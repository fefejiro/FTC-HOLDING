import { ShoppingBag, Stethoscope, BookOpen, Activity, UtensilsCrossed, Shirt, MoreHorizontal, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ExpenseListItemProps {
  description: string;
  category: string;
  amount: number;
  status: "pending" | "paid" | "settled";
  userOwed?: number;
  userPaid?: number;
  percentage?: string;
  onMoreClick?: () => void;
}

const categoryIcons: Record<string, any> = {
  childcare: ShoppingBag,
  medical: Stethoscope,
  education: BookOpen,
  activities: Activity,
  food: UtensilsCrossed,
  clothing: Shirt,
  other: DollarSign,
};

const categoryColors: Record<string, string> = {
  childcare: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  medical: "bg-red-500/20 text-red-700 dark:text-red-400",
  education: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  activities: "bg-green-500/20 text-green-700 dark:text-green-400",
  food: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  clothing: "bg-pink-500/20 text-pink-700 dark:text-pink-400",
  other: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
};

export function ExpenseListItem({
  description,
  category,
  amount,
  status,
  userOwed,
  userPaid,
  percentage,
  onMoreClick,
}: ExpenseListItemProps) {
  const IconComponent = categoryIcons[category] || categoryIcons.other;
  const iconColor = categoryColors[category] || categoryColors.other;
  
  const statusConfig = {
    pending: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
    paid: "bg-green-500/20 text-green-700 dark:text-green-400",
    settled: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  };

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-muted/30 rounded-lg transition-colors group">
      {/* Category Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconColor}`}>
        <IconComponent className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-foreground text-sm truncate">{description}</h4>
          <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{category}</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className={`text-xs capitalize flex-shrink-0 ${statusConfig[status]}`}>
            {status}
          </Badge>
          {percentage && <span>Split: {percentage}%</span>}
        </div>
      </div>

      {/* Amount and Status */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <p className="font-bold text-foreground text-sm">${amount.toFixed(2)}</p>
        {userOwed !== undefined && userPaid !== undefined && (
          <p className="text-xs text-muted-foreground">
            {userOwed > userPaid ? `$${(userOwed - userPaid).toFixed(2)} left` : "Settled"}
          </p>
        )}
      </div>

      {/* More Button (hidden by default, visible on hover) */}
      {onMoreClick && (
        <Button
          size="icon"
          variant="ghost"
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={onMoreClick}
          data-testid="button-expense-more"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
