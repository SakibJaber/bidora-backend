import { Module } from '@nestjs/common';
import { AuctionModule } from './auction/auction.module';

@Module({
  imports: [AuctionModule],
  controllers: [],
  providers: [],
})
export class DomainModule {}
