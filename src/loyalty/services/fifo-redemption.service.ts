import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DateUtils } from '../utils/date-utils';
import { TransactionType } from '@prisma/client';

@Injectable()
export class FifoRedemptionService {
  constructor(private prisma: PrismaService) {}

  async getAvailablePoints(
    loyaltyAccountId: string,
  ): Promise<{ totalAvailable: number; transactions: any[] }> {
    // Get all posted EARN transactions that haven't expired
    const now = new Date();
    const transactions = await this.prisma.loyaltyTransaction.findMany({
      where: {
        loyaltyAccountId,
        type: TransactionType.EARN,
        posted: true,
        OR: [
          { expirationDate: null },
          { expirationDate: { gt: now } },
        ],
      },
      orderBy: {
        transactionDate: 'asc', // FIFO: oldest first
      },
    });

    const totalAvailable = transactions.reduce(
      (sum, txn) => sum + txn.points,
      0,
    );

    return { totalAvailable, transactions };
  }

  async calculateRedemptionBreakdown(
    loyaltyAccountId: string,
    pointsToRedeem: number,
  ): Promise<{ transactions: Array<{ id: string; points: number }>; total: number }> {
    const { transactions } = await this.getAvailablePoints(loyaltyAccountId);

    let remaining = pointsToRedeem;
    const breakdown: Array<{ id: string; points: number }> = [];

    for (const txn of transactions) {
      if (remaining <= 0) break;

      const pointsToUse = Math.min(remaining, txn.points);
      breakdown.push({
        id: txn.transactionId,
        points: pointsToUse,
      });
      remaining -= pointsToUse;
    }

    const total = breakdown.reduce((sum, item) => sum + item.points, 0);

    return { transactions: breakdown, total };
  }
}