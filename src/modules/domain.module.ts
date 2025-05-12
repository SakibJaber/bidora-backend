import { Module } from '@nestjs/common';
import { AuctionModule } from './auction/auction.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { BidModule } from './bid/bid.module';
import { PaymentProofModule } from './payment-proof/payment-proof.module';
import { CronModule } from 'src/common/cron/cron.module';

@Module({
  imports: [
    CronModule,
    AuthModule,
    UserModule,
    AuctionModule,
    BidModule,
    PaymentProofModule,
  ],
  controllers: [],
  providers: [],
})
export class DomainModule {}
