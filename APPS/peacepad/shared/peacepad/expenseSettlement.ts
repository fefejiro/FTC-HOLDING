export interface ExpenseSettlementLike {
  amount?: string | null;
  userOwedAmount?: string | null;
  userPaidAmount?: string | null;
  owedAmount?: string | null;
  alreadyPaid?: string | null;
  userPercentage?: string | null;
}

export interface ExpenseSettlementSummary {
  totalAmount: number;
  userOwed: number;
  userPaid: number;
  remaining: number;
  suggestedAmount: string;
  canSettle: boolean;
  reason: string | null;
}

export interface SettlementAmountValidation {
  isValid: boolean;
  normalizedAmount: string;
  reason: string | null;
}

function roundToCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseCurrencyAmount(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? roundToCurrency(value) : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const sanitized = value.replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? roundToCurrency(parsed) : 0;
}

export function getExpenseSettlementSummary(
  expense: ExpenseSettlementLike | null | undefined,
): ExpenseSettlementSummary {
  const totalAmount = parseCurrencyAmount(expense?.amount);
  const percentage = parseCurrencyAmount(expense?.userPercentage);
  const calculatedShare =
    expense?.userOwedAmount !== undefined && expense?.userOwedAmount !== null
      ? expense.userOwedAmount
      : expense?.owedAmount !== undefined && expense?.owedAmount !== null
        ? expense.owedAmount
      : percentage > 0
        ? ((totalAmount * percentage) / 100).toFixed(2)
        : expense?.amount;
  const userOwed = parseCurrencyAmount(calculatedShare);
  const userPaid = parseCurrencyAmount(
    expense?.userPaidAmount !== undefined && expense?.userPaidAmount !== null
      ? expense.userPaidAmount
      : expense?.alreadyPaid,
  );
  const remaining = Math.max(0, roundToCurrency(userOwed - userPaid));
  const canSettle = remaining > 0.009;

  return {
    totalAmount,
    userOwed,
    userPaid,
    remaining,
    suggestedAmount: remaining.toFixed(2),
    canSettle,
    reason: canSettle ? null : "Your share is already settled.",
  };
}

export function validateSettlementAmount(
  rawAmount: string | number | null | undefined,
  summary: ExpenseSettlementSummary,
): SettlementAmountValidation {
  if (!summary.canSettle) {
    return {
      isValid: false,
      normalizedAmount: "0.00",
      reason: summary.reason,
    };
  }

  const amount = parseCurrencyAmount(rawAmount);
  if (amount <= 0) {
    return {
      isValid: false,
      normalizedAmount: "0.00",
      reason: "Enter a valid payment amount.",
    };
  }

  if (amount > summary.remaining + 0.009) {
    return {
      isValid: false,
      normalizedAmount: amount.toFixed(2),
      reason: `You can only settle up to $${summary.remaining.toFixed(2)}.`,
    };
  }

  return {
    isValid: true,
    normalizedAmount: amount.toFixed(2),
    reason: null,
  };
}

export function getExpenseErrorMessage(error: unknown, fallback = "Unable to process this payment."): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (!message) {
    return fallback;
  }

  const strippedStatus = message.replace(/^\d{3}:\s*/, "").trim();
  const normalized = strippedStatus || message;

  if (normalized.startsWith("{") && normalized.endsWith("}")) {
    try {
      const parsed = JSON.parse(normalized);
      if (typeof parsed?.message === "string" && parsed.message.trim()) {
        return parsed.message.trim();
      }
    } catch {
      return fallback;
    }
  }

  return normalized;
}
