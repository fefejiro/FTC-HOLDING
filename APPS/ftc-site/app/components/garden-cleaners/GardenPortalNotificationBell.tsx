"use client";

import { useEffect, useMemo, useState } from "react";
import getSupabase, { loadRuntimeSupabaseConfig } from "../../../lib/supabase";

type PortalNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  details: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
};

type Props = {
  enabled: boolean;
};

const VIBRATION_KEY = "gc_portal_vibration_enabled";
const SOUND_KEY = "gc_portal_sound_enabled";

function loadSetting(key: string, fallback = false): boolean {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (value == null) return fallback;
  return value === "true";
}

function toUint8Array(base64Value: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Value.length % 4)) % 4);
  const base64 = (base64Value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message || fallback : fallback;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  await loadRuntimeSupabaseConfig();
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("No session token");
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });
}

export default function GardenPortalNotificationBell({ enabled }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [pushReady, setPushReady] = useState(false);
  const [lastAnnouncedId, setLastAnnouncedId] = useState<string>("");

  const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);

  useEffect(() => {
    setSoundEnabled(loadSetting(SOUND_KEY, false));
    setVibrationEnabled(loadSetting(VIBRATION_KEY, false));
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    async function pullNotifications() {
      try {
        setLoading(true);
        const res = await fetchWithAuth("/api/garden-cleaners-notifications?limit=40").then((r) => r.json());
        if (!res.ok) throw new Error(res.error || "Unable to load notifications");
        if (!active) return;
        const items: PortalNotification[] = res.notifications || [];
        setNotifications(items);
      } catch (error: unknown) {
        if (!active) return;
        setMessage(getErrorMessage(error, "Unable to load notifications"));
      } finally {
        if (active) setLoading(false);
      }
    }

    void pullNotifications();
    const interval = window.setInterval(() => {
      void pullNotifications();
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const latestUnread = notifications.find((item) => !item.is_read);
    if (!latestUnread) return;
    if (latestUnread.id === lastAnnouncedId) return;
    setLastAnnouncedId(latestUnread.id);

    if (permission === "granted" && typeof window !== "undefined" && document.visibilityState === "visible") {
      try {
        new Notification(latestUnread.title, {
          body: latestUnread.body,
          tag: latestUnread.id
        });
      } catch {
        // no-op
      }
    }

    if (permission === "granted" && soundEnabled && typeof window !== "undefined" && document.visibilityState === "visible") {
      try {
        const audio = new Audio(
          "data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YRAAAAAA"
        );
        void audio.play();
      } catch {
        // no-op
      }
    }

    if (permission === "granted" && vibrationEnabled && typeof navigator !== "undefined" && "vibrate" in navigator && document.visibilityState === "visible") {
      try {
        navigator.vibrate?.([80, 20, 80]);
      } catch {
        // no-op
      }
    }
  }, [notifications, permission, soundEnabled, vibrationEnabled, enabled, lastAnnouncedId]);

  async function markAsRead(id: string) {
    try {
      const res = await fetchWithAuth("/api/garden-cleaners-notifications", {
        method: "PATCH",
        body: JSON.stringify({ notification_id: id })
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error || "Unable to mark notification");
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, "Unable to update notification"));
    }
  }

  async function requestBrowserAlerts() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setMessage("Browser notifications are not supported on this device.");
      return;
    }

    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        setMessage("Browser notifications remain disabled.");
        return;
      }

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setMessage("Push is unavailable in this browser. In-app notifications will continue.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/garden-portal-sw.js", { scope: "/portal" });
      const publicKey = process.env.NEXT_PUBLIC_GARDEN_PORTAL_VAPID_PUBLIC_KEY;

      if (!publicKey) {
        setPushReady(false);
        setMessage("Push setup key not configured yet. In-app notifications are active.");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8Array(publicKey)
      });

      const saveRes = await fetchWithAuth("/api/garden-cleaners-notification-subscription", {
        method: "POST",
        body: JSON.stringify({ subscription })
      }).then((r) => r.json());

      if (!saveRes.ok) throw new Error(saveRes.error || "Unable to save push preference");
      setPushReady(Boolean(saveRes.pushReady));
      setMessage(saveRes.pushReady ? "Browser notifications enabled." : "Push storage is not ready yet. In-app notifications are active.");
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, "Unable to enable browser notifications"));
    }
  }

  if (!enabled) return null;

  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", gap: 8 }}>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen((value) => !value)}>
        Notifications ({unreadCount})
      </button>
      {open ? (
        <article className="card garden-proof-card" style={{ minWidth: 320, maxWidth: 420, position: "absolute", right: 0, top: "100%", zIndex: 30 }}>
          <h4 style={{ marginTop: 0 }}>Portal notifications</h4>
          <p className="muted">In-app notifications are the reliable baseline.</p>
          <div className="hero-actions" style={{ marginBottom: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={requestBrowserAlerts}>
              Enable browser alerts
            </button>
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            Permission: {permission}{pushReady ? " | Push-ready" : " | Push fallback"}
          </p>
          <label style={{ display: "block", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => {
                const next = e.currentTarget.checked;
                setSoundEnabled(next);
                if (typeof window !== "undefined") window.localStorage.setItem(SOUND_KEY, String(next));
              }}
            />
            <span style={{ marginLeft: 8 }}>Optional in-app sound</span>
          </label>
          <label style={{ display: "block", marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={vibrationEnabled}
              onChange={(e) => {
                const next = e.currentTarget.checked;
                setVibrationEnabled(next);
                if (typeof window !== "undefined") window.localStorage.setItem(VIBRATION_KEY, String(next));
              }}
            />
            <span style={{ marginLeft: 8 }}>Optional in-app vibration</span>
          </label>

          {loading ? <p className="muted">Loading...</p> : null}
          {message ? <p className="muted">{message}</p> : null}
          <div style={{ display: "grid", gap: 8, maxHeight: 320, overflow: "auto" }}>
            {notifications.length === 0 ? <p className="muted">No notifications yet.</p> : null}
            {notifications.map((item) => (
              <article key={item.id} className="card" style={{ borderColor: item.is_read ? "#dce8df" : "#9fc7b7" }}>
                <p style={{ margin: "0 0 4px", fontWeight: 600 }}>{item.title}</p>
                <p className="muted" style={{ margin: "0 0 8px" }}>{item.body}</p>
                <div className="hero-actions" style={{ justifyContent: "space-between" }}>
                  <span className="muted" style={{ fontSize: 12 }}>{new Date(item.created_at).toLocaleString("en-CA")}</span>
                  {!item.is_read ? (
                    <button type="button" className="btn btn-secondary" onClick={() => markAsRead(item.id)}>
                      Mark read
                    </button>
                  ) : (
                    <span className="muted">Read</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </article>
      ) : null}
    </div>
  );
}
