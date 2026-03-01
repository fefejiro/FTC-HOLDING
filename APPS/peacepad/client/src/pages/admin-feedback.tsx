import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Bug,
  Lightbulb,
  Heart,
  HelpCircle,
  CheckCircle,
  X,
  Clock,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Feedback } from "@shared/schema";

const typeIcons = {
  bug: Bug,
  suggestion: Lightbulb,
  praise: Heart,
  other: HelpCircle,
};

const typeColors = {
  bug: "destructive",
  suggestion: "default",
  praise: "secondary",
  other: "outline",
} as const;

const severityColors = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
} as const;

const statusIcons = {
  new: AlertCircle,
  reviewing: Clock,
  backlog: Clock,
  resolved: CheckCircle,
  "wont-fix": X,
};

const statusColors = {
  new: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  reviewing: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  backlog: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  resolved: "bg-green-500/10 text-green-600 dark:text-green-400",
  "wont-fix": "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export default function AdminFeedbackPage() {
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(
    null,
  );
  const [adminNotes, setAdminNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  // Fetch feedback
  const { data: feedbackList = [], isLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/admin/feedback", statusFilter],
    queryFn: async () => {
      const res = await fetch(
        statusFilter === "all"
          ? "/api/admin/feedback"
          : `/api/admin/feedback?status=${statusFilter}`,
      );
      if (!res.ok) throw new Error("Failed to fetch feedback");
      return res.json();
    },
  });

  // Update feedback status
  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: string;
      notes?: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/admin/feedback/${id}`, {
        status,
        adminNotes: notes,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      toast({
        title: "Feedback updated",
        description: "The feedback status has been updated successfully.",
      });
      setSelectedFeedback(null);
      setAdminNotes("");
    },
    onError: () => {
      toast({
        title: "Failed to update",
        description: "Could not update the feedback status.",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (feedback: Feedback, newStatus: string) => {
    updateStatus.mutate({
      id: feedback.id,
      status: newStatus,
      notes: adminNotes || feedback.adminNotes || undefined,
    });
  };

  // Group feedback by status
  const groupedFeedback = {
    new: feedbackList.filter((f) => f.status === "new"),
    reviewing: feedbackList.filter((f) => f.status === "reviewing"),
    backlog: feedbackList.filter((f) => f.status === "backlog"),
    resolved: feedbackList.filter((f) => f.status === "resolved"),
    "wont-fix": feedbackList.filter((f) => f.status === "wont-fix"),
  };

  const FeedbackCard = ({ feedback }: { feedback: Feedback }) => {
    const TypeIcon = typeIcons[feedback.type as keyof typeof typeIcons];
    const StatusIcon = statusIcons[feedback.status as keyof typeof statusIcons];

    return (
      <Card
        className="cursor-pointer hover-elevate active-elevate-2"
        onClick={() => {
          setSelectedFeedback(feedback);
          setAdminNotes(feedback.adminNotes || "");
        }}
        data-testid={`card-feedback-${feedback.id}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <TypeIcon className="h-4 w-4" />
              <Badge
                variant={typeColors[feedback.type as keyof typeof typeColors]}
              >
                {feedback.type}
              </Badge>
              {feedback.severity && (
                <Badge
                  variant={
                    severityColors[
                      feedback.severity as keyof typeof severityColors
                    ]
                  }
                >
                  {feedback.severity}
                </Badge>
              )}
            </div>
            <div
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-1 text-xs",
                statusColors[feedback.status as keyof typeof statusColors],
              )}
            >
              <StatusIcon className="h-3 w-3" />
              {feedback.status}
            </div>
          </div>
          <CardTitle className="text-sm mt-2">{feedback.subject}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {feedback.description}
          </p>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {feedback.category}
            </Badge>
            <span>
              {format(new Date(feedback.createdAt!), "MMM d, h:mm a")}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading feedback...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Beta Feedback Manager
              </CardTitle>
              <CardDescription>
                Review and respond to feedback from beta testers
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className="w-[150px]"
                data-testid="select-status-filter"
              >
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-filter-all">
                  All
                </SelectItem>
                <SelectItem value="new" data-testid="option-filter-new">
                  New
                </SelectItem>
                <SelectItem
                  value="reviewing"
                  data-testid="option-filter-reviewing"
                >
                  Reviewing
                </SelectItem>
                <SelectItem
                  value="backlog"
                  data-testid="option-filter-backlog"
                >
                  Backlog
                </SelectItem>
                <SelectItem
                  value="resolved"
                  data-testid="option-filter-resolved"
                >
                  Resolved
                </SelectItem>
                <SelectItem
                  value="wont-fix"
                  data-testid="option-filter-wont-fix"
                >
                  Won't Fix
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Feedback Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>New</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groupedFeedback.new.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reviewing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groupedFeedback.reviewing.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resolved</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groupedFeedback.resolved.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Won't Fix</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groupedFeedback["wont-fix"].length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback List */}
      <Tabs defaultValue="new" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="new" data-testid="tab-new">
            New ({groupedFeedback.new.length})
          </TabsTrigger>
          <TabsTrigger value="reviewing" data-testid="tab-reviewing">
            Reviewing ({groupedFeedback.reviewing.length})
          </TabsTrigger>
          <TabsTrigger value="backlog" data-testid="tab-backlog">
            Backlog ({groupedFeedback.backlog.length})
          </TabsTrigger>
          <TabsTrigger value="resolved" data-testid="tab-resolved">
            Resolved ({groupedFeedback.resolved.length})
          </TabsTrigger>
          <TabsTrigger value="wont-fix" data-testid="tab-wont-fix">
            Won't Fix ({groupedFeedback["wont-fix"].length})
          </TabsTrigger>
        </TabsList>

        {Object.entries(groupedFeedback).map(([status, items]) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {items.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <div className="text-muted-foreground">
                    No {status === "wont-fix" ? "won't fix" : status} feedback
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {items.map((feedback) => (
                  <FeedbackCard key={feedback.id} feedback={feedback} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Feedback Detail Dialog */}
      <Dialog
        open={!!selectedFeedback}
        onOpenChange={(open) => !open && setSelectedFeedback(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {typeIcons[
                    selectedFeedback.type as keyof typeof typeIcons
                  ] && (
                    <>
                      {(() => {
                        const Icon =
                          typeIcons[
                            selectedFeedback.type as keyof typeof typeIcons
                          ];
                        return <Icon className="h-5 w-5" />;
                      })()}
                    </>
                  )}
                  {selectedFeedback.subject}
                </DialogTitle>
                <DialogDescription>
                  Submitted on{" "}
                  {format(
                    new Date(selectedFeedback.createdAt!),
                    "MMMM d, yyyy 'at' h:mm a",
                  )}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {/* Metadata */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge
                      variant={
                        typeColors[
                          selectedFeedback.type as keyof typeof typeColors
                        ]
                      }
                    >
                      {selectedFeedback.type}
                    </Badge>
                    {selectedFeedback.severity && (
                      <Badge
                        variant={
                          severityColors[
                            selectedFeedback.severity as keyof typeof severityColors
                          ]
                        }
                      >
                        {selectedFeedback.severity}
                      </Badge>
                    )}
                    <Badge variant="outline">{selectedFeedback.category}</Badge>
                    <Badge
                      variant="outline"
                      className={
                        statusColors[
                          selectedFeedback.status as keyof typeof statusColors
                        ]
                      }
                    >
                      {selectedFeedback.status}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Description */}
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedFeedback.description}
                    </p>
                  </div>

                  {/* Technical Info */}
                  <div>
                    <h4 className="font-medium mb-2">Technical Information</h4>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p>URL: {selectedFeedback.url || "Not provided"}</p>
                      <p>
                        Device: {selectedFeedback.deviceInfo || "Not available"}
                      </p>
                      <p>
                        Version:{" "}
                        {selectedFeedback.appVersion || "Not specified"}
                      </p>
                    </div>
                  </div>

                  {/* Admin Notes */}
                  <div>
                    <h4 className="font-medium mb-2">Admin Notes</h4>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes for internal tracking..."
                      className="min-h-[100px]"
                      data-testid="input-admin-notes"
                    />
                  </div>

                  {selectedFeedback.resolvedAt && (
                    <div className="text-sm text-muted-foreground">
                      Resolved on{" "}
                      {format(
                        new Date(selectedFeedback.resolvedAt),
                        "MMMM d, yyyy",
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Status Actions - Fixed at bottom */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-2">Update Status</h4>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={
                      selectedFeedback.status === "new" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handleStatusUpdate(selectedFeedback, "new")}
                    disabled={updateStatus.isPending}
                    data-testid="button-status-new"
                  >
                    New
                  </Button>
                  <Button
                    variant={
                      selectedFeedback.status === "reviewing"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      handleStatusUpdate(selectedFeedback, "reviewing")
                    }
                    disabled={updateStatus.isPending}
                    data-testid="button-status-reviewing"
                  >
                    Reviewing
                  </Button>
                  <Button
                    variant={
                      selectedFeedback.status === "backlog"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      handleStatusUpdate(selectedFeedback, "backlog")
                    }
                    disabled={updateStatus.isPending}
                    data-testid="button-status-backlog"
                  >
                    Backlog
                  </Button>
                  <Button
                    variant={
                      selectedFeedback.status === "resolved"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      handleStatusUpdate(selectedFeedback, "resolved")
                    }
                    disabled={updateStatus.isPending}
                    data-testid="button-status-resolved"
                  >
                    Resolved
                  </Button>
                  <Button
                    variant={
                      selectedFeedback.status === "wont-fix"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      handleStatusUpdate(selectedFeedback, "wont-fix")
                    }
                    disabled={updateStatus.isPending}
                    data-testid="button-status-wont-fix"
                  >
                    Won't Fix
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
