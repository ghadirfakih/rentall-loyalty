# Design Note: RENTALL Loyalty & Rewards Service

## 1. Data Model Decisions

### 1.1 Multi-Tenant Architecture

The system is designed as a multi-tenant SaaS application where each tenant (rental company) has isolated data. This is achieved through:

- **Tenant ID in all tables**: Every table includes `tenantId` as a required field
- **Composite unique constraints**: `@@unique([tenantId, customerId])` ensures one account per customer per tenant
- **Indexed queries**: All queries filter by `tenantId` first for performance and data isolation

**Rationale**: RENTALL is a SaaS platform serving multiple rental companies. Data isolation is critical for security and compliance.

### 1.2 Three-Tier Data Model

**LoyaltyAccount**: Stores customer account state
- Denormalized balance fields (`currentBalance`, `totalPointsEarned`, `pointsRedeemed`) for fast reads
- `tierQualifyingPoints` separate from `currentBalance` to ensure tier upgrades aren't affected by redemptions
- `accountNumber` auto-generated in format `LOY-YYYY-NNNNN` for human-readable identification

**LoyaltyTransaction**: Immutable transaction log
- All point movements recorded as transactions (audit trail)
- `posted` flag separates transaction creation from balance updates
- `expirationDate` stored at transaction level for precise expiration tracking
- Points stored as integers: positive for EARN, negative for REDEEM

**LoyaltyTier**: Configuration table
- Tenant-specific tier configurations
- `earnMultiplier` allows different multipliers per tenant
- `benefits` stored as JSON for flexibility

### 1.3 Separation of Concerns

- **Account balances** (denormalized): Fast reads, updated via batch posting
- **Transaction log** (source of truth): Complete audit trail
- **Tier configuration**: Separate table allows tenant-specific customization

## 2. Tier Multipliers Implementation

### 2.1 Calculation Flow

Tier multipliers are applied **at calculation time**, not at storage time:

1. **Base Points Calculation**: 
   ```
   basePoints = (rentalDays × pointsPerDay) + floor(milesDriven × pointsPerMile)
   ```

2. **Tier Lookup**: Fetch customer's current tier from `LoyaltyAccount`

3. **Multiplier Application**:
   ```
   finalPoints = floor(basePoints × tierMultiplier)
   ```

4. **Storage**: Store the final points (already multiplied) in the transaction

### 2.2 Multiplier Values

- **BRONZE**: 1.0 (no bonus)
- **SILVER**: 1.25 (25% bonus)
- **GOLD**: 1.5 (50% bonus)
- **PLATINUM**: 2.0 (100% bonus)

### 2.3 Design Decision

Multipliers are applied **before** storing points, not retroactively. This means:
- Points earned at BRONZE tier remain at base value even after tier upgrade
- Only new transactions benefit from higher tier multipliers
- Simpler implementation and predictable behavior

**Alternative Considered**: Applying multipliers retroactively would be complex and could lead to balance inconsistencies.

## 3. Points Expiration Handling

### 3.1 Expiration Date Storage

Each EARN transaction stores its own `expirationDate`:
- Set to `transactionDate + 12 months` when transaction is created
- Stored at transaction level for precise tracking
- Allows different expiration policies per transaction type if needed

### 3.2 Expiration Filtering

When calculating available points for redemption:

```sql
WHERE type = 'EARN'
  AND posted = true
  AND (expirationDate IS NULL OR expirationDate > NOW())
ORDER BY transactionDate ASC
```

**Key Points**:
- Only `posted = true` transactions are considered (batch-posted)
- Expired points are excluded via date comparison
- FIFO ordering ensures oldest non-expired points are consumed first

### 3.3 Expiration Logic

- **EARN transactions**: Always have `expirationDate` set (12 months from earning)
- **REDEEM transactions**: No expiration date (they're deductions)
- **Expired points**: Automatically excluded from available balance calculations
- **No cleanup job needed**: Expired points remain in database but are filtered out in queries

## 4. FIFO Redemption Algorithm

### 4.1 Algorithm Overview

First-In-First-Out (FIFO) ensures the oldest earned points are redeemed first, preventing points from expiring unused.

### 4.2 Implementation Steps

1. **Query Available Points**:
   - Filter: `type = EARN`, `posted = true`, `expirationDate > NOW()`
   - Order: `transactionDate ASC` (oldest first)
   - Result: Ordered list of transactions with available points

2. **Consumption Logic**:
   ```typescript
   let remaining = pointsToRedeem;
   for (const txn of transactions) {
     if (remaining <= 0) break;
     const pointsToUse = Math.min(remaining, txn.points);
     // Consume pointsToUse from txn
     remaining -= pointsToUse;
   }
   ```

3. **Partial Consumption**: If a transaction has more points than needed, only the required amount is consumed, leaving the remainder for future redemptions.

### 4.3 Benefits

- **Prevents Expiration**: Oldest points are used first, reducing expiration risk
- **Fair to Customers**: Points earned earlier are redeemed first
- **Audit Trail**: Each redemption can be traced to specific earning transactions

### 4.4 Edge Cases Handled

- **Insufficient Points**: Validation before redemption creation
- **Partial Transaction Consumption**: Handled gracefully
- **Multiple Transactions**: Automatically spans multiple transactions if needed

## 5. Batch Posting Approach

### 5.1 Two-Phase Transaction Pattern

Transactions are created with `posted = false` and later batch-posted to update account balances. This mirrors accounting systems and provides:

- **Error Recovery**: Can review transactions before posting
- **End-of-Day Reconciliation**: All transactions posted together
- **Audit Trail**: Clear separation between transaction creation and balance updates
- **Consistency**: All balance updates happen atomically

### 5.2 Batch Posting Process

1. **Find Unposted Transactions**:
   ```typescript
   WHERE posted = false
   [AND tenantId = ?] // Optional tenant filter
   ```

2. **Group by Account**:
   - Aggregate points earned/redeemed per account
   - Calculate `tierQualifyingPoints` (only from EARN transactions)

3. **Atomic Update** (using Prisma transaction):
   ```typescript
   await prisma.$transaction(async (tx) => {
     // Update all accounts
     for (account of accounts) {
       await tx.loyaltyAccount.update({
         data: {
           totalPointsEarned: { increment: earned },
           currentBalance: { increment: earned - redeemed },
           pointsRedeemed: { increment: redeemed },
           tierQualifyingPoints: { increment: qualifying },
         }
       });
     }
     
     // Mark all transactions as posted
     await tx.loyaltyTransaction.updateMany({
       where: { transactionId: { in: transactionIds } },
       data: { posted: true, batchId }
     });
   });
   ```

### 5.3 Balance Update Logic

- **totalPointsEarned**: Incremented by sum of EARN transaction points
- **currentBalance**: Incremented by (earned - redeemed)
- **pointsRedeemed**: Incremented by absolute value of REDEEM transaction points
- **tierQualifyingPoints**: Incremented only by EARN transaction points (redemptions don't affect tier)

### 5.4 Benefits

- **Atomicity**: All updates succeed or fail together
- **Performance**: Batch updates are more efficient than individual updates
- **Traceability**: `batchId` links all transactions posted together
- **Flexibility**: Can post all tenants or filter by tenant

## 6. Additional Design Decisions

### 6.1 Account Number Generation

Format: `LOY-YYYY-NNNNN`
- `LOY`: Prefix for loyalty accounts
- `YYYY`: Current year
- `NNNNN`: 5-digit sequential number (padded with zeros)

**Note**: In production, this should use a database sequence or atomic counter to ensure uniqueness across concurrent requests.

### 6.2 Index Strategy

**Composite Indexes** for common query patterns:
- `[tenantId, customerId]`: Account lookups
- `[loyaltyAccountId, transactionDate]`: Transaction history
- `[batchId, posted]`: Batch processing queries
- `[tenantId, type, category, transactionDate]`: Reporting queries

**Partial Indexes** (considered but not implemented):
- Could add `WHERE posted = false` index for faster batch queries
- Could add `WHERE expirationDate > NOW()` index for redemption queries

### 6.3 Error Handling

- **Insufficient Points**: Validated before redemption transaction creation
- **Account Not Found**: Returns 404 with clear error message
- **Duplicate Accounts**: Prevented by unique constraint
- **Invalid Input**: Validated via DTOs using class-validator

### 6.4 Configuration Management

All business rules are configurable via environment variables:
- Points per day/mile
- Expiration months
- Tier thresholds
- Tier multipliers

This allows tenant-specific customization without code changes.

## 7. Trade-offs and Considerations

### 7.1 Denormalized Balances

**Trade-off**: Account balances are stored redundantly (in account table and calculable from transactions)

**Benefits**: Fast reads, simple queries
**Costs**: Must keep balances in sync via batch posting

**Decision**: Acceptable for this use case where reads are frequent and writes are batched.

### 7.2 Batch Posting Requirement

**Trade-off**: Points aren't immediately available after earning

**Benefits**: Consistency, audit trail, error recovery
**Costs**: Slight delay in point availability

**Decision**: Matches accounting patterns and provides better data integrity.

### 7.3 Tier Multiplier Application

**Trade-off**: Multipliers applied at calculation time, not retroactively

**Benefits**: Simple, predictable, no balance recalculations
**Costs**: Customers don't get retroactive bonuses

**Decision**: Standard industry practice - only new transactions benefit from tier upgrades.

## 8. Future Enhancements

If this were a production system, consider:

1. **Real-time Posting Option**: Allow immediate posting for certain transaction types
2. **Point Expiration Cleanup Job**: Periodic job to mark/archive expired points
3. **Tier Downgrade Logic**: Handle tier downgrades if points expire
4. **Transaction Reversal**: Support for reversing posted transactions
5. **Concurrent Redemption Locking**: Prevent double-spending in high-concurrency scenarios
6. **Caching Layer**: Cache account balances for frequently accessed accounts
7. **Event Sourcing**: Consider event sourcing pattern for complete audit trail

---

**Author**: [Ghadir Fakih]  
**Date**: December 2025  
**Version**: 1.0
```

This DESIGN.md covers:
- Data model decisions
- Tier multipliers implementation
- Points expiration handling
- FIFO redemption algorithm
- Batch posting approach
- Trade-offs and considerations


