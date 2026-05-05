import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ConchCallModePage from "@/pages/conch-call-mode";
import ConchCoachModePage from "@/pages/conch-coach-mode";

type ConchSurfaceMode = "call" | "coach";

const CONCH_MODE_STORAGE_KEY = "peacepad_conch_surface_mode";

export default function ConchModePage() {
  const [mode, setMode] = useState<ConchSurfaceMode>(() => {
    const stored = localStorage.getItem(CONCH_MODE_STORAGE_KEY);
    return stored === "coach" ? "coach" : "call";
  });

  useEffect(() => {
    localStorage.setItem(CONCH_MODE_STORAGE_KEY, mode);
  }, [mode]);

  return (
    <div className="flex flex-col min-h-full bg-background" data-testid="page-conch-mode">
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto w-full max-w-xl px-4 py-3">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-1" role="tablist" aria-label="Conch mode tabs">
            <Button
              type="button"
              variant="ghost"
              className={cn("rounded-lg", mode === "call" && "bg-background shadow-sm")}
              onClick={() => setMode("call")}
              data-testid="button-conch-tab-call"
            >
              Call
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={cn("rounded-lg", mode === "coach" && "bg-background shadow-sm")}
              onClick={() => setMode("coach")}
              data-testid="button-conch-tab-coach"
            >
              Coach Voice
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {mode === "call" ? <ConchCallModePage /> : <ConchCoachModePage />}
      </div>
    </div>
  );
}
