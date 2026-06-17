'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@/app/lib/supabase/client';

type AuthorRole = 'student' | 'tutor';
type Tool = 'pen' | 'eraser';
type EventType = 'stroke' | 'erase' | 'clear';

type Point = {
  x: number;
  y: number;
};

type WhiteboardPayload = {
  points?: Point[];
  color?: string;
  width?: number;
};

type WhiteboardEvent = {
  id: string;
  booking_id: string;
  author_profile_id: string;
  author_role: AuthorRole;
  event_type: EventType;
  payload: WhiteboardPayload;
  created_at: string;
};

type Props = {
  bookingId: string;
  authorProfileId: string;
  authorRole: AuthorRole;
};

function isPoint(value: unknown): value is Point {
  return (
    Boolean(value)
    && typeof value === 'object'
    && typeof (value as Point).x === 'number'
    && typeof (value as Point).y === 'number'
  );
}

function normalizeEvent(row: Partial<WhiteboardEvent>): WhiteboardEvent | null {
  if (!row.id || !row.booking_id || !row.author_profile_id || !row.author_role || !row.event_type || !row.created_at) {
    return null;
  }

  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const points = Array.isArray(payload.points) ? payload.points.filter(isPoint) : [];

  return {
    id: row.id,
    booking_id: row.booking_id,
    author_profile_id: row.author_profile_id,
    author_role: row.author_role,
    event_type: row.event_type,
    payload: {
      points,
      color: typeof payload.color === 'string' ? payload.color : '#0f172a',
      width: typeof payload.width === 'number' ? payload.width : 3,
    },
    created_at: row.created_at,
  };
}

function getCanvasPoint(canvas: HTMLCanvasElement, event: PointerEvent | React.PointerEvent<HTMLCanvasElement>): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function drawPath(context: CanvasRenderingContext2D, event: WhiteboardEvent) {
  if (event.event_type === 'clear') {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    return;
  }

  const points = event.payload.points ?? [];
  if (points.length === 0) return;

  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = event.payload.width ?? 3;
  context.strokeStyle = event.payload.color ?? '#0f172a';
  context.globalCompositeOperation = event.event_type === 'erase' ? 'destination-out' : 'source-over';

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) {
    context.lineTo(point.x, point.y);
  }
  if (points.length === 1) {
    context.lineTo(points[0].x + 0.1, points[0].y + 0.1);
  }
  context.stroke();
  context.restore();
}

export default function WhiteboardCanvas({ bookingId, authorProfileId, authorRole }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePointsRef = useRef<Point[]>([]);
  const [events, setEvents] = useState<WhiteboardEvent[]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [status, setStatus] = useState('Loading board...');
  const [isDrawing, setIsDrawing] = useState(false);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    const nextWidth = Math.max(1, Math.floor(rect.width * scale));
    const nextHeight = Math.max(1, Math.floor(rect.height * scale));

    if (canvas.width === nextWidth && canvas.height === nextHeight) return;
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }, []);

  const replayEvents = useCallback((nextEvents: WhiteboardEvent[]) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const event of nextEvents) {
      drawPath(context, event);
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    replayEvents(events);

    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [events, replayEvents, resizeCanvas]);

  useEffect(() => {
    let mounted = true;
    const supabase = createBrowserClient();

    async function loadEvents() {
      const { data, error } = await supabase
        .from('whiteboard_events')
        .select('id, booking_id, author_profile_id, author_role, event_type, payload, created_at')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })
        .limit(1000);

      if (!mounted) return;

      if (error) {
        setStatus(`Whiteboard unavailable: ${error.message}`);
        return;
      }

      const rows = (data ?? []) as Partial<WhiteboardEvent>[];
      const normalized = rows
        .map((row) => normalizeEvent(row))
        .filter((event): event is WhiteboardEvent => Boolean(event));

      setEvents(normalized);
      setStatus(normalized.length > 0 ? 'Board restored' : 'Board ready');
    }

    void loadEvents();

    const channel = supabase
      .channel(`whiteboard:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whiteboard_events',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload: { new: Partial<WhiteboardEvent> }) => {
          const nextEvent = normalizeEvent(payload.new as Partial<WhiteboardEvent>);
          if (!nextEvent) return;
          setEvents((current) => (
            current.some((event) => event.id === nextEvent.id)
              ? current
              : [...current, nextEvent].sort((left, right) => left.created_at.localeCompare(right.created_at))
          ));
          setStatus(nextEvent.event_type === 'clear' ? 'Board cleared' : 'Board synced');
        },
      )
      .subscribe((state: string) => {
        if (state === 'SUBSCRIBED') setStatus((current) => (current === 'Loading board...' ? 'Board ready' : current));
      });

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [bookingId]);

  async function saveEvent(eventType: EventType, payload: WhiteboardPayload) {
    const supabase = createBrowserClient();
    const { error } = await supabase.from('whiteboard_events').insert({
      booking_id: bookingId,
      author_profile_id: authorProfileId,
      author_role: authorRole,
      event_type: eventType,
      payload,
    });

    if (error) {
      setStatus(`Could not save board event: ${error.message}`);
      return false;
    }

    return true;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(canvas, event);
    activePointsRef.current = [point];
    setIsDrawing(true);

    drawPath(context, {
      id: 'preview',
      booking_id: bookingId,
      author_profile_id: authorProfileId,
      author_role: authorRole,
      event_type: tool === 'eraser' ? 'erase' : 'stroke',
      payload: {
        points: [point],
        color: '#0f172a',
        width: tool === 'eraser' ? 18 : 3,
      },
      created_at: new Date().toISOString(),
    });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const point = getCanvasPoint(canvas, event);
    const points = activePointsRef.current;
    const previous = points[points.length - 1] ?? point;
    points.push(point);

    drawPath(context, {
      id: 'preview',
      booking_id: bookingId,
      author_profile_id: authorProfileId,
      author_role: authorRole,
      event_type: tool === 'eraser' ? 'erase' : 'stroke',
      payload: {
        points: [previous, point],
        color: '#0f172a',
        width: tool === 'eraser' ? 18 : 3,
      },
      created_at: new Date().toISOString(),
    });
  }

  async function finishStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDrawing(false);

    const points = activePointsRef.current;
    activePointsRef.current = [];
    if (points.length === 0) return;

    setStatus('Saving board...');
    await saveEvent(tool === 'eraser' ? 'erase' : 'stroke', {
      points,
      color: '#0f172a',
      width: tool === 'eraser' ? 18 : 3,
    });
  }

  async function clearBoard() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    setStatus('Clearing board...');
    await saveEvent('clear', {});
  }

  return (
    <section
      className="surface"
      data-testid="lesson-whiteboard"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '280px', padding: 0, overflow: 'hidden' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--spacing-3)',
          padding: 'var(--spacing-3) var(--spacing-4)',
          borderBottom: '1px solid #e2e8f0',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p className="kicker" style={{ marginBottom: 'var(--spacing-1)' }}>Shared Board</p>
          <h2 className="h4" style={{ marginBottom: 0 }}>Whiteboard</h2>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={tool === 'pen' ? 'btn-primary' : 'btn-secondary'}
            data-testid="whiteboard-tool-pen"
            style={{ padding: '7px 11px' }}
            onClick={() => setTool('pen')}
          >
            Pen
          </button>
          <button
            type="button"
            className={tool === 'eraser' ? 'btn-primary' : 'btn-secondary'}
            data-testid="whiteboard-tool-eraser"
            style={{ padding: '7px 11px' }}
            onClick={() => setTool('eraser')}
          >
            Eraser
          </button>
          <button
            type="button"
            className="btn-secondary"
            data-testid="whiteboard-clear"
            style={{ padding: '7px 11px' }}
            onClick={() => {
              void clearBoard();
            }}
          >
            Clear
          </button>
        </div>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: '220px', background: '#fff8e8' }}>
        <canvas
          ref={canvasRef}
          data-testid="whiteboard-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => {
            void finishStroke(event);
          }}
          onPointerCancel={(event) => {
            void finishStroke(event);
          }}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
        />
        <p
          className="body-sm secondary"
          data-testid="whiteboard-status"
          style={{
            position: 'absolute',
            left: '12px',
            bottom: '10px',
            margin: 0,
            padding: '4px 8px',
            borderRadius: '999px',
            background: 'rgba(255,255,255,.82)',
          }}
        >
          {status}
        </p>
      </div>
    </section>
  );
}
