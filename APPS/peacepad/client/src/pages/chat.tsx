import ChatInterface from "@/components/ChatInterface";
import AffirmationBanner from "@/components/AffirmationBanner";
import { SEOHead } from "@/components/SEOHead";

export default function ChatPage() {
  const affirmationsEnabled = localStorage.getItem("affirmations_enabled") === "true";

  return (
    <>
      <SEOHead
        title="Messages - PeacePad"
        description="Secure family messaging"
        noindex={true}
      />
      <div 
        className="flex flex-col flex-1 min-h-0 items-center"
        style={{ overscrollBehavior: 'contain' }}
      >
        {affirmationsEnabled && <AffirmationBanner />}
        <div className="flex-1 overflow-hidden w-full max-w-2xl mx-auto border-x border-border/10 bg-card/50 min-h-0">
          <ChatInterface />
        </div>
      </div>
    </>
  );
}
