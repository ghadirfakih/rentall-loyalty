/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,customer_id]` on the table `loyalty_accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "loyalty_transactions_transaction_date_idx";

-- CreateIndex
CREATE INDEX "loyalty_accounts_join_date_idx" ON "loyalty_accounts"("join_date" DESC);

-- CreateIndex
CREATE INDEX "loyalty_accounts_tier_date_idx" ON "loyalty_accounts"("tier_date" DESC);

-- CreateIndex
CREATE INDEX "loyalty_accounts_tenant_id_customer_id_idx" ON "loyalty_accounts"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "loyalty_accounts_tenant_id_account_number_idx" ON "loyalty_accounts"("tenant_id", "account_number");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_accounts_tenant_id_customer_id_key" ON "loyalty_accounts"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "loyalty_tiers_tenant_id_tier_name_min_points_idx" ON "loyalty_tiers"("tenant_id", "tier_name", "min_points");

-- CreateIndex
CREATE INDEX "loyalty_transactions_transaction_date_idx" ON "loyalty_transactions"("transaction_date" DESC);

-- CreateIndex
CREATE INDEX "loyalty_transactions_rental_id_idx" ON "loyalty_transactions"("rental_id");

-- CreateIndex
CREATE INDEX "loyalty_transactions_loyalty_account_id_transaction_date_idx" ON "loyalty_transactions"("loyalty_account_id", "transaction_date" DESC);

-- CreateIndex
CREATE INDEX "loyalty_transactions_tenant_id_type_category_transaction_da_idx" ON "loyalty_transactions"("tenant_id", "type", "category", "transaction_date" DESC);

-- CreateIndex
CREATE INDEX "loyalty_transactions_batch_id_posted_idx" ON "loyalty_transactions"("batch_id", "posted");

-- CreateIndex
CREATE INDEX "loyalty_transactions_rental_id_type_idx" ON "loyalty_transactions"("rental_id", "type");
