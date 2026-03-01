import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { MessageSquare, User, Calendar, AlertTriangle, ArrowLeft } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

interface MessageData {
  total: number;
  messages: Array<{
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    partnershipId: string;
    createdAt: string;
    toneLabel: string | null;
    conflictScore: number | null;
  }>;
}

const toneColors: Record<string, string> = {
  positive: "bg-green-500/10 text-green-600 dark:text-green-400",
  neutral: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  frustrated: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  defensive: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  hostile: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function AdminMessagesPage() {
  const { data, isLoading } = useQuery<MessageData>({
    queryKey: ['/api/admin/messages'],
  });

  const messages = data?.messages || [];
  const total = data?.total || 0;

  return (
    <>
      <SEOHead title="Admin - Messages" description="View message analytics" noindex />
      <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-20">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <MessageSquare className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Message Analytics</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold">Recent Messages</h2>
            <CardDescription>
              Total messages: {total} | Showing last 100 messages with tone analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No messages found</div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <Card key={message.id} className="hover-elevate" data-testid={`card-message-${message.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{message.senderName}</span>
                            </div>
                            {message.toneLabel && (
                              <Badge 
                                variant="outline" 
                                className={toneColors[message.toneLabel] || toneColors.neutral}
                              >
                                {message.toneLabel}
                              </Badge>
                            )}
                            {message.conflictScore && message.conflictScore > 50 && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                CES: {message.conflictScore}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {message.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {message.createdAt
                              ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })
                              : 'Unknown'}
                          </span>
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
