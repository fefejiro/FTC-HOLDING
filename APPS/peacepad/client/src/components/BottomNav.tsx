import { Link, useLocation } from "wouter";
import { CalendarDays, MessageCircle, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/chat", label: "Messages", icon: MessageCircle },
  { path: "/prep-chat", label: "Prep Chat", icon: Sparkles },
  { path: "/scheduling", label: "Calendar", icon: CalendarDays },
  { path: "/settings", label: "You", icon: Settings },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] border-t bg-background/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-2 safe-area-bottom">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <Link key={item.path} href={item.path}>
              <button
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs font-medium transition",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className={cn("h-5 w-5", isActive && "scale-105")} />
                <span>{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
