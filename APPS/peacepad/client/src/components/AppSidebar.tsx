import { useLocation } from "wouter";
import { CalendarDays, LogOut, MessageCircle, Settings, Sparkles, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { title: "Messages", url: "/chat", icon: MessageCircle },
  { title: "Prep", url: "/prep-chat", icon: Sparkles },
  { title: "Calendar", url: "/scheduling", icon: CalendarDays },
  { title: "You", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: partnerships = [] } = useQuery<any[]>({
    queryKey: ["/api/partnerships"],
    enabled: Boolean(user),
  });

  const activePartnership = user?.activePartnershipId
    ? partnerships.find((partnership) => partnership.id === user.activePartnershipId)
    : partnerships[0];

  const partnerName =
    activePartnership?.partnerName ||
    activePartnership?.partner?.displayName ||
    activePartnership?.partner?.email ||
    null;
  const items = NAV_ITEMS.map((item) =>
    item.title === "Messages"
      ? { ...item, url: user?.activePartnershipId ? "/chat" : "/compose" }
      : item,
  );

  return (
    <Sidebar>
      <SidebarHeader className="space-y-4 p-4 safe-area-top">
        <div className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.displayName || "PeacePad user"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {partnerName ? `Connected with ${partnerName}` : "Invite your co-parent to connect"}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Core</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button variant="ghost" className="w-full justify-start" onClick={() => void logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
