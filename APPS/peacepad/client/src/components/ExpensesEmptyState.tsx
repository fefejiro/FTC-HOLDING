import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

interface ExpensesEmptyStateProps {
  onAddExpense: () => void;
}

export function ExpensesEmptyState({ onAddExpense }: ExpensesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="mb-4 flex justify-center">
          <DollarSign className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-1">No shared costs yet</h2>
        <p className="text-sm text-muted-foreground">
          Add the first item to keep payments clear and reduce follow-up conflict.
        </p>
      </div>

      <div className="w-full">
        <Button
          onClick={onAddExpense}
          size="lg"
          className="w-full"
          data-testid="button-add-first-expense"
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Add First Shared Cost
        </Button>
      </div>
    </div>
  );
}
