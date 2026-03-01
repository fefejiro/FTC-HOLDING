import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { MessageCircle, Settings, LogOut, MapPin, Calendar, User, DollarSign, CheckSquare, StickyNote, Heart, PawPrint, Shell, BookOpen, Cloud, Book, ShoppingCart, MessageSquare, ChevronDown, ChevronRight, GraduationCap, Trophy, Shield, Sparkles, Brain, Menu } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

// Core Features - Ordered by Solo → Co-Parent access
// Prep Chat always first, then solo features, then features needing co-parent
const coreFeatures = [
  {
    title: "Prep",
    url: "/",
    icon: Sparkles,
  },
  {
    title: "Calendar",
    url: "/scheduling",
    icon: Calendar,
  },
  {
    title: "Expenses",
    url: "/expenses",
    icon: DollarSign,
  },
  {
    title: "Chat",
    url: "/chat",
    icon: MessageCircle,
  },
  {
    title: "Conch",
    url: "/conch-mode",
    icon: Shell,
  },
  {
    title: "More",
    url: "#",
    icon: Menu,
  },
];

// Secondary Features - Collapsible "More Tools" section
const moreTools = [
  {
    title: "Find Support",
    url: "/therapist-directory",
    icon: MapPin,
  },
  {
    title: "Beta Guide",
    url: "/beta/welcome",
    icon: GraduationCap,
  },
  {
    title: "Progress",
    url: "/progress",
    icon: Trophy,
  },
  {
    title: "Tasks",
    url: "/tasks",
    icon: CheckSquare,
  },
  {
    title: "Notes",
    url: "/notes",
    icon: StickyNote,
  },
  {
    title: "Child Updates",
    url: "/child-updates",
    icon: Heart,
  },
  {
    title: "Parenting Tips",
    url: "/parenting-tips",
    icon: BookOpen,
  },
  {
    title: "Activity Ideas",
    url: "/weather-activities",
    icon: Cloud,
  },
  {
    title: "Shopping List",
    url: "/shopping-list",
    icon: ShoppingCart,
  },
  {
    title: "Pets",
    url: "/pets",
    icon: PawPrint,
  },
  {
    title: "Story Creator",
    url: "/storybook-creator",
    icon: Book,
  },
];

interface Partnership {
  id: string;
  userId: string;
  partnerId: string;
  partnerName: string;
  partnerProfileImageUrl: string | null;
  status: string;
}

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);

  const { data: partnerships = [] } = useQuery<Partnership[]>({
    queryKey: ['/api/partnerships'],
    enabled: !!user,
  });

  const isEmoji = user?.profileImageUrl?.startsWith("emoji:");
  const emojiValue = isEmoji && user?.profileImageUrl ? user.profileImageUrl.replace("emoji:", "") : "";

  const handleLogout = async () => {
    console.log("[Logout] Starting smooth logout transition...");
    try {
      // 1. Immediately clear React Query cache to stop any refetches
      queryClient.clear();
      
      // 2. Small delay to let the app react to cleared state
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 3. Clear all potential session/auth keys
      const keysToRemove = [
        "peacepad_session_id",
        "pending_join_code",
        "hasSeenIntro",
        "hasAcceptedConsent",
        "aiMessageConsent",
        "aiCallConsent",
        "selected_avatar_color",
        "mood_checkins_enabled",
        "theme",
        "onboarding-checklist-dismissed"
      ];
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // 4. Call the server logout endpoint to clear server session
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } catch (e) {
        console.log('[Logout] Server logout request failed:', e);
      }
      
      // 5. Redirect to onboarding for a fresh start
      window.location.href = "/onboarding";
    } catch (error) {
      console.error("[Logout] Error during logout:", error);
      window.location.href = "/onboarding";
    }
  };

  const moreToolsOpenState = moreToolsOpen;

  return (
    <Sidebar>
      <SidebarHeader className="p-4 space-y-3 safe-area-top">
        {user && (
          <div className="flex items-center gap-3 p-2 bg-card rounded-lg border border-card-border">
            <Avatar className="h-10 w-10">
              {isEmoji ? (
                <div className="flex items-center justify-center text-2xl">{emojiValue}</div>
              ) : user.profileImageUrl ? (
                <AvatarImage src={user.profileImageUrl} alt={user.displayName || "User"} />
              ) : (
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate" data-testid="text-user-displayname">
                {user.displayName || "User"}
              </p>
              {user.email && (
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              )}
            </div>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        {partnerships.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Co-Parents</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-2 px-2">
                {partnerships.map((partnership) => (
                  <div
                    key={partnership.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover-elevate"
                    data-testid={`partner-${partnership.partnerId}`}
                  >
                    <Avatar className="h-8 w-8">
                      {partnership.partnerProfileImageUrl ? (
                        <AvatarImage src={partnership.partnerProfileImageUrl} alt={partnership.partnerName} />
                      ) : (
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{partnership.partnerName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        {/* Core 5 Features - Always visible and emphasized */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold">Core Features</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreFeatures.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <a href={item.url} data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Secondary Features - Collapsible */}
        <Collapsible open={moreToolsOpen} onOpenChange={setMoreToolsOpen}>
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold">More Tools</SidebarGroupLabel>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between px-2 py-1.5 h-auto font-normal hover-elevate"
              >
                <span className="text-xs">
                  {moreToolsOpen ? "Show less" : "Show more"}
                </span>
                {moreToolsOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {moreTools.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location === item.url}>
                        <a href={item.url} data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
        {/* Admin Section - Only visible to admins */}
        {user?.isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold">Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.startsWith('/admin')}>
                    <a href="/admin" data-testid="link-admin">
                      <Shield />
                      <span>Admin Dashboard</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start"
          asChild
        >
          <a href="mailto:peacepad@peacepad.ca?subject=PeacePad Beta Feedback">
            <MessageSquare className="mr-2 h-4 w-4" />
            Send Feedback
          </a>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </Button>
        <p className="text-xs text-muted-foreground">
          Parent together with confidence
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
