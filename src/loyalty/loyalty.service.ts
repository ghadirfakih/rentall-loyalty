import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountNumberGenerator } from './utils/account-number-generator';
import { DateUtils } from './utils/date-utils';
import { PointsCalculationService } from './services/points-calculation.service';
import { FifoRedemptionService } from './services/fifo-redemption.service';
import { TierUpgradeService } from './services/tier-upgrade.service';
import { loyaltyConfig } from '../config/loyalty.config';
import { CreateAccountDto } from './dto/create-account.dto';
import { EarnPointsDto } from './dto/earn-points.dto';
import { RedeemPointsDto } from './dto/redeem-points.dto';
import { CalculatePointsDto } from './dto/calculate-points.dto';
import { CheckTierDto } from './dto/check-tier.dto';
import { BatchPostDto } from './dto/batch-post.dto';
import { TransactionCategory, TransactionType } from '@prisma/client';

@Injectable()
export class LoyaltyService {
  constructor(
    private prisma: PrismaService,
    private pointsCalculation: PointsCalculationService,
    private fifoRedemption: FifoRedemptionService,
    private tierUpgrade: TierUpgradeService,
  ) {}

  async createAccount(dto: CreateAccountDto) {
    // Check if account already exists
    const existing = await this.prisma.loyaltyAccount.findFirst({
      where: {
        tenantId: dto.tenantId,
        customerId: dto.customerId,
      },
    });

    if (existing) {
      throw new BadRequestException('Account already exists for this customer');
    }

    const accountNumber = AccountNumberGenerator.generate();

    const account = await this.prisma.loyaltyAccount.create({
      data: {
        tenantId: dto.tenantId,
        customerId: dto.customerId,
        accountNumber,
        tier: 'BRONZE',
      },
    });

    return {
      loyaltyAccountId: account.loyaltyAccountId,
      accountNumber: account.accountNumber,
      tier: account.tier,
      currentBalance: account.currentBalance,
    };
  }

  async getAccountByCustomer(tenantId: string, customerId: string) {
    const account = await this.prisma.loyaltyAccount.findFirst({
      where: { tenantId, customerId },
      include: {
        transactions: {
          take: 10,
          orderBy: { transactionDate: 'desc' },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  async earnPoints(dto: EarnPointsDto) {
    const account = await this.prisma.loyaltyAccount.findFirst({
      where: {
        tenantId: dto.tenantId,
        customerId: dto.customerId,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const expirationDate = DateUtils.addMonths(
      new Date(),
      loyaltyConfig.expirationMonths,
    );

    const transaction = await this.prisma.loyaltyTransaction.create({
      data: {
        tenantId: dto.tenantId,
        loyaltyAccountId: account.loyaltyAccountId,
        rentalId: dto.rentalId,
        type: TransactionType.EARN,
        category: dto.category,
        points: dto.points,
        description: dto.description,
        expirationDate,
        posted: false,
      },
    });

    return {
      transactionId: transaction.transactionId,
      points: transaction.points,
      expirationDate: transaction.expirationDate,
    };
  }

  async redeemPoints(dto: RedeemPointsDto) {
    const account = await this.prisma.loyaltyAccount.findFirst({
      where: {
        tenantId: dto.tenantId,
        customerId: dto.customerId,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Check available points
    const { totalAvailable } = await this.fifoRedemption.getAvailablePoints(
      account.loyaltyAccountId,
    );

    if (totalAvailable < dto.points) {
      throw new BadRequestException(
        `Insufficient points. Available: ${totalAvailable}, Requested: ${dto.points}`,
      );
    }

    // Create redemption transaction (not posted yet)
    const transaction = await this.prisma.loyaltyTransaction.create({
      data: {
        tenantId: dto.tenantId,
        loyaltyAccountId: account.loyaltyAccountId,
        type: TransactionType.REDEEM,
        category: TransactionCategory.REDEMPTION,
        points: -dto.points, // Negative for redemption
        description: dto.description,
        posted: false,
      },
    });

    return {
      transactionId: transaction.transactionId,
      pointsRedeemed: dto.points,
      remainingBalance: totalAvailable - dto.points,
    };
  }

  async getTransactionHistory(
    tenantId: string,
    customerId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const account = await this.prisma.loyaltyAccount.findFirst({
      where: { tenantId, customerId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({
        where: { loyaltyAccountId: account.loyaltyAccountId },
        skip,
        take: limit,
        orderBy: { transactionDate: 'desc' },
      }),
      this.prisma.loyaltyTransaction.count({
        where: { loyaltyAccountId: account.loyaltyAccountId },
      }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async calculatePoints(dto: CalculatePointsDto) {
    const result = await this.pointsCalculation.calculateNtmPoints(
      dto.tenantId,
      dto.customerId,
      dto.rentalDuration,
      dto.milesDriven,
    );

    return {
      ntmPoints: result.finalPoints,
      promotional: 0,
      total: result.finalPoints,
      calculation: result.calculation,
      tierMultiplier: result.tierMultiplier,
    };
  }

  async checkTier(dto: CheckTierDto) {
    const result = await this.tierUpgrade.checkAndUpgradeTier(
      dto.tenantId,
      dto.customerId,
    );

    const account = await this.prisma.loyaltyAccount.findFirst({
      where: {
        tenantId: dto.tenantId,
        customerId: dto.customerId,
      },
    });

    return {
      upgraded: result.upgraded,
      oldTier: result.oldTier,
      newTier: result.newTier,
      tierDate: account?.tierDate,
    };
  }

  async batchPost(dto: BatchPostDto) {
    const where: any = { posted: false };
    if (dto.tenantId) {
      where.tenantId = dto.tenantId;
    }

    const unpostedTransactions = await this.prisma.loyaltyTransaction.findMany({
      where,
      include: {
        account: true,
      },
    });

    const batchId = dto.batchId || `BATCH-${Date.now()}`;
    let postedCount = 0;
    let totalPointsEarned = 0;
    let totalPointsRedeemed = 0;

    // Group transactions by account for batch updates
    const accountUpdates = new Map<string, {
      pointsEarned: number;
      pointsRedeemed: number;
      tierQualifyingPoints: number;
    }>();

    for (const txn of unpostedTransactions) {
      const accountId = txn.loyaltyAccountId;
      
      if (!accountUpdates.has(accountId)) {
        accountUpdates.set(accountId, {
          pointsEarned: 0,
          pointsRedeemed: 0,
          tierQualifyingPoints: 0,
        });
      }

      const updates = accountUpdates.get(accountId)!;

      if (txn.type === TransactionType.EARN) {
        updates.pointsEarned += txn.points;
        updates.tierQualifyingPoints += txn.points;
        totalPointsEarned += txn.points;
      } else if (txn.type === TransactionType.REDEEM) {
        updates.pointsRedeemed += Math.abs(txn.points);
        totalPointsRedeemed += Math.abs(txn.points);
      }
    }

    // Update accounts and transactions in a transaction
    await this.prisma.$transaction(async (tx) => {
      for (const [accountId, updates] of accountUpdates.entries()) {
        await tx.loyaltyAccount.update({
          where: { loyaltyAccountId: accountId },
          data: {
            totalPointsEarned: { increment: updates.pointsEarned },
            currentBalance: { increment: updates.pointsEarned - updates.pointsRedeemed },
            pointsRedeemed: { increment: updates.pointsRedeemed },
            tierQualifyingPoints: { increment: updates.tierQualifyingPoints },
          },
        });
      }

      await tx.loyaltyTransaction.updateMany({
        where: { transactionId: { in: unpostedTransactions.map(t => t.transactionId) } },
        data: {
          posted: true,
          batchId,
        },
      });
    });

    postedCount = unpostedTransactions.length;

    return {
      postedCount,
      totalPointsEarned,
      totalPointsRedeemed,
      batchId,
    };
  }
}