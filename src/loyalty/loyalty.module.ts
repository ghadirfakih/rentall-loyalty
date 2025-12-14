import { Module } from '@nestjs/common';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PointsCalculationService } from './services/points-calculation.service';
import { FifoRedemptionService } from './services/fifo-redemption.service';
import { TierUpgradeService } from './services/tier-upgrade.service';

@Module({
  imports: [PrismaModule],
  controllers: [LoyaltyController],
  providers: [
    LoyaltyService,
    PointsCalculationService,
    FifoRedemptionService,
    TierUpgradeService,
  ],
})
export class LoyaltyModule {}