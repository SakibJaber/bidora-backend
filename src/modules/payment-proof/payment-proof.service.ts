import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { PaymentProofEntity } from './entities/payment-proof.entity';
import {
  CreatePaymentProofDto,
  UpdatePaymentProofDto,
} from './dto/payment-proof.dto';


import { sql } from 'drizzle-orm';

import * as dayjs from 'dayjs';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';
import { DRIZZLE } from 'src/common/database/drizzle.module';
import { auctions, users, paymentProofs } from 'src/common/database/schema';
import { DrizzleDB } from 'src/common/database/types/drizzle';

@Injectable()
export class PaymentProofService {
  private readonly logger = new Logger(PaymentProofService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private transformPaymentProof(row: any): PaymentProofEntity {
    return new PaymentProofEntity({
      id: row.id,
      userId: row.userId,
      auctionId: row.auctionId,
      imagePublicId: row.imagePublicId,
      imageUrl: row.imageUrl,
      status: row.status,
      amount: parseFloat(row.amount), // numeric fields come back as strings
      comment: row.comment,
      uploadedAt: row.uploadedAt,
    });
  }

  private async calculateCommission(
    auctionId: number,
    tx: DrizzleDB,
  ): Promise<number> {
    const auction = await tx.query.auctions.findFirst({
      where: eq(auctions.id, auctionId),
    });
    if (!auction) throw new NotFoundException('Auction not found');

    const endTime = dayjs(auction.endTime, 'DD/MM/YYYY HH:mm:ss', true);
    if (!endTime.isValid())
      throw new BadRequestException('Invalid auction end time format');
    if (dayjs().isBefore(endTime))
      throw new BadRequestException('Auction has not ended yet');
    if (auction.commissionCalculated)
      throw new BadRequestException('Commission already processed');

    const envRate = parseFloat(process.env.COMMISSION_RATE || '');
    const rate =
      !isNaN(envRate) && envRate > 0 && envRate <= 1 ? envRate : 0.05;
    const raw = auction.currentBid * rate;
    return Math.round(raw * 100) / 100; // Two-decimal rounding
  }

  // async createPaymentProof(
  //   userId: number,
  //   dto: CreatePaymentProofDto,
  //   image: Express.Multer.File,
  // ): Promise<PaymentProofEntity> {
  //   this.logger.log(`Creating payment proof for user ${userId}`);
  //   this.logger.debug(`Raw DTO: ${JSON.stringify(dto)}`);
  //   return this.db.transaction(async (tx) => {
  //     // 1. Load & validate user
  //     const user = await tx.query.users.findFirst({
  //       where: eq(users.id, userId),
  //     });
  //     if (!user) throw new NotFoundException('User not found');
  //     if (user.role !== 'Auctioneer')
  //       throw new ForbiddenException('Only Auctioneers can submit payment proofs');

  //     const unpaid = Number(user.unpaidCommission);
  //     if (isNaN(unpaid) || unpaid <= 0)
  //       throw new BadRequestException('No unpaid commission available');

  //     // 2. Validate inputs
  //     if (!Number.isInteger(userId))
  //       throw new BadRequestException('userId must be an integer');
  //     if (!Number.isInteger(dto.auctionId))
  //       throw new BadRequestException('auctionId must be an integer');

  //     const amount =
  //       typeof dto.amount === 'string' ? parseFloat(dto.amount) : dto.amount;
  //     if (isNaN(amount) || amount <= 0)
  //       throw new BadRequestException('Invalid amount value');
  //     const roundedAmount = Number(amount.toFixed(2)); // Ensure 2 decimal places
  //     if (roundedAmount > unpaid)
  //       throw new BadRequestException(
  //         `Amount exceeds your unpaid commission balance (${unpaid.toFixed(2)})`,
  //       );

  //     // 3. Compute & compare commission
  //     const commission = await this.calculateCommission(dto.auctionId, tx);
  //     this.logger.debug(`Calculated commission: ${commission}`);
  //     const tolerance = 0.01;
  //     if (Math.abs(roundedAmount - commission) > tolerance)
  //       throw new BadRequestException(
  //         `Amount must equal the auction’s commission: ${commission.toFixed(2)}`,
  //       );

  //     // 4. Upload proof image
  //     if (!image?.buffer)
  //       throw new BadRequestException('Image is required');
  //     const uploaded = await this.cloudinary.uploadFile(image, 'payment_proofs');
  //     if (!uploaded?.public_id || !uploaded?.secure_url)
  //       throw new BadRequestException('Image upload failed');

  //     // 5. Insert payment proof
  //     this.logger.debug(
  //       `Inserting payment proof: userId=${userId} (type: ${typeof userId}), auctionId=${dto.auctionId} (type: ${typeof dto.auctionId}), amount=${roundedAmount} (type: ${typeof roundedAmount})`,
  //     );
  //     const [newProof] = await tx
  //       .insert(paymentProofs)
  //       .values({
  //         userId,
  //         auctionId: dto.auctionId,
  //         imagePublicId: uploaded.public_id,
  //         imageUrl: uploaded.secure_url,
  //         amount: roundedAmount,
  //         comment: dto.comment,
  //         status: 'Pending',
  //       }as any)
  //       .returning();

  //     // 6. Deduct unpaidCommission
  //     await tx
  //       .update(users)
  //       .set({ unpaidCommission: Number((unpaid - roundedAmount).toFixed(2)) }as any )
  //       .where(eq(users.id, userId));

  //     // 7. Mark auction commissionCalculated
  //     await tx
  //       .update(auctions)
  //       .set({ commissionCalculated: true }as any )
  //       .where(eq(auctions.id, dto.auctionId));

  //     return this.transformPaymentProof(newProof);
  //   });
  // }

  async createPaymentProof(
    userId: number,
    dto: CreatePaymentProofDto,
    image: Express.Multer.File,
  ): Promise<PaymentProofEntity> {
    this.logger.log(`Creating payment proof for user ${userId}`);
    this.logger.debug(`Raw DTO: ${JSON.stringify(dto)}`);
    return this.db.transaction(async (tx) => {
      const user = await tx.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (!user) throw new NotFoundException('User not found');
      if (user.role !== 'Auctioneer')
        throw new ForbiddenException('Only Auctioneers can submit payment proofs');
  
      const unpaid = Number(user.unpaidCommission);
      if (isNaN(unpaid) || unpaid <= 0)
        throw new BadRequestException('No unpaid commission available');
  
      if (!Number.isInteger(userId))
        throw new BadRequestException('userId must be an integer');
      if (!Number.isInteger(dto.auctionId))
        throw new BadRequestException('auctionId must be an integer');
  
      const amount =
        typeof dto.amount === 'string' ? parseFloat(dto.amount) : dto.amount;
      if (isNaN(amount) || amount <= 0)
        throw new BadRequestException('Invalid amount value');
      const roundedAmount = Number(amount.toFixed(2));
      if (roundedAmount > unpaid)
        throw new BadRequestException(
          `Amount exceeds your unpaid commission balance (${unpaid.toFixed(2)})`,
        );
  
      const commission = await this.calculateCommission(dto.auctionId, tx);
      this.logger.debug(`Calculated commission: ${commission}`);
      const tolerance = 0.01;
      if (Math.abs(roundedAmount - commission) > tolerance)
        throw new BadRequestException(
          `Amount must equal the auction’s commission: ${commission.toFixed(2)}`,
        );
  
      if (!image?.buffer)
        throw new BadRequestException('Image is required');
      const uploaded = await this.cloudinary.uploadFile(image, 'payment_proofs');
      if (!uploaded?.public_id || !uploaded?.secure_url)
        throw new BadRequestException('Image upload failed');
  
      this.logger.debug(
        `Inserting payment proof: userId=${userId} (type: ${typeof userId}), auctionId=${dto.auctionId} (type: ${typeof dto.auctionId}), amount=${roundedAmount} (type: ${typeof roundedAmount})`,
      );
      const [newProof] = await tx
        .insert(paymentProofs)
        .values({
          userId,
          auctionId: dto.auctionId,
          imagePublicId: uploaded.public_id,
          imageUrl: uploaded.secure_url,
          amount: roundedAmount,
          comment: dto.comment,
          status: 'Pending',
        }as any)
        .returning();
  
      // Round to integer for unpaidCommission
      const newUnpaid = Math.floor(unpaid - roundedAmount);
      this.logger.debug(
        `Updating unpaidCommission: ${unpaid} - ${roundedAmount} = ${newUnpaid}`,
      );
      await tx
        .update(users)
        .set({ unpaidCommission: newUnpaid }as any )
        .where(eq(users.id, userId));
  
      await tx
        .update(auctions)
        .set({ commissionCalculated: true } as any)
        .where(eq(auctions.id, dto.auctionId));
  
      return this.transformPaymentProof(newProof);
    });
  }

  async getAllPaymentProofs(
    page = 1,
    limit = 10,
  ): Promise<{
    data: PaymentProofEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const offset = (page - 1) * limit;
    const [rows, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(paymentProofs)
        .orderBy(paymentProofs.uploadedAt)
        .limit(limit)
        .offset(offset),
      this.db.select({ count: sql`COUNT(*)` }).from(paymentProofs),
    ]);

    return {
      data: rows.map(this.transformPaymentProof),
      total: Number(count),
      page,
      limit,
    };
  }

  async getPaymentProofById(id: number): Promise<PaymentProofEntity> {
    const row = await this.db.query.paymentProofs.findFirst({
      where: eq(paymentProofs.id, id),
    });

    if (!row) {
      throw new NotFoundException('Payment proof not found');
    }

    return this.transformPaymentProof(row);
  }

  async getPaymentProofsByUser(userId: number): Promise<PaymentProofEntity[]> {
    const rows = await this.db
      .select()
      .from(paymentProofs)
      .where(eq(paymentProofs.userId, userId))
      .orderBy(paymentProofs.uploadedAt);
    return rows.map(this.transformPaymentProof);
  }

  async updatePaymentProof(
    id: number,
    dto: UpdatePaymentProofDto,
  ): Promise<PaymentProofEntity> {
    this.logger.log(`Updating payment proof ${id}`);

    return this.db.transaction(async (tx) => {
      const proof = await tx.query.paymentProofs.findFirst({
        where: eq(paymentProofs.id, id),
      });
      if (!proof) {
        throw new NotFoundException('Payment proof not found');
      }

      // Prevent updating amount if status is not Pending
      const amount =
        proof.status === 'Pending' && dto.amount
          ? Number(dto.amount.toFixed(2))
          : undefined;

      const [updated] = await tx
        .update(paymentProofs)
        .set({
          amount,
          comment: dto.comment,
          status: dto.status,
        }as any )
        .where(eq(paymentProofs.id, id))
        .returning();

      if (!updated) {
        throw new NotFoundException('Payment proof not found');
      }

      return this.transformPaymentProof(updated);
    });
  }

  async deletePaymentProof(id: number): Promise<{ message: string }> {
    this.logger.log(`Deleting payment proof ${id}`);

    return this.db.transaction(async (tx) => {
      const proof = await tx.query.paymentProofs.findFirst({
        where: eq(paymentProofs.id, id),
      });
      if (!proof) {
        throw new NotFoundException('Payment proof not found');
      }

      if (proof.imagePublicId) {
        await this.cloudinary.deleteFile(proof.imagePublicId);
      }

      const result = await tx
        .delete(paymentProofs)
        .where(eq(paymentProofs.id, id));

      if (result.rowCount === 0) {
        throw new NotFoundException('Payment proof not found');
      }

      return { message: 'Payment proof deleted successfully' };
    });
  }
}