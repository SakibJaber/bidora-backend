import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateBidDto {
  @IsInt()
  auctionId: number;

  @IsInt()
  @Min(1)
  amount: number;
}

export class UpdateBidDto {
  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;
}
