import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Brain, Calendar, Shield, TrendingUp, Users } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { useLocation } from "wouter";
import familyImage from "@assets/generated_images/Co-parents_and_child_holding_hands_e55c74b4.png";
import peacepadIcon from "/peacepad-icon.png";

export default function LandingPage() {
  const hasScrolledToTop = useRef(false);
  const [, setLocation] = useLocation();

  // Always redirect unauthenticated users to onboarding flow
  // The onboarding page will decide what to show (welcome, consent, or guest entry)
  useEffect(() => {
    console.log("[Landing] Redirecting to unified onboarding flow");
    setLocation("/onboarding");
  }, [setLocation]);

  // Scroll to top when landing page is shown
  useEffect(() => {
    if (!hasScrolledToTop.current) {
      hasScrolledToTop.current = true;
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });
    }
  }, []);

  const features = [
    {
      icon: MessageCircle,
      title: "Better Conversations",
      description: "Gentle message guidance that helps conversations stay calm and constructive",
    },
    {
      icon: Brain,
      title: "Smart Guidance",
      description: "Helpful suggestions that keep communication clear and respectful",
    },
    {
      icon: Calendar,
      title: "Stay in Sync",
      description: "Coordinate schedules, tasks, and important updates in one place",
    },
    {
      icon: Shield,
      title: "Private & Secure",
      description: "Your information stays secure and accessible only to people you choose",
    },
    {
      icon: TrendingUp,
      title: "Track Progress",
      description: "See how communication improves over time",
    },
    {
      icon: Users,
      title: "Built for Co-Parents",
      description: "Designed to help separated and divorced parents stay on the same page",
    },
  ];

  return (
    <>
      <SEOHead
        title="PeacePad - Co-Parenting App to Communicate Clearly & Reduce Conflict"
        description="PeacePad is a co-parenting app that helps parents communicate clearly and reduce conflict. AI-powered message clarity, shared custody calendar, and expense tracking — free for separated and divorced parents."
        keywords="co-parenting app, co-parenting communication app, reduce conflict co-parenting, talk to ex about kids, co-parent messaging app, shared custody calendar, divorce communication app, separated parents app, parallel parenting app"
        ogImage="https://peacepad.ca/og-image.png"
        canonical="https://peacepad.ca/"
      />
      <div>
      <div className="relative min-h-[calc(100vh-60px)] w-full overflow-hidden bg-gradient-to-br from-purple-600 via-violet-700 to-purple-800 dark:from-purple-900 dark:via-violet-950 dark:to-purple-950">
        {/* Animated gradient background - purple theme matching intro slides */}
        <div className="absolute inset-0">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full bg-violet-400/20 blur-3xl" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full bg-purple-400/20 blur-3xl" />
        </div>

        {/* Background family image - positioned behind content, centered */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img 
            src={familyImage}
            alt=""
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-auto object-contain opacity-[0.08]"
            loading="lazy"
            width="800"
            height="600"
            aria-hidden="true"
          />
          {/* Purple overlay to ensure text readability */}
          <div className="absolute inset-0 bg-purple-900/70" />
        </div>
        
        <div className="relative z-20 flex h-full w-full flex-col items-center justify-center px-6">
          {/* Center content - perfectly centered */}
          <div className="w-full max-w-xl text-center flex flex-col items-center justify-center">
            {/* Logo and Title */}
            <div className="mb-8 flex items-center justify-center gap-4">
              <div className="p-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg">
                <img 
                  src={peacepadIcon} 
                  alt="PeacePad Logo" 
                  className="h-12 w-12 md:h-14 md:w-14" 
                  width="56"
                  height="56"
                />
              </div>
              <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-50 to-white drop-shadow-lg">
                PeacePad
              </h1>
            </div>
            
            {/* Taglines */}
            <p className="mb-3 text-2xl md:text-3xl font-light text-white">
              Communicate Clearly. Reduce Conflict.
            </p>
            <p className="mb-16 text-lg md:text-xl text-white/95">
              Before you send that message, let me help you make it clearer
            </p>
            
            {/* Get Started Section */}
            <div className="w-full space-y-6">
              <div className="space-y-3">
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                  Get Started
                </h2>
                <p className="text-lg md:text-xl text-white/90">
                  Access the current private beta experience
                </p>
              </div>
              
              {/* Primary OAuth Button - Extra Large and Prominent */}
              <div className="flex flex-col gap-6 items-center w-full">
                <Button
                  size="lg"
                  className="bg-white hover:bg-purple-50 text-purple-700 shadow-2xl hover:shadow-3xl text-lg md:text-xl px-12 py-8 w-full sm:max-w-md font-bold transition-all duration-200 transform hover:scale-105 border-0"
                  onClick={() => setLocation("/onboarding")}
                  data-testid="button-private-beta-entry"
                >
                  Continue to Private Beta
                </Button>
                <p className="text-sm text-white/80 max-w-md">
                  Account access is currently managed internally while private beta rollout expands.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Features section removed - already covered in intro slideshow */}
      
      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 py-4 text-center">
        <div className="flex items-center justify-center gap-4 text-sm text-white/80">
          <a 
            href="/help"
            className="hover:text-white transition-colors"
            data-testid="link-help"
          >
            Help
          </a>
          <span className="text-white/40">|</span>
          <a
            href="/support"
            className="hover:text-white transition-colors"
            data-testid="link-support"
          >
            Support
          </a>
          <span className="text-white/40">|</span>
          <a 
            href="/privacy"
            className="hover:text-white transition-colors"
            data-testid="link-privacy-policy"
          >
            Privacy Policy
          </a>
          <span className="text-white/40">|</span>
          <a
            href="/terms"
            className="hover:text-white transition-colors"
            data-testid="link-terms"
          >
            Terms
          </a>
          <span className="text-white/40">|</span>
          <a 
            href="mailto:peacepad@peacepad.ca"
            className="hover:text-white transition-colors"
            data-testid="link-contact"
          >
            Contact
          </a>
          <span className="text-white/50">|</span>
          <span className="text-white/80">2026 PeacePad</span>
        </div>
      </footer>
    </div>
    </>
  );
}
