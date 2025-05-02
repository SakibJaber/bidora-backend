import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuctionService } from './auction.service';
import * as multer from 'multer';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';

@Controller('auctions')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.memoryStorage(),
    }),
  )
  create(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateAuctionDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.auctionService.createAuction(userId, dto, image);
  }

  @Get()
  findAll() {
    return this.auctionService.getAllAuctions();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auctionService.getAuctionById(id);
  }

  // @Put(':id')
  // update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAuctionDto) {
  //   return this.auctionService.updateAuction(id, dto);
  // }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.auctionService.deleteAuction(id);
  }
}
