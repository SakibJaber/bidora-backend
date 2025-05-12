import {
    IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export enum PaymentProofStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Settled = 'Settled',
}

export class PaymentProofEntity {
    @IsInt()
    id: number;
  
    @IsInt()
    userId: number;

    @IsInt()
    auctionId: number;
  
    @IsString()
    imagePublicId: string;
  
    @IsString()
    imageUrl: string;
  
    @IsEnum(PaymentProofStatus)
    status: PaymentProofStatus;
  
    @IsOptional()
    @IsInt()
    @Min(0)
    amount?: number;
  
    @IsOptional()
    @IsString()
    comment?: string;
  
    @IsDate()
    uploadedAt: Date;

  constructor(data: PaymentProofEntity) {
    Object.assign(this, data);
  }
}
