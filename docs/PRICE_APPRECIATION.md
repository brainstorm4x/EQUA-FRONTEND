# EQUA Token Price Appreciation Logic

This document describes the three-phase price appreciation model used by EQUA Token.

## Overview

EQUA uses a transaction-based price appreciation model that rewards early adopters while ensuring sustainable long-term growth. The price of EQUA increases based on the total number of transactions conducted on the network.

## Three-Phase Model

### Phase 1: Early Growth (Building Foundation)

- **Price Range**: $0.01 to $100
- **Transactions per Epoch**: 100
- **Growth Rate**: 0.1% per epoch (compounded)
- **Formula**: `Price = $0.01 × (1.001)^epoch`
- **Duration**: ~921,500 transactions (approximately 9,215 epochs)

**Why This Mechanism?**
- Early network builders take genuine risk; rapid appreciation rewards this commitment
- Frequent small increases (every 100 transactions) mean appreciation is steady and visible
- Compounding creates powerful incentives for early adoption

### Phase 2: Scaling Growth

- **Price Range**: $100 to $200,000
- **Transactions per Epoch**: 1,000
- **Growth Rate**: 0.01% per epoch (compounded)
- **Formula**: `Price = $100 × (1.0001)^epoch`
- **Duration**: ~76 million additional transactions

**Why This Mechanism?**
- As the network scales, 0.01% per 1,000 transactions provides steady, predictable growth
- Compounding continues but at a slower rate, preventing explosive volatility
- The rhythm is slower (1,000 transactions vs. 100) because the network is larger and more stable

### Phase 3: Perpetual Sustainable Growth

- **Price Range**: $200,000+
- **Transactions per Epoch**: 1,000
- **Growth Rate**: $100 per epoch (linear, not compounded)
- **Formula**: `Price = $200,000 + ($100 × epochs_after_transition)`
- **Monthly Cap**: Maximum $25,000 price increase per month

**Why This Mechanism?**
- At extreme valuations ($200k+), compounding becomes mathematically unsustainable
- Linear growth ($100 per 1,000 transactions) is still powerful: approximately 12% annual appreciation
- The $25,000/month cap prevents runaway price increases while ensuring steady, predictable growth

## Phase Comparison

| Aspect | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|
| **Tx per Epoch** | 100 | 1,000 | 1,000 |
| **Growth per Epoch** | 0.1% (compound) | 0.01% (compound) | $100 (linear) |
| **Price Range** | $0.01 → $100 | $100 → $200,000 | $200,000 → ∞ |
| **Characteristic** | Rapid early reward | Steady scaling | Stable perpetual growth |
| **Best for** | Early believers | Growing network | Long-term holders |

## Example Scenarios

### Scenario 1: The Earliest Believer (Joins at Epoch 0)
- Holds 10,000 EQUA purchased at $0.01
- Initial investment: $100
- At Phase 1 end: Holdings worth $1,000,000
- At Phase 2 end: Holdings worth $2,000,000,000

### Scenario 2: The Early Network Builder (Joins mid-Phase 1)
- Joins when price is $1, holds 1,000 EQUA
- Initial investment: $1,000
- At Phase 1 end: Holdings worth $100,000
- At Phase 2 end: Holdings worth $200,000,000

### Scenario 3: The Phase 2 Participant
- Holds 100 EQUA purchased at $1,000
- Initial investment: $100,000
- At Phase 2 end: Holdings worth $20,000,000
- Year 2 of Phase 3: Holdings worth $50,000,000

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
```

## On-Chain Implementation

Note: The price appreciation logic is calculated off-chain for display purposes. The actual price should be tracked on-chain in the smart contract's global state to ensure consistency and prevent manipulation.

## Related Documentation

- [EQUA Whitepaper](/whitepaper) - Full project documentation
- [Referral System](./REFERRAL_CODES.md) - How referral codes work
