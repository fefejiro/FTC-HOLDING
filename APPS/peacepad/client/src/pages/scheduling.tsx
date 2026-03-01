import SchedulingDashboard from "@/components/SchedulingDashboard";
import { SEOHead } from "@/components/SEOHead";
import { TutorialModal } from "@/components/TutorialModal";
import { useFirstTimeTutorial } from "@/hooks/useFirstTimeTutorial";
import { Calendar } from "lucide-react";

export default function SchedulingPage() {
  const { showTutorial, closeTutorial } = useFirstTimeTutorial('peacepad_calendar_tutorial_seen');

  return (
    <div 
      className="flex flex-col flex-1 min-h-0 bg-background"
      style={{ overscrollBehavior: 'contain' }}
    >
      <SEOHead
        title="Calendar - PeacePad"
        description="Shared custody calendar"
        noindex={true}
      />
      <TutorialModal
        open={showTutorial}
        onClose={closeTutorial}
        title="How the Calendar Works"
        storageKey="peacepad_calendar_tutorial_seen"
        icon={<Calendar className="h-5 w-5 text-green-500" />}
        steps={[
          { title: "Add Events", description: "Create pickups, dropoffs, appointments, and custody switches" },
          { title: "Share Events", description: "Both parents see the same calendar. No double-bookings, no confusion" },
          { title: "Get Reminders", description: "Receive notifications before important events so nothing falls through the cracks" },
        ]}
      />
      <div className="flex-1 min-h-0">
        <SchedulingDashboard />
      </div>
    </div>
  );
}
