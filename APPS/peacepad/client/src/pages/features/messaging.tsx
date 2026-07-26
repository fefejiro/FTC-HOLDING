import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";
import { MessageCircle, Sparkles, Shield, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function MessagingFeaturePage() {
  return (
    <>
      <SEOHead
        title="Co-Parent Messaging App with AI Tone Analysis | PeacePad"
        description="Communicate effectively with your co-parent using AI-powered tone analysis. Get real-time feedback on message tone before sending. Helps prevent conflict and keeps conversations child-focused."
        keywords="co-parent messaging app, AI tone analysis, co-parenting communication tool, divorce messaging app, custody communication, conflict-free messaging, co-parent chat app"
        canonical="https://peacepad.ca/features/messaging"
      />
      
      <div className="min-h-screen-dvh bg-background">
        {/* Hero Section */}
        <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Smart Communication
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Message Your Co-Parent Without the Drama
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Our intelligent tone analysis empowers you to communicate with confidence, building productive conversations that help you co-parent successfully.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/chat">
                <Button size="lg" className="w-full sm:w-auto" data-testid="button-try-messaging" aria-label="Try messaging feature now">
                  Try Messaging Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/resources">
                <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-learn-more" aria-label="Learn more about communication tips">
                  Communication Tips
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Key Benefits */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Why Co-Parents Choose PeacePad Messaging</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card data-testid="card-benefit-tone">
                <CardHeader>
                  <Sparkles className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Tone Analysis</CardTitle>
                  <CardDescription>
                    Get real-time feedback on message tone before sending. PeacePad identifies potentially frustrating or hostile language and suggests more constructive alternatives.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-benefit-secure">
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Private & Secure</CardTitle>
                  <CardDescription>
                    Authenticated, partnership-scoped conversations with transport encryption. No
                    public profiles or social feed. Messages are not end-to-end encrypted.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-benefit-history">
                <CardHeader>
                  <Clock className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Conversation History</CardTitle>
                  <CardDescription>
                    Keep a searchable record of all discussions, agreements, and important details. Never lose track of what was decided.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">How PeacePad Messaging Works</h2>
            <div className="space-y-8">
              <div className="flex gap-4" data-testid="step-write">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Write Your Message</h3>
                  <p className="text-muted-foreground">
                    Type what you want to say to your co-parent, just like any messaging app.
                  </p>
                </div>
              </div>

              <div className="flex gap-4" data-testid="step-analyze">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Tone Check</h3>
                  <p className="text-muted-foreground">
                    Before you send, PeacePad evaluates the emotional tone (calm, cooperative, neutral, frustrated, defensive, or hostile) and provides feedback.
                  </p>
                </div>
              </div>

              <div className="flex gap-4" data-testid="step-improve">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Get Suggestions (Optional)</h3>
                  <p className="text-muted-foreground">
                    If the message seems tense, PeacePad suggests a reworded version that's more constructive while keeping your point intact.
                  </p>
                </div>
              </div>

              <div className="flex gap-4" data-testid="step-send">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Send With Confidence</h3>
                  <p className="text-muted-foreground">
                    Choose to send your original message or the improved version. Either way, you're communicating with awareness.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Additional Features */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card/50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">More Than Just Text Messages</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <Card data-testid="card-feature-media">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Rich Media Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Share photos, documents, audio messages, and video clips. Perfect for sharing school updates, medical records, or special moments.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-realtime">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Real-Time Delivery
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Messages are delivered instantly via WebSocket connections. See when messages are delivered and read.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-calls">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Voice & Video Calls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Tap the phone or video icon to start a call directly from the conversation. No separate app needed.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-mobile">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Mobile-Optimized
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Works seamlessly on phones, tablets, and desktop. Install as a Progressive Web App for the best experience.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Other Features */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Complete Co-Parenting Solution</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Link href="/features/calendar">
                <Card className="hover-elevate h-full cursor-pointer" data-testid="link-feature-calendar-cross">
                  <CardHeader>
                    <CardTitle className="text-lg">Shared Calendar</CardTitle>
                    <CardDescription>Coordinate custody schedules with smart conflict detection</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              
              <Link href="/features/expenses">
                <Card className="hover-elevate h-full cursor-pointer" data-testid="link-feature-expenses-cross">
                  <CardHeader>
                    <CardTitle className="text-lg">Expense Tracker</CardTitle>
                    <CardDescription>Track receipts and split costs fairly</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              
              <Link href="/features/support">
                <Card className="hover-elevate h-full cursor-pointer" data-testid="link-feature-support-cross">
                  <CardHeader>
                    <CardTitle className="text-lg">Support Directory</CardTitle>
                    <CardDescription>Find therapists and resources near you</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </div>
        </section>

        {/* Helpful Resources */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Helpful Resources</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="hover-elevate">
                <CardHeader>
                  <CardTitle className="text-lg">Communication Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Learn proven strategies for effective co-parent communication
                  </p>
                  <Link href="/resources/peaceful-communication-tips">
                    <Button variant="outline" size="sm" data-testid="link-resource-communication">
                      Read Guide
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              
              <Card className="hover-elevate">
                <CardHeader>
                  <CardTitle className="text-lg">Find Professional Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Connect with therapists and mediators who can help
                  </p>
                  <Link href="/therapist-directory">
                    <Button variant="outline" size="sm" data-testid="link-find-support">
                      Browse Directory
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/50">
          <div className="max-w-3xl mx-auto text-center">
            <MessageCircle className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Start Communicating With Confidence Today
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of co-parents using smart messaging to build better conversations and put their children first.
            </p>
            <Link href="/chat">
              <Button size="lg" data-testid="button-get-started">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
