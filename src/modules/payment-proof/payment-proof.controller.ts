// src/payment-proof/payment-proof.controller.ts
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
  UseInterceptors,
  UploadedFile,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PaymentProofService } from './payment-proof.service';
import {
  CreatePaymentProofDto,
  UpdatePaymentProofDto,
} from './dto/payment-proof.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Role } from 'src/common/utils/enums/role.enum';

@Controller('payment-proofs')
export class PaymentProofController {
  private readonly logger = new Logger(PaymentProofController.name);

  constructor(private readonly paymentProofService: PaymentProofService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  // @UsePipes(new ValidationPipe({ transform: true }))
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.memoryStorage(),
    }),
  )
  async create(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreatePaymentProofDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    this.logger.log(
      `Creating payment proof for user ${userId}, auction ${dto.auctionId}, amount ${dto.amount}`,
    );
    console.log('DTO content:', dto);

    const paymentProof = await this.paymentProofService.createPaymentProof(
      userId,
      dto,
      image,
    );
    return {
      success: true,
      data: paymentProof,
      message:
        'Your proof has been submitted successfully. We will review it and respond to you within 24 hours.',
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Get()
  async findAll(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    const result = await this.paymentProofService.getAllPaymentProofs(
      page,
      limit,
    );
    return {
      data: result.data,
      meta: { total: result.total, page, limit },
      message: 'Payment proofs retrieved successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const paymentProof = await this.paymentProofService.getPaymentProofById(id);
    return {
      data: paymentProof,
      message: 'Payment proof retrieved successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/me')
  async findByUser(@CurrentUser('sub') userId: number) {
    const paymentProofs =
      await this.paymentProofService.getPaymentProofsByUser(userId);
    return {
      data: paymentProofs,
      message: 'User payment proofs retrieved successfully',
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentProofDto,
  ) {
    this.logger.log(`Updating payment proof ${id}`);
    const paymentProof = await this.paymentProofService.updatePaymentProof(
      id,
      dto,
    );
    return {
      data: paymentProof,
      message: 'Payment proof updated successfully',
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Deleting payment proof ${id}`);
    await this.paymentProofService.deletePaymentProof(id);
    return { message: 'Payment proof deleted successfully' };
  }
}
