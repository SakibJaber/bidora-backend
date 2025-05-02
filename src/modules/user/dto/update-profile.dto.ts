import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

class BankTransferDto {
  @IsString() bankAccountNumber: string;
  @IsString() bankAccountName: string;
  @IsString() bankName: string;
}

class EasypaisaDto {
  @IsString() easypaisaAccountNumber: string;
}

class PaypalDto {
  @IsEmail() paypalEmail: string;
}

class PaymentMethodsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => BankTransferDto)
  bankTransfer?: BankTransferDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EasypaisaDto)
  easypaisa?: EasypaisaDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaypalDto)
  paypal?: PaypalDto;
}

export class UserProfileDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  @Length(11, 11)
  phone: string;

  @IsString()
  profileImagePublicId: string;

  @IsString()
  profileImageUrl: string;

  // 💡 Only validate this field if the role is NOT 'Bidder'
  @ValidateIf((o) => o.role !== 'Bidder')
  @ValidateNested()
  @Type(() => PaymentMethodsDto)
  paymentMethods?: PaymentMethodsDto;

  @IsOptional()
  @IsString()
  role?: 'Auctioneer' | 'Bidder' | 'Super Admin';
}
