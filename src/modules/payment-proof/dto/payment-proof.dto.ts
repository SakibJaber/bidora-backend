import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, IsEnum, IsNumber } from 'class-validator';

enum PaymentProofStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Settled = 'Settled',
}

export class CreatePaymentProofDto {
  @IsInt()
  @Type(() => Number)
  auctionId: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdatePaymentProofDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsEnum(['Pending', 'Approved', 'Rejected', 'Settled'])
  status?: 'Pending' | 'Approved' | 'Rejected' | 'Settled';
}
