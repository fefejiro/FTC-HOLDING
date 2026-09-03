'use client';

import { useCallback, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { caseStudies, demoModules } from '@/lib/site-content';
import { WorkflowAnimation } from '@/components/WorkflowAnimation';
import { demoSteps } from '@/components/demoSteps';
import { SparkWidget } from '@/components/SparkWidget';
import { getStripeApiUrl } from '@/lib/stripe-config';

type ChatMsg = { role: 'user' | 'assistant'; content: string };

function InlineSparkChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [turnNumber, setTurnNumber] = useState(1);
  const [blocked, setBlocked] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Samantha') || v.name.includes('Alex'))
    );
    if (preferred) utter.voice = preferred;
    utter.rate = 1.05;
    utter.pitch = 1.0;
    window.speechSynthesis.speak(utter);
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading || blocked) return;
    const userMsg: ChatMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(getStripeApiUrl('/api/spark/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, turn_number: turnNumber }),
      });
      const data = await res.json() as { reply?: string; requires_pass?: boolean; session_limit_reached?: boolean };
      if (res.status === 402 || res.status === 429 || data.requires_pass || data.session_limit_reached) {
        setBlocked(true);
        setMessages((prev) => [...prev, { role: 'assistant', content: "You've used the free preview turns. Start your project to continue the conversation." }]);
      } else if (data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply! }]);
        setTurnNumber((n) => n + 1);
        speak(data.reply!);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Try again in a moment.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [loading, blocked, turnNumber, speak]);

  const startVoice = useCallback(() => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) return;
    if (isListening) { recognitionRef.current?.stop(); return; }
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript ?? '';
      if (transcript) send(transcript);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
    setIsListening(true);
  }, [isListening, send]);

  const hasSpeech = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3 flex items-center gap-2">
        <Badge variant="teal">Ask Spark</Badge>
        <span className="text-body-sm text-tx-secondary">Una Labs AI · 3 free turns</span>
      </div>
      <div className="flex-1 min-h-[220px] max-h-[280px] overflow-y-auto rounded-2xl bg-bg-offwhite p-4 space-y-3 text-body-sm">
        {messages.length === 0 && (
          <p className="text-tx-secondary">Ask anything about how Una Labs works, what we build, or how to get started.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <span className={[
              'inline-block rounded-2xl px-3 py-2 max-w-[85%] leading-relaxed',
              m.role === 'user' ? 'bg-brand-teal text-white' : 'bg-white text-tx-body border border-border',
            ].join(' ')}>
              {m.content}
            </span>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <span className="inline-block rounded-2xl px-3 py-2 bg-white border border-border text-tx-secondary animate-pulse">Thinking…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {blocked ? (
        <div className="mt-3">
          <Button href="/start" variant="primary" size="md">Start your project</Button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask about how we work…"
            disabled={loading}
            className="flex-1 rounded-xl border border-border bg-white px-4 py-2 text-body-sm text-tx-body placeholder:text-tx-secondary focus:outline-none focus:ring-2 focus:ring-brand-teal disabled:opacity-50"
          />
          {hasSpeech && (
            <button
              type="button"
              onClick={startVoice}
              aria-label={isListening ? 'Stop listening' : 'Speak your question'}
              className={['rounded-xl border px-3 py-2 text-sm transition-colors', isListening ? 'border-red-400 bg-red-50 text-red-500 animate-pulse' : 'border-border bg-white text-tx-secondary hover:text-tx-heading'].join(' ')}
            >
              🎙
            </button>
          )}
          <button
            type="button"
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="rounded-xl bg-brand-teal px-4 py-2 text-body-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}

export function DemoContent() {
  const [active, setActive] = useState(demoModules[0].slug);
  const demoModule = demoModules.find((item) => item.slug === active) ?? demoModules[0];
  const studies = Object.values(caseStudies);

  return (
    <>
      <section className="bg-white">
        <div className="max-w-content mx-auto px-6 pt-16 pb-20">
          <div className="max-w-3xl">
            <Badge variant="teal">Product walkthroughs</Badge>
            <h1 className="mt-4 text-display text-tx-heading">See Una Labs in action</h1>
            <p className="mt-6 text-body-lg leading-relaxed text-tx-secondary">
              Choose a walkthrough, try a safe preview, or open a live product. Each mode is labelled so you know what you are seeing.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              {demoModules.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => setActive(item.slug)}
                  className={[
                    'rounded-full px-4 py-2 text-body-sm font-semibold transition-colors',
                    active === item.slug
                      ? 'bg-brand-teal text-white'
                      : 'bg-bg-offwhite text-tx-secondary hover:text-tx-heading',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[28px] border border-border bg-bg-offwhite p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="muted">{demoModule.product}</Badge>
                <Badge variant="teal">{demoModule.loomUrl ? 'Watch · product footage' : 'Try · synthetic preview'}</Badge>
              </div>
              <h2 className="mt-4 text-h2 text-tx-heading">{demoModule.title}</h2>
              <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">
                {demoModule.description}
              </p>

              {demoModule.loomUrl ? (
                <div className="mt-6 w-full overflow-hidden rounded-2xl border border-border bg-black" style={{ aspectRatio: '16/9' }}>
                  <iframe
                    src={demoModule.loomUrl}
                    title={demoModule.title}
                    loading="lazy"
                    className="h-full w-full border-0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              ) : (
                <WorkflowAnimation steps={demoSteps[demoModule.slug] ?? demoSteps.intake} />
              )}

              <ul className="mt-6 space-y-3">
                {demoModule.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3">
                    <span className="mt-0.5 text-brand-teal">+</span>
                    <span className="text-body-sm text-tx-body">{bullet}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-caption text-tx-muted">No private customer data or production actions are used in this preview.</p>
            </div>

            <div className="rounded-[28px] border border-border bg-white p-6 shadow-sm flex flex-col">
              <InlineSparkChat />
              <div className="mt-6 pt-6 border-t border-border">
                <Button href={demoModule.cta.href} variant="primary" size="md" external={demoModule.cta.external}>
                  {demoModule.cta.label}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-bg-subtle py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl">
            <Badge variant="teal">Shipped products</Badge>
            <h2 className="mt-4 text-h2 text-tx-heading">Products and workflows to explore</h2>
            <p className="mt-4 text-body-lg leading-relaxed text-tx-secondary">
              Explore a product surface or read the case study for the story behind it.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {studies.map((study) => (
              <div
                key={study.slug}
                className="rounded-[24px] border border-border bg-white p-6 shadow-sm"
              >
                <Badge variant="muted">{study.title}</Badge>
                <h3 className="mt-4 text-h4 text-tx-heading">{study.headline}</h3>
                <p className="mt-3 text-body-sm leading-relaxed text-tx-secondary">
                  {study.subheadline}
                </p>
                <div className="mt-6">
                  <Button href={`/products/${study.slug}`} variant="ghost" size="md">
                    Read case study
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <SparkWidget />
    </>
  );
}
