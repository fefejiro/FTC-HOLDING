import { ExternalLink, HeartHandshake, LifeBuoy, Scale, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/SEOHead";

const RESOURCES = [
  {
    category: "Crisis Support",
    icon: ShieldAlert,
    items: [
      {
        name: "988 Suicide & Crisis Lifeline",
        description: "24/7 crisis support by call or text in the United States.",
        actionLabel: "Call or text 988",
        href: "tel:988",
      },
      {
        name: "National Domestic Violence Hotline",
        description: "Safety planning, crisis support, and referrals for survivors.",
        actionLabel: "Call 800-799-7233",
        href: "tel:18007997233",
      },
      {
        name: "Crisis Text Line",
        description: "Text-based support when you need help right away.",
        actionLabel: "Text HOME to 741741",
        href: "sms:741741?body=HOME",
      },
    ],
  },
  {
    category: "Legal Aid",
    icon: Scale,
    items: [
      {
        name: "Legal Services Corporation",
        description: "Find civil legal aid organizations across the United States.",
        actionLabel: "Find legal aid",
        href: "https://www.lsc.gov/about-lsc/what-legal-aid/get-legal-help",
      },
      {
        name: "WomensLaw",
        description: "State-by-state legal information for custody, abuse, and safety.",
        actionLabel: "Browse legal help",
        href: "https://www.womenslaw.org/",
      },
      {
        name: "LawHelp.org",
        description: "Local legal information and referrals for families and caregivers.",
        actionLabel: "Open LawHelp",
        href: "https://www.lawhelp.org/",
      },
    ],
  },
  {
    category: "Counseling",
    icon: HeartHandshake,
    items: [
      {
        name: "Psychology Today Therapist Finder",
        description: "Search for family therapists, mediators, and counselors.",
        actionLabel: "Find a therapist",
        href: "https://www.psychologytoday.com/us/therapists",
      },
      {
        name: "Open Path Collective",
        description: "Lower-cost therapy options with participating clinicians.",
        actionLabel: "See affordable counseling",
        href: "https://openpathcollective.org/",
      },
      {
        name: "SAMHSA Treatment Locator",
        description: "Mental health and substance use treatment resources near you.",
        actionLabel: "Find support",
        href: "https://findtreatment.gov/",
      },
    ],
  },
  {
    category: "Co-Parenting Resources",
    icon: LifeBuoy,
    items: [
      {
        name: "Children and Family Futures",
        description: "Practical family and co-parenting support resources.",
        actionLabel: "Open resource center",
        href: "https://www.cffutures.org/",
      },
      {
        name: "Parents Without Partners",
        description: "Support and community for single and co-parents.",
        actionLabel: "Visit site",
        href: "https://www.parentswithoutpartners.org/",
      },
      {
        name: "Custody X Change Parenting Plan Guide",
        description: "Create a calm, child-centered parenting plan outside the app.",
        actionLabel: "Read the guide",
        href: "https://www.custodyxchange.com/topics/custody/plans/parenting-plan.php",
      },
    ],
  },
];

export default function ResourcesPage() {
  return (
    <>
      <SEOHead
        title="Support Resources - PeacePad"
        description="Curated crisis support, legal aid, counseling, and co-parenting resources."
        noindex
      />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4">
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Support resources</CardTitle>
                <CardDescription>
                  External links for crisis support, legal aid, counseling, and co-parenting help.
                </CardDescription>
              </div>
              <Badge variant="outline" className="w-fit bg-muted/40">
                Link-out only
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {RESOURCES.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.category} className="border-border/60">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary/10 p-3">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.category}</CardTitle>
                      <CardDescription>{section.items.length} trusted external options</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {section.items.map((item) => (
                    <div key={item.name} className="rounded-2xl border border-border/70 bg-background p-4">
                      <p className="font-medium">{item.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                      <Button asChild variant="outline" className="mt-3">
                        <a href={item.href} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {item.actionLabel}
                        </a>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
