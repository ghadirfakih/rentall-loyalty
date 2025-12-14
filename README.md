# RENTALL Loyalty & Rewards Service

## 🔗 Links

- **GitHub Repository**: [https://github.com/YOUR_USERNAME/rentall-loyalty-service](https://github.com/YOUR_USERNAME/rentall-loyalty-service)
- **Live API**: [https://your-app.railway.app](https://your-app.railway.app) (or your deployment URL)
- **Postman Collection**: See `postman-collection.json` in the root directory

## 📦 Quick Links

- [API Documentation](#-api-endpoints)
- [Testing](#-running-tests)
- [Deployment](#-deployment)

A loyalty and rewards program service for RENTALL, a SaaS platform for car and vehicle rental management. This service allows customers to earn and redeem points, progress through loyalty tiers, and benefit from promotions.

## 🚀 Tech Stack

- **Framework**: NestJS (Node.js + TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Validation**: class-validator, class-transformer
- **Testing**: Jest
- **Language**: TypeScript

## 📋 Features

- ✅ Track multiple point types (NTM, Promotional, CPC)
- ✅ Earn and redeem points
- ✅ Tier system (Bronze, Silver, Gold, Platinum)
- ✅ Points expiration (12 months)
- ✅ Batch processing for transactions
- ✅ FIFO redemption logic
- ✅ Real-time API endpoints

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up database
createdb rentall_loyalty
# Update .env with your DATABASE_URL

# 3. Run migrations
npx prisma migrate dev

# 4. Seed tiers (Choose one method)

## Option A: Using Prisma Seed Script
npx ts-node prisma/seed.ts
## Option B: Manual via pgAdmin/SQL
Insert tier data directly into the `loyalty_tiers` table:

INSERT INTO loyalty_tiers (tenant_id, tier_name, min_points, earn_multiplier, benefits)
VALUES
  ('tenant-001', 'BRONZE', 0, 1.0, '{"description": "BRONZE tier"}'),
  ('tenant-001', 'SILVER', 1000, 1.25, '{"description": "SILVER tier"}'),
  ('tenant-001', 'GOLD', 5000, 1.5, '{"description": "GOLD tier"}'),
  ('tenant-001', 'PLATINUM', 10000, 2.0, '{"description": "PLATINUM tier"}');**Note:** The application will fallback to config values if the `loyalty_tiers` table is empty.

# 5. Start server
npm run start:dev
```

The API will be available at `http://localhost:3000`

## 🗄️ Database Setup

### Prerequisites

- PostgreSQL installed and running
- Node.js 18+ and npm

### Steps

1. **Create a PostgreSQL database:**

```bash
createdb rentall_loyalty
```

Or using PostgreSQL CLI:
```sql
CREATE DATABASE rentall_loyalty;
```

2. **Set up environment variables:**

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/rentall_loyalty?schema=public"
PORT=3000

# Loyalty Configuration
POINTS_PER_DAY=20
POINTS_PER_MILE=0.2
POINTS_EXPIRATION_MONTHS=12

# Tier Thresholds
TIER_BRONZE_MIN=0
TIER_SILVER_MIN=1000
TIER_GOLD_MIN=5000
TIER_PLATINUM_MIN=10000
```

Replace `postgres`, `password`, `localhost`, and `5432` with your PostgreSQL credentials.

3. **Run database migrations:**

```bash
npx prisma migrate dev
```

This will:
- Create all tables (loyalty_accounts, loyalty_transactions, loyalty_tiers)
- Create indexes for performance
- Set up foreign key constraints

4. **Generate Prisma Client:**

```bash
npx prisma generate
```

5. **Seed the database (Important!):**

```bash
npx ts-node prisma/seed.ts
```

This populates the `loyalty_tiers` table with default tiers (BRONZE, SILVER, GOLD, PLATINUM) for your tenant.

## 🏃 Running the Application

### Install Dependencies

```bash
npm install
```

### Development Mode

```bash
npm run start:dev
```

The application will start on `http://localhost:3000` (or the port specified in `.env`).

### Production Mode

```bash
npm run build
npm run start:prod
```

## 🧪 Running Tests

### Unit Tests

```bash
npm run test
```

### Watch Mode

```bash
npm run test:watch
```

### Test Coverage

```bash
npm run test:cov
```

### End-to-End Tests

```bash
npm run test:e2e
```

## 📡 API Endpoints

Base URL: `http://localhost:3000`

### 1. Create Loyalty Account

**POST** `/loyalty/accounts`

**Request:**
```json
{
  "customerId": "customer-123",
  "tenantId": "tenant-001"
}
```

**Response:**
```json
{
  "loyaltyAccountId": "uuid",
  "accountNumber": "LOY-2024-00001",
  "tier": "BRONZE",
  "currentBalance": 0
}
```

### 2. Get Loyalty Account by Customer

**GET** `/loyalty/accounts/:customerId?tenantId=tenant-001`

**Response:**
```json
{
  "loyaltyAccountId": "uuid",
  "tenantId": "tenant-001",
  "customerId": "customer-123",
  "accountNumber": "LOY-2024-00001",
  "tier": "BRONZE",
  "currentBalance": 0,
  "totalPointsEarned": 0,
  "pointsRedeemed": 0,
  "tierQualifyingPoints": 0,
  "joinDate": "2024-12-11T...",
  "transactions": [...]
}
```

### 3. Earn Points

**POST** `/loyalty/earn`

**Request:**
```json
{
  "customerId": "customer-123",
  "tenantId": "tenant-001",
  "rentalId": "rental-456",
  "category": "NTM",
  "points": 150,
  "description": "5 days × 20 points + 250 miles × 0.2"
}
```

**Response:**
```json
{
  "transactionId": "uuid",
  "points": 150,
  "expirationDate": "2025-12-11T..."
}
```

**Note:** Transaction is created with `posted: false`. Run batch-post to update account balances.

### 4. Redeem Points

**POST** `/loyalty/redeem`

**Request:**
```json
{
  "customerId": "customer-123",
  "tenantId": "tenant-001",
  "points": 100,
  "description": "Redeemed for $10 rental discount"
}
```

**Response:**
```json
{
  "transactionId": "uuid",
  "pointsRedeemed": 100,
  "remainingBalance": 50
}
```

**Note:** Requires sufficient posted points. Redeems using FIFO (oldest points first).

### 5. Get Transaction History

**GET** `/loyalty/transactions?customerId=customer-123&tenantId=tenant-001&page=1&limit=20`

**Response:**
```json
{
  "transactions": [
    {
      "transactionId": "uuid",
      "type": "EARN",
      "category": "NTM",
      "points": 150,
      "posted": true,
      "transactionDate": "2024-12-11T...",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

### 6. Calculate Earned Points (NTM)

**POST** `/loyalty/calculate`

**Request:**
```json
{
  "customerId": "customer-123",
  "tenantId": "tenant-001",
  "rentalDuration": 5,
  "milesDriven": 250
}
```

**Response:**
```json
{
  "ntmPoints": 150,
  "promotional": 0,
  "total": 150,
  "calculation": "5 days × 20 = 100 + 250 miles × 0.2 = 50",
  "tierMultiplier": 1.0
}
```

### 7. Check & Apply Tier Upgrade

**POST** `/loyalty/check-tier`

**Request:**
```json
{
  "customerId": "customer-123",
  "tenantId": "tenant-001"
}
```

**Response:**
```json
{
  "upgraded": true,
  "oldTier": "BRONZE",
  "newTier": "SILVER",
  "tierDate": "2024-12-11T..."
}
```

### 8. Batch Post Transactions

**POST** `/loyalty/batch-post`

**Request:**
```json
{
  "tenantId": "tenant-001"
}
```

**Response:**
```json
{
  "postedCount": 3,
  "totalPointsEarned": 450,
  "totalPointsRedeemed": 100,
  "batchId": "BATCH-1765465901356"
}
```

## 🔄 Typical Workflow

1. **Create Account**
   