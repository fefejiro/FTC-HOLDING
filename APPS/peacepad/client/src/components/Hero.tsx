import { Button } from "@/components/ui/button";
import { MessageCircle, Shield } from "lucide-react";
import heroImage from "@assets/stock_images/peaceful_diverse_fam_f2239163.jpg";

export default function Hero() {
  const handleGetStarted = () => {
    console.log("Get Started clicked");
  };

  const handleLearnMore = () => {
    console.log("Learn More clicked");
  };

  return (
    <div className="relative h-[70vh] sm:h-[60vh] min-h-[500px] max-h-[800px] w-full overflow-hidden">
      <img
        src={heroImage}
        alt="Parents working together for their children"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/75 via-slate-900/65 to-slate-900/55" />
      
      <div className="relative z-10 flex h-full items-center justify-center px-4 sm:px-6">
        <div className="max-w-4xl text-center">
          <div className="mb-4 sm:mb-6 flex items-center justify-center gap-2 sm:gap-3">
            <MessageCircle className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-white">
              PeacePad
            </h1>
          </div>
          
          <p className="mb-6 sm:mb-8 text-lg sm:text-xl md:text-2xl text-white/90 px-4">
            Parent together with confidence
          </p>
          
          <p className="mb-8 sm:mb-10 text-sm sm:text-base md:text-lg text-white/80 px-4 max-w-2xl mx-auto">
            Move beyond logistics. PeacePad helps you communicate constructively with real-time tone analysis, 
            ensuring every message builds understanding, not conflict.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
            <Button
              size="lg"
              className="backdrop-blur-md bg-white/20 border border-white/30 text-white hover:bg-white/30 w-full sm:w-auto"
              onClick={handleGetStarted}
              data-testid="button-get-started"
            >
              <Shield className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Get Started Free
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="backdrop-blur-md bg-white/10 border-white/40 text-white hover:bg-white/20 w-full sm:w-auto"
              onClick={handleLearnMore}
              data-testid="button-learn-more"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
