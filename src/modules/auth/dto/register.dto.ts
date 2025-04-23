import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(3, 40)
  userName: string;

  @IsString()
  @Length(8)
  password: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  role?: 'Auctioneer' | 'Bidder';
}
