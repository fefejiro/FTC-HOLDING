import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Link2, Users, Calendar, MessageSquare, ArrowLeft } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

interface Partnership {
  id: string;
  userId: string;
  partnerId: string;
  user1Name: string;
  user1Email: string | null;
  user2Name: string;
  user2Email: string | null;
  status: string;
  createdAt: string;
}

export default function AdminPartnershipsPage() {
  const { data: partnerships = [], isLoading } = useQuery<Partnership[]>({
    queryKey: ['/api/admin/partnerships'],
  });

  return (
    <>
      <SEOHead title="Admin - Partnerships" description="View all partnerships" noindex />
      <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-20">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Link2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Partnership Management</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold">All Partnerships</h2>
            <CardDescription>
              Total partnerships: {partnerships.length} | Co-parenting connections between users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading partnerships...</div>
            ) : partnerships.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No partnerships found</div>
            ) : (
              <div className="space-y-4">
                {partnerships.map((partnership) => (
                  <Card key={partnership.id} className="hover-elevate" data-testid={`card-partnership-${partnership.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{partnership.user1Name}</p>
                              <p className="text-xs text-muted-foreground">{partnership.user1Email || 'No email'}</p>
                            </div>
                          </div>
                          
                          <div className="text-muted-foreground">
                            <Link2 className="h-4 w-4" />
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{partnership.user2Name}</p>
                              <p className="text-xs text-muted-foreground">{partnership.user2Email || 'No email'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <Badge variant={partnership.status === 'active' ? 'default' : 'secondary'}>
                            {partnership.status}
                          </Badge>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {partnership.createdAt
                                ? formatDistanceToNow(new Date(partnership.createdAt), { addSuffix: true })
                                : 'Unknown'}
                            </span>
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
