import { Test, TestingModule } from '@nestjs/testing';
import { TierUpgradeService } from './tier-upgrade.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TierEnum } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('TierUpgradeService', () => {
  let service: TierUpgradeService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      loyaltyAccount: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      loyaltyTier: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TierUpgradeService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TierUpgradeService>(TierUpgradeService);
    prismaService = module.get(PrismaService);
  });

  describe('checkAndUpgradeTier', () => {
    it('should not upgrade if points below SILVER threshold', async () => {
      const account = {
        loyaltyAccountId: 'account-123',
        tier: TierEnum.BRONZE,
        tierQualifyingPoints: 500,
      };

      // Mock tiers from database
      jest.spyOn(prismaService.loyaltyTier, 'findMany').mockResolvedValue([
        { tierName: TierEnum.PLATINUM, minPoints: 10000 },
        { tierName: TierEnum.GOLD, minPoints: 5000 },
        { tierName: TierEnum.SILVER, minPoints: 1000 },
        { tierName: TierEnum.BRONZE, minPoints: 0 },
      ] as any);

      jest.spyOn(prismaService.loyaltyAccount, 'findFirst').mockResolvedValue(account as any);

      const result = await service.checkAndUpgradeTier('tenant-001', 'customer-123');

      expect(result.upgraded).toBe(false);
      expect(result.oldTier).toBe(TierEnum.BRONZE);
      expect(result.newTier).toBe(TierEnum.BRONZE);
      expect(prismaService.loyaltyAccount.update).not.toHaveBeenCalled();
    });

    it('should upgrade to SILVER when threshold reached', async () => {
      const account = {
        loyaltyAccountId: 'account-123',
        tier: TierEnum.BRONZE,
        tierQualifyingPoints: 1000,
      };

      // Mock tiers from database
      jest.spyOn(prismaService.loyaltyTier, 'findMany').mockResolvedValue([
        { tierName: TierEnum.PLATINUM, minPoints: 10000 },
        { tierName: TierEnum.GOLD, minPoints: 5000 },
        { tierName: TierEnum.SILVER, minPoints: 1000 },
        { tierName: TierEnum.BRONZE, minPoints: 0 },
      ] as any);

      jest.spyOn(prismaService.loyaltyAccount, 'findFirst').mockResolvedValue(account as any);
      jest.spyOn(prismaService.loyaltyAccount, 'update').mockResolvedValue({
        ...account,
        tier: TierEnum.SILVER,
        tierDate: new Date(),
      } as any);

      const result = await service.checkAndUpgradeTier('tenant-001', 'customer-123');

      expect(result.upgraded).toBe(true);
      expect(result.oldTier).toBe(TierEnum.BRONZE);
      expect(result.newTier).toBe(TierEnum.SILVER);
      expect(prismaService.loyaltyAccount.update).toHaveBeenCalledWith({
        where: { loyaltyAccountId: 'account-123' },
        data: {
          tier: TierEnum.SILVER,
          tierDate: expect.any(Date),
        },
      });
    });

    it('should upgrade to GOLD when threshold reached', async () => {
      const account = {
        loyaltyAccountId: 'account-123',
        tier: TierEnum.SILVER,
        tierQualifyingPoints: 5000,
      };

      jest.spyOn(prismaService.loyaltyTier, 'findMany').mockResolvedValue([
        { tierName: TierEnum.PLATINUM, minPoints: 10000 },
        { tierName: TierEnum.GOLD, minPoints: 5000 },
        { tierName: TierEnum.SILVER, minPoints: 1000 },
        { tierName: TierEnum.BRONZE, minPoints: 0 },
      ] as any);

      jest.spyOn(prismaService.loyaltyAccount, 'findFirst').mockResolvedValue(account as any);
      jest.spyOn(prismaService.loyaltyAccount, 'update').mockResolvedValue({
        ...account,
        tier: TierEnum.GOLD,
      } as any);

      const result = await service.checkAndUpgradeTier('tenant-001', 'customer-123');

      expect(result.upgraded).toBe(true);
      expect(result.newTier).toBe(TierEnum.GOLD);
    });

    it('should upgrade to PLATINUM when threshold reached', async () => {
      const account = {
        loyaltyAccountId: 'account-123',
        tier: TierEnum.GOLD,
        tierQualifyingPoints: 10000,
      };

      jest.spyOn(prismaService.loyaltyTier, 'findMany').mockResolvedValue([
        { tierName: TierEnum.PLATINUM, minPoints: 10000 },
        { tierName: TierEnum.GOLD, minPoints: 5000 },
        { tierName: TierEnum.SILVER, minPoints: 1000 },
        { tierName: TierEnum.BRONZE, minPoints: 0 },
      ] as any);

      jest.spyOn(prismaService.loyaltyAccount, 'findFirst').mockResolvedValue(account as any);
      jest.spyOn(prismaService.loyaltyAccount, 'update').mockResolvedValue({
        ...account,
        tier: TierEnum.PLATINUM,
      } as any);

      const result = await service.checkAndUpgradeTier('tenant-001', 'customer-123');

      expect(result.upgraded).toBe(true);
      expect(result.newTier).toBe(TierEnum.PLATINUM);
    });

    it('should throw NotFoundException if account not found', async () => {
      jest.spyOn(prismaService.loyaltyAccount, 'findFirst').mockResolvedValue(null);

      await expect(
        service.checkAndUpgradeTier('tenant-001', 'customer-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use tierQualifyingPoints not currentBalance', async () => {
      const account = {
        loyaltyAccountId: 'account-123',
        tier: TierEnum.BRONZE,
        tierQualifyingPoints: 1000, // Should upgrade
        currentBalance: 500, // Should be ignored
      };

      jest.spyOn(prismaService.loyaltyTier, 'findMany').mockResolvedValue([
        { tierName: TierEnum.PLATINUM, minPoints: 10000 },
        { tierName: TierEnum.GOLD, minPoints: 5000 },
        { tierName: TierEnum.SILVER, minPoints: 1000 },
        { tierName: TierEnum.BRONZE, minPoints: 0 },
      ] as any);

      jest.spyOn(prismaService.loyaltyAccount, 'findFirst').mockResolvedValue(account as any);
      jest.spyOn(prismaService.loyaltyAccount, 'update').mockResolvedValue({
        ...account,
        tier: TierEnum.SILVER,
      } as any);

      const result = await service.checkAndUpgradeTier('tenant-001', 'customer-123');

      expect(result.upgraded).toBe(true);
      expect(result.newTier).toBe(TierEnum.SILVER);
    });

    it('should fallback to config if database tiers not found', async () => {
      const account = {
        loyaltyAccountId: 'account-123',
        tier: TierEnum.BRONZE,
        tierQualifyingPoints: 1000,
      };

      // Mock empty database (should fallback to config)
      jest.spyOn(prismaService.loyaltyTier, 'findMany').mockResolvedValue([]);

      jest.spyOn(prismaService.loyaltyAccount, 'findFirst').mockResolvedValue(account as any);
      jest.spyOn(prismaService.loyaltyAccount, 'update').mockResolvedValue({
        ...account,
        tier: TierEnum.SILVER,
      } as any);

      const result = await service.checkAndUpgradeTier('tenant-001', 'customer-123');

      expect(result.upgraded).toBe(true);
      expect(result.newTier).toBe(TierEnum.SILVER);
    });
  });
});
