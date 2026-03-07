import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Trash2, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function DeleteData() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !username) {
      toast({
        title: "Missing Information",
        description: "Please provide your email and username.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate submission - in production this would call an API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSubmitted(true);
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <Link href="/">
              <button className="p-2 -ml-2 hover:bg-muted rounded-lg" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <h1 className="text-lg font-semibold">Delete My Data</h1>
          </div>
        </header>

        <div className="p-4 max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-primary mx-auto" />
              <h2 className="text-xl font-semibold">Request Received</h2>
              <p className="text-muted-foreground">
                We don receive your request. We go delete your data within 30 days. 
                You go receive email confirmation when e don complete.
              </p>
              <Link href="/">
                <Button className="mt-4" data-testid="button-go-home">
                  Go Back Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Link href="/">
            <button className="p-2 -ml-2 hover:bg-muted rounded-lg" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-lg font-semibold">Delete My Data</h1>
        </div>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Request Data Deletion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You fit request make we delete all your personal data from Saywetin. 
              This go include your account, listening history, and any saved songs.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter the email you used to sign up"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your Saywetin username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  data-testid="input-username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Tell us why you wan comot (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="resize-none"
                  rows={3}
                  data-testid="input-reason"
                />
              </div>

              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">
                  <strong>Warning:</strong> This action no fit reverse. All your data go delete permanently.
                </p>
              </div>

              <Button 
                type="submit" 
                variant="destructive" 
                className="w-full"
                disabled={isSubmitting}
                data-testid="button-submit-delete"
              >
                {isSubmitting ? "Dey Send..." : "Submit Deletion Request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          We go process your request within 30 days as per our{" "}
          <Link href="/privacy" className="text-primary underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
