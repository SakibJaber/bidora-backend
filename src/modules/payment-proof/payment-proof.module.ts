import { Module } from '@nestjs/common';
import { PaymentProofService } from './payment-proof.service';
import { PaymentProofController } from './payment-proof.controller';
import { CloudinaryModule } from 'src/common/cloudinary/cloudinary.module';
import { DrizzleModule } from 'src/common/database/drizzle.module';

@Module({
  imports: [CloudinaryModule, DrizzleModule],
  controllers: [PaymentProofController],
  providers: [PaymentProofService],
  exports: [PaymentProofService],
})
export class PaymentProofModule {}
