-- CreateEnum
CREATE TYPE "TierEnum" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('EARN', 'REDEEM', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('NTM', 'PROMOTIONAL', 'CPC', 'REDEMPTION');

-- CreateTable
CREATE TABLE "loyalty_accounts" (
    "loyalty_account_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "tier" "TierEnum" NOT NULL DEFAULT 'BRONZE',
    "total_points_earned" INTEGER NOT NULL DEFAULT 0,
    "current_balance" INTEGER NOT NULL DEFAULT 0,
    "points_redeemed" INTEGER NOT NULL DEFAULT 0,
    "tier_qualifying_points" INTEGER NOT NULL DEFAULT 0,
    "join_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tier_date" TIMESTAMP(3),
    "expiration_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("loyalty_account_id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "transaction_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "loyalty_account_id" TEXT NOT NULL,
    "rental_id" TEXT,
    "type" "TransactionType" NOT NULL,
    "category" "TransactionCategory" NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiration_date" TIMESTAMP(3),
    "batch_id" TEXT,
    "posted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "loyalty_tiers" (
    "tier_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "tier_name" "TierEnum" NOT NULL,
    "min_points" INTEGER NOT NULL,
    "earn_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "benefits" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_tiers_pkey" PRIMARY KEY ("tier_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_accounts_account_number_key" ON "loyalty_accounts"("account_number");

-- CreateIndex
CREATE INDEX "loyalty_accounts_tenant_id_idx" ON "loyalty_accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "loyalty_accounts_customer_id_idx" ON "loyalty_accounts"("customer_id");

-- CreateIndex
CREATE INDEX "loyalty_accounts_tier_idx" ON "loyalty_accounts"("tier");

-- CreateIndex
CREATE INDEX "loyalty_transactions_tenant_id_idx" ON "loyalty_transactions"("tenant_id");

-- CreateIndex
CREATE INDEX "loyalty_transactions_loyalty_account_id_idx" ON "loyalty_transactions"("loyalty_account_id");

-- CreateIndex
CREATE INDEX "loyalty_transactions_transaction_date_idx" ON "loyalty_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "loyalty_transactions_posted_idx" ON "loyalty_transactions"("posted");

-- CreateIndex
CREATE INDEX "loyalty_tiers_tenant_id_idx" ON "loyalty_tiers"("tenant_id");

-- CreateIndex
CREATE INDEX "loyalty_tiers_tier_name_idx" ON "loyalty_tiers"("tier_name");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_tiers_tenant_id_tier_name_key" ON "loyalty_tiers"("tenant_id", "tier_name");
