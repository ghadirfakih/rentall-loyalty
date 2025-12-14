import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { loyaltyConfig } from '../../config/loyalty.config';
import { TierEnum } from "@prisma/client";

@Injectable()
export class PointsCalculationService {
  constructor(private prisma: PrismaService) {}

  async calculateNtmPoints(
    tenantId: string,
    customerId: string,
    rentalDuration: number,
    milesDriven: number,
  ): Promise<{
    basePoints: number;
    tierMultiplier: number;
    finalPoints: number;
    calculation: string;
    tier: TierEnum;
  }> {
    // Get customer's current tier
    const account = await this.prisma.loyaltyAccount.findFirst({
      where: { tenantId, customerId },
    });

    const tier = account?.tier || TierEnum.BRONZE;
    
    // Get multiplier from database table
    const tierConfig = await this.prisma.loyaltyTier.findFirst({
      where: { tenantId, tierName: tier },
    });

    // Use database multiplier if available, otherwise fallback to config
    const multiplier = tierConfig?.earnMultiplier || loyaltyConfig.tierMultipliers[tier];

    // Calculate base points
    const daysPoints = rentalDuration * loyaltyConfig.pointsPerDay;
    const milesPoints = Math.floor(milesDriven * loyaltyConfig.pointsPerMile);
    const basePoints = daysPoints + milesPoints;

    // Apply tier multiplier
    const finalPoints = Math.floor(basePoints * multiplier);

    const calculation = `${rentalDuration} days × ${loyaltyConfig.pointsPerDay} = ${daysPoints} + ${milesDriven} miles × ${loyaltyConfig.pointsPerMile} = ${milesPoints}`;

    return {
      basePoints,
      tierMultiplier: multiplier,
      finalPoints,
      calculation,
      tier,
    };
  }
}