import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { JwtAuthGuard, JwtRefreshGuard } from 'src/common/guards/jwt.guard';
import { Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.register(dto);

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 15, // 15 minutes
    });

    return { user, refreshToken }; // refreshToken returned for Flutter
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.login(dto);

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 15,
    });

    return { user, accessToken, refreshToken };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(
    @GetUser('sub') userId: number,
    @GetUser('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.refreshTokens(
      userId,
      token,
    );

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 15,
    });

    return { accessToken, refreshToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @GetUser('sub') userId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);

    // Clear cookies
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      // expires: new Date(0),
    });

    return { message: 'Logged out successfully' };
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
