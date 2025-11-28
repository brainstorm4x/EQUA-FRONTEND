# EQUA Token Price Appreciation Logic

This document describes the five-phase price appreciation model used by EQUA Token.

## Overview

EQUA uses a transaction-based price appreciation model that rewards early adopters while ensuring sustainable long-term growth. The price of EQUA increases based on the total number of transactions conducted on the network.

## Five-Phase Model

### Phase 1: Initial Growth ($0.01 to $1)

- **Price Range**: $0.01 to $1
- **Transactions per Epoch**: 1 transaction
- **Growth Rate**: 0.1% per epoch (compounded)
- **Formula**: `Price = $0.01 × (1.001)^epoch`
- **Duration**: ~4,605 transactions

**Why This Mechanism?**
- Every single transaction counts and grows the price
- Rapid appreciation rewards the earliest believers
- Easy to understand: 1 transaction = 1 price increase

### Phase 2: Early Scaling ($1 to $10)

- **Price Range**: $1 to $10
- **Transactions per Epoch**: 10 transactions
- **Growth Rate**: 0.1% per epoch (compounded)
- **Formula**: `Price = $1 × (1.001)^epoch`
- **Duration**: ~23,030 additional transactions

**Why This Mechanism?**
- Growth rate stays strong but epochs are larger
- Network is gaining momentum
- Still rewarding early participants

### Phase 3: Network Growth ($10 to $100)

- **Price Range**: $10 to $100
- **Transactions per Epoch**: 100 transactions
- **Growth Rate**: 0.1% per epoch (compounded)
- **Formula**: `Price = $10 × (1.001)^epoch`
- **Duration**: ~230,300 additional transactions

**Why This Mechanism?**
- Network is becoming established
- Larger epoch sizes reflect growing transaction volume
- Compounding continues to reward holders

### Phase 4: Mature Scaling ($100 to $200,000)

- **Price Range**: $100 to $200,000
- **Transactions per Epoch**: 1,000 transactions
- **Growth Rate**: 0.01% per epoch (compounded)
- **Formula**: `Price = $100 × (1.0001)^epoch`
- **Duration**: ~76,012,000 additional transactions

**Why This Mechanism?**
- Slower growth rate prevents runaway appreciation
- Larger epochs reflect mature network activity
- Compounding continues but at a sustainable pace

### Phase 5: Perpetual Sustainable Growth ($200,000+)

- **Price Range**: $200,000+
- **Transactions per Epoch**: 1,000 transactions
- **Growth Rate**: $100 per epoch (0.05% of $200,000, linear)
- **Formula**: `Price = $200,000 + ($100 × epochs_after_transition)`
- **Monthly Cap**: Maximum $25,000 price increase per month

**Why This Mechanism?**
- Compounding stops to prevent unsustainable exponential growth
- Linear growth ($100 per 1,000 transactions) provides steady appreciation
- The $25,000/month cap prevents runaway price increases
- Approximately 12% annual appreciation at high transaction volumes

## Phase Comparison

| Phase | Tx per Epoch | Growth per Epoch | Price Range | Type |
|-------|--------------|------------------|-------------|------|
| 1 | 1 | 0.1% | $0.01 → $1 | Compound |
| 2 | 10 | 0.1% | $1 → $10 | Compound |
| 3 | 100 | 0.1% | $10 → $100 | Compound |
| 4 | 1,000 | 0.01% | $100 → $200,000 | Compound |
| 5 | 1,000 | $100 | $200,000 → ∞ | Linear |

## Example Scenarios

### Scenario 1: Very Early Believer (First 100 transactions)
- Purchases EQUA at ~$0.01
- After Phase 1: Value appreciation of 100x
- After Phase 4: Potential appreciation of 20,000,000x

### Scenario 2: Early Adopter (Phase 2 participant)
- Joins when price is $2
- Initial investment has strong growth potential through remaining phases

### Scenario 3: Network Participant (Phase 4)
- Joins during mature phase at $1,000
- Still benefits from steady 0.01% compounding
- Long-term growth to $200,000+ possible

### Scenario 4: Long-term Holder (Phase 5)
- Holds through linear growth phase
- Benefits from consistent $100/epoch additions
- Protected by $25,000/month cap from volatility

## Technical Implementation

The price calculation is implemented in `src/utils/priceCalculator.ts`:

```typescript
import { EquaPriceCalculator } from '@/utils/priceCalculator';

// Get current price
const price = EquaPriceCalculator.calculatePrice(totalTransactions);

// Get current phase
const phase = EquaPriceCalculator.getPhase(totalTransactions);

// Get detailed price info
const info = EquaPriceCalculator.getPriceInfo(totalTransactions);

// Get phase thresholds
const thresholds = EquaPriceCalculator.getPhaseThresholds();
```

## Transaction Types that Count

The following transactions contribute to price appreciation epochs:
- Sending EQUA tokens between users
- Receiving EQUA tokens
- Any on-chain EQUA transfer

Note: Minting new EQUA does not count as a transaction for price appreciation purposes.

## Monthly Cap Enforcement

In Phase 5, the $25,000/month cap works as follows:
- Maximum of 250 epochs (250 × $100) can apply per month
- This equals approximately 250,000 transactions per month maximum effective
- Additional transactions still occur but don't increase price beyond the cap
- Cap resets at the start of each calendar month

## On-Chain Implementation

The price appreciation logic should be tracked on-chain in the smart contract's global state to ensure consistency and prevent manipulation. The off-chain calculator is for display purposes only.

## Related Documentation

- [EQUA Whitepaper](/whitepaper) - Full project documentation
- [Referral System](./REFERRAL_CODES.md) - How referral codes work
