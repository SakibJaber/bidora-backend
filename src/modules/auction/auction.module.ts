import { Module } from '@nestjs/common';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';
import { DrizzleModule } from 'src/common/database/drizzle.module';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';

@Module({
  imports: [DrizzleModule, ],
  controllers: [AuctionController],
  providers: [AuctionService, CloudinaryService, ],
})
export class AuctionModule {}
