import { IsInt, Min, IsOptional, IsString, IsDate } from 'class-validator';

export class BidEntity {
  @IsInt()
  id: number;

  @IsInt()
  auctionId: number;

  @IsInt()
  userId: number;

  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsDate()
  createdAt: Date;

  constructor(partial: Partial<BidEntity>) {
    Object.assign(this, partial);
  }
}
