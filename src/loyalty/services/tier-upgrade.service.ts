import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { loyaltyConfig } from '../../config/loyalty.config';
import { TierEnum } from '@prisma/client';

@Injectable()
export class TierUpgradeService {
  constructor(private prisma: PrismaService) {}

  async checkAndUpgradeTier(
    tenantId: string,
    customerId: string,
  ): Promise<{ upgraded: boolean; oldTier: TierEnum; newTier: TierEnum }> {
    const account = await this.prisma.loyaltyAccount.findFirst({
      where: { tenantId, customerId },
    });

    if (!account) {
      throw new NotFoundException(`Loyalty account not found for customer ${customerId} and tenant ${tenantId}`);
    }

    const oldTier = account.tier;
    const newTier = await this.calculateTier(tenantId, account.tierQualifyingPoints);

    if (newTier !== oldTier) {
      // Upgrade tier
      await this.prisma.loyaltyAccount.update({
        where: { loyaltyAccountId: account.loyaltyAccountId },
        data: {
          tier: newTier,
          tierDate: new Date(),
        },
      });

      return { upgraded: true, oldTier, newTier };
    }

    return { upgraded: false, oldTier, newTier };
  }

  private async calculateTier(tenantId: string, tierQualifyingPoints: number): Promise<TierEnum> {
    // Try to get tiers from database first
    const tiers = await this.prisma.loyaltyTier.findMany({
      where: { tenantId },
      orderBy: { minPoints: 'desc' }, // Highest threshold first
    });

    if (tiers.length > 0) {
      // Use database tiers - find the highest tier the customer qualifies for
      for (const tier of tiers) {
        if (tierQualifyingPoints >= tier.minPoints) {
          return tier.tierName;
        }
      }
      // If no tier matches, return BRONZE (lowest tier)
      return TierEnum.BRONZE;
    }

    // Fallback to config if no tiers in database (backward compatibility)
    if (tierQualifyingPoints >= loyaltyConfig.tierThresholds.PLATINUM) {
      return TierEnum.PLATINUM;
    }
    if (tierQualifyingPoints >= loyaltyConfig.tierThresholds.GOLD) {
      return TierEnum.GOLD;
    }
    if (tierQualifyingPoints >= loyaltyConfig.tierThresholds.SILVER) {
      return TierEnum.SILVER;
    }
    return TierEnum.BRONZE;
  }
}