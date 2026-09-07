import type { ExpenseSplit, FamilyExpense } from "../domain/parentCore";
import type { EntityId } from "../domain/v2";

export type ExpenseSplitMode = "equal" | "other-parent" | "private";
export type ExpenseFilter = "all" | FamilyExpense["status"];

export function parseExpenseAmount(value: string): number | null {
  const normalized = value.trim().replace(/,/g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const minor = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

export function buildExpenseSplits(actorIdentityId: EntityId, otherParentIdentityId: EntityId | undefined, mode: ExpenseSplitMode): readonly ExpenseSplit[] {
  if (!otherParentIdentityId || mode === "private") return [{ identityId: actorIdentityId, shareType: "percentage", shareValue: 100 }];
  if (mode === "other-parent") return [
    { identityId: actorIdentityId, shareType: "percentage", shareValue: 0 },
    { identityId: otherParentIdentityId, shareType: "percentage", shareValue: 100 }
  ];
  return [
    { identityId: actorIdentityId, shareType: "percentage", shareValue: 50 },
    { identityId: otherParentIdentityId, shareType: "percentage", shareValue: 50 }
  ];
}

export function filterExpenses(expenses: readonly FamilyExpense[], filter: ExpenseFilter): readonly FamilyExpense[] {
  return filter === "all" ? expenses : expenses.filter((expense) => expense.status === filter);
}

export function settlementShareMinor(expense: FamilyExpense, identityId: EntityId): number {
  const split = expense.splits.find((item) => item.identityId === identityId);
  if (!split) return 0;
  return split.shareType === "fixed" ? split.shareValue : Math.round(expense.amountMinor * (split.shareValue / 100));
}
