import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, CheckSquare, AlertCircle } from "lucide-react";

interface SharedItemSnapshot {
  title: string;
  subtitle?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

interface SharedItemCardProps {
  itemType: "event" | "expense" | "task";
  content: string;
  isDeleted?: boolean;
  isSender: boolean;
}

export function SharedItemCard({ itemType, content, isDeleted, isSender }: SharedItemCardProps) {
  let snapshot: SharedItemSnapshot | null = null;
  
  try {
    const parsed = JSON.parse(content);
    snapshot = parsed.snapshot || null;
  } catch {
    snapshot = null;
  }

  const getIcon = () => {
    switch (itemType) {
      case "event":
        return <Calendar className="h-4 w-4" />;
      case "expense":
        return <DollarSign className="h-4 w-4" />;
      case "task":
        return <CheckSquare className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTypeLabel = () => {
    switch (itemType) {
      case "event":
        return "Calendar Event";
      case "expense":
        return "Expense";
      case "task":
        return "Task";
      default:
        return "Shared Item";
    }
  };

  const getBadgeVariant = () => {
    switch (itemType) {
      case "event":
        return "secondary";
      case "expense":
        return "outline";
      case "task":
        return "default";
      default:
        return "secondary";
    }
  };

  if (isDeleted || !snapshot) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-dashed">
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground italic">
          {isDeleted ? "This item has been deleted" : "Unable to load shared item"}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={`p-3 rounded-lg border min-w-[200px] max-w-[280px] ${
        isSender 
          ? "bg-white/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600" 
          : "bg-purple-400/20 border-purple-300/50 dark:border-purple-500/30"
      }`}
      data-testid={`shared-item-card-${itemType}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Badge variant={getBadgeVariant()} className="text-xs gap-1">
          {getIcon()}
          {getTypeLabel()}
        </Badge>
      </div>
      
      <h4 className={`font-medium text-sm leading-tight ${
        isSender ? "text-foreground" : "text-white"
      }`}>
        {snapshot.title}
      </h4>
      
      {snapshot.subtitle && (
        <p className={`text-xs mt-1 ${
          isSender ? "text-muted-foreground" : "text-white/80"
        }`}>
          {snapshot.subtitle}
        </p>
      )}
      
      {snapshot.metadata && Object.keys(snapshot.metadata).length > 0 && (
        <div className={`flex flex-wrap gap-1.5 mt-2 pt-2 border-t ${
          isSender ? "border-slate-200 dark:border-slate-600" : "border-purple-300/30"
        }`}>
          {Object.entries(snapshot.metadata).map(([key, value]) => {
            if (value === null || value === undefined || value === "") return null;
            const displayValue = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
            return (
              <span 
                key={key} 
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  isSender 
                    ? "bg-slate-100 dark:bg-slate-700 text-muted-foreground" 
                    : "bg-purple-300/30 text-white/90"
                }`}
              >
                {key}: {displayValue}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
