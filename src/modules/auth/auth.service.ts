import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { users } from 'src/common/database/schema';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { DRIZZLE } from 'src/common/database/drizzle.module';
import { DrizzleDB } from 'src/common/database/types/drizzle';
import { RegisterDto } from './dto/register.dto';

type User = typeof users.$inferSelect;
// type CreateUser = typeof users.$inferInsert;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private readonly logger = new Logger(AuthService.name);

  async register(dto: RegisterDto) {
    const hash = await bcrypt.hash(dto.password, 10);

    const [user] = await this.db
      .insert(users)
      .values({ ...dto, password: hash } as User)
      .returning();

    const tokens = await this.getTokens(user.id);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.getTokens(user.id);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user, ...tokens };
  }

  async logout(userId: number) {
    await this.db
      .update(users)
      .set({ refreshToken: null } as Partial<User>)
      .where(eq(users.id, userId));
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.refreshToken)
      throw new ForbiddenException('Access Denied');

    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isMatch) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.id);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
    });

    if (!user) throw new NotFoundException('User not found');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.db
      .update(users)
      .set({ password: hashed })
      .where(eq(users.email, dto.email));

    return { message: 'Password reset successful' };
  }

  private async getTokens(userId: number) {
    const payload = { sub: userId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: number, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);

    await this.db
      .update(users)
      .set({ refreshToken: hash } as Partial<User>)
      .where(eq(users.id, userId));
  }
}
