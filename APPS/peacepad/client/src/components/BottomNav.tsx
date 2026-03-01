import { Link, useLocation } from "wouter";
import { MessageCircle, Phone, Calendar, CheckSquare, Menu, Heart, DollarSign, PawPrint, Settings, LogOut, StickyNote, Shell, BookOpen, MapPin, Cloud, Book, ShoppingCart, MessageSquare, GraduationCap, Trophy, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export function BottomNav() {
  const [location] = useLocation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const { logout } = useAuth();
  const [pressingButton, setPressingButton] = useState<string | null>(null);
  const [springingButton, setSpringingButton] = useState<string | null>(null);
  const springTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePressStart = useCallback((buttonId: string) => {
    if (springTimeoutRef.current) {
      clearTimeout(springTimeoutRef.current);
    }
    setSpringingButton(null);
    setPressingButton(buttonId);
  }, []);

  const handlePressEnd = useCallback((buttonId: string) => {
    setPressingButton(null);
    setSpringingButton(buttonId);
    springTimeoutRef.current = setTimeout(() => {
      setSpringingButton(null);
    }, 350);
  }, []);

  const isActive = (path: string) => {
    // Prep Chat (/) is the home page - only highlight it when we're exactly at "/"
    if (path === "/" && location === "/") return true;
    // For Chat, only highlight when exactly on /chat (not on /)
    if (path === "/chat" && location === "/chat") return true;
    // For other paths, match exactly
    return location === path;
  };

  const handleLogout = async () => {
    console.log("[Logout] Starting smooth logout transition...");
    setMoreMenuOpen(false); // Close the menu first
    await logout(); // Use the centralized logout from useAuth hook
  };

  // Core Features for bottom nav - Solo features first, then Co-Parent features
  // Prep Chat always first
  const navItems = [
    { path: "/", icon: Sparkles, label: "Prep" },
    { path: "/scheduling", icon: Calendar, label: "Calendar" },
    { path: "/expenses", icon: DollarSign, label: "Expenses" },
    { path: "/chat", icon: MessageCircle, label: "Chat" },
    { path: "/conch-mode", icon: Shell, label: "Conch" },
  ];

  // Everything else in More menu - ordered by feature completeness
  const moreItems = [
    // 🔝 Critical features first - Find Support at top for DV survivors
    { path: "/therapist-directory", icon: MapPin, label: "Find Support" },
    
    // ✅ Complete core features
    { path: "/tasks", icon: CheckSquare, label: "Tasks" },
    { path: "/notes", icon: StickyNote, label: "Notes" },
    { path: "/child-updates", icon: Heart, label: "Child Updates" },
    { path: "/progress", icon: Trophy, label: "Progress" },
    { path: "/beta/welcome", icon: GraduationCap, label: "Beta Guide" },
    { path: "/calls", icon: Shell, label: "Conch History" },
    { path: "/parenting-tips", icon: BookOpen, label: "Parenting Tips" },
    { path: "/weather-activities", icon: Cloud, label: "Activity Ideas" },
    
    // 🔜 Coming Soon - incomplete features
    { path: "/shopping-list", icon: ShoppingCart, label: "Shopping List", comingSoon: true },
    { path: "/pets", icon: PawPrint, label: "Pets", comingSoon: true },
    { path: "/storybook-creator", icon: Book, label: "Story Creator", comingSoon: true },
    
    // ⚙️ Settings always at bottom
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-[9999] safe-area-bottom"
      data-testid="bottom-nav"
      style={{ 
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        contain: 'layout style paint'
      }}
    >
      <div className="flex items-center justify-between h-16 px-1">
        {/* Main Nav Items */}
        {navItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <button
              className={cn(
                "nav-button flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[64px] py-2 rounded-2xl",
                isActive(item.path) ? "text-primary" : "text-muted-foreground",
                pressingButton === item.path && "pressing",
                springingButton === item.path && "springing"
              )}
              data-testid={`nav-${item.label.toLowerCase()}`}
              onPointerDown={() => handlePressStart(item.path)}
              onPointerUp={() => handlePressEnd(item.path)}
              onPointerLeave={() => pressingButton === item.path && handlePressEnd(item.path)}
              onPointerCancel={() => pressingButton === item.path && handlePressEnd(item.path)}
            >
              <item.icon className={cn(
                "h-6 w-6",
                isActive(item.path) ? "nav-icon-active" : "nav-icon-inactive"
              )} />
              <span className={cn(
                "text-[10px] font-medium mt-0.5",
                isActive(item.path) && "font-semibold"
              )}>{item.label}</span>
              {isActive(item.path) && <div className="nav-dot mt-0.5" />}
            </button>
          </Link>
        ))}

        {/* More Menu */}
        <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "nav-button flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[64px] py-2 rounded-2xl text-muted-foreground",
                pressingButton === "more" && "pressing",
                springingButton === "more" && "springing"
              )}
              data-testid="nav-more"
              onPointerDown={() => handlePressStart("more")}
              onPointerUp={() => handlePressEnd("more")}
              onPointerLeave={() => pressingButton === "more" && handlePressEnd("more")}
              onPointerCancel={() => pressingButton === "more" && handlePressEnd("more")}
            >
              <Menu className="h-6 w-6 nav-icon-inactive" />
              <span className="text-[10px] font-medium mt-0.5">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl flex flex-col p-0">
            <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
              <SheetTitle className="text-2xl">More Options</SheetTitle>
            </SheetHeader>
            
            {/* Scrollable Menu Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-1.5 pb-20">
                {moreItems.map((item: any) => (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 h-12 rounded-xl text-base",
                        isActive(item.path) && "bg-primary/15 text-primary",
                        item.comingSoon && "opacity-60 cursor-not-allowed"
                      )}
                      onClick={() => !item.comingSoon && setMoreMenuOpen(false)}
                      disabled={item.comingSoon}
                      data-testid={`more-${item.label.toLowerCase()}`}
                    >
                      <item.icon className="h-5 w-5" />
                      <div className="flex-1 flex items-center justify-between">
                        <span>{item.label}</span>
                        {item.comingSoon && (
                          <span className="text-xs font-semibold px-2 py-1 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-200 rounded-full">
                            Coming Soon
                          </span>
                        )}
                      </div>
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
            
            {/* Fixed Sign Out Button at Bottom */}
            <div className="px-6 py-4 border-t shrink-0 bg-background">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 rounded-xl text-base text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
                data-testid="button-logout-mobile"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
