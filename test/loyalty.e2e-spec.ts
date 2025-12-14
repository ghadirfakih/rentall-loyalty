import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Loyalty E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.loyaltyTransaction.deleteMany({});
    await prisma.loyaltyAccount.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  const tenantId = 'test-tenant';
  const customerId = 'test-customer';

  describe('Full Loyalty Flow', () => {
    it('should create account, earn points, batch post, and redeem', async () => {
      // 1. Create account
      const createResponse = await request(app.getHttpServer())
        .post('/loyalty/accounts')
        .send({
          customerId,
          tenantId,
        })
        .expect(201);

      expect(createResponse.body).toHaveProperty('loyaltyAccountId');
      expect(createResponse.body.tier).toBe('BRONZE');

      // 2. Earn points
      const earnResponse = await request(app.getHttpServer())
        .post('/loyalty/earn')
        .send({
          customerId,
          tenantId,
          category: 'NTM',
          points: 150,
          description: 'Test earning',
        })
        .expect(201);

      expect(earnResponse.body.points).toBe(150);

      // 3. Batch post
      const batchResponse = await request(app.getHttpServer())
        .post('/loyalty/batch-post')
        .send({ tenantId })
        .expect(201);

      expect(batchResponse.body.postedCount).toBeGreaterThan(0);

      // 4. Get account (verify balance updated)
      const accountResponse = await request(app.getHttpServer())
        .get(`/loyalty/accounts/${customerId}?tenantId=${tenantId}`)
        .expect(200);

      expect(accountResponse.body.currentBalance).toBeGreaterThan(0);

      // 5. Redeem points
      const redeemResponse = await request(app.getHttpServer())
        .post('/loyalty/redeem')
        .send({
          customerId,
          tenantId,
          points: 50,
          description: 'Test redemption',
        })
        .expect(201);

      expect(redeemResponse.body.pointsRedeemed).toBe(50);
    });

    it('should reject redemption with insufficient points', async () => {
      // First, create an account for this customer
      await request(app.getHttpServer())
        .post('/loyalty/accounts')
        .send({
          customerId: 'customer-no-points',
          tenantId,
        })
        .expect(201);

      // Now try to redeem more points than available (account has 0 points)
      await request(app.getHttpServer())
        .post('/loyalty/redeem')
        .send({
          customerId: 'customer-no-points',
          tenantId,
          points: 1000,
          description: 'Test insufficient points',
        })
        .expect(400);
    });
  });
});
