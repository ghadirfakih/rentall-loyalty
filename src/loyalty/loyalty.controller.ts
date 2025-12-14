import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    UsePipes,
    ValidationPipe,
  } from '@nestjs/common';
  import { LoyaltyService } from './loyalty.service';
  import { CreateAccountDto } from './dto/create-account.dto';
  import { EarnPointsDto } from './dto/earn-points.dto';
  import { RedeemPointsDto } from './dto/redeem-points.dto';
  import { CalculatePointsDto } from './dto/calculate-points.dto';
  import { CheckTierDto } from './dto/check-tier.dto';
  import { BatchPostDto } from './dto/batch-post.dto';
  
  @Controller('loyalty')
  export class LoyaltyController {
    constructor(private readonly loyaltyService: LoyaltyService) {}
  
    @Post('accounts')
    @UsePipes(new ValidationPipe())
    async createAccount(@Body() dto: CreateAccountDto) {
      return this.loyaltyService.createAccount(dto);
    }
  
    @Get('accounts/:customerId')
    async getAccount(
      @Param('customerId') customerId: string,
      @Query('tenantId') tenantId: string,
    ) {
      return this.loyaltyService.getAccountByCustomer(tenantId, customerId);
    }
  
    @Post('earn')
    @UsePipes(new ValidationPipe())
    async earnPoints(@Body() dto: EarnPointsDto) {
      return this.loyaltyService.earnPoints(dto);
    }
  
    @Post('redeem')
    @UsePipes(new ValidationPipe())
    async redeemPoints(@Body() dto: RedeemPointsDto) {
      return this.loyaltyService.redeemPoints(dto);
    }
  
    @Get('transactions')
    async getTransactions(
      @Query('customerId') customerId: string,
      @Query('tenantId') tenantId: string,
      @Query('page') page?: string,
      @Query('limit') limit?: string,
    ) {
      return this.loyaltyService.getTransactionHistory(
        tenantId,
        customerId,
        parseInt(page || '1', 10),
        parseInt(limit || '20', 10),
      );
    }
  
    @Post('calculate')
    @UsePipes(new ValidationPipe())
    async calculatePoints(@Body() dto: CalculatePointsDto) {
      return this.loyaltyService.calculatePoints(dto);
    }
  
    @Post('check-tier')
    @UsePipes(new ValidationPipe())
    async checkTier(@Body() dto: CheckTierDto) {
      return this.loyaltyService.checkTier(dto);
    }
  
    @Post('batch-post')
    @UsePipes(new ValidationPipe())
    async batchPost(@Body() dto: BatchPostDto) {
      return this.loyaltyService.batchPost(dto);
    }
  }