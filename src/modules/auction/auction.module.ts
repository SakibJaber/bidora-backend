import { Module } from '@nestjs/common';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';
import { DrizzleModule } from 'src/common/database/drizzle.module';

@Module({
  imports: [DrizzleModule],
  controllers: [AuctionController],
  providers: [AuctionService],
})
export class AuctionModule {}
