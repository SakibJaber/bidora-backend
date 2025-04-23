import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt/jwt.strategy';
import { RefreshStrategy } from './jwt/refresh.strategy';
import { UserService } from '../user/user.service';
import { ConfigModule } from '@nestjs/config';
import { DrizzleModule } from 'src/common/database/drizzle.module';

@Module({
  imports: [
    ConfigModule,
    DrizzleModule,
    JwtModule.register({
      global: true,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, JwtStrategy, RefreshStrategy],
})
export class AuthModule {}
