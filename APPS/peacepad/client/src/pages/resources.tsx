import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";
import { BookOpen, MessageCircle, Calendar, DollarSign, Heart } from "lucide-react";
import { Link } from "wouter";

interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: any;
  slug: string;
  content: string;
}

const resources: Resource[] = [
  {
    id: "1",
    title: "5 Tips for Peaceful Co-Parenting Communication",
    description: "Learn how to communicate effectively with your co-parent without conflict. Practical strategies for respectful dialogue.",
    category: "Communication",
    icon: MessageCircle,
    slug: "peaceful-communication-tips",
    content: `
      <h2>Effective Co-Parenting Communication Strategies</h2>
      <p>Co-parenting communication can be challenging, but these five strategies will help you maintain a peaceful relationship with your ex-partner while putting your children first.</p>
      
      <h3>1. Keep It Business-Like</h3>
      <p>Treat conversations about your children like professional correspondence. Stay focused on logistics, schedules, and your children's needs. Avoid discussing past relationship issues or personal matters.</p>
      
      <h3>2. Use Written Communication</h3>
      <p>Apps like PeacePad allow you to communicate in writing, giving you time to think before responding. This reduces impulsive reactions and creates a record of all agreements.</p>
      
      <h3>3. Practice Active Listening</h3>
      <p>Even when you disagree, acknowledge your co-parent's perspective. Use phrases like "I understand your concern about..." before sharing your viewpoint.</p>
      
      <h3>4. Focus on Solutions</h3>
      <p>Instead of dwelling on problems, propose actionable solutions. "What if we..." is more productive than "You always..."</p>
      
      <h3>5. Take Time Before Responding</h3>
      <p>If a message triggers an emotional response, wait 24 hours before replying. This "cooling off" period prevents escalation and helps you respond thoughtfully.</p>
      
      <p><strong>Remember:</strong> Your children benefit most when both parents communicate respectfully. Every peaceful interaction is an investment in their emotional well-being.</p>
      
      <p class="mt-6 p-4 bg-accent/10 rounded-md border border-accent">
        <strong>Ready to improve your co-parent communication?</strong><br/>
        Try <a href="/features/messaging" class="text-primary hover:underline font-medium" data-testid="link-feature-messaging">PeacePad's Smart Messaging</a> with real-time tone analysis that helps you communicate more effectively.
      </p>
    `
  },
  {
    id: "2",
    title: "Managing Shared Custody Schedules: A Complete Guide",
    description: "Master the art of custody scheduling with practical tips for smooth transitions and conflict-free coordination.",
    category: "Scheduling",
    icon: Calendar,
    slug: "custody-schedule-guide",
    content: `
      <h2>Creating a Custody Schedule That Works</h2>
      <p>A well-organized custody schedule reduces stress for everyone. Here's how to create and maintain an effective shared parenting calendar.</p>
      
      <h3>Choose the Right Schedule Type</h3>
      <ul>
        <li><strong>Week On/Week Off:</strong> Best for older children and parents living close by</li>
        <li><strong>2-2-3 Schedule:</strong> Alternating 2 days/2 days/3 days - no child goes more than 3 days without seeing a parent</li>
        <li><strong>Every Extended Weekend:</strong> One parent has weekdays, the other has Thu-Mon every other week</li>
      </ul>
      
      <h3>Use a Shared Digital Calendar</h3>
      <p>Tools like PeacePad's shared calendar ensure both parents always know the schedule. Features to look for:</p>
      <ul>
        <li>Real-time updates visible to both parents</li>
        <li>Conflict detection to avoid double-booking</li>
        <li>Color coding for easy visual reference</li>
        <li>Notifications for upcoming transitions</li>
      </ul>
      
      <h3>Plan for Special Events</h3>
      <p>Add birthdays, holidays, school events, and extracurricular activities well in advance. Discuss holiday schedules at least 2 months ahead to avoid last-minute conflicts.</p>
      
      <h3>Build in Flexibility</h3>
      <p>Life happens. Make swaps easier by establishing clear swap-request protocols and being willing to accommodate reasonable schedule changes.</p>
      
      <h3>Keep Children Informed</h3>
      <p>Use visual calendars at home so children know what to expect. Predictability reduces anxiety, especially for younger kids.</p>
      
      <p class="mt-6 p-4 bg-accent/10 rounded-md border border-accent">
        <strong>Need a better custody calendar?</strong><br/>
        Explore <a href="/features/calendar" class="text-primary hover:underline font-medium" data-testid="link-feature-calendar">PeacePad's Shared Calendar</a> with smart conflict detection and automatic reminders.
      </p>
    `
  },
  {
    id: "3",
    title: "How to Split Expenses Fairly After Separation",
    description: "Practical strategies for tracking, splitting, and managing shared child-related expenses without conflict.",
    category: "Finances",
    icon: DollarSign,
    slug: "split-expenses-guide",
    content: `
      <h2>Fair Expense Sharing for Co-Parents</h2>
      <p>Money conversations can be tense, but clear systems prevent conflict. Here's how to manage shared expenses effectively.</p>
      
      <h3>Decide on a Splitting Method</h3>
      <ul>
        <li><strong>50/50 Split:</strong> Equal contribution regardless of income</li>
        <li><strong>Proportional to Income:</strong> Each parent pays based on their earnings (e.g., 60/40 if one earns 60% of combined income)</li>
        <li><strong>Hybrid:</strong> Some expenses 50/50, others proportional</li>
      </ul>
      
      <h3>What to Include</h3>
      <p><strong>Typically Shared:</strong></p>
      <ul>
        <li>Medical and dental expenses not covered by insurance</li>
        <li>School fees, supplies, and extracurricular activities</li>
        <li>Childcare costs</li>
        <li>Clothing and shoes</li>
        <li>Special equipment (sports gear, musical instruments)</li>
      </ul>
      
      <p><strong>Usually Not Shared:</strong></p>
      <ul>
        <li>Daily groceries during your parenting time</li>
        <li>Entertainment at your house</li>
        <li>Personal items you choose to buy</li>
      </ul>
      
      <h3>Use an Expense Tracking App</h3>
      <p>Apps like PeacePad let you:</p>
      <ul>
        <li>Upload receipts instantly</li>
        <li>Categorize expenses automatically</li>
        <li>See real-time balance owed/owing</li>
        <li>Request reimbursement with proof</li>
      </ul>
      
      <h3>Set Clear Approval Thresholds</h3>
      <p>Agree on spending limits. For example: "Expenses under $50 don't need pre-approval, over $50 require discussion."</p>
      
      <h3>Settle Balances Regularly</h3>
      <p>Monthly settlements prevent large debts from building up. Use e-transfer or payment apps to make it quick and documented.</p>
      
      <p class="mt-6 p-4 bg-accent/10 rounded-md border border-accent">
        <strong>Tired of expense confusion?</strong><br/>
        Try <a href="/features/expenses" class="text-primary hover:underline font-medium" data-testid="link-feature-expenses">PeacePad's Expense Tracker</a> with receipt uploads and automatic 50/50 splits.
      </p>
    `
  },
  {
    id: "4",
    title: "Finding the Right Family Therapist for Co-Parenting Support",
    description: "How to find, evaluate, and work with a family therapist who understands co-parenting challenges.",
    category: "Support",
    icon: Heart,
    slug: "finding-family-therapist",
    content: `
      <h2>Choosing a Family Therapist</h2>
      <p>Professional support can make co-parenting much easier. Here's how to find the right therapist for your family's needs.</p>
      
      <h3>When to Seek Professional Help</h3>
      <p>Consider therapy if:</p>
      <ul>
        <li>Communication consistently breaks down into conflict</li>
        <li>You can't agree on parenting decisions</li>
        <li>Your children show signs of stress or acting out</li>
        <li>You need help creating a parenting plan</li>
        <li>Past trauma affects current co-parenting</li>
      </ul>
      
      <h3>Types of Family Therapy</h3>
      <ul>
        <li><strong>Individual Therapy:</strong> Work on your own emotional responses and coping strategies</li>
        <li><strong>Co-Parent Counseling:</strong> Both parents attend to improve communication</li>
        <li><strong>Family Therapy:</strong> Includes children to address family dynamics</li>
        <li><strong>Mediation:</strong> Neutral third party helps negotiate agreements</li>
      </ul>
      
      <h3>Finding a Qualified Therapist</h3>
      <p>Look for:</p>
      <ul>
        <li>License in clinical psychology, social work, or marriage & family therapy</li>
        <li>Specific experience with divorce and co-parenting</li>
        <li>Evidence-based approaches (CBT, emotion-focused therapy, Gottman method)</li>
        <li>Good reviews from other separated families</li>
      </ul>
      
      <h3>Use PeacePad's Find Support Directory</h3>
      <p>Our directory includes:</p>
      <ul>
        <li>Verified family therapists in your area</li>
        <li>Filters for insurance acceptance and sliding scale fees</li>
        <li>Specialties like high-conflict divorce or child-focused therapy</li>
        <li>Direct contact information and websites</li>
      </ul>
      
      <h3>Questions to Ask Potential Therapists</h3>
      <ul>
        <li>How much experience do you have with co-parenting issues?</li>
        <li>What's your approach to high-conflict situations?</li>
        <li>Do you see both parents together, separately, or both?</li>
        <li>What are your fees and do you accept insurance?</li>
        <li>How do you measure progress?</li>
      </ul>
      
      <h3>Making Therapy Work</h3>
      <p>Come prepared with specific situations you want to address. Be honest, even when it's uncomfortable. Remember, the therapist is there to help both of you be better co-parents, not to take sides.</p>
      
      <p class="mt-6 p-4 bg-accent/10 rounded-md border border-accent">
        <strong>Looking for local support resources?</strong><br/>
        Browse <a href="/features/support" class="text-primary hover:underline font-medium" data-testid="link-feature-support">PeacePad's Support Directory</a> to find therapists, mediators, legal aid, and crisis support near you.
      </p>
    `
  },
];

export default function ResourcesPage() {
  return (
    <>
      <SEOHead
        title="Free Co-Parenting Resources & Expert Guides | PeacePad"
        description="Free expert guides on co-parenting communication, creating custody schedules, splitting expenses fairly, and finding family therapy. Practical tips for peaceful co-parenting after separation or divorce."
        keywords="co-parenting tips free, custody schedule guide, shared expenses guide, family therapy guide, peaceful co-parenting, divorce communication tips, parallel parenting resources"
        canonical="https://peacepad.ca/resources"
      />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 pb-20 overflow-x-hidden">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Co-Parenting Resources</h1>
          </div>
          <p className="text-muted-foreground">
            Expert guides and practical tips for peaceful co-parenting after separation
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {resources.map((resource) => {
            const Icon = resource.icon;
            return (
              <Link key={resource.id} href={`/resources/${resource.slug}`}>
                <Card className="hover-elevate h-full cursor-pointer" data-testid={`card-resource-${resource.id}`}>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="mb-2">{resource.title}</CardTitle>
                        <CardDescription>{resource.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <span className="text-xs font-medium text-primary">{resource.category}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <Card className="bg-muted/50 mt-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-3">Looking for local support?</h2>
            <p className="text-muted-foreground mb-4">
              Find family therapists, crisis support, and legal services in your area using our Find Support directory.
            </p>
            <Link href="/therapist-directory" className="text-primary font-medium hover:underline" data-testid="link-therapist-directory">
              Browse Support Directory →
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export { resources };
