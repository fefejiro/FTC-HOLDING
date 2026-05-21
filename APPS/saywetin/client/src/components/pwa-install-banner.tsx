import { useEffect, useMemo, useState } from "react";
import { Share2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "saywetin:pwa-install-dismissed";

function isStandaloneDisplay(): boolean {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || (navigator as any).standalone === true;
}

function isIOSWeb(): boolean {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function isSafari(): boolean {
  const ua = window.navigator.userAgent.toLowerCase();
  return ua.includes("safari") && !ua.includes("crios") && !ua.includes("fxios");
}

function isNativeRuntime(): boolean {
  return Boolean((window as any).Capacitor?.isNativePlatform?.());
}

export function PwaInstallBanner({ onlyHome = true, route = "/" }: { onlyHome?: boolean; route?: string }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  const isInstallableSafari = useMemo(() => isIOSWeb() && isSafari() && !isStandaloneDisplay(), []);
  const isStandalone = useMemo(() => isStandaloneDisplay(), []);
  const shouldHideForRoute = onlyHome && route !== "/";

  if (typeof window === "undefined") return null;
  if (isNativeRuntime() || isStandalone || dismissed || shouldHideForRoute) return null;

  const hasPrompt = Boolean(installEvent);
  const showBanner = hasPrompt || isInstallableSafari;
  if (!showBanner) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      dismiss();
    }
  };

  return (
    <div
      className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-[60] rounded-xl border border-white/15 bg-black/85 p-3 text-white shadow-xl backdrop-blur"
      data-testid="banner-install-pwa"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-white/10 p-2">
          {hasPrompt ? <Plus className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install SayWetin on your phone</p>
          {hasPrompt ? (
            <p className="mt-1 text-xs text-white/75">
              Add to home screen for a faster, app-like listening experience.
            </p>
          ) : (
            <p className="mt-1 text-xs text-white/75">
              On iPhone Safari: tap <span className="font-medium">Share</span>, then <span className="font-medium">Add to Home Screen</span>.
            </p>
          )}
          <div className="mt-2 flex gap-2">
            {hasPrompt ? (
              <Button size="sm" onClick={install} className="h-8 px-3 text-xs" data-testid="button-install-pwa">
                Install
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={dismiss}
              className="h-8 px-3 text-xs text-white/80 hover:bg-white/10 hover:text-white"
              data-testid="button-dismiss-install-pwa"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
