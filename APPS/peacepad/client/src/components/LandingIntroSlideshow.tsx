import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, X, Loader2 } from "lucide-react";
import familyIllustration from "@assets/generated_images/mixed_race_family_purple_slide.png";
import messagingIllustration from "@assets/generated_images/parents_texting_brown_eyebrows.png";
import organizationIllustration from "@assets/generated_images/happy_parents_organizing_green.png";
import conchIllustration from "@assets/generated_images/conch_mode_conversation_orange.png";

const allImages = [familyIllustration, messagingIllustration, organizationIllustration, conchIllustration];

interface LandingIntroSlideshowProps {
  onComplete: () => void;
}

interface SlideData {
  id: number;
  backgroundColor: string;
  image: string;
  imageAlt: string;
  featureLabel: string;
  title: string;
  subtitle: string;
  showGetStarted?: boolean;
}

export default function LandingIntroSlideshow({ onComplete }: LandingIntroSlideshowProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    let loadedCount = 0;
    const totalImages = allImages.length;

    allImages.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
      img.src = src;
    });

    const timeout = setTimeout(() => {
      setImagesLoaded(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  const handleComplete = () => {
    localStorage.setItem("hasSeenIntro", "true");
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem("hasSeenIntro", "true");
    onComplete();
  };

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on('select', onSelect);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  const handlePrevious = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const handleNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const slides: SlideData[] = [
    {
      id: 1,
      backgroundColor: "hsl(262, 70%, 68%)",
      image: familyIllustration,
      imageAlt: "Happy family together",
      featureLabel: "Welcome to PeacePad",
      title: "Communicate Clearly",
      subtitle: "A co-parenting app that helps parents communicate clearly and reduce conflict",
    },
    {
      id: 2,
      backgroundColor: "hsl(199, 89%, 60%)",
      image: messagingIllustration,
      imageAlt: "Family members messaging with gentle guidance",
      featureLabel: "One Shared Space",
      title: "Better Conversations",
      subtitle: "Messages, schedules, tasks, and notes in one organized place",
    },
    {
      id: 3,
      backgroundColor: "hsl(142, 71%, 58%)",
      image: organizationIllustration,
      imageAlt: "Family organizing calendars and tasks together",
      featureLabel: "Proactive AI Coach",
      title: "Communication That Feels Better",
      subtitle: "Your personal AI coach predicts conflicts, offers gentle nudges, and helps conversations stay calm",
    },
    {
      id: 4,
      backgroundColor: "hsl(14, 90%, 65%)",
      image: conchIllustration,
      imageAlt: "Family having structured conversations",
      featureLabel: "Built for You",
      title: "For Co-Parents",
      subtitle: "Communicate clearly, reduce conflict, and keep the focus on your kids",
      showGetStarted: true,
    },
  ];

  if (!imagesLoaded) {
    return (
      <div 
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ 
          backgroundColor: "hsl(262, 70%, 68%)",
          height: '100dvh',
          minHeight: '-webkit-fill-available'
        }}
      >
        <Loader2 className="h-12 w-12 animate-spin text-white mb-4" />
        <p className="text-white/80 text-lg font-medium">Loading PeacePad...</p>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-background overflow-hidden touch-none"
      style={{ 
        height: '100dvh',
        minHeight: '-webkit-fill-available'
      }}
    >
      {/* Skip Button - Fixed position top right */}
      <button
        onClick={handleSkip}
        className="fixed right-4 z-[60] flex items-center gap-2 text-white bg-white/25 hover:bg-white/40 backdrop-blur-md border border-white/40 font-semibold px-4 py-2 rounded-full transition-all shadow-lg"
        style={{ top: 'max(16px, calc(16px + env(safe-area-inset-top)))' }}
        data-testid="button-skip-intro"
      >
        <X className="h-4 w-4" />
        <span>Skip</span>
      </button>

      {/* Dot indicators - Fixed at bottom center */}
      <div 
        className="fixed left-1/2 -translate-x-1/2 z-[60] flex gap-2"
        style={{ bottom: 'max(24px, calc(24px + env(safe-area-inset-bottom)))' }}
      >
        {slides.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all ${
              index === selectedIndex ? 'bg-white w-6' : 'bg-white/40'
            }`}
          />
        ))}
      </div>

      {/* Carousel */}
      <div className="h-dvh w-screen overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide) => (
            <div 
              key={slide.id} 
              className="relative flex-[0_0_100%] min-w-0"
              style={{ backgroundColor: slide.backgroundColor }}
            >
              <div className="relative h-dvh overflow-y-auto flex flex-col items-center justify-center p-6 text-center text-white">
                <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-700">
                  {/* Feature Label */}
                  <div className="inline-block px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-sm font-semibold tracking-wide uppercase">
                    {slide.featureLabel}
                  </div>

                  {/* Illustration */}
                  <div className="relative aspect-square w-full max-w-[280px] mx-auto group">
                    <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-all duration-1000" />
                    <img 
                      src={slide.image} 
                      alt={slide.imageAlt}
                      className="relative z-10 w-full h-full object-contain drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>

                  {/* Text Content */}
                  <div className="space-y-4">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                      {slide.title}
                    </h2>
                    <p className="text-lg md:text-xl text-white/90 leading-relaxed font-medium px-4">
                      {slide.subtitle}
                    </p>
                  </div>

                  {/* Action Button (Last Slide Only) */}
                  {slide.showGetStarted && (
                    <div className="pt-4 flex justify-center w-full">
                      <Button 
                        size="lg" 
                        onClick={handleComplete}
                        className="bg-white text-orange-600 hover:bg-orange-50 font-bold text-xl px-10 py-7 rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 group mx-auto"
                        data-testid="button-get-started-slideshow"
                      >
                        Get Started
                        <ChevronRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Navigation - Left Arrow */}
              {selectedIndex > 0 && (
                <button
                  onClick={handlePrevious}
                  className="hidden lg:flex absolute left-6 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md border border-white/20 transition-all"
                  aria-label="Previous slide"
                  data-testid="button-prev-slide"
                >
                  <ChevronLeft className="h-8 w-8 text-white" strokeWidth={2} />
                </button>
              )}

              {/* Desktop Navigation - Right Arrow */}
              {selectedIndex < slides.length - 1 && (
                <button
                  onClick={handleNext}
                  className="hidden lg:flex absolute right-6 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md border border-white/20 transition-all"
                  aria-label="Next slide"
                  data-testid="button-next-slide"
                >
                  <ChevronRight className="h-8 w-8 text-white" strokeWidth={2} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
