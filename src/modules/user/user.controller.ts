import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import * as multer from 'multer';
import { UserProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';

@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.getAllUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Get('leaderboard')
  async fetchLeaderboard(@Query('limit') limit: string) {
    const parsedLimit = parseInt(limit, 10);
    const max = isNaN(parsedLimit) ? 10 : parsedLimit;
    return this.userService.fetchLeaderboard(max);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserById(id);
  }

  @Put(':id/profile')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.memoryStorage(),
    }),
  )
  async updateProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UserProfileDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.userService.updateUserProfile(id, dto, image);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.userService.deleteUser(id);
  }
}
