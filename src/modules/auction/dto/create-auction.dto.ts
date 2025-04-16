import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

export class CreateAuctionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  startingBid: number;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsEnum(['New', 'Used'], { message: 'Condition must be either New or Used' })
  condition: 'New' | 'Used';

  @IsString()
  imagePublicId: string;

  @IsString()
  imageUrl: string;

  @IsNumber()
  createdBy: number;
}
