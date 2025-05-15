import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/common/database/drizzle.module';
import { DrizzleDB } from 'src/common/database/types/drizzle';
import { bids } from 'src/common/database/schema/bid.schema';
import { auctions } from 'src/common/database/schema/auction.schema';
import { users } from 'src/common/database/schema/user.schema';
import { BidEntity } from './entities/bid.entity';
import { CreateBidDto, UpdateBidDto } from './dto/bid.dto';
import * as dayjs from 'dayjs';
import * as customParseFormat from 'dayjs/plugin/customParseFormat';

// Enable custom parse format plugin
dayjs.extend(customParseFormat);

@Injectable()
export class BidService {
  private readonly logger = new Logger(BidService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  private transformBid(row: any): BidEntity {
    return new BidEntity({
      id: row.id,
      auctionId: row.auctionId,
      userId: row.userId,
      amount: row.amount,
      userName: row.userName,
      profileImage: row.profileImage,
      createdAt: row.createdAt,
    });
  }

  async placeBid(userId: number, dto: CreateBidDto): Promise<BidEntity> {
    this.logger.log(
      `Creating bid for user ${userId} on auction ${dto.auctionId}`,
    );

    return this.db.transaction(async (tx) => {
      // Verify auction exists and is active
      const auction = await tx.query.auctions.findFirst({
        where: eq(auctions.id, dto.auctionId),
      });
      if (!auction) {
        throw new NotFoundException('Auction not found');
      }

      // Parse endTime with dayjs in DD/MM/YYYY HH:mm:ss format
      const endTime = dayjs(auction.endTime, 'DD/MM/YYYY HH:mm:ss');
      if (!endTime.isValid()) {
        throw new BadRequestException('Invalid auction end time format');
      }

      // Check if auction has ended
      if (endTime.isBefore(dayjs())) {
        throw new BadRequestException('Auction has ended');
      }

      // Verify user exists
      const user = await tx.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if bid amount is higher than current highest bid
      const highestBid = await tx
        .select({ amount: sql`MAX(${bids.amount})` })
        .from(bids)
        .where(eq(bids.auctionId, dto.auctionId));
      const highestAmount = highestBid[0]?.amount
        ? Number(highestBid[0].amount)
        : auction.startingBid;
      if (dto.amount <= highestAmount) {
        throw new BadRequestException(
          `Bid amount must be higher than ${highestAmount}`,
        );
      }

      // Create bid
      const [newBid] = await tx
        .insert(bids)
        .values({
          auctionId: dto.auctionId,
          userId,
          amount: dto.amount,
          userName: user.userName,
          profileImage: user.profileImageUrl,
        } as any)
        .returning();

      // Update auction's currentBid
      await tx
        .update(auctions)
        .set({ currentBid: dto.amount })
        .where(eq(auctions.id, dto.auctionId));

      return this.transformBid(newBid);
    });
  }

  async processAuctionWinner(auctionId: number): Promise<{ message: string; winner?: BidEntity }> {
    this.logger.log(`Processing winner for auction ${auctionId}`);

    return this.db.transaction(async (tx) => {
      // Fetch auction details
      const auction = await tx.query.auctions.findFirst({
        where: eq(auctions.id, auctionId),
      });
      if (!auction) {
        throw new NotFoundException('Auction not found');
      }

      // Parse endTime with dayjs
      const endTime = dayjs(auction.endTime, 'DD/MM/YYYY HH:mm:ss');
      if (!endTime.isValid()) {
        throw new BadRequestException('Invalid auction end time format');
      }

      // Check if auction has ended
      if (endTime.isAfter(dayjs())) {
        throw new BadRequestException('Auction has not yet ended');
      }

      // Find the highest bid
      const highestBid = await tx
        .select()
        .from(bids)
        .where(eq(bids.auctionId, auctionId))
        .orderBy(sql`${bids.amount} DESC`)
        .limit(1);

      if (!highestBid.length) {
        return { message: 'No bids placed for this auction' };
      }

      const winningBid = highestBid[0];

      // Update user's auctionsWon and moneySpent
      const [updatedUser] = await tx
        .update(users)
        .set({
          auctionsWon: sql`${users.auctionsWon} + 1`,
          moneySpent: sql`${users.moneySpent} + ${winningBid.amount}`,
        })
        .where(eq(users.id, winningBid.userId))
        .returning();

      if (!updatedUser) {
        throw new NotFoundException('Winning user not found');
      }

      // Update auction's highestBidderId
      await tx
        .update(auctions)
        .set({ highestBidderId: winningBid.userId })
        .where(eq(auctions.id, auctionId));

      return {
        message: 'Auction winner processed successfully',
        winner: this.transformBid(winningBid),
      };
    });
  }

  async getAllBids(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: BidEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const offset = (page - 1) * limit;
    const [rows, [{ count }]] = await Promise.all([
      this.db.select().from(bids).limit(limit).offset(offset),
      this.db.select({ count: sql`COUNT(*)` }).from(bids),
    ]);

    return {
      data: rows.map(this.transformBid),
      total: Number(count),
      page,
      limit,
    };
  }

  async getBidsByAuction(auctionId: number): Promise<BidEntity[]> {
    const rows = await this.db
      .select()
      .from(bids)
      .where(eq(bids.auctionId, auctionId));
    return rows.map(this.transformBid);
  }

  async updateBid(id: number, dto: UpdateBidDto): Promise<BidEntity> {
    this.logger.log(`Updating bid ${id}`);

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(bids)
        .set({
          amount: dto.amount,
          userName: dto.userName,
          profileImage: dto.profileImage,
        } as any)
        .where(eq(bids.id, id))
        .returning();

      if (!updated) {
        throw new NotFoundException('Bid not found');
      }

      return this.transformBid(updated);
    });
  }

  async deleteBid(id: number): Promise<{ message: string }> {
    this.logger.log(`Deleting bid ${id}`);

    const deleted = await this.db.delete(bids).where(eq(bids.id, id));

    if (deleted.rowCount === 0) {
      throw new NotFoundException('Bid not found');
    }

    return { message: 'Bid deleted successfully' };
  }
}