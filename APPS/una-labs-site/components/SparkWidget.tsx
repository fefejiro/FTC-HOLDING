'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getStripeApiUrl } from '@/lib/stripe-config';

// Web Speech API types (not in lib.dom.d.ts by default)
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    onend: (() => void) | null;
  }
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }
  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }
  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }
  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }
}

const SPARK_STORAGE_KEY = 'una_spark_pass_session_id';
const SPARK_TURN_KEY = 'una_spark_turn_number';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type SparkStatus = 'idle' | 'loading' | 'preview_exhausted' | 'paying' | 'session_limit';

function loadStoredPass(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(SPARK_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function savePass(sessionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SPARK_STORAGE_KEY, sessionId);
  } catch {
    // ignore
  }
}

function loadTurnNumber(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const stored = window.localStorage.getItem(SPARK_TURN_KEY);
    const n = parseInt(stored ?? '1', 10);
    return Number.isFinite(n) && n >= 1 ? n : 1;
  } catch {
    return 1;
  }
}

function saveTurnNumber(n: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SPARK_TURN_KEY, String(n));
  } catch {
    // ignore
  }
}

export function SparkWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<SparkStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [passSessionId, setPassSessionId] = useState<string>('');
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const [previewTurns, setPreviewTurns] = useState<number>(3);
  const [maxTurns, setMaxTurns] = useState<number>(20);
  const [email, setEmail] = useState('');
  const [payingError, setPayingError] = useState('');
  const [payingLoading, setPayingLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Restore session state on mount
  useEffect(() => {
    const storedPass = loadStoredPass();
    const storedTurn = loadTurnNumber();
    if (storedPass) setPassSessionId(storedPass);
    if (storedTurn) setTurnNumber(storedTurn);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || status === 'loading') return;

    setInput('');
    setErrorMsg('');
    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setStatus('loading');

    const currentTurn = turnNumber;

    try {
      const chatBody: Record<string, unknown> = {
          message: text,
          turn_number: currentTurn,
        };
        if (passSessionId) {
          chatBody.pass_session_id = passSessionId;
        }

      const res = await fetch(getStripeApiUrl('/api/spark/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatBody),
      });

      const data = await res.json() as {
        ok?: boolean;
        reply?: string;
        error?: string;
        requires_pass?: boolean;
        session_limit_reached?: boolean;
        preview_turns?: number;
        max_turns?: number;
        turn_number?: number;
        turns_remaining?: number;
      };

      if (res.status === 503) {
        setErrorMsg('Spark is temporarily offline. Check back soon.');
        setStatus('idle');
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      if (res.status === 402 && data.requires_pass) {
        if (typeof data.preview_turns === 'number') setPreviewTurns(data.preview_turns);
        setStatus('preview_exhausted');
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      if (res.status === 429 && data.session_limit_reached) {
        if (typeof data.max_turns === 'number') setMaxTurns(data.max_turns);
        setStatus('session_limit');
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      if (!res.ok || !data.ok || !data.reply) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
        setStatus('idle');
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      if (typeof data.preview_turns === 'number') setPreviewTurns(data.preview_turns);
      if (typeof data.max_turns === 'number') setMaxTurns(data.max_turns);

      const nextTurn = currentTurn + 1;
      setTurnNumber(nextTurn);
      saveTurnNumber(nextTurn);

      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply! }]);
      setStatus('idle');
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setStatus('idle');
      setMessages((prev) => prev.slice(0, -1));
    }
  }, [input, status, turnNumber, passSessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startVoice = useCallback(() => {
    const SpeechRecognitionCtor =
      (typeof window !== 'undefined' && (window.SpeechRecognition ?? window.webkitSpeechRecognition)) || null;
    if (!SpeechRecognitionCtor) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const rec = new SpeechRecognitionCtor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [isListening]);

  const handleGetPass = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setPayingError('Enter a valid email to continue.');
      return;
    }
    setPayingError('');
    setPayingLoading(true);

    try {
      const res = await fetch(getStripeApiUrl('/api/spark/create-pass'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setPayingError(data.error ?? 'Could not start checkout. Please try again.');
      }
    } catch {
      setPayingError('Network error. Please try again.');
    } finally {
      setPayingLoading(false);
    }
  };

  const isPreview = !passSessionId || turnNumber <= previewTurns;
  const turnsUsed = turnNumber - 1;
  const previewRemaining = Math.max(0, previewTurns - turnsUsed);

  return (
    <div className="fixed bottom-20 right-6 z-40 flex flex-col items-end gap-3 print:hidden">
      {open && (
        <div className="w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-white shadow-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200" style={{ height: '480px' }}>
          {/* Header */}
          <div className="px-5 py-3 border-b border-border bg-bg-subtle flex items-center justify-between shrink-0">
            <div>
              <p className="text-body-sm font-semibold text-tx-heading flex items-center gap-2">
                <span className="text-brand-teal">⚡</span> Spark
              </p>
              {isPreview && previewRemaining > 0 && (
                <p className="text-[11px] text-tx-muted mt-0.5">
                  {previewRemaining} free preview {previewRemaining === 1 ? 'turn' : 'turns'} remaining
                </p>
              )}
              {!isPreview && (
                <p className="text-[11px] text-brand-teal mt-0.5">Spark pass active</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close Spark"
              className="text-tx-muted hover:text-tx-heading transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          {status !== 'preview_exhausted' && status !== 'session_limit' && (
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center pt-8">
                  <p className="text-[13px] text-tx-secondary leading-relaxed">
                    Ask me anything about Una Labs — how it works, pricing, or how to start your project.
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-brand-teal text-white'
                        : 'bg-bg-subtle border border-border text-tx-heading'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {status === 'loading' && (
                <div className="flex justify-start">
                  <div className="bg-bg-subtle border border-border rounded-xl px-3.5 py-2.5">
                    <span className="text-[13px] text-tx-muted animate-pulse">Spark is thinking…</span>
                  </div>
                </div>
              )}
              {errorMsg && (
                <p className="text-[12px] text-red-500 text-center px-2">{errorMsg}</p>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Billing gate */}
          {status === 'preview_exhausted' && (
            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
              <div className="text-center">
                <p className="text-[13px] font-semibold text-tx-heading">Preview turns used</p>
                <p className="text-[12px] text-tx-secondary mt-1 leading-relaxed">
                  You have used your {previewTurns} free preview turns. Get a Spark pass to keep chatting.
                </p>
              </div>
              <div className="rounded-xl border border-brand-teal/30 bg-brand-teal/5 p-4">
                <p className="text-[12px] font-semibold text-tx-heading mb-1">Spark Pass</p>
                <p className="text-[11px] text-tx-secondary mb-3">One-time payment. 90-day access. Up to {maxTurns} turns per session.</p>
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-[13px] text-tx-heading placeholder-tx-muted focus:outline-none focus:border-brand-teal"
                  />
                  {payingError && <p className="text-[11px] text-red-500">{payingError}</p>}
                  <button
                    type="button"
                    onClick={handleGetPass}
                    disabled={payingLoading}
                    className="w-full rounded-lg bg-brand-teal text-white py-2 text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {payingLoading ? 'Redirecting…' : 'Get Spark Pass →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Session limit */}
          {status === 'session_limit' && (
            <div className="flex-1 flex items-center justify-center px-5">
              <div className="text-center">
                <p className="text-[13px] font-semibold text-tx-heading">Session complete</p>
                <p className="text-[12px] text-tx-secondary mt-1 leading-relaxed">
                  You have reached the {maxTurns}-turn session limit. Start a new session to continue.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setTurnNumber(1);
                    saveTurnNumber(1);
                    setStatus('idle');
                    setErrorMsg('');
                  }}
                  className="mt-4 rounded-lg bg-brand-teal text-white px-4 py-2 text-[13px] font-semibold hover:opacity-90 transition-opacity"
                >
                  Start new session
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          {status !== 'preview_exhausted' && status !== 'session_limit' && (
            <div className="border-t border-border px-4 py-3 shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  placeholder="Ask Spark…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={status === 'loading'}
                  className="flex-1 resize-none rounded-lg border border-border px-3 py-2 text-[13px] text-tx-heading placeholder-tx-muted focus:outline-none focus:border-brand-teal disabled:opacity-60 leading-relaxed"
                  style={{ maxHeight: '80px' }}
                />
                {typeof window !== 'undefined' && (window.SpeechRecognition ?? window.webkitSpeechRecognition) && (
                  <button
                    type="button"
                    onClick={startVoice}
                    aria-label={isListening ? 'Stop listening' : 'Use voice input'}
                    className={[
                      'shrink-0 flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-bg-offwhite text-tx-secondary hover:bg-brand-teal/10 hover:text-brand-teal border border-border',
                    ].join(' ')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                      <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!input.trim() || status === 'loading'}
                  aria-label="Send message"
                  className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-teal text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trigger button */}
      <button
        type="button"
        aria-label={open ? 'Close Spark' : 'Open Spark AI chat'}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:opacity-90 transition-opacity"
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    </div>
  );
}
