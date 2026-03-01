import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";
import { Calendar, Sparkles, Users, Bell, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { Link } from "wouter";

export default function CalendarFeaturePage() {
  return (
    <>
      <SEOHead
        title="Free Shared Custody Calendar App | Co-Parenting Schedule | PeacePad"
        description="Free shared custody calendar with conflict detection and real-time sync. Coordinate pickup/dropoff schedules, custody exchanges, and parenting time. Never miss a custody exchange again."
        keywords="shared custody calendar free, co-parenting schedule app, custody exchange calendar, visitation schedule app, parenting time tracker, custody calendar app, divorce schedule app"
        canonical="https://peacepad.ca/features/calendar"
      />
      
      <div className="min-h-screen-dvh bg-background">
        {/* Hero Section */}
        <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Smart Conflict Detection
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Never Miss a Custody Exchange Again
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Keep everyone on the same page with a shared calendar designed specifically for co-parenting. Automatic conflict detection prevents double-booking and scheduling mistakes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/scheduling">
                <Button size="lg" className="w-full sm:w-auto" data-testid="button-try-calendar" aria-label="Try shared calendar now">
                  Try Calendar Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/resources/co-parenting-schedule-tips">
                <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-scheduling-tips" aria-label="Learn about scheduling tips">
                  Scheduling Tips
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Key Benefits */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Everything You Need to Coordinate Custody</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card data-testid="card-benefit-sync">
                <CardHeader>
                  <Users className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Real-Time Sync</CardTitle>
                  <CardDescription>
                    Changes made by either parent instantly appear for both. No more "I didn't know about that" misunderstandings.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-benefit-conflicts">
                <CardHeader>
                  <Sparkles className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Conflict Detection</CardTitle>
                  <CardDescription>
                    PeacePad automatically spots scheduling overlaps and conflicts, warning you before they become problems.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-benefit-reminders">
                <CardHeader>
                  <Bell className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Smart Reminders</CardTitle>
                  <CardDescription>
                    Get notifications for upcoming exchanges, events, and important dates. Never forget a pick-up or drop-off again.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Deep Dive */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Built for Co-Parenting Schedules</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <Card data-testid="card-feature-recurring">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Recurring Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Set up repeating custody schedules (weekly, bi-weekly, custom patterns) once and let PeacePad handle the rest.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-details">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Rich Event Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Add locations, notes, which children are involved, pickup/dropoff times, and special instructions to every event.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-templates">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Schedule Templates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Start with common custody arrangements (50/50, 2-2-3, alternating weeks) or create your own custom schedule.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-export">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Export & Share
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Export your schedule to standard calendar formats (iCal) to sync with Google Calendar, Apple Calendar, or Outlook.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-color">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Color Coding
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Visually distinguish between custody time, school events, extracurriculars, medical appointments, and more.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-mobile">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Mobile Access
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    View and manage your calendar from anywhere. Works on all devices and can be installed as a mobile app.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Helps */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card/50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Common Scheduling Problems We Solve</h2>
            <div className="space-y-6">
              <Card data-testid="problem-doublebook">
                <CardHeader>
                  <CardTitle>❌ Problem: Double-Booking</CardTitle>
                  <CardDescription className="text-base">
                    One parent schedules a vacation during the other's custody time, causing last-minute conflicts and frustration.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-primary font-medium">✅ PeacePad Solution:</p>
                  <p className="text-muted-foreground">
                    Smart conflict detection immediately alerts both parents when a new event overlaps with existing custody time, preventing scheduling mistakes.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="problem-forgotten">
                <CardHeader>
                  <CardTitle>❌ Problem: Forgotten Pickups</CardTitle>
                  <CardDescription className="text-base">
                    A parent forgets about a custody exchange, leaving the child waiting or missing important activities.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-primary font-medium">✅ PeacePad Solution:</p>
                  <p className="text-muted-foreground">
                    Automatic reminders notify both parents before every exchange. Set custom reminder times (1 hour, 1 day, etc.).
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="problem-miscommunication">
                <CardHeader>
                  <CardTitle>❌ Problem: "I Thought You Had Them"</CardTitle>
                  <CardDescription className="text-base">
                    Miscommunication about who has custody when leads to confusion and emergency scrambling.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-primary font-medium">✅ PeacePad Solution:</p>
                  <p className="text-muted-foreground">
                    A single shared calendar shows exactly who has custody at any time. Both parents always see the same information.
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
              <Link href="/features/messaging">
                <Card className="hover-elevate h-full cursor-pointer" data-testid="link-feature-messaging-cross">
                  <CardHeader>
                    <CardTitle className="text-lg">Smart Messaging</CardTitle>
                    <CardDescription>Communicate confidently with tone analysis</CardDescription>
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
                  <CardTitle className="text-lg">Custody Schedule Guide</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Complete guide to creating schedules that work for everyone
                  </p>
                  <Link href="/resources/custody-schedule-guide">
                    <Button variant="outline" size="sm" data-testid="link-resource-schedule">
                      Read Guide
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              
              <Card className="hover-elevate">
                <CardHeader>
                  <CardTitle className="text-lg">All Co-Parenting Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Expert guides on communication, finances, and support
                  </p>
                  <Link href="/resources">
                    <Button variant="outline" size="sm" data-testid="link-all-resources">
                      Browse All Guides
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
            <Calendar className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Get Your Custody Schedule Under Control
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Stop the scheduling chaos. Start coordinating like a team.
            </p>
            <Link href="/scheduling">
              <Button size="lg" data-testid="button-get-started">
                Set Up Your Calendar
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
