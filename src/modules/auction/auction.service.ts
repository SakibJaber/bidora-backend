import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { AuctionEntity } from './entities/auction.entity';
import { auctions } from 'src/common/database/schema';
import { db } from 'src/common/database/drizzle.client';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from 'src/common/database/drizzle.module';

@Injectable()
export class AuctionService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  private readonly logger = new Logger(AuctionService.name);

  async createAuction(dto: CreateAuctionDto) {
    const [auction] = await this.db.insert(auctions).values(dto).returning();
    return auction;
  }

  async getAllAuctions(): Promise<AuctionEntity[]> {
    const rows = await this.db.select().from(auctions);
    return rows.map((row) => new AuctionEntity(row));
  }

  async getAuctionById(id: number): Promise<AuctionEntity> {
    const row = await db.query.auctions.findFirst({
      where: eq(auctions.id, id),
    });

    if (!row) {
      throw new NotFoundException('Auction not found');
    }

    return new AuctionEntity(row);
  }

  async updateAuction(id: number, dto: UpdateAuctionDto) {
    const [updated] = await this.db
      .update(auctions)
      .set(dto)
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
}

