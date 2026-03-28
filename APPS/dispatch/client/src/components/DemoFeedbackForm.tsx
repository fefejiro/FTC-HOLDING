import { FormEvent, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, MessageSquare } from 'lucide-react';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

type DemoFeedbackContext = {
  context: string;
  operatorName?: string | null;
  demoSessionId?: string | null;
  requestId?: string | null;
  completedRequestId?: string | null;
};

export default function DemoFeedbackForm({
  context,
  onSubmitted,
}: {
  context: DemoFeedbackContext;
  onSubmitted?: () => void;
}) {
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [message, setMessage] = useState('');
  const startedAtRef = useRef(Date.now());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      overallImpression: String(formData.get('overallImpression') || '').trim(),
      confusing: String(formData.get('confusing') || '').trim(),
      trustworthy: String(formData.get('trustworthy') || '').trim(),
      missing: String(formData.get('missing') || '').trim(),
      startedAt: startedAtRef.current,
      context: context.context,
      operatorName: context.operatorName || undefined,
      demoSessionId: context.demoSessionId || undefined,
      requestId: context.requestId || undefined,
      completedRequestId: context.completedRequestId || undefined,
    };

    setSubmitState('submitting');
    setMessage('');

    try {
      const response = await fetch('/api/demo-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        requestId?: string;
      };

      if (!response.ok || !body.ok) {
        throw new Error(body.error || body.message || 'Unable to send feedback right now.');
      }

      setSubmitState('success');
      setMessage(body.requestId ? `Feedback received. Reference ${body.requestId}.` : 'Feedback received.');
      startedAtRef.current = Date.now();
      form.reset();
      onSubmitted?.();
    } catch (error) {
      setSubmitState('error');
      setMessage(error instanceof Error ? error.message : 'Unable to send feedback right now.');
    }
  }

  return (
    <div className="rounded-2xl border border-dispatch-border bg-dispatch-surface p-5">
      <div className="flex items-center gap-2 text-orange-300">
        <MessageSquare className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.22em]">Client demo feedback</span>
      </div>
      <h3 className="mt-3 text-lg font-semibold text-white">Tell Una Labs what the client experienced.</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Keep it practical. We want what felt clear, what felt confusing, and what would need to improve
        before real use.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-300">
            <span>Name</span>
            <input
              type="text"
              name="name"
              placeholder="Your name"
              className="rounded-xl border border-dispatch-border bg-dispatch-bg px-4 py-3 text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-300">
            <span>Email</span>
            <input
              type="email"
              name="email"
              required
              placeholder="hello@company.com"
              className="rounded-xl border border-dispatch-border bg-dispatch-bg px-4 py-3 text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          <span>Overall impression</span>
          <textarea
            name="overallImpression"
            required
            rows={3}
            placeholder="How did the demo feel overall?"
            className="rounded-xl border border-dispatch-border bg-dispatch-bg px-4 py-3 text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          <span>What felt confusing</span>
          <textarea
            name="confusing"
            required
            rows={3}
            placeholder="What slowed you down or made the flow less clear?"
            className="rounded-xl border border-dispatch-border bg-dispatch-bg px-4 py-3 text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          <span>What felt trustworthy</span>
          <textarea
            name="trustworthy"
            required
            rows={3}
            placeholder="What made the system feel credible or useful?"
            className="rounded-xl border border-dispatch-border bg-dispatch-bg px-4 py-3 text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          <span>What is missing</span>
          <textarea
            name="missing"
            required
            rows={3}
            placeholder="What would you need before using this for real work?"
            className="rounded-xl border border-dispatch-border bg-dispatch-bg px-4 py-3 text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none"
          />
        </label>

        {message ? (
          <div
            className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
              submitState === 'error'
                ? 'border-red-500/20 bg-red-500/10 text-red-300'
                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
            }`}
            role={submitState === 'error' ? 'alert' : 'status'}
          >
            {submitState === 'error' ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            )}
            <span>{message}</span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitState === 'submitting'}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-wait disabled:opacity-70"
        >
          {submitState === 'submitting' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending feedback...
            </>
          ) : (
            'Send demo feedback'
          )}
        </button>
      </form>
    </div>
  );
}
