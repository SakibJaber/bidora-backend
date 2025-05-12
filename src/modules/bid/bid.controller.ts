import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  ParseIntPipe,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { BidService } from './bid.service';
import { CreateBidDto, UpdateBidDto } from './dto/bid.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/utils/enums/role.enum';
import { BidEntity } from './entities/bid.entity';

@Controller('bids')
export class BidController {
  private readonly logger = new Logger(BidController.name);

  constructor(private readonly bidService: BidService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BIDDER)
  @Post()
  async placeBid(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateBidDto,
  ) {
    this.logger.log(
      `Creating bid for user ${userId} on auction ${dto.auctionId}`,
    );
    const bid = await this.bidService.placeBid(userId, dto);
    return { data: bid, message: 'Bid created successfully' };
  }

  @Get()
  async findAll() {
    const bids = await this.bidService.getAllBids();
    return { data: bids, message: 'Bids retrieved successfully' };
  }


  @Get('auction/:auctionId')
  async findByAuction(@Param('auctionId', ParseIntPipe) auctionId: number) {
    const bids = await this.bidService.getBidsByAuction(auctionId);
    return { data: bids, message: 'Auction bids retrieved successfully' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBidDto,
  ) {
    this.logger.log(`Updating bid ${id}`);
    const bid = await this.bidService.updateBid(id, dto);
    return { data: bid, message: 'Bid updated successfully' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Deleting bid ${id}`);
    await this.bidService.deleteBid(id);
    return { message: 'Bid deleted successfully' };
  }
}
