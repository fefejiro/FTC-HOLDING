import Hero from "@/components/Hero";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Brain, Calendar, Shield, TrendingUp, Users } from "lucide-react";

export default function HomePage() {
  const features = [
    {
      icon: MessageCircle,
      title: "Real-Time Chat",
      description: "Structured, recorded communication designed for co-parents",
    },
    {
      icon: Brain,
      title: "Tone Guidance",
      description: "Understand emotional context with intelligent mood detection",
    },
    {
      icon: Calendar,
      title: "Shared Dashboard",
      description: "Coordinate notes, tasks, and child updates in one place",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Authenticated access and transport encryption help protect communications",
    },
    {
      icon: TrendingUp,
      title: "Mood Trends",
      description: "Track communication patterns over time (coming soon)",
    },
    {
      icon: Users,
      title: "Third-Party Access",
      description: "Optional viewing for mediators or therapists (coming soon)",
    },
  ];

  return (
    <div>
      <Hero />
      
      <div className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Communication built on understanding
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Where most co-parenting apps focus on logistics, PeacePad focuses on emotional clarity 
              and constructive dialogue.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2 text-foreground">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
