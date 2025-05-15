import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import { and, eq, lt, desc } from 'drizzle-orm';
import * as dayjs from 'dayjs';
import { PaymentProofService } from 'src/modules/payment-proof/payment-proof.service';
import { UserService } from 'src/modules/user/user.service';
import { DRIZZLE } from '../database/drizzle.module';
import {
  paymentProofs,
  users,
  commissions,
  auctions,
  bids,
} from '../database/schema';
import { DrizzleDB } from '../database/types/drizzle';
import { EmailService } from '../utils/email/email.service';
import { BidService } from 'src/modules/bid/bid.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private readonly COMMISSION_RATE = 0.1; // 10% commission rate

  constructor(
    private readonly paymentProofService: PaymentProofService,
    private readonly userService: UserService,
    private readonly bidService: BidService,
    private readonly emailService: EmailService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'processEndedAuctions' })
  async processEndedAuctions() {
    this.logger.log('Running Process Ended Auctions Cron...');

    try {
      // Find auctions that have ended and haven't had commission calculated
      const endedAuctions = await this.db.query.auctions.findMany({
        where: and(
          lt(auctions.endTime, dayjs().format('DD/MM/YYYY HH:mm:ss')),
          eq(auctions.commissionCalculated, false),
        ),
      });

      this.logger.log(
        `Found ${endedAuctions.length} ended auctions to process`,
      );

      for (const auction of endedAuctions) {
        await this.db.transaction(async (tx) => {
          try {
            // Find the highest bid for this auction
            const highestBid = await tx
              .select()
              .from(bids)
              .where(eq(bids.auctionId, auction.id))
              .orderBy(desc(bids.amount))
              .limit(1);

            if (!highestBid.length) {
              // No bids, mark as processed
              await tx
                .update(auctions)
                .set({ commissionCalculated: true })
                .where(eq(auctions.id, auction.id));
              this.logger.log(
                `No bids for auction ${auction.id}, marked as processed`,
              );
              return;
            }

            const winningBid = highestBid[0];
            const winnerId = winningBid.userId;
            const winningAmount = Number(winningBid.amount);

            // Get winner's current stats
            const winner = await tx.query.users.findFirst({
              where: eq(users.id, winnerId),
            });

            if (!winner) {
              this.logger.error(
                `Winner user ${winnerId} not found for auction ${auction.id}`,
              );
              return;
            }

            // Calculate new stats for winner
            const newAuctionsWon = Number(winner.auctionsWon) + 1;
            const newMoneySpent = Number(winner.moneySpent) + winningAmount;

            // Update winner's stats
            await tx
              .update(users)
              .set({
                auctionsWon: newAuctionsWon,
                moneySpent: newMoneySpent,
              } as any)
              .where(eq(users.id, winnerId));

            // Get auctioneer's current stats
            const auctioneer = await tx.query.users.findFirst({
              where: eq(users.id, auction.createdBy),
            });

            if (!auctioneer) {
              this.logger.error(
                `Auctioneer ${auction.createdBy} not found for auction ${auction.id}`,
              );
              return;
            }

            // Calculate commission (10% of winning amount)
            const commissionAmount = Number(
              (winningAmount * this.COMMISSION_RATE).toFixed(2),
            );
            const newUnpaidCommission =
              Number(auctioneer.unpaidCommission) + commissionAmount;

            // Update auctioneer's unpaid commission
            await tx
              .update(users)
              .set({
                unpaidCommission: newUnpaidCommission,
              } as any)
              .where(eq(users.id, auction.createdBy));

            // Update auction with highest bidder and mark as processed
            await tx
              .update(auctions)
              .set({
                highestBidderId: winnerId,
                currentBid: winningAmount,
                commissionCalculated: true,
              } as any)
              .where(eq(auctions.id, auction.id));

            // Send notification email to winner
            const winnerSubject = `Congratulations! You've Won Auction: ${auction.title}`;
            const winnerMessage = `Dear ${winner.userName},\n\nCongratulations! You have won the auction for "${auction.title}" with a bid of ${winningAmount.toFixed(2)}.\n\nAuction Details:\n- Item: ${auction.title}\n- Winning Bid: ${winningAmount.toFixed(2)}\n- Auction End Time: ${auction.endTime}\n\nPlease proceed with the payment process within the next 48 hours to complete your purchase.\n\nBest regards,\nZeeshu Auction Team`;

            await this.emailService.sendEmail({
              email: winner.email,
              subject: winnerSubject,
              message: winnerMessage,
            });

            // Send notification email to auctioneer
            const auctioneerSubject = `Auction Completed: ${auction.title}`;
            const auctioneerMessage = `Dear ${auctioneer.userName},\n\nYour auction for "${auction.title}" has ended. The winning bid was ${winningAmount.toFixed(2)}.\n\nCommission Details:\n- Commission Rate: ${this.COMMISSION_RATE * 100}%\n- Commission Amount: ${commissionAmount.toFixed(2)}\n- Total Unpaid Commission: ${newUnpaidCommission.toFixed(2)}\n\nPlease settle your unpaid commission balance at your earliest convenience.\n\nBest regards,\nZeeshu Auction Team`;

            await this.emailService.sendEmail({
              email: auctioneer.email,
              subject: auctioneerSubject,
              message: auctioneerMessage,
            });

            this.logger.log(
              `Processed auction ${auction.id}: Winner ${winnerId}, Amount ${winningAmount}, Auctions Won ${newAuctionsWon}, Money Spent ${newMoneySpent}, Auctioneer ${auction.createdBy}, Commission ${commissionAmount}, Unpaid Commission ${newUnpaidCommission}`,
            );
          } catch (error) {
            this.logger.error(
              `Error processing auction ${auction.id}: ${error.message}`,
            );
            throw error; // Roll back transaction on error
          }
        });
      }
    } catch (error) {
      this.logger.error(`Error in processEndedAuctions: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'verifyCommission' })
  async verifyCommissionCron() {
    this.logger.log('Running Verify Commission Cron...');

    const approvedProofs = await this.db
      .select()
      .from(paymentProofs)
      .where(eq(paymentProofs.status, 'Approved'));

    this.logger.log(`Found ${approvedProofs.length} approved payment proofs`);

    for (const proof of approvedProofs) {
      try {
        await this.db.transaction(async (tx) => {
          const user = await tx.query.users.findFirst({
            where: eq(users.id, proof.userId),
          });
          if (!user) {
            throw new NotFoundException(`User ${proof.userId} not found`);
          }

          if (user.role !== 'Auctioneer') {
            this.logger.warn(
              `User ${user.id} is not an Auctioneer, skipping proof ${proof.id}`,
            );
            return;
          }

          const unpaid = Number(user.unpaidCommission);
          const amount = Number(proof.amount);
          let newUnpaid: number;

          if (unpaid >= amount) {
            newUnpaid = Number((unpaid - amount).toFixed(2));
          } else {
            newUnpaid = 0;
            this.logger.warn(
              `User ${user.id} has insufficient unpaid commission (${unpaid}) for proof amount (${amount})`,
            );
          }

          await tx
            .update(users)
            .set({ unpaidCommission: newUnpaid } as any)
            .where(eq(users.id, user.id));

          await tx
            .update(paymentProofs)
            .set({ status: 'Settled' } as any)
            .where(eq(paymentProofs.id, proof.id));

          await tx.insert(commissions).values({
            userId: user.id,
            amount: Math.round(Number(proof.amount) * 100),
          } as any);

          const settlementDate = dayjs().format('MMM DD, YYYY');
          const subject = `Your Payment Has Been Successfully Verified And Settled`;
          const message = `Dear ${user.userName},\n\nWe are pleased to inform you that your recent payment has been successfully verified and settled. Thank you for promptly providing the necessary proof of payment. Your account has been updated, and you can now proceed with your activities on our platform without any restrictions.\n\nPayment Details:\nAmount Settled: ${amount.toFixed(
            2,
          )}\nUnpaid Amount: ${newUnpaid.toFixed(
            2,
          )}\nDate of Settlement: ${settlementDate}\n\nBest regards,\nZeeshu Auction Team`;

          await this.emailService.sendEmail({
            email: user.email,
            subject,
            message,
          });

          this.logger.log(
            `User ${user.id} paid commission of ${amount.toFixed(2)}`,
          );
        });
      } catch (error) {
        this.logger.error(
          `Error processing commission proof ${proof.id} for user ${proof.userId}: ${error.message}`,
        );
      }
    }
  }
}
