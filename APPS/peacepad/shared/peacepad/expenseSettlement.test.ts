import { describe, expect, it } from "vitest";
import {
  getExpenseErrorMessage,
  getExpenseSettlementSummary,
  validateSettlementAmount,
} from "./expenseSettlement";

describe("expense settlement helpers", () => {
  it("computes remaining balance from owed and paid amounts", () => {
    const summary = getExpenseSettlementSummary({
      amount: "90.00",
      userOwedAmount: "54.00",
      userPaidAmount: "18.00",
    });

    expect(summary.userOwed).toBe(54);
    expect(summary.userPaid).toBe(18);
    expect(summary.remaining).toBe(36);
    expect(summary.canSettle).toBe(true);
    expect(summary.suggestedAmount).toBe("36.00");
  });

  it("blocks settlements once the share is already paid", () => {
    const summary = getExpenseSettlementSummary({
      amount: "90.00",
      userOwedAmount: "54.00",
      userPaidAmount: "54.00",
    });

    expect(summary.canSettle).toBe(false);
    expect(validateSettlementAmount("10", summary)).toEqual({
      isValid: false,
      normalizedAmount: "0.00",
      reason: "Your share is already settled.",
    });
  });

  it("supports backend settlement fields when payment already exceeds the share", () => {
    const summary = getExpenseSettlementSummary({
      amount: "90.00",
      owedAmount: "54.00",
      alreadyPaid: "90.00",
    });

    expect(summary.canSettle).toBe(false);
    expect(summary.remaining).toBe(0);
    expect(validateSettlementAmount("54", summary)).toEqual({
      isValid: false,
      normalizedAmount: "0.00",
      reason: "Your share is already settled.",
    });
  });

  it("rejects amounts above the remaining balance", () => {
    const summary = getExpenseSettlementSummary({
      amount: "90.00",
      userOwedAmount: "54.00",
      userPaidAmount: "20.00",
    });

    expect(validateSettlementAmount("50", summary)).toEqual({
      isValid: false,
      normalizedAmount: "50.00",
      reason: "You can only settle up to $34.00.",
    });
  });

  it("extracts human-friendly API messages", () => {
    const error = new Error('400: {"message":"You have already paid your share of this expense"}');
    expect(getExpenseErrorMessage(error)).toBe("You have already paid your share of this expense");
  });
});
