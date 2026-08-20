# Settlement & Human Approval Service Documentation

## Purpose
Enforces the mandatory Human-in-the-Loop financial settlement workflow, executing MySQL ACID transactions for AI recommendations approval, rejection, and manual accountant overrides.

## Settlement Flow

```
AI Recommendation (status: pending)
              │
              ├──► Human Click [Approve]
              │          │
              │          ▼
              │    MySQL Transaction:
              │    1. Insert into payment_allocations (type: ai_approved)
              │    2. Update repayment_schedules (paid_amount, status)
              │    3. Update payments (status: fully_allocated)
              │    4. Update ai_recommendations (status: approved)
              │    5. Update reconciliation_cases (status: resolved)
              │    6. Insert into audit_logs (action: APPROVE_PAYMENT_ALLOCATION)
              │
              ├──► Human Click [Reject]
              │          │
              │          ▼
              │    Set ai_recommendations.status = 'rejected'
              │    Set reconciliation_cases.status = 'under_review'
              │    Insert audit log (action: REJECT_AI_RECOMMENDATION)
              │
              └──► Human Click [Manual Override]
                         │
                         ▼
                   (Requires override_reason string)
                   MySQL Transaction:
                   1. Insert payment_allocations (type: ai_overridden)
                   2. Update repayment_schedules & payments
                   3. Set ai_recommendations.status = 'overridden'
                   4. Set reconciliation_cases.status = 'resolved'
                   5. Insert audit log (action: OVERRIDE_RECONCILIATION)
```

## Mentor Questions

### Q1. How does the system guarantee financial integrity during payment settlement?
**Answer**: Every settlement action executes inside a single MySQL ACID transaction. If updating `payment_allocations`, `repayment_schedules`, or `payments` fails at any point, the entire operation rolls back, preventing partial or corrupt financial balances.

### Q2. Why is `override_reason` mandatory during manual overrides?
**Answer**: Section 17 & compliance rules require an explicit audit trail explaining why an accountant overrode the AI agent's recommendation for regulatory compliance.
