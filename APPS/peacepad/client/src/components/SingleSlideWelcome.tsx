import { ArrowRight, LogIn, MessageCircle, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface SingleSlideWelcomeProps {
  onTryPeacePad: () => void;
  onExistingAccount: () => void;
}

export default function SingleSlideWelcome({
  onTryPeacePad,
  onExistingAccount,
}: SingleSlideWelcomeProps) {
  return (
    <main
      className="relative min-h-[100dvh] overflow-hidden bg-[#160b2e] text-white safe-area-top"
      data-testid="peacepad-welcome"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,_rgba(186,132,255,0.30),_transparent_34%),radial-gradient(circle_at_88%_72%,_rgba(236,199,255,0.20),_transparent_32%),linear-gradient(145deg,_#251046_0%,_#4c1d78_48%,_#251046_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -left-24 top-1/3 h-64 w-64 rounded-full border border-white/10"
      />
      <div
        aria-hidden="true"
        className="absolute -right-20 top-16 h-48 w-48 rounded-full border border-white/10"
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10 sm:px-8">
        <div className="flex items-center gap-3" aria-label="PeacePad">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_18px_50px_rgba(9,3,25,0.35)] backdrop-blur">
            <MessageCircle className="h-6 w-6" strokeWidth={1.8} />
          </div>
          <span className="text-lg font-semibold tracking-tight">PeacePad</span>
        </div>

        <section className="flex flex-1 flex-col justify-center py-10">
          <div
            aria-hidden="true"
            className="relative mb-10 h-44 w-44 self-center sm:h-52 sm:w-52"
          >
            <div className="absolute inset-0 rounded-[42%_58%_55%_45%/45%_42%_58%_55%] border border-white/20 bg-white/10 shadow-[0_30px_100px_rgba(11,2,31,0.55)] backdrop-blur-md" />
            <div className="absolute inset-[18%] rotate-12 rounded-[45%_55%_50%_50%/52%_42%_58%_48%] border border-white/30 bg-gradient-to-br from-white/25 to-white/5" />
            <div className="absolute inset-[36%] -rotate-12 rounded-full border border-white/40 bg-white/15" />
            <div className="absolute bottom-7 right-3 h-8 w-16 rotate-[28deg] rounded-full border border-white/25 bg-white/10" />
            <Sparkles className="absolute right-2 top-3 h-7 w-7 text-[#ead8ff]" strokeWidth={1.5} />
          </div>

          <div className="space-y-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#e5ccff]">
              Pause. Choose. Respond.
            </p>
            <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-5xl">
              A calmer way through hard co-parenting moments.
            </h1>
            <p className="mx-auto max-w-md text-pretty text-base leading-7 text-white/75 sm:text-lg">
              Pause, check how a message may land, and choose a clear next step before you send.
            </p>
          </div>
        </section>

        <div className="space-y-3">
          <Button
            type="button"
            size="lg"
            onClick={onTryPeacePad}
            className="h-14 w-full rounded-2xl bg-white text-base font-semibold text-[#3d1664] shadow-[0_20px_50px_rgba(10,3,29,0.35)] transition hover:bg-[#f6edff]"
            data-testid="button-try-peacepad"
          >
            Try PeacePad
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={onExistingAccount}
            className="h-14 w-full rounded-2xl border-white/25 bg-white/5 text-base font-medium text-white backdrop-blur transition hover:bg-white/10 hover:text-white"
            data-testid="button-existing-account"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Existing account
          </Button>
        </div>

        <nav
          aria-label="PeacePad policies and support"
          className="mt-7 flex items-center justify-center gap-5 text-xs text-white/65"
        >
          <Link href="/privacy" className="transition hover:text-white" data-testid="link-welcome-privacy">
            Privacy
          </Link>
          <Link href="/terms" className="transition hover:text-white" data-testid="link-welcome-terms">
            Terms
          </Link>
          <Link href="/support" className="transition hover:text-white" data-testid="link-welcome-support">
            Support
          </Link>
        </nav>
      </div>
    </main>
  );
}
