// src/cron/cron.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentProofModule } from 'src/modules/payment-proof/payment-proof.module';
import { UserModule } from 'src/modules/user/user.module';
import { EmailModule } from '../utils/email/email.module';
import { CronService } from './cron.service';
import { DrizzleModule } from '../database/drizzle.module';
import { BidModule } from 'src/modules/bid/bid.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DrizzleModule,
    PaymentProofModule,
    UserModule,
    BidModule,
    EmailModule,
  ],
  providers: [CronService],
})
export class CronModule {}
