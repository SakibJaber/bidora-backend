import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq, gt, sql } from 'drizzle-orm';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { AuctionEntity } from './entities/auction.entity';
import { auctions, bids, users } from 'src/common/database/schema';
import { DRIZZLE } from 'src/common/database/drizzle.module';
import { DrizzleDB } from 'src/common/database/types/drizzle';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';
import * as dayjs from 'dayjs';

@Injectable()
export class AuctionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private readonly logger = new Logger(AuctionService.name);

  async createAuction(
    userId: number,
    dto: CreateAuctionDto,
    image?: Express.Multer.File,
  ) {
    const now = new Date();
    const nowStr = dayjs(now).format('DD/MM/YYYY HH:mm:ss');

    const activeAuction = await this.db.query.auctions.findFirst({
      where: (auctions, { and }) =>
        and(eq(auctions.createdBy, userId), gt(auctions.endTime, nowStr)),
    });

    if (activeAuction) {
      throw new BadRequestException('You already have one active auction.');
    }

    const startDate = dayjs(
      dto.startTime,
      'DD/MM/YYYY HH:mm:ss',
      true,
    ).toDate();
    const endDate = dayjs(dto.endTime, 'DD/MM/YYYY HH:mm:ss', true).toDate();

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException(
        'Invalid date format. Use DD/MM/YYYY HH:mm:ss',
      );
    }

    if (startDate <= now) {
      throw new BadRequestException(
        'Auction start time must be in the future.',
      );
    }

    if (startDate >= endDate) {
      throw new BadRequestException(
        'Auction start time must be before end time.',
      );
    }

    if (dayjs(endDate).diff(startDate, 'minute') < 60) {
      throw new BadRequestException('Auction must last at least 1 hour.');
    }

    let imagePublicId = '';
    let imageUrl = '';

    if (image?.buffer) {
      const uploaded = await this.cloudinary
        .uploadFile(image, 'auction_item_photos')
        .catch((err) => {
          console.error('Image upload error:', err);
          throw new InternalServerErrorException('Image upload failed.');
        });

      imagePublicId = uploaded.public_id;
      imageUrl = uploaded.secure_url;
    }

    return await this.db.transaction(async (tx) => {
      const [insertedAuction] = await tx
        .insert(auctions)
        .values({
          ...dto,
          createdBy: userId,
          imageUrl,
          imagePublicId,
          commissionCalculated: false,
          createdAt: now,
        } as any)
        .returning();

      if (!insertedAuction) {
        throw new InternalServerErrorException('Auction creation failed.');
      }
      // OPTIONAL: If you plan to associate category or tag in future
      // await this.categoryService.addCategoryToAuction({ auctionId: insertedAuction.id, categoryId }, tx);

      // Fetch full auction info (e.g., with joins in the future)
      const [fullAuction] = await tx
        .select()
        .from(auctions)
        .where(eq(auctions.id, insertedAuction.id));

      return new AuctionEntity(fullAuction);
    });
  }

  async getAllAuctions(): Promise<AuctionEntity[]> {
    const rows = await this.db.select().from(auctions);
    return rows.map((row) => new AuctionEntity(row));
  }

  async getMyAuctionItems(userId: number): Promise<AuctionEntity[]> {
    const rows = await this.db
      .select()
      .from(auctions)
      .where(eq(auctions.createdBy, userId));
    return rows.map((row) => new AuctionEntity(row));
  }

  async getAuctionDetails(id: number) {
    const auction = await this.db.query.auctions.findFirst({
      where: eq(auctions.id, id),
    });

    if (!auction) throw new NotFoundException('Auction not found');

    const bidList = await this.db
      .select()
      .from(bids)
      .where(eq(bids.auctionId, id));

    const bidders = bidList.sort((a, b) => b.amount - a.amount);
    return {
      auctionItem: new AuctionEntity(auction),
      bidders,
    };
  }

  async getAuctionById(id: number): Promise<AuctionEntity> {
    const row = await this.db.query.auctions.findFirst({
      where: eq(auctions.id, id),
    });

    if (!row) {
      throw new NotFoundException('Auction not found');
    }

    return new AuctionEntity(row);
  }

  async updateAuction(id: number, dto: UpdateAuctionDto) {
    const startDate = dayjs(dto.startTime, 'DD/MM/YYYY HH:mm:ss', true);
    const endDate = dayjs(dto.endTime, 'DD/MM/YYYY HH:mm:ss', true);

    if (!startDate.isValid() || !endDate.isValid()) {
      throw new BadRequestException('Invalid date format');
    }

    const [updated] = await this.db
      .update(auctions)
      .set({
        // User can only update date-time
        startTime: startDate.format('DD/MM/YYYY HH:mm:ss'),
        endTime: endDate.format('DD/MM/YYYY HH:mm:ss'),
      })
      .where(eq(auctions.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Auction not found');
    return updated;
  }

  async deleteAuction(id: number): Promise<{ message: string }> {
    const deleted = await this.db.delete(auctions).where(eq(auctions.id, id));

    if (deleted.rowCount === 0)
      throw new NotFoundException('Auction not found');

    return { message: 'Auction deleted successfully' };
  }

  async republishAuction(
    id: number,
    dto: { startTime: string; endTime: string; commissionCalculated: boolean },
    userId: number,
  ) {
    const auction = await this.db.query.auctions.findFirst({
      where: eq(auctions.id, id),
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    if (auction.createdBy !== userId) {
      throw new BadRequestException('Unauthorized to republish this auction');
    }

    //  Prevent republishing if auction is already active
    const auctionEndTime = dayjs(auction.endTime, 'DD/MM/YYYY HH:mm:ss', true);

    if (!auctionEndTime.isValid()) {
      throw new InternalServerErrorException(
        'Stored auction end time is invalid.',
      );
    }

    if (auctionEndTime.isAfter(dayjs())) {
      throw new BadRequestException(
        'Auction is already active, cannot republish.',
      );
    }

    const now = new Date();
    const startDate = dayjs(dto.startTime, 'DD/MM/YYYY HH:mm:ss', true);
    const endDate = dayjs(dto.endTime, 'DD/MM/YYYY HH:mm:ss', true);

    if (!startDate.isValid() || !endDate.isValid()) {
      throw new BadRequestException(
        'Invalid date format. Use DD/MM/YYYY HH:mm:ss',
      );
    }

    if (startDate.toDate() <= now) {
      throw new BadRequestException('Start time must be in the future.');
    }

    if (startDate.isAfter(endDate)) {
      throw new BadRequestException('Start time must be before end time.');
    }

    // Ensure end time is at least 1 hour after start time
    if (endDate.diff(startDate, 'hour', true) < 1) {
      throw new BadRequestException(
        'End time must be at least 1 hour after start time.',
      );
    }
    const [updated] = await this.db
      .update(auctions)
      .set({
        startTime: startDate.format('DD/MM/YYYY HH:mm:ss'),
        endTime: endDate.format('DD/MM/YYYY HH:mm:ss'),
        commissionCalculated: dto.commissionCalculated,
      } as any)
      .where(eq(auctions.id, id))
      .returning();

    if (!updated) {
      throw new InternalServerErrorException('Failed to republish auction');
    }
    return new AuctionEntity(updated);
  }

  async closeAuction(id: number): Promise<{ message: string; winner?: AuctionEntity }> {
    return this.db.transaction(async (tx) => {
      // Fetch the auction
      const auction = await tx.query.auctions.findFirst({
        where: eq(auctions.id, id),
      });

      if (!auction) {
        throw new NotFoundException('Auction not found');
      }

      // Check if auction has already been processed
      if (auction.commissionCalculated) {
        throw new BadRequestException('Auction has already been closed');
      }

      // Parse endTime to verify auction has ended
      const endTime = dayjs(auction.endTime, 'DD/MM/YYYY HH:mm:ss', true);
      if (!endTime.isValid()) {
        throw new BadRequestException('Invalid auction end time format');
      }

      if (endTime.isAfter(dayjs())) {
        throw new BadRequestException('Auction has not yet ended');
      }

      // Find the highest bid
      const highestBid = await tx
        .select({
          userId: bids.userId,
          amount: sql`MAX(${bids.amount})`,
        })
        .from(bids)
        .where(eq(bids.auctionId, id))
        .groupBy(bids.userId)
        .orderBy(sql`MAX(${bids.amount}) DESC`)
        .limit(1);

      if (!highestBid.length) {
        // No bids, mark auction as closed
        await tx
          .update(auctions)
          .set({ commissionCalculated: true })
          .where(eq(auctions.id, id));
        return { message: 'Auction closed with no bids' };
      }

      const winnerId = highestBid[0].userId;
      const winningAmount = Number(highestBid[0].amount);

      // Update auction with highest bidder and mark as closed
      const [updatedAuction] = await tx
        .update(auctions)
        .set({
          highestBidderId: winnerId,
          currentBid: winningAmount,
          commissionCalculated: true,
        })
        .where(eq(auctions.id, id))
        .returning();

      if (!updatedAuction) {
        throw new InternalServerErrorException('Failed to update auction');
      }

      // Update user's auctionsWon and moneySpent
      const [updatedUser] = await tx
        .update(users)
        .set({
          auctionsWon: sql`${users.auctionsWon} + 1`,
          moneySpent: sql`${users.moneySpent} + ${winningAmount}`,
        })
        .where(eq(users.id, winnerId))
        .returning();

      if (!updatedUser) {
        throw new InternalServerErrorException('Failed to update user');
      }

      return {
        message: 'Auction closed successfully',
        winner: new AuctionEntity(updatedAuction),
      };
    });
  }
}
