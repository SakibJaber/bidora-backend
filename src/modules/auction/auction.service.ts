import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq, gt } from 'drizzle-orm';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { AuctionEntity } from './entities/auction.entity';
import { Auction, auctions } from 'src/common/database/schema';
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
    console.log('startTime DTO:', dto.startTime);
    console.log('endTime DTO:', dto.endTime);

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
        ...dto,
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
}
