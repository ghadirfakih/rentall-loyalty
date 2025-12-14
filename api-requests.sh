#!/bin/bash

# Base URL
BASE_URL="http://localhost:3000"

echo "=== RENTALL Loyalty API Test Script ==="
echo ""

# 1. Create Account
echo "1. Creating account..."
curl -X POST "${BASE_URL}/loyalty/accounts" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "tenantId": "tenant-001"
  }'
echo -e "\n"

# 2. Get Account
echo "2. Getting account..."
curl -X GET "${BASE_URL}/loyalty/accounts/customer-123?tenantId=tenant-001"
echo -e "\n"

# 3. Earn Points
echo "3. Earning points..."
curl -X POST "${BASE_URL}/loyalty/earn" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "tenantId": "tenant-001",
    "rentalId": "rental-456",
    "category": "NTM",
    "points": 150,
    "description": "5 days × 20 points + 250 miles × 0.2"
  }'
echo -e "\n"

# 4. Batch Post (IMPORTANT: Post earned points before redeeming)
echo "4. Batch posting transactions..."
curl -X POST "${BASE_URL}/loyalty/batch-post" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-001"
  }'
echo -e "\n"

# 5. Redeem Points
echo "5. Redeeming points..."
curl -X POST "${BASE_URL}/loyalty/redeem" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "tenantId": "tenant-001",
    "points": 100,
    "description": "Redeemed for $10 rental discount"
  }'
echo -e "\n"

# 6. Batch Post Again (Post redemption transaction)
echo "6. Batch posting redemption..."
curl -X POST "${BASE_URL}/loyalty/batch-post" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-001"
  }'
echo -e "\n"

# 7. Get Transactions
echo "7. Getting transaction history..."
curl -X GET "${BASE_URL}/loyalty/transactions?customerId=customer-123&tenantId=tenant-001&page=1&limit=20"
echo -e "\n"

# 8. Calculate Points
echo "8. Calculating points..."
curl -X POST "${BASE_URL}/loyalty/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "tenantId": "tenant-001",
    "rentalDuration": 5,
    "milesDriven": 250
  }'
echo -e "\n"

# 9. Check Tier
echo "9. Checking tier upgrade..."
curl -X POST "${BASE_URL}/loyalty/check-tier" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "tenantId": "tenant-001"
  }'
echo -e "\n"

echo "=== Test Complete ==="