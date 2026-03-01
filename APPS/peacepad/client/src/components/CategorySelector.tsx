import { ShoppingBag, Stethoscope, BookOpen, Activity, UtensilsCrossed, Shirt, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CategorySelectorProps {
  value: string;
  onChange: (category: string) => void;
}

const categories = [
  { id: "childcare", label: "Childcare", icon: ShoppingBag, color: "bg-blue-500/20 text-blue-700 dark:text-blue-400" },
  { id: "medical", label: "Medical", icon: Stethoscope, color: "bg-red-500/20 text-red-700 dark:text-red-400" },
  { id: "education", label: "Education", icon: BookOpen, color: "bg-purple-500/20 text-purple-700 dark:text-purple-400" },
  { id: "activities", label: "Activities", icon: Activity, color: "bg-green-500/20 text-green-700 dark:text-green-400" },
  { id: "food", label: "Food", icon: UtensilsCrossed, color: "bg-orange-500/20 text-orange-700 dark:text-orange-400" },
  { id: "clothing", label: "Clothing", icon: Shirt, color: "bg-pink-500/20 text-pink-700 dark:text-pink-400" },
  { id: "other", label: "Other", icon: HelpCircle, color: "bg-gray-500/20 text-gray-700 dark:text-gray-400" },
];

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Category</label>
      <div className="grid grid-cols-4 gap-2">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          const isSelected = value === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onChange(cat.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all ${
                isSelected
                  ? `${cat.color} ring-2 ring-offset-2 ring-primary`
                  : `bg-card border border-border hover:border-primary/50`
              }`}
              data-testid={`category-${cat.id}`}
              type="button"
            >
              <IconComponent className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium text-center truncate">{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
