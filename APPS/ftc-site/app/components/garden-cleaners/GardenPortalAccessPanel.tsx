"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { GardenPortalUserRole } from "../../../lib/gardenContracts";
import getSupabase from "../../../lib/supabase";

type PortalProjectRecord = {
  id: string;
  name: string | null;
  status: string | null;
  description: string | null;
  created_at: string | null;
  service_region: string | null;
  assigned_owner: string | null;
};

type AuthState = "loading" | "authenticated" | "unauthenticated" | "unavailable";
type SignInState = "idle" | "submitting" | "error" | "success";
type QueueFilter = "all" | "new" | "triaged" | "scheduled" | "completed" | "cancelled";
type RegionTag = "Oshawa" | "Whitby" | "Ajax" | "Pickering" | "Courtice" | "Durham Region" | "Unspecified";

const REGION_OPTIONS: RegionTag[] = ["Oshawa", "Whitby", "Ajax", "Pickering", "Courtice", "Durham Region", "Unspecified"];

const VALID_QUEUE_STATUSES = new Set<Exclude<QueueFilter, "all">>([
  "new",
  "triaged",
  "scheduled",
  "completed",
  "cancelled"
]);

function normalizeStatus(value: string | null): Exclude<QueueFilter, "all"> {
  const candidate = String(value || "").trim().toLowerCase();
  if (VALID_QUEUE_STATUSES.has(candidate as Exclude<QueueFilter, "all">)) {
    return candidate as Exclude<QueueFilter, "all">;
  }
  return "new";
}

function inferRegion(name: string | null, description: string | null): RegionTag {
  const text = `${name || ""} ${description || ""}`.toLowerCase();
  if (text.includes("oshawa")) {
    return "Oshawa";
  }
  if (text.includes("whitby")) {
    return "Whitby";
  }
  if (text.includes("ajax")) {
    return "Ajax";
  }
  if (text.includes("pickering")) {
    return "Pickering";
  }
  if (text.includes("courtice")) {
    return "Courtice";
  }
  if (text.includes("durham")) {
    return "Durham Region";
  }
  return "Unspecified";
}

function inferOwner(description: string | null): string {
  const text = description || "";
  const match = text.match(/(?:owner|assignee|assigned to)\s*[:\-]\s*([a-z0-9 ._@-]{3,80})/i);
  if (!match) {
    return "Unassigned";
  }

  return match[1].trim();
}

function normalizeRegion(value: string | null): RegionTag | null {
  const candidate = String(value || "").trim().toLowerCase();
  if (!candidate) {
    return null;
  }
  if (candidate === "oshawa") {
    return "Oshawa";
  }
  if (candidate === "whitby") {
    return "Whitby";
  }
  if (candidate === "ajax") {
    return "Ajax";
  }
  if (candidate === "pickering") {
    return "Pickering";
  }
  if (candidate === "courtice") {
    return "Courtice";
  }
  if (candidate === "durham" || candidate === "durham region") {
    return "Durham Region";
  }
  if (candidate === "unspecified") {
    return "Unspecified";
  }
  return null;
}

function resolveRecordRegion(record: PortalProjectRecord): RegionTag {
  return normalizeRegion(record.service_region) || inferRegion(record.name, record.description);
}

function resolveRecordOwner(record: PortalProjectRecord): string {
  return String(record.assigned_owner || "").trim() || inferOwner(record.description);
}

function isMissingColumnError(message: string, columnName: string): boolean {
  const text = message.toLowerCase();
  return text.includes("column") && text.includes(columnName.toLowerCase()) && text.includes("does not exist");
}

function parseEmailList(value?: string): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function resolveRole(email: string): GardenPortalUserRole {
  const normalizedEmail = email.trim().toLowerCase();
  const adminEmails = parseEmailList(process.env.NEXT_PUBLIC_GARDEN_PORTAL_ADMIN_EMAILS);
  const staffEmails = parseEmailList(process.env.NEXT_PUBLIC_GARDEN_PORTAL_STAFF_EMAILS);

  if (adminEmails.includes(normalizedEmail)) {
    return "admin";
  }

  if (staffEmails.includes(normalizedEmail) || normalizedEmail.endsWith("@gardencleaners.ca")) {
    return "staff";
  }

  return "client";
}

export default function GardenPortalAccessPanel() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [userEmail, setUserEmail] = useState<string>("");
  const [role, setRole] = useState<GardenPortalUserRole | null>(null);
  const [records, setRecords] = useState<PortalProjectRecord[]>([]);
  const [loadError, setLoadError] = useState<string>("");
  const [signInEmail, setSignInEmail] = useState<string>("");
  const [signInPassword, setSignInPassword] = useState<string>("");
  const [signInState, setSignInState] = useState<SignInState>("idle");
  const [signInMessage, setSignInMessage] = useState<string>("");
  const [pendingStatusProjectId, setPendingStatusProjectId] = useState<string>("");
  const [pendingAssignmentProjectId, setPendingAssignmentProjectId] = useState<string>("");
  const [pendingRegionProjectId, setPendingRegionProjectId] = useState<string>("");
  const [regionDraftByProjectId, setRegionDraftByProjectId] = useState<Record<string, RegionTag>>({});
  const [queueMessage, setQueueMessage] = useState<string>("");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [queueSearch, setQueueSearch] = useState<string>("");
  const [queueRegion, setQueueRegion] = useState<"all" | RegionTag>("all");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const canOperateQueue = role === "staff" || role === "admin";
  const canMarkCompleted = role === "admin";
  const canAssignSelf = role === "staff" || role === "admin";
  const canEditRegion = role === "admin";

  const visibleRecords = useMemo(() => {
    const normalizedSearch = queueSearch.trim().toLowerCase();
    return records.filter((record) => {
      const normalizedStatus = normalizeStatus(record.status);
      const statusMatches = queueFilter === "all" ? true : normalizedStatus === queueFilter;
      const regionMatches = queueRegion === "all" ? true : resolveRecordRegion(record) === queueRegion;
      if (!statusMatches) {
        return false;
      }
      if (!regionMatches) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }

      const haystack = `${record.name || ""} ${record.description || ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [records, queueFilter, queueRegion, queueSearch]);

  const queueCounts = useMemo(() => {
    const counts: Record<Exclude<QueueFilter, "all">, number> = {
      new: 0,
      triaged: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0
    };

    for (const record of records) {
      counts[normalizeStatus(record.status)] += 1;
    }

    return counts;
  }, [records]);

  const regionCounts = useMemo(() => {
    const counts: Record<RegionTag, number> = {
      Oshawa: 0,
      Whitby: 0,
      Ajax: 0,
      Pickering: 0,
      Courtice: 0,
      "Durham Region": 0,
      Unspecified: 0
    };

    for (const record of records) {
      counts[resolveRecordRegion(record)] += 1;
    }

    return counts;
  }, [records]);

  useEffect(() => {
    setRegionDraftByProjectId((prev) => {
      const next: Record<string, RegionTag> = {};
      for (const record of records) {
        next[record.id] = prev[record.id] || resolveRecordRegion(record);
      }
      return next;
    });
  }, [records]);

  async function loadRecords(nextRole: GardenPortalUserRole, sessionEmail: string) {
    const supabase = getSupabase();

    async function runQuery(selectColumns: string) {
      const baseQuery = supabase
        .from("projects")
        .select(selectColumns)
        .order("created_at", { ascending: false })
        .limit(nextRole === "client" ? 6 : 12);

      return nextRole === "client"
        ? baseQuery.ilike("email", sessionEmail)
        : baseQuery.ilike("name", "%Garden%");
    }

    const preferred = await runQuery("id,name,status,description,created_at,service_region,assigned_owner");
    if (!preferred.error) {
      setLoadError("");
      setRecords((preferred.data || []) as unknown as PortalProjectRecord[]);
      return;
    }

    const fallback = await runQuery("id,name,status,description,created_at");
    if (fallback.error) {
      setRecords([]);
      setLoadError("Portal records are currently unavailable. You are authenticated, but data access is restricted for this session.");
      return;
    }

    setLoadError("");
    setRecords(
      ((fallback.data || []) as unknown as Array<Omit<PortalProjectRecord, "service_region" | "assigned_owner">>).map((item) => ({
        ...item,
        service_region: null,
        assigned_owner: null
      }))
    );
  }

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    async function loadSessionAndData(emailFromSession?: string) {
      try {
        const supabase = getSupabase();
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionEmail = (emailFromSession || sessionData.session?.user?.email || "").trim().toLowerCase();

        if (!mounted) {
          return;
        }

        if (!sessionEmail) {
          setAuthState("unauthenticated");
          setUserEmail("");
          setRole(null);
          setRecords([]);
          setLoadError("");
          setQueueMessage("");
          return;
        }

        const nextRole = resolveRole(sessionEmail);
        setAuthState("authenticated");
        setUserEmail(sessionEmail);
        setRole(nextRole);
        await loadRecords(nextRole, sessionEmail);
      } catch {
        if (!mounted) {
          return;
        }
        setAuthState("unavailable");
        setUserEmail("");
        setRole(null);
        setRecords([]);
        setLoadError("Supabase public environment is not configured for this deployment.");
      }
    }

    async function init() {
      await loadSessionAndData();

      try {
        const supabase = getSupabase();
        const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          void loadSessionAndData(nextSession?.user?.email || undefined);
        });
        unsubscribe = () => {
          data.subscription.unsubscribe();
        };
      } catch {
        // no-op: init already handled unavailable state
      }
    }

    void init();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = signInEmail.trim().toLowerCase();
    const password = signInPassword.trim();

    if (!email || !password) {
      setSignInState("error");
      setSignInMessage("Email and password are required.");
      return;
    }

    try {
      const supabase = getSupabase();
      setSignInState("submitting");
      setSignInMessage("");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setSignInState("error");
        setSignInMessage(error.message || "Unable to sign in with email and password.");
        return;
      }

      setSignInState("success");
      setSignInMessage("Signed in. Loading your portal records...");
      setSignInPassword("");
    } catch {
      setSignInState("error");
      setSignInMessage("Sign-in is unavailable in this deployment.");
    }
  }

  async function sendMagicLink() {
    const email = signInEmail.trim().toLowerCase();
    if (!email) {
      setSignInState("error");
      setSignInMessage("Enter your email first to send a magic link.");
      return;
    }

    try {
      const supabase = getSupabase();
      setSignInState("submitting");
      setSignInMessage("");
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        setSignInState("error");
        setSignInMessage(error.message || "Unable to send magic link.");
        return;
      }

      setSignInState("success");
      setSignInMessage("Magic link sent. Check your inbox and return to this portal tab.");
    } catch {
      setSignInState("error");
      setSignInMessage("Magic link delivery is unavailable in this deployment.");
    }
  }

  async function updateProjectStatus(projectId: string, nextStatus: string) {
    if (!canOperateQueue || !userEmail) {
      return;
    }

    if (!VALID_QUEUE_STATUSES.has(nextStatus as Exclude<QueueFilter, "all">)) {
      setQueueMessage("Invalid queue transition requested.");
      return;
    }

    try {
      const supabase = getSupabase();
      setPendingStatusProjectId(projectId);
      setQueueMessage("");
      const existing = records.find((item) => item.id === projectId);
      if (existing && normalizeStatus(existing.status) === nextStatus) {
        setQueueMessage(`Project is already marked ${nextStatus}.`);
        return;
      }

      const previousStatus = existing?.status || null;
      setRecords((prev) => prev.map((item) => (item.id === projectId ? { ...item, status: nextStatus } : item)));

      const { error } = await supabase
        .from("projects")
        .update({ status: nextStatus })
        .eq("id", projectId);

      if (error) {
        setRecords((prev) => prev.map((item) => (item.id === projectId ? { ...item, status: previousStatus } : item)));
        setQueueMessage(error.message || "Unable to update queue status for this project.");
        return;
      }

      setQueueMessage(`Project status updated to ${nextStatus}.`);
    } catch {
      setQueueMessage("Queue update is temporarily unavailable.");
    } finally {
      setPendingStatusProjectId("");
    }
  }

  async function assignProjectOwner(projectId: string) {
    if (!canAssignSelf || !userEmail) {
      return;
    }

    try {
      const supabase = getSupabase();
      setPendingAssignmentProjectId(projectId);
      setQueueMessage("");
      const existing = records.find((item) => item.id === projectId);
      const previousOwner = existing?.assigned_owner || null;
      setRecords((prev) => prev.map((item) => (item.id === projectId ? { ...item, assigned_owner: userEmail } : item)));
      const { error } = await supabase
        .from("projects")
        .update({ assigned_owner: userEmail })
        .eq("id", projectId);

      if (error) {
        setRecords((prev) => prev.map((item) => (item.id === projectId ? { ...item, assigned_owner: previousOwner } : item)));
        if (isMissingColumnError(error.message || "", "assigned_owner")) {
          setQueueMessage("Owner assignment requires schema rollout. Apply migration 202604260004 and refresh.");
          return;
        }
        setQueueMessage(error.message || "Unable to assign owner for this project.");
        return;
      }

      setQueueMessage(`Project assigned to ${userEmail}.`);
    } catch {
      setQueueMessage("Owner assignment is temporarily unavailable.");
    } finally {
      setPendingAssignmentProjectId("");
    }
  }

  async function updateProjectRegion(projectId: string) {
    if (!canEditRegion || !userEmail) {
      return;
    }

    const nextRegion = regionDraftByProjectId[projectId] || "Unspecified";

    try {
      const supabase = getSupabase();
      setPendingRegionProjectId(projectId);
      setQueueMessage("");
      const existing = records.find((item) => item.id === projectId);
      const previousRegion = existing?.service_region || null;
      setRecords((prev) => prev.map((item) => (item.id === projectId ? { ...item, service_region: nextRegion } : item)));
      const { error } = await supabase
        .from("projects")
        .update({ service_region: nextRegion })
        .eq("id", projectId);

      if (error) {
        setRecords((prev) => prev.map((item) => (item.id === projectId ? { ...item, service_region: previousRegion } : item)));
        if (isMissingColumnError(error.message || "", "service_region")) {
          setQueueMessage("Region save requires schema rollout. Apply migration 202604260004 and refresh.");
          return;
        }
        setQueueMessage(error.message || "Unable to update region for this project.");
        return;
      }

      setQueueMessage(`Project region updated to ${nextRegion}.`);
    } catch {
      setQueueMessage("Region update is temporarily unavailable.");
    } finally {
      setPendingRegionProjectId("");
    }
  }

  async function refreshQueue() {
    if (!role || !userEmail) {
      return;
    }
    try {
      setIsRefreshing(true);
      setQueueMessage("");
      await loadRecords(role, userEmail);
      setQueueMessage("Queue refreshed from live records.");
    } catch {
      setQueueMessage("Unable to refresh queue right now.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function signOut() {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch {
      setAuthState("unavailable");
    }
  }

  return (
    <section className="section garden-section">
      <div className="section-heading">
        <p className="eyebrow">Portal access</p>
        <h2>Authenticated client and staff lanes</h2>
        <p>
          The portal now checks your authenticated session and unlocks lane visibility based on role. Client sessions load personal delivery records;
          staff and admin sessions load Garden operational records.
        </p>
      </div>

      <div className="garden-split-grid">
        <article className="card garden-split-card">
          <p className="garden-panel-kicker">Session state</p>
          <h2>
            {authState === "loading" && "Checking portal session..."}
            {authState === "unauthenticated" && "Sign in required"}
            {authState === "unavailable" && "Portal auth unavailable"}
            {authState === "authenticated" && `Signed in as ${role}`}
          </h2>
          {userEmail ? <p>{userEmail}</p> : null}

          {authState === "unauthenticated" ? (
            <form className="intake-form" onSubmit={signInWithPassword} noValidate>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  name="portalEmail"
                  value={signInEmail}
                  autoComplete="email"
                  onChange={(event) => setSignInEmail(event.currentTarget.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  name="portalPassword"
                  value={signInPassword}
                  autoComplete="current-password"
                  onChange={(event) => setSignInPassword(event.currentTarget.value)}
                  placeholder="Enter your password"
                  required
                />
              </label>
              <div className="hero-actions">
                <button type="submit" className="btn btn-primary" disabled={signInState === "submitting"}>
                  {signInState === "submitting" ? "Signing in..." : "Sign in to portal"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={sendMagicLink} disabled={signInState === "submitting"}>
                  Send magic link
                </button>
              </div>
              {signInMessage ? (
                <p className={signInState === "error" ? "form-feedback error" : "form-feedback success"}>
                  {signInMessage}
                </p>
              ) : null}
            </form>
          ) : null}

          {authState === "unavailable" ? <p>{loadError}</p> : null}

          {authState === "authenticated" ? (
            <button type="button" className="btn btn-secondary" onClick={signOut}>
              Sign out of portal session
            </button>
          ) : null}
        </article>

        <article className="card garden-split-card">
          <p className="garden-panel-kicker">Lane visibility</p>
          <h2>Role-based lane unlocks</h2>
          <ul className="feature-list compact-feature-list">
            <li>Client: personal request and delivery visibility</li>
            <li>Staff: queue triage and regional routing visibility</li>
            <li>Admin: full operations oversight</li>
          </ul>
          {canOperateQueue ? <p>Staff and admin accounts can update queue status directly from each record card below.</p> : null}
          {loadError && authState === "authenticated" ? <p>{loadError}</p> : null}
          {queueMessage ? <p>{queueMessage}</p> : null}
        </article>
      </div>

      {authState === "authenticated" ? (
        <>
          {canOperateQueue ? (
            <article className="card garden-proof-card">
              <h3>Operations queue controls</h3>
              <div className="intake-form-grid">
                <label>
                  <span>Status filter</span>
                  <select value={queueFilter} onChange={(event) => setQueueFilter(event.currentTarget.value as QueueFilter)}>
                    <option value="all">All statuses</option>
                    <option value="new">New</option>
                    <option value="triaged">Triaged</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <label>
                  <span>Region filter</span>
                  <select value={queueRegion} onChange={(event) => setQueueRegion(event.currentTarget.value as "all" | RegionTag)}>
                    <option value="all">All regions</option>
                    {REGION_OPTIONS.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Search queue</span>
                  <input
                    type="text"
                    value={queueSearch}
                    onChange={(event) => setQueueSearch(event.currentTarget.value)}
                    placeholder="Search by project name or details"
                  />
                </label>
              </div>
              <div className="hero-actions">
                <button type="button" className="btn btn-secondary" onClick={refreshQueue} disabled={isRefreshing}>
                  {isRefreshing ? "Refreshing..." : "Refresh queue"}
                </button>
              </div>
              <p>
                Queue mix: {queueCounts.new} new, {queueCounts.triaged} triaged, {queueCounts.scheduled} scheduled, {queueCounts.completed} completed, {queueCounts.cancelled} cancelled.
              </p>
              <p>
                Regions: {regionCounts.Oshawa} Oshawa, {regionCounts.Whitby} Whitby, {regionCounts.Ajax} Ajax, {regionCounts.Pickering} Pickering, {regionCounts.Courtice} Courtice, {regionCounts["Durham Region"]} Durham Region, {regionCounts.Unspecified} unspecified.
              </p>
            </article>
          ) : null}

          <div className="cards-grid cards-grid-3">
            {visibleRecords.length ? (
              visibleRecords.map((record) => (
              <article key={record.id} className="card garden-proof-card">
                <h3>{record.name || "Untitled project"}</h3>
                <p>
                  <strong>Status:</strong> {normalizeStatus(record.status)}
                </p>
                <p>
                  <strong>Region:</strong> {resolveRecordRegion(record)}
                </p>
                <p>
                  <strong>Owner:</strong> {resolveRecordOwner(record)}
                </p>
                {canEditRegion ? (
                  <label>
                    <span>Set region</span>
                    <select
                      value={regionDraftByProjectId[record.id] || resolveRecordRegion(record)}
                      onChange={(event) =>
                        setRegionDraftByProjectId((prev) => ({
                          ...prev,
                          [record.id]: event.currentTarget.value as RegionTag
                        }))
                      }
                    >
                      {REGION_OPTIONS.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <p>{record.description || "No project description available."}</p>
                <p>
                  <strong>Created:</strong>{" "}
                  {record.created_at ? new Date(record.created_at).toLocaleDateString("en-CA") : "unknown"}
                </p>
                {canOperateQueue ? (
                  <div className="hero-actions" aria-label="Queue status actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void updateProjectStatus(record.id, "triaged")}
                      disabled={pendingStatusProjectId === record.id || normalizeStatus(record.status) === "triaged"}
                    >
                      Mark triaged
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void updateProjectStatus(record.id, "scheduled")}
                      disabled={pendingStatusProjectId === record.id || normalizeStatus(record.status) === "scheduled"}
                    >
                      Mark scheduled
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void updateProjectStatus(record.id, "completed")}
                      disabled={!canMarkCompleted || pendingStatusProjectId === record.id || normalizeStatus(record.status) === "completed"}
                    >
                      Mark completed
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void assignProjectOwner(record.id)}
                      disabled={!canAssignSelf || pendingAssignmentProjectId === record.id || resolveRecordOwner(record) === userEmail}
                    >
                      {pendingAssignmentProjectId === record.id ? "Assigning..." : "Assign to me"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void updateProjectRegion(record.id)}
                      disabled={!canEditRegion || pendingRegionProjectId === record.id}
                    >
                      {pendingRegionProjectId === record.id ? "Saving region..." : "Save region"}
                    </button>
                  </div>
                ) : null}
              </article>
              ))
            ) : (
              <article className="card garden-proof-card">
                <h3>No records available for this session</h3>
                <p>
                  Your session is authenticated, but there are no accessible project rows for the current role and active queue filters.
                </p>
              </article>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}