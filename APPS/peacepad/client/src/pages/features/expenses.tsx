import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";
import { DollarSign, Receipt, Camera, CheckCircle2, ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function ExpensesFeaturePage() {
  return (
    <>
      <SEOHead
        title="Co-Parenting Expense Tracker | Split Child Costs 50/50 | PeacePad"
        description="Free co-parenting expense tracker with receipt upload and automatic 50/50 splits. Track shared child expenses, request settlements, and keep transparent records. Perfect for divorced and separated parents."
        keywords="co-parenting expense tracker, child expense splitter, shared custody costs, divorce expense tracking, split child costs, receipt tracker co-parents, child support expense log"
        canonical="https://peacepad.ca/features/expenses"
      />
      
      <div className="min-h-screen-dvh bg-background">
        {/* Hero Section */}
        <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Receipt className="h-4 w-4" />
              Transparent Money Management
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Stop Fighting About Money
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Track shared parenting expenses, split costs fairly, and keep receipts organized. Everything in one place, completely transparent for both parents.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/expenses">
                <Button size="lg" className="w-full sm:w-auto" data-testid="button-try-expenses" aria-label="Try expense tracker now">
                  Try Expense Tracker
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/resources">
                <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-finance-tips" aria-label="Read financial tips for co-parents">
                  Financial Tips
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Key Benefits */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Why Co-Parents Love Our Expense Tracker</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card data-testid="card-benefit-receipts">
                <CardHeader>
                  <Camera className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Receipt Upload</CardTitle>
                  <CardDescription>
                    Snap a photo of receipts with your phone. All expense documentation stored securely in one place.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-benefit-auto">
                <CardHeader>
                  <DollarSign className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Automatic Splitting</CardTitle>
                  <CardDescription>
                    Expenses are automatically split 50/50 or use custom percentages. No manual math or awkward money conversations.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-benefit-tracking">
                <CardHeader>
                  <TrendingUp className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Payment Tracking</CardTitle>
                  <CardDescription>
                    See who owes what at a glance. Mark expenses as paid to keep running balances accurate and up-to-date.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">How PeacePad Expense Tracking Works</h2>
            <div className="space-y-8">
              <div className="flex gap-4" data-testid="step-add">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Add an Expense</h3>
                  <p className="text-muted-foreground">
                    Enter the expense amount, category (medical, school, activities, etc.), and description. Upload a photo of the receipt for documentation.
                  </p>
                </div>
              </div>

              <div className="flex gap-4" data-testid="step-split">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Automatic Split Calculation</h3>
                  <p className="text-muted-foreground">
                    PeacePad automatically calculates each parent's share (default 50/50). Both parents can see the expense immediately.
                  </p>
                </div>
              </div>

              <div className="flex gap-4" data-testid="step-notify">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Review & Confirm</h3>
                  <p className="text-muted-foreground">
                    The other parent gets notified, can view the receipt, and see how much they owe. Everything is transparent.
                  </p>
                </div>
              </div>

              <div className="flex gap-4" data-testid="step-settle">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Track Payment Status</h3>
                  <p className="text-muted-foreground">
                    Once reimbursed, mark the expense as "Paid." See running totals of who owes what across all expenses.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Deep Dive */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Everything You Need to Manage Shared Costs</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <Card data-testid="card-feature-categories">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Expense Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Organize expenses by type: Medical, School Supplies, Extracurriculars, Clothing, Childcare, and more. See spending patterns.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-receipts">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Receipt Storage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Take photos of receipts directly in the app. All documentation saved securely and accessible to both parents.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-custom">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Custom Split Ratios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Not all expenses are 50/50. Set custom split percentages for different expense types based on your agreement.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-history">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Complete History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Search and filter all past expenses. Export reports for tax purposes or legal documentation if needed.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-balance">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Running Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Always know exactly who owes who. See total amounts owed across all unpaid expenses at a glance.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-notifications">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Smart Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Get notified when new expenses are added or when you receive payment. Stay on top of shared finances.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Problems Solved */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Common Money Problems We Solve</h2>
            <div className="space-y-6">
              <Card data-testid="problem-receipts">
                <CardHeader>
                  <CardTitle>❌ Problem: Lost Receipts</CardTitle>
                  <CardDescription className="text-base">
                    "I can't find the receipt for those soccer cleats I bought last month."
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-primary font-medium">✅ PeacePad Solution:</p>
                  <p className="text-muted-foreground">
                    All receipts stored digitally with searchable descriptions. Never lose documentation again.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="problem-tracking">
                <CardHeader>
                  <CardTitle>❌ Problem: "Wait, Did You Pay Me Back?"</CardTitle>
                  <CardDescription className="text-base">
                    Confusion about what's been reimbursed and what's still owed leads to arguments.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-primary font-medium">✅ PeacePad Solution:</p>
                  <p className="text-muted-foreground">
                    Clear payment status on every expense. Both parents see exactly what's paid and what's pending.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="problem-transparency">
                <CardHeader>
                  <CardTitle>❌ Problem: Lack of Transparency</CardTitle>
                  <CardDescription className="text-base">
                    One parent doesn't trust the other's expense claims without proof.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-primary font-medium">✅ PeacePad Solution:</p>
                  <p className="text-muted-foreground">
                    Receipt photos attached to every expense. Complete transparency builds trust and reduces conflict.
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
              
              <Link href="/features/calendar">
                <Card className="hover-elevate h-full cursor-pointer" data-testid="link-feature-calendar-cross">
                  <CardHeader>
                    <CardTitle className="text-lg">Shared Calendar</CardTitle>
                    <CardDescription>Coordinate custody schedules with smart conflict detection</CardDescription>
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
                  <CardTitle className="text-lg">Expense Splitting Guide</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Learn how to split child expenses fairly and avoid conflicts
                  </p>
                  <Link href="/resources/split-expenses-guide">
                    <Button variant="outline" size="sm" data-testid="link-resource-expenses">
                      Read Guide
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              
              <Card className="hover-elevate">
                <CardHeader>
                  <CardTitle className="text-lg">Legal & Financial Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Find legal aid and financial counseling services near you
                  </p>
                  <Link href="/therapist-directory">
                    <Button variant="outline" size="sm" data-testid="link-legal-support">
                      Find Resources
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
            <Receipt className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Make Shared Finances Simple & Fair
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Stop the money arguments. Start tracking expenses together with complete transparency.
            </p>
            <Link href="/expenses">
              <Button size="lg" data-testid="button-get-started">
                Start Tracking Expenses
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
