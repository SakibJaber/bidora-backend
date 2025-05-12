// src/cron/cron.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as dayjs from 'dayjs';
import { PaymentProofService } from 'src/modules/payment-proof/payment-proof.service';
import { UserService } from 'src/modules/user/user.service';
import { DRIZZLE } from '../database/drizzle.module';
import { paymentProofs, users, commissions } from '../database/schema';
import { DrizzleDB } from '../database/types/drizzle';
import { EmailService } from '../utils/email/email.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly paymentProofService: PaymentProofService,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS, { name: 'verifyCommission' })
  async verifyCommissionCron() {
    this.logger.log('Running Verify Commission Cron...');

    // Fetch approved payment proofs
    const approvedProofs = await this.db
      .select()
      .from(paymentProofs)
      .where(eq(paymentProofs.status, 'Approved'));

    this.logger.log(`Found ${approvedProofs.length} approved payment proofs`);

    for (const proof of approvedProofs) {
      try {
        await this.db.transaction(async (tx) => {
          // Fetch user
          const user = await tx.query.users.findFirst({
            where: eq(users.id, proof.userId),
          });
          if (!user) {
            throw new NotFoundException(`User ${proof.userId} not found`);
          }

          // Ensure user is an Auctioneer
          if (user.role !== 'Auctioneer') {
            this.logger.warn(
              `User ${user.id} is not an Auctioneer, skipping proof ${proof.id}`,
            );
            return;
          }

          const unpaid = Number(user.unpaidCommission);
          const amount = Number(proof.amount);
          let newUnpaid: number;

          // Update unpaidCommission
          if (unpaid >= amount) {
            newUnpaid = newUnpaid = Math.floor(unpaid - amount);
          } else {
            newUnpaid = 0;
            this.logger.warn(
              `User ${user.id} has insufficient unpaid commission (${unpaid}) for proof amount (${amount})`,
            );
          }

          await tx
            .update(users)
            .set({ unpaidCommission: newUnpaid }as any )
            .where(eq(users.id, user.id));

          // Update payment proof status to Settled
          await tx
            .update(paymentProofs)
            .set({ status: 'Settled' }as any )
            .where(eq(paymentProofs.id, proof.id));

          // Create commission record
          await tx.insert(commissions).values({
            userId: user.id,
            amount: proof.amount,
          }as any );

          // Send email
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