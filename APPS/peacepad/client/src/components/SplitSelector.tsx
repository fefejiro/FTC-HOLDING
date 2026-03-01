import { Button } from "@/components/ui/button";

interface SplitSelectorProps {
  value: string;
  onChange: (percentage: string) => void;
}

const splitOptions = [
  { id: "50", label: "50/50", description: "Equal split" },
  { id: "60", label: "60/40", description: "You pay more" },
  { id: "40", label: "40/60", description: "You pay less" },
  { id: "100", label: "100/0", description: "Full amount" },
];

export function SplitSelector({ value, onChange }: SplitSelectorProps) {
  const partnersShare = 100 - parseInt(value);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Split Payment</label>
        <div className="text-xs text-muted-foreground">
          You: <span className="font-semibold text-foreground">{value}%</span> • Them:{" "}
          <span className="font-semibold text-foreground">{partnersShare}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {splitOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            type="button"
            className={`p-3 rounded-lg border-2 transition-all ${
              value === option.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
            data-testid={`split-${option.id}`}
          >
            <div className="font-semibold text-sm">{option.label}</div>
            <div className="text-xs text-muted-foreground">{option.description}</div>
          </button>
        ))}
      </div>

      {/* Visual split indicator */}
      <div className="flex items-center gap-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${value}%` }} />
        <div className="h-full bg-secondary transition-all" style={{ width: `${partnersShare}%` }} />
      </div>
    </div>
  );
}
