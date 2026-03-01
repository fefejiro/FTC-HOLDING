import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, MessageSquare, Link as LinkIcon, CheckCircle2, Activity, AlertCircle, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { TestMonitorDisplay } from "@/components/TestMonitorDisplay";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface AdminStats {
  totalUsers: number;
  totalPartnerships: number;
  totalMessages: number;
  consentStats: {
    privacyAccepted: number;
    aiMessageConsent: number;
    aiCallConsent: number;
  };
  recentSignups: Array<{
    id: string;
    displayName: string | null;
    email: string | null;
    createdAt: Date;
    privacyAccepted: boolean;
    aiMessageConsent: boolean;
    aiCallConsent: boolean;
  }>;
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="p-6 pb-40">
        <div className="max-w-7xl mx-auto space-y-6">
          <p className="text-3xl font-bold">Admin Dashboard</p>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-lg"></div>
            <div className="h-32 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  const consentRate = stats && stats.totalUsers > 0 ? {
    privacy: ((stats.consentStats.privacyAccepted / stats.totalUsers) * 100).toFixed(1),
    aiMessage: ((stats.consentStats.aiMessageConsent / stats.totalUsers) * 100).toFixed(1),
    aiCall: ((stats.consentStats.aiCallConsent / stats.totalUsers) * 100).toFixed(1),
  } : { privacy: '0', aiMessage: '0', aiCall: '0' };

  return (
    <div className="p-6 pb-40">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
            <Activity className="h-6 w-6 text-primary animate-pulse" />
          </div>
          
          {/* Quick Admin Links */}
          <div className="flex gap-2">
            <Link href="/admin/users">
              <Button variant="outline" className="gap-2" data-testid="button-view-users">
                <Users className="h-4 w-4" />
                All Users
              </Button>
            </Link>
            <Link href="/admin/feedback">
              <Button variant="outline" className="gap-2" data-testid="button-view-feedback">
                <MessageCircle className="h-4 w-4" />
                Beta Feedback
              </Button>
            </Link>
            <Link href="/admin/errors">
              <Button variant="outline" className="gap-2" data-testid="button-view-errors">
                <AlertCircle className="h-4 w-4" />
                Error Logs
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Metrics - Clickable for drill-down */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/users">
            <Card className="cursor-pointer hover-elevate active-elevate-2 transition-all" data-testid="card-total-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-users">{stats?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Registered accounts
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/partnerships">
            <Card className="cursor-pointer hover-elevate active-elevate-2 transition-all" data-testid="card-total-partnerships">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Partnerships</CardTitle>
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-partnerships">{stats?.totalPartnerships || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Co-parenting connections
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/messages">
            <Card className="cursor-pointer hover-elevate active-elevate-2 transition-all" data-testid="card-total-messages">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-messages">{stats?.totalMessages || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total conversations
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Consent Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Consent Analytics
            </CardTitle>
            <CardDescription>User consent rates for privacy and smart features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Privacy Policy</span>
                  <span className="text-sm text-muted-foreground" data-testid="text-privacy-rate">
                    {consentRate?.privacy}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all" 
                    style={{ width: `${consentRate?.privacy}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.consentStats.privacyAccepted} of {stats?.totalUsers} users
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Message Tone Analysis</span>
                  <span className="text-sm text-muted-foreground" data-testid="text-ai-message-rate">
                    {consentRate?.aiMessage}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all" 
                    style={{ width: `${consentRate?.aiMessage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.consentStats.aiMessageConsent} of {stats?.totalUsers} users
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Call Listening (Opt-in)</span>
                  <span className="text-sm text-muted-foreground" data-testid="text-ai-call-rate">
                    {consentRate?.aiCall}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all" 
                    style={{ width: `${consentRate?.aiCall}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.consentStats.aiCallConsent} of {stats?.totalUsers} users
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Monitor */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Monitoring</CardTitle>
            <CardDescription>Real-time performance metrics and active users</CardDescription>
          </CardHeader>
          <CardContent>
            <TestMonitorDisplay />
          </CardContent>
        </Card>

        {/* Recent Signups */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Signups</CardTitle>
            <CardDescription>Last 10 users who joined PeacePad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.recentSignups.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                  data-testid={`user-signup-${user.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium">{user.displayName || "Anonymous"}</p>
                    <p className="text-sm text-muted-foreground">{user.email || "No email"}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </p>
                    <div className="flex gap-1 justify-end">
                      {user.privacyAccepted && (
                        <div className="relative group">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="absolute bottom-full mb-1 hidden group-hover:block bg-popover text-popover-foreground text-xs px-2 py-1 rounded whitespace-nowrap">Privacy accepted</span>
                        </div>
                      )}
                      {user.aiMessageConsent && (
                        <div className="relative group">
                          <CheckCircle2 className="h-3 w-3 text-blue-500" />
                          <span className="absolute bottom-full mb-1 hidden group-hover:block bg-popover text-popover-foreground text-xs px-2 py-1 rounded whitespace-nowrap">Tone analysis consent</span>
                        </div>
                      )}
                      {user.aiCallConsent && (
                        <div className="relative group">
                          <CheckCircle2 className="h-3 w-3 text-purple-500" />
                          <span className="absolute bottom-full mb-1 hidden group-hover:block bg-popover text-popover-foreground text-xs px-2 py-1 rounded whitespace-nowrap">Call listening consent</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {!stats?.recentSignups.length && (
                <p className="text-center text-muted-foreground py-8">No users yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
