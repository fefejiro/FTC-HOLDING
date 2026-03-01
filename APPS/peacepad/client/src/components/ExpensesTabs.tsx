import { Button } from "@/components/ui/button";

interface ExpensesTabsProps {
  activeTab: "all" | "mine" | "theirs" | "pending" | "settled";
  onTabChange: (tab: "all" | "mine" | "theirs" | "pending" | "settled") => void;
}

export function ExpensesTabs({ activeTab, onTabChange }: ExpensesTabsProps) {
  const tabs = [
    { id: "all", label: "All" },
    { id: "mine", label: "Mine" },
    { id: "theirs", label: "Theirs" },
    { id: "pending", label: "Pending" },
    { id: "settled", label: "Settled" },
  ] as const;

  return (
    <div className="px-4 py-3 flex justify-center overflow-x-auto">
      <div className="inline-flex gap-2 p-2 bg-card rounded-3xl border border-border/50 flex-nowrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-expenses-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
