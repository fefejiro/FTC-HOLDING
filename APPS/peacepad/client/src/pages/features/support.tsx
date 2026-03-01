import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";
// @ts-ignore
import { Heart, MapPin, Phone, DollarSign, CheckCircle2, ArrowRight, Search } from "lucide-react";
import { Link } from "wouter";

export default function SupportFeaturePage() {
  return (
    <>
      <SEOHead
        title="Find Co-Parenting Support Near You | Therapist & Resource Directory | PeacePad"
        description="Find local co-parenting support: family therapists, mediators, legal aid, domestic violence resources, and crisis support. Location-based directory for separated parents in Canada."
        keywords="co-parenting support Canada, family therapist directory, divorce mediator near me, domestic violence resources, co-parenting classes, parenting coordinator, legal aid parents, crisis support hotline"
        canonical="https://peacepad.ca/features/support"
      />
      
      <div className="min-h-screen-dvh bg-background">
        {/* Hero Section */}
        <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 shadow-sm border border-primary/20">
              <Heart className="h-4 w-4" />
              Local Support Resources
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
              Find Co-Parenting <span className="text-primary">Support</span> Near You
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Access a curated directory of therapists, mediators, legal services, crisis support, and government resources—all filtered by your location and budget.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/therapist-directory">
                <Button size="lg" className="w-full sm:w-auto" data-testid="button-find-support">
                  Find Support Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/resources">
                <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-guides">
                  Read Guides
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Key Benefits */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Why Use Our Support Directory</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card data-testid="card-benefit-location">
                <CardHeader>
                  <MapPin className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Location-Based Search</CardTitle>
                  <CardDescription>
                    Enter your city or postal code to find support services near you. See distances and get directions to each resource.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-benefit-free">
                <CardHeader>
                  <DollarSign className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Free & Low-Cost Options</CardTitle>
                  <CardDescription>
                    Filter by cost to find free resources, sliding-scale services, and government-funded programs that fit your budget.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-benefit-verified">
                <CardHeader>
                  <CheckCircle2 className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Curated & Verified</CardTitle>
                  <CardDescription>
                    Every resource is vetted and categorized. No endless Google searches—we've done the research for you.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Resource Categories */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Types of Support Available</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card data-testid="card-category-crisis" className="border-destructive/30 bg-destructive/5 shadow-md scale-[1.02] transition-transform">
                <CardHeader>
                  <Phone className="h-8 w-8 text-destructive mb-2 animate-pulse" />
                  <CardTitle className="text-destructive font-bold text-xl">Crisis Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-destructive/90 font-semibold">
                    24/7 hotlines, domestic violence resources, emergency mental health services, and immediate crisis intervention.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-category-therapists">
                <CardHeader>
                  <Heart className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Therapists & Counselors</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Individual therapy, family counseling, child psychologists, and co-parenting specialists to help navigate challenges.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-category-legal">
                <CardHeader>
                  <Search className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Legal Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Family law attorneys, legal aid clinics, mediation services, and court support for custody arrangements.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-category-government">
                <CardHeader>
                  <CheckCircle2 className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Government Programs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Child support services, public health programs, subsidized childcare, and social services for families.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-category-family">
                <CardHeader>
                  <Heart className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Family Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Parenting classes, support groups, community centers, and educational programs for children and parents.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-category-mediation">
                <CardHeader>
                  <Search className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Mediation Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Professional mediators to help resolve custody disputes, create parenting plans, and improve communication.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card/50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">How to Find Support</h2>
            <div className="space-y-8">
              <div className="flex gap-4" data-testid="step-location">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Enter Your Location</h3>
                  <p className="text-muted-foreground">
                    Type your city, postal code, or allow location access to find resources near you. Set your search radius (5-200 km).
                  </p>
                </div>
              </div>

              <div className="flex gap-4" data-testid="step-filter">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Filter by Type & Cost</h3>
                  <p className="text-muted-foreground">
                    Choose the category you need (therapists, legal, crisis) and filter by free/low-cost options if budget is a concern.
                  </p>
                </div>
              </div>

              <div className="flex gap-4" data-testid="step-browse">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Browse Results</h3>
                  <p className="text-muted-foreground">
                    See resources sorted by distance. Each listing includes contact info, address, operating hours, and what services they offer.
                  </p>
                </div>
              </div>

              <div className="flex gap-4" data-testid="step-connect">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Connect & Get Help</h3>
                  <p className="text-muted-foreground">
                    Call, visit the website, or get directions. Every resource includes all the details you need to take the next step.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Directory Features</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <Card data-testid="card-feature-distance">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Distance Calculation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    See exactly how far each resource is from your location. Sort by distance to find the closest options.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-directions">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Get Directions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    One-click navigation to any resource using your preferred maps app (Google Maps, Apple Maps, etc.).
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-hours">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Operating Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Know when each resource is available. See if they offer evening or weekend appointments.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-contact">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Phone numbers, websites, and email addresses all in one place. No hunting for contact details.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-multilingual">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Language Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Filter by language to find resources that serve you in your preferred language.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-feature-saved">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Remember Your Search
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Your last search location is saved so you don't have to re-enter it every time you visit.
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
              
              <Link href="/features/expenses">
                <Card className="hover-elevate h-full cursor-pointer" data-testid="link-feature-expenses-cross">
                  <CardHeader>
                    <CardTitle className="text-lg">Expense Tracker</CardTitle>
                    <CardDescription>Track receipts and split costs fairly</CardDescription>
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
                  <CardTitle className="text-lg">Finding a Family Therapist</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Guide to choosing the right therapist for your family
                  </p>
                  <Link href="/resources/finding-family-therapist">
                    <Button variant="outline" size="sm" data-testid="link-resource-therapist">
                      Read Guide
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              
              <Card className="hover-elevate">
                <CardHeader>
                  <CardTitle className="text-lg">All Co-Parenting Guides</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Communication tips, schedules, expenses, and more
                  </p>
                  <Link href="/resources">
                    <Button variant="outline" size="sm" data-testid="link-resources-all">
                      Browse Guides
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
            <Heart className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              You Don't Have to Do This Alone
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Find the support you need, right in your community. Help is available.
            </p>
            <Link href="/therapist-directory">
              <Button size="lg" data-testid="button-get-started">
                Find Support Near You
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
