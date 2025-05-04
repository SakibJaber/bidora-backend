import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsISO8601,
  IsDate,
} from 'class-validator';
import * as dayjs from 'dayjs';
import * as customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

export class CreateAuctionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  startingBid: number;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsEnum(['New', 'Used'])
  condition: 'New' | 'Used';

  @IsNumber()
  @Type(() => Number)
  currentBid: number;

  @IsNotEmpty()
  @Transform(({ value }) => {
    // Parse and convert string to Date using dayjs
    const date = dayjs(value, 'DD/MM/YYYY HH:mm:ss', true); // true for strict parsing
    if (date.isValid()) {
      return date.toDate();
    }
    return value; // return the original value if parsing fails
  })
  @IsDate()
  startTime: Date;

  @IsNotEmpty()
  @Transform(({ value }) => {
    const date = dayjs(value, 'DD/MM/YYYY HH:mm:ss', true);
    if (date.isValid()) {
      return date.toDate();
    }
    return value;
  })
  @IsDate()
  endTime: Date;

  @IsString()
  @IsNotEmpty()
  imagePublicId: string;

  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @IsNumber()
  @IsOptional()
  highestBidderId?: number;

  @IsNotEmpty()
  @IsOptional()
  commissionCalculated: boolean;
}
