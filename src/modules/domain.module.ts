import { Module } from '@nestjs/common';
import { AuctionModule } from './auction/auction.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AuthModule,UserModule,AuctionModule],
  controllers: [],
  providers: [],
})
export class DomainModule {}
