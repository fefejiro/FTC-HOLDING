import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MessageSquare, X, Send, Bug, Lightbulb, Heart, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const feedbackSchema = z.object({
  type: z.enum(["bug", "suggestion", "praise", "other"]),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  category: z.enum(["messaging", "conch-mode", "calendar", "expenses", "auth", "ui", "performance", "other"]),
  subject: z.string().min(3, "Subject must be at least 3 characters").max(100, "Subject is too long"),
  description: z.string().min(10, "Please provide more detail (at least 10 characters)").max(1000, "Description is too long"),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

const typeIcons = {
  bug: Bug,
  suggestion: Lightbulb,
  praise: Heart,
  other: HelpCircle,
};

const typeColors = {
  bug: "text-destructive",
  suggestion: "text-blue-600 dark:text-blue-400",
  praise: "text-green-600 dark:text-green-400",
  other: "text-muted-foreground",
};

interface FeedbackWidgetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FeedbackWidget({ open: externalOpen, onOpenChange }: FeedbackWidgetProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { toast } = useToast();

  // Use external control if provided, otherwise use internal state
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      type: "suggestion",
      category: "other",
      severity: "medium",
      subject: "",
      description: "",
    },
  });

  const feedbackType = form.watch("type");

  const submitFeedback = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      const res = await apiRequest("POST", "/api/feedback", {
        ...data,
        url: window.location.href,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Thank you for your feedback!",
        description: "Your feedback has been submitted and will help us improve PeacePad.",
      });
      form.reset();
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit feedback",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FeedbackFormData) => {
    // Only include severity if it's a bug report
    if (data.type !== "bug") {
      delete data.severity;
    }
    submitFeedback.mutate(data);
  };

  const Icon = typeIcons[feedbackType];

  const isDevelopment = window.location.hostname.includes('replit') || 
                        window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';

  return (
    <>
      {/* Floating Feedback Button - Only show in development/beta environments */}
      {isDevelopment && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed z-[9999] flex items-center justify-center h-9 w-9 rounded-full shadow-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95 border border-primary/20 backdrop-blur-sm"
          style={{ 
            top: 'max(8px, calc(8px + env(safe-area-inset-top, 0px)))', 
            right: 'max(60px, calc(60px + env(safe-area-inset-right, 0px)))'
          }}
          data-testid="button-feedback-open"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      )}

      {/* Feedback Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] p-0 gap-0">
          <div className="sticky top-0 bg-background z-10 p-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Icon className={cn("h-5 w-5", typeColors[feedbackType])} />
                Beta Feedback
              </DialogTitle>
              <DialogDescription>
                Help us improve PeacePad by sharing your thoughts.
              </DialogDescription>
            </DialogHeader>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto px-6 py-4">
                <div className="space-y-4">
                  {/* Feedback Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-feedback-type">
                          <SelectValue placeholder="Select feedback type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bug" data-testid="option-type-bug">
                          <span className="flex items-center gap-2">
                            <Bug className="h-4 w-4" />
                            Bug Report
                          </span>
                        </SelectItem>
                        <SelectItem value="suggestion" data-testid="option-type-suggestion">
                          <span className="flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Suggestion
                          </span>
                        </SelectItem>
                        <SelectItem value="praise" data-testid="option-type-praise">
                          <span className="flex items-center gap-2">
                            <Heart className="h-4 w-4" />
                            Praise
                          </span>
                        </SelectItem>
                        <SelectItem value="other" data-testid="option-type-other">
                          <span className="flex items-center gap-2">
                            <HelpCircle className="h-4 w-4" />
                            Other
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Severity (only for bugs) */}
              {feedbackType === "bug" && (
                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Severity</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-severity">
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="critical" data-testid="option-severity-critical">
                            Critical - App is unusable
                          </SelectItem>
                          <SelectItem value="high" data-testid="option-severity-high">
                            High - Major feature broken
                          </SelectItem>
                          <SelectItem value="medium" data-testid="option-severity-medium">
                            Medium - Minor issue
                          </SelectItem>
                          <SelectItem value="low" data-testid="option-severity-low">
                            Low - Cosmetic issue
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="messaging" data-testid="option-category-messaging">Messaging</SelectItem>
                        <SelectItem value="conch-mode" data-testid="option-category-conch">Conch Mode</SelectItem>
                        <SelectItem value="calendar" data-testid="option-category-calendar">Calendar & Events</SelectItem>
                        <SelectItem value="expenses" data-testid="option-category-expenses">Expenses</SelectItem>
                        <SelectItem value="auth" data-testid="option-category-auth">Login & Account</SelectItem>
                        <SelectItem value="ui" data-testid="option-category-ui">User Interface</SelectItem>
                        <SelectItem value="performance" data-testid="option-category-performance">Performance</SelectItem>
                        <SelectItem value="other" data-testid="option-category-other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subject */}
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Brief summary of your feedback" 
                        {...field} 
                        data-testid="input-subject"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={
                          feedbackType === "bug" 
                            ? "What were you trying to do? What happened instead?" 
                            : "Share your thoughts in detail..."
                        }
                        className="min-h-[100px] resize-none"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormDescription>
                      {feedbackType === "bug" 
                        ? "Include steps to reproduce if possible" 
                        : "Be as specific as possible"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
                </div>
              </div>

              {/* Actions - Fixed at bottom */}
              <div className="sticky bottom-0 bg-background z-10 flex justify-end gap-2 p-6 pt-4 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  data-testid="button-feedback-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitFeedback.isPending}
                  data-testid="button-feedback-submit"
                >
                  {submitFeedback.isPending ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}