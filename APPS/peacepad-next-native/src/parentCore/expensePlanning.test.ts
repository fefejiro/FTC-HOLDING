import type { FamilyExpense } from "../domain/parentCore";
import { buildExpenseSplits, filterExpenses, parseExpenseAmount, settlementShareMinor } from "./expensePlanning";

const expense = (status: FamilyExpense["status"]): FamilyExpense => ({
  id: `${status}-id`, version: 1, schemaVersion: "2.0", region: "ca",
  provenance: { createdAt: "2026-08-30T12:00:00.000Z", createdBy: { identityId: "actor", sessionId: "session" }, source: "app" },
  familyCircleId: "family", createdByIdentityId: "actor", childProfileIds: [], title: "School shoes",
  description: null, category: "clothing", amountMinor: 12000, currency: "CAD",
  incurredAt: "2026-08-30T12:00:00.000Z", status,
  splits: [{ identityId: "actor", shareType: "percentage", shareValue: 25 }, { identityId: "other", shareType: "percentage", shareValue: 75 }],
  receiptAttachmentId: null
});

describe("expense planning", () => {
  it("parses currency without accepting ambiguous precision", () => {
    expect(parseExpenseAmount("1,234.50")).toBe(123450);
    expect(parseExpenseAmount("12.345")).toBeNull();
    expect(parseExpenseAmount("free")).toBeNull();
    expect(parseExpenseAmount("0")).toBeNull();
  });

  it("builds private, equal, and full-repayment splits", () => {
    expect(buildExpenseSplits("actor", undefined, "equal")).toEqual([{ identityId: "actor", shareType: "percentage", shareValue: 100 }]);
    expect(buildExpenseSplits("actor", "other", "equal").map((split) => split.shareValue)).toEqual([50, 50]);
    expect(buildExpenseSplits("actor", "other", "other-parent").map((split) => split.shareValue)).toEqual([0, 100]);
  });

  it("filters statuses and calculates a parent's share", () => {
    const values = [expense("open"), expense("settled")];
    expect(filterExpenses(values, "open")).toHaveLength(1);
    expect(filterExpenses(values, "all")).toHaveLength(2);
    expect(settlementShareMinor(values[0], "other")).toBe(9000);
  });
});
