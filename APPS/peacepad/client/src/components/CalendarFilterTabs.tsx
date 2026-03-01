import { Button } from "@/components/ui/button";

interface CalendarFilterTabsProps {
  activeTab: "all" | "my-events" | "shared" | "birthdays";
  onTabChange: (tab: "all" | "my-events" | "shared" | "birthdays") => void;
}

export function CalendarFilterTabs({ activeTab, onTabChange }: CalendarFilterTabsProps) {
  const tabs = [
    { id: "all", label: "All Events" },
    { id: "my-events", label: "My Events" },
    { id: "shared", label: "Shared" },
    { id: "birthdays", label: "Birthdays" },
  ] as const;

  return (
    <div className="px-4 py-3 flex justify-center overflow-x-auto">
      <div className="inline-flex gap-2 p-2 bg-card rounded-3xl border border-border/50 flex-nowrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as any)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-calendar-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
