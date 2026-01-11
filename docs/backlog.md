# Product Backlog

## Story: Customer Retention Cost Service

### Title
**Implement Customer Retention Cost Service behind RetentionCostCalculator Interface**

### Description
As a Commerce Business User, I want to quantify the long-term value of a customer (LTV) so that the Promising Engine can decide when to prioritize "Saving the Sale" over immediate profitability.

We have defined the `RetentionCostCalculator` interface in the Promising Engine:
```typescript
interface RetentionCostCalculator {
  calculateRetentionCost(order: any): Promise<number>;
}
```

This story covers building the *actual implementation* of this interface (and likely a backing microservice).

### Acceptance Criteria
1.  **Inputs**: Order Context (Customer ID, etc).
2.  **Outputs**: Max Allowable Loss (Dollar amount).
3.  **Integration**:
    *   Implement the `RetentionCostCalculator` class.
    *   Connect to Customer Data Platform (CDP) or LTV database.
4.  **Logic**:
    *   If Customer Segment = VIP, return High Threshold.
    *   If Churn Risk = High, return High Threshold.
    *   Otherwise, return Standard/Zero.

### Technical Notes
- The Promising Engine currently uses a Mock implementation in `server.ts`.
- This new service should replace that mock.
