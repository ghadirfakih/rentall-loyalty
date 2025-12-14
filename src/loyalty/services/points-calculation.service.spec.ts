import { Test, TestingModule } from '@nestjs/testing';
import { PointsCalculationService } from './points-calculation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TierEnum } from '@prisma/client';
import { loyaltyConfig } from '../../config/loyalty.config';

describe('PointsCalculationService', () => {
  let service: PointsCalculationService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      loyaltyAccount: {
        findFirst: jest.fn(),
      },
      loyaltyTier: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsCalculationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PointsCalculationService>(PointsCalculationService);
    prismaService = module.get(PrismaService);
  });

  describe('calculateNtmPoints', () => {
    it('should calculate base points correctly', async () => {
      jest.spyOn(prismaService.loyaltyAccount, 'findFirst').mockResolvedValue({
        tier: TierEnum.BRONZE,
      } as any);

      // Mock tier config from database
      jest.spyOn(prismaService.loyaltyTier, 'findFirst').mockResolvedValue({
        tierName: TierEnum.BRONZE,
        earnMultiplier: 1.0,
      } as any);

      const result = await service.calculateNtmPoints(
        'tenant-001',
        'customer-123',
        5, // days
        250, // miles
      );

      // Base: (5 × 20) + floor(250 × 0.2) = 100 + 50 = 150
      expect(result.basePoints).toBe(150);
      expect(result.tierMultiplier).toBe(1.0);
      expect(result.finalPoints).toBe(150);
      expect(result.calculation).toContain('5 days × 20');
      expect(result.calculation).toContain('250 miles × 0.2');
    });

    it('should apply BRONZE tier multiplier (1.0)', async () => {
      jest.spyOn(prismaService.loyaltyAccount, 'findFirst').mockResolvedValue({
        tier: TierEnum.BRONZE,
      } as any);

      jest.spyOn(prismaService.loyaltyTier, 'findFirst').mockResolvedValue({
        tierName: TierEnum.BRONZE,
        earnMultiplier: 1.0,
      } as any);

      const result = await service.calculateNtmPoints(
        'tenant-001',
        'customer-123',
        5,
        250,
      );

      expect(result.tierMultiplier).toBe(1.0);
      expect(result.finalPoints).toBe(150);
    });

    it('should apply SILVER tier multiplier (1.25)', async () => {
      jest.spyOn(prismaService.loyaltyAccount, 'findFirst').mockResolvedValue({
        tier: TierEnum.SILVER,
      } as any);

      jest.spyOn(prismaService.loyaltyTier, 'findFirst').mockResolvedValue({
        tierName: TierEnum.SILVER,
        earnMultiplier: 1.25,
      } as any);

      const result = await service.calculateNtmPoints(
        'tenant-001',
        'customer-123',
        5,
        250,
      );

      // 150 × 1.25 = 187.5 → floor = 187
      expect(result.tierMultiplier).toBe(1.25);
      expect(result.finalPoints).toBe(187);
    });

    it('should apply GOLD tier multiplier (1.5)', async () => {
      jest.spyOn(prismaService.loyaltyAccount, 'findFirst').mockResolvedValue({
        tier: TierEnum.GOLD,
      } as any);

      jest.spyOn(prismaService.loyaltyTier, 'findFirst').mockResolvedValue({
        tierName: TierEnum.GOLD,
        earnMultiplier: 1.5,
      } as any);

      const result = await service.calculateNtmPoints(
        'tenant-001',
        'customer-123',
        5,
        250,
      );

      // 150 × 1.5 = 225
      expect(result.tierMultiplier).toBe(1.5);
      expect(result.finalPoints).toBe(225);
    });

    it('should apply PLATINUM tier multiplier (2.0)', async () => {
      jest.spyOn(prismaService.loyaltyAccount, 'findFirst').mockResolvedValue({
        tier: TierEnum.PLATINUM,
      } as any);

      jest.spyOn(prismaService.loyaltyTier, 'findFirst').mockResolvedValue({
        tierName: TierEnum.PLATINUM,
        earnMultiplier: 2.0,
      } as any);

      const result = await service.calculateNtmPoints(
        'tenant-001',
        'customer-123',
        5,
        250,
      );

      // 150 × 2.0 = 300
      expect(result.tierMultiplier).toBe(2.0);
      expect(result.finalPoints).toBe(300);
    });

    it('should default to BRONZE if account not found', async () => {
      jest.spyOn(prismaService.loyaltyAccount, 'findFirst').mockResolvedValue(null);

      // Mock tier config not found (should fallback to config)
      jest.spyOn(prismaService.loyaltyTier, 'findFirst').mockResolvedValue(null);

      const result = await service.calculateNtmPoints(
        'tenant-001',
        'customer-123',
        5,
        250,
      );

      expect(result.tier).toBe(TierEnum.BRONZE);
      expect(result.tierMultiplier).toBe(1.0);
    });

    it('should round down miles points correctly', async () => {
      jest.spyOn(prismaService.loyaltyAccount, 'findFirst').mockResolvedValue({
        tier: TierEnum.BRONZE,
      } as any);

      jest.spyOn(prismaService.loyaltyTier, 'findFirst').mockResolvedValue({
        tierName: TierEnum.BRONZE,
        earnMultiplier: 1.0,
      } as any);

      const result = await service.calculateNtmPoints(
        'tenant-001',
        'customer-123',
        1,
        99, // 99 × 0.2 = 19.8 → floor = 19
      );

      // (1 × 20) + floor(99 × 0.2) = 20 + 19 = 39
      expect(result.basePoints).toBe(39);
    });

    it('should fallback to config if tier not found in database', async () => {
      jest.spyOn(prismaService.loyaltyAccount, 'findFirst').mockResolvedValue({
        tier: TierEnum.SILVER,
      } as any);

      // Mock tier config not found in database (should fallback to config)
      jest.spyOn(prismaService.loyaltyTier, 'findFirst').mockResolvedValue(null);

      const result = await service.calculateNtmPoints(
        'tenant-001',
        'customer-123',
        5,
        250,
      );

      // Should use config multiplier (1.25) as fallback
      expect(result.tierMultiplier).toBe(1.25);
      expect(result.finalPoints).toBe(187);
    });
  });
});
