import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Users, Mail, Calendar, UserCheck, Clock, Smartphone, Link2 } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

export default function AdminUsersPage() {
  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/users'],
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <SEOHead title="Admin - Users" description="View all registered users" noindex />
      <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-20">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">User Management</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold">All Registered Users</h2>
            <CardDescription>
              Total users: {users.length} | Showing signup details and activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No users found</div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <Card key={user.id} className="hover-elevate">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12 border-2 border-border">
                          {user.profileImageUrl ? (
                            <AvatarImage src={user.profileImageUrl} alt={user.displayName || 'User'} />
                          ) : (
                            <AvatarFallback className="bg-muted">
                              <UserCheck className="h-6 w-6 text-muted-foreground" />
                            </AvatarFallback>
                          )}
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="text-lg font-semibold">
                              {user.displayName || user.firstName || user.lastName || 'Anonymous User'}
                            </h3>
                            {user.isGuest && (
                              <Badge variant="outline" className="text-xs">Guest</Badge>
                            )}
                            {user.termsAcceptedAt && (
                              <Badge variant="outline" className="text-xs">Terms Accepted</Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span className="truncate">{user.email || 'No email'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>Joined: {formatDate(user.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>
                                Last login: {user.lastLoginAt 
                                  ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })
                                  : 'Never'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link2 className="h-4 w-4" />
                              <span>{user.activePartnershipId ? 'Has partner' : 'No partner'}</span>
                            </div>
                          </div>

                          {user.lastUserAgent && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <Smartphone className="h-3 w-3" />
                              <span className="truncate max-w-md">{user.lastUserAgent}</span>
                            </div>
                          )}

                          <div className="mt-2 text-xs text-muted-foreground">
                            <span className="font-mono">ID: {user.id}</span>
                            {user.inviteCode && (
                              <span className="ml-3">Invite Code: <span className="font-mono font-bold">{user.inviteCode}</span></span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
