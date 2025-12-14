import { Test, TestingModule } from '@nestjs/testing';
import { FifoRedemptionService } from './fifo-redemption.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

describe('FifoRedemptionService', () => {
  let service: FifoRedemptionService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      loyaltyTransaction: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FifoRedemptionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FifoRedemptionService>(FifoRedemptionService);
    prismaService = module.get(PrismaService);
  });

  describe('getAvailablePoints', () => {
    it('should return only posted EARN transactions', async () => {
      const transactions = [
        {
          transactionId: 'txn-1',
          type: TransactionType.EARN,
          points: 100,
          posted: true,
          expirationDate: null,
          transactionDate: new Date('2024-01-01'),
        },
        {
          transactionId: 'txn-2',
          type: TransactionType.EARN,
          points: 50,
          posted: false, // Not posted, should be excluded
          expirationDate: null,
          transactionDate: new Date('2024-01-02'),
        },
      ];

      jest.spyOn(prismaService.loyaltyTransaction, 'findMany').mockResolvedValue([
        transactions[0],
      ] as any);

      const result = await service.getAvailablePoints('account-123');

      expect(result.totalAvailable).toBe(100);
      expect(prismaService.loyaltyTransaction.findMany).toHaveBeenCalledWith({
        where: {
          loyaltyAccountId: 'account-123',
          type: TransactionType.EARN,
          posted: true,
          OR: [
            { expirationDate: null },
            { expirationDate: { gt: expect.any(Date) } },
          ],
        },
        orderBy: {
          transactionDate: 'asc',
        },
      });
    });

    it('should exclude expired points', async () => {
      const expiredDate = new Date('2023-01-01');
      const futureDate = new Date('2025-12-31');

      const transactions = [
        {
          transactionId: 'txn-1',
          points: 100,
          expirationDate: expiredDate, // Expired
          transactionDate: new Date('2023-01-01'),
        },
        {
          transactionId: 'txn-2',
          points: 50,
          expirationDate: futureDate, // Not expired
          transactionDate: new Date('2024-01-01'),
        },
      ];

      jest.spyOn(prismaService.loyaltyTransaction, 'findMany').mockResolvedValue([
        transactions[1],
      ] as any);

      const result = await service.getAvailablePoints('account-123');

      expect(result.totalAvailable).toBe(50);
    });

    it('should order transactions by date (FIFO)', async () => {
      const transactions = [
        {
          transactionId: 'txn-1',
          points: 100,
          transactionDate: new Date('2024-01-02'), // Newer
        },
        {
          transactionId: 'txn-2',
          points: 50,
          transactionDate: new Date('2024-01-01'), // Older - should be first
        },
      ];

      jest.spyOn(prismaService.loyaltyTransaction, 'findMany').mockResolvedValue(
        transactions as any,
      );

      await service.getAvailablePoints('account-123');

      expect(prismaService.loyaltyTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            transactionDate: 'asc', // Oldest first (FIFO)
          },
        }),
      );
    });
  });

  describe('calculateRedemptionBreakdown', () => {
    it('should consume oldest points first (FIFO)', async () => {
      const transactions = [
        {
          transactionId: 'txn-1',
          points: 100,
          transactionDate: new Date('2024-01-01'), // Oldest
        },
        {
          transactionId: 'txn-2',
          points: 50,
          transactionDate: new Date('2024-01-02'), // Newer
        },
      ];

      jest.spyOn(prismaService.loyaltyTransaction, 'findMany').mockResolvedValue(
        transactions as any,
      );

      const result = await service.calculateRedemptionBreakdown(
        'account-123',
        75, // Redeem 75 points
      );

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].id).toBe('txn-1'); // Oldest first
      expect(result.transactions[0].points).toBe(75);
      expect(result.total).toBe(75);
    });

    it('should consume multiple transactions if needed', async () => {
      const transactions = [
        {
          transactionId: 'txn-1',
          points: 50, // Fully consumed
          transactionDate: new Date('2024-01-01'),
        },
        {
          transactionId: 'txn-2',
          points: 50, // Partially consumed (25)
          transactionDate: new Date('2024-01-02'),
        },
      ];

      jest.spyOn(prismaService.loyaltyTransaction, 'findMany').mockResolvedValue(
        transactions as any,
      );

      const result = await service.calculateRedemptionBreakdown(
        'account-123',
        75, // Redeem 75 points
      );

      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].points).toBe(50); // Full amount
      expect(result.transactions[1].points).toBe(25); // Partial amount
      expect(result.total).toBe(75);
    });

    it('should handle insufficient points', async () => {
      const transactions = [
        {
          transactionId: 'txn-1',
          points: 50,
          transactionDate: new Date('2024-01-01'),
        },
      ];

      jest.spyOn(prismaService.loyaltyTransaction, 'findMany').mockResolvedValue(
        transactions as any,
      );

      const result = await service.calculateRedemptionBreakdown(
        'account-123',
        100, // Try to redeem more than available
      );

      expect(result.total).toBe(50); // Only available amount
      expect(result.transactions[0].points).toBe(50);
    });
  });
});
