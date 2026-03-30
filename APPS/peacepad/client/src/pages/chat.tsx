import MvpChatInterface from "@/components/MvpChatInterface";
import { SEOHead } from "@/components/SEOHead";

export default function ChatPage() {
  return (
    <>
      <SEOHead
        title="Messages - PeacePad"
        description="Communicate clearly with your co-parent before things escalate."
        noindex
      />
      <div className="flex min-h-0 flex-1 flex-col bg-background">
        <MvpChatInterface />
      </div>
    </>
  );
}
