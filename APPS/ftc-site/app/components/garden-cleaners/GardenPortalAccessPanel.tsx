"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { GardenPortalUserRole } from "../../../lib/gardenContracts";
import getSupabase from "../../../lib/supabase";

// Types for new API integration
type JobRecord = {
  id: string;
  quote_id?: string;
  customer_email: string;
  address?: string;
  city?: string;
  region?: string;
  service_type?: string;
  service_frequency?: string;
  property_type?: string;
  status: string;
  status_updated_at?: string;
  created_at?: string;
  updated_at?: string;
  staff_profile_id?: string;
};
type QuoteRecord = {
  id: string;
  email: string;
  address?: string;
  city?: string;
  region?: string;
  service_type?: string;
  service_frequency?: string;
  property_type?: string;
  created_at?: string;
};

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
  // Unified state for jobs/quotes
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
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
  const [loading, setLoading] = useState<boolean>(false);

  const isAdmin = role === "admin";
  const isStaff = role === "staff";
  const isCustomer = role === "client";

  // Filtered jobs for staff/admin
  const visibleJobs = useMemo(() => {
    if (!isAdmin && !isStaff) return [];
    let filtered = jobs;
    if (queueFilter !== "all") {
      filtered = filtered.filter((j) => (j.status || "").toLowerCase() === queueFilter);
    }
    if (queueRegion !== "all") {
      filtered = filtered.filter((j) => (j.region || "Unspecified") === queueRegion);
    }
    if (queueSearch.trim()) {
      const s = queueSearch.trim().toLowerCase();
      filtered = filtered.filter((j) =>
        [j.address, j.city, j.service_type, j.property_type].join(" ").toLowerCase().includes(s)
      );
    }
    // Staff: only assigned jobs
    if (isStaff) {
      // TODO: filter by staff_profile_id if available
    }
    return filtered;
  }, [jobs, queueFilter, queueRegion, queueSearch, isAdmin, isStaff]);

  // Customer jobs
  const customerJobs = useMemo(() => {
    if (!isCustomer) return [];
    return jobs;
  }, [jobs, isCustomer]);

  // (Obsolete: queueCounts/regionCounts, now handled by jobs/quotes filtering and UI)

  // (Obsolete: regionDraftByProjectId effect, removed after jobs/quotes refactor)

  // API fetch helpers
  async function fetchWithAuth(url: string, options: RequestInit = {}) {
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

  async function loadPortalData(nextRole: GardenPortalUserRole) {
    setLoading(true);
    setLoadError("");
    try {
      if (nextRole === "admin") {
        // Admin: fetch all jobs and all quotes
        const [jobsRes, quotesRes] = await Promise.all([
          fetchWithAuth("/api/garden-cleaners-job").then(r => r.json()),
          fetchWithAuth("/api/garden-cleaners-quote").then(r => r.json()).catch(() => ({ ok: false, quotes: [] }))
        ]);
        if (!jobsRes.ok) throw new Error(jobsRes.error || "Failed to load jobs");
        setJobs(jobsRes.jobs || []);
        setQuotes(quotesRes.quotes || []);
      } else if (nextRole === "staff") {
        // Staff: fetch assigned jobs
        const jobsRes = await fetchWithAuth("/api/garden-cleaners-my-jobs").then(r => r.json());
        if (!jobsRes.ok) throw new Error(jobsRes.error || "Failed to load jobs");
        setJobs(jobsRes.jobs || []);
        setQuotes([]);
      } else {
        // Customer: fetch own jobs
        const jobsRes = await fetchWithAuth("/api/garden-cleaners-my-jobs").then(r => r.json());
        if (!jobsRes.ok) throw new Error(jobsRes.error || "Failed to load jobs");
        setJobs(jobsRes.jobs || []);
        setQuotes([]);
      }
    } catch (e: any) {
      setLoadError(e.message || "Failed to load portal data");
      setJobs([]);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    async function loadSessionAndData(emailFromSession?: string) {
      try {
        const supabase = getSupabase();
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionEmail = (emailFromSession || sessionData.session?.user?.email || "").trim().toLowerCase();

        if (!mounted) return;
        if (!sessionEmail) {
          setAuthState("unauthenticated");
          setUserEmail("");
          setRole(null);
          setJobs([]);
          setQuotes([]);
          setLoadError("");
          setQueueMessage("");
          return;
        }
        const nextRole = resolveRole(sessionEmail);
        setAuthState("authenticated");
        setUserEmail(sessionEmail);
        setRole(nextRole);
        await loadPortalData(nextRole);
      } catch {
        if (!mounted) return;
        setAuthState("unavailable");
        setUserEmail("");
        setRole(null);
        setJobs([]);
        setQuotes([]);
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
      } catch {}
    }
    void init();
    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
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

  // Staff: update job status
  async function updateJobStatus(jobId: string, nextStatus: string) {
    if (!isStaff && !isAdmin) return;
    setPendingStatusProjectId(jobId);
    setQueueMessage("");
    try {
      const res = await fetchWithAuth("/api/garden-cleaners-job-status", {
        method: "POST",
        body: JSON.stringify({ job_id: jobId, status: nextStatus })
      }).then(r => r.json());
      if (!res.ok) throw new Error(res.error || "Failed to update status");
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: nextStatus } : j)));
      setQueueMessage(`Job status updated to ${nextStatus}`);
    } catch (e: any) {
      setQueueMessage(e.message || "Unable to update job status");
    } finally {
      setPendingStatusProjectId("");
    }
  }

  // Admin: convert quote to job
  async function convertQuoteToJob(quoteId: string) {
    if (!isAdmin) return;
    setQueueMessage("");
    try {
      const res = await fetchWithAuth("/api/garden-cleaners-job", {
        method: "POST",
        body: JSON.stringify({ quote_id: quoteId })
      }).then(r => r.json());
      if (!res.ok) throw new Error(res.error || "Failed to convert quote");
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      setQueueMessage("Quote converted to job");
      await loadPortalData("admin");
    } catch (e: any) {
      setQueueMessage(e.message || "Unable to convert quote");
    }
  }

  // Admin: assign staff to job
  async function assignStaffToJob(jobId: string, staffProfileId: string) {
    if (!isAdmin) return;
    setQueueMessage("");
    try {
      const res = await fetchWithAuth("/api/garden-cleaners-job-assign", {
        method: "POST",
        body: JSON.stringify({ job_id: jobId, staff_profile_id: staffProfileId })
      }).then(r => r.json());
      if (!res.ok) throw new Error(res.error || "Failed to assign staff");
      setQueueMessage("Staff assigned to job");
      await loadPortalData("admin");
    } catch (e: any) {
      setQueueMessage(e.message || "Unable to assign staff");
    }
  }



  async function refreshQueue() {
    if (!role) return;
    try {
      setIsRefreshing(true);
      setQueueMessage("");
      await loadPortalData(role);
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

  // --- UI ---
  return (
    <section className="section garden-section">
      <div className="section-heading">
        <p className="eyebrow">Portal access</p>
        <h2>Role-based Garden Cleaners portal</h2>
        <p>
          {isAdmin && "Admin: manage all jobs, convert quotes, assign staff."}
          {isStaff && "Staff: view and update assigned jobs."}
          {isCustomer && "Customer: view your job status."}
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
                <input type="email" name="portalEmail" value={signInEmail} autoComplete="email" onChange={(e) => setSignInEmail(e.currentTarget.value)} placeholder="you@example.com" required />
              </label>
              <label>
                <span>Password</span>
                <input type="password" name="portalPassword" value={signInPassword} autoComplete="current-password" onChange={(e) => setSignInPassword(e.currentTarget.value)} placeholder="Enter your password" required />
              </label>
              <div className="hero-actions">
                <button type="submit" className="btn btn-primary" disabled={signInState === "submitting"}>{signInState === "submitting" ? "Signing in..." : "Sign in to portal"}</button>
                <button type="button" className="btn btn-secondary" onClick={sendMagicLink} disabled={signInState === "submitting"}>Send magic link</button>
              </div>
              {signInMessage ? <p className={signInState === "error" ? "form-feedback error" : "form-feedback success"}>{signInMessage}</p> : null}
            </form>
          ) : null}
          {authState === "unavailable" ? <p>{loadError}</p> : null}
          {authState === "authenticated" ? (
            <button type="button" className="btn btn-secondary" onClick={signOut}>Sign out of portal session</button>
          ) : null}
        </article>
        <article className="card garden-split-card">
          <p className="garden-panel-kicker">Lane visibility</p>
          <h2>Role: {role}</h2>
          {loadError && authState === "authenticated" ? <p>{loadError}</p> : null}
          {queueMessage ? <p>{queueMessage}</p> : null}
        </article>
      </div>
      {authState === "authenticated" && (
        <>
          {loading && <div className="loading">Loading portal data...</div>}
          {/* Admin: Quotes to convert */}
          {isAdmin && quotes.length > 0 && (
            <article className="card garden-proof-card">
              <h3>Quotes to Convert</h3>
              <ul>
                {quotes.map((q) => (
                  <li key={q.id}>
                    <div>Email: {q.email} | {q.address} {q.city} | {q.service_type} | {q.property_type}</div>
                    <button className="btn btn-secondary" onClick={() => convertQuoteToJob(q.id)}>Convert to Job</button>
                  </li>
                ))}
              </ul>
            </article>
          )}
          {/* Admin/Staff: Job queue */}
          {(isAdmin || isStaff) && (
            <article className="card garden-proof-card">
              <h3>Job Queue</h3>
              <div className="intake-form-grid">
                <label>
                  <span>Status filter</span>
                  <select value={queueFilter} onChange={(e) => setQueueFilter(e.currentTarget.value as QueueFilter)}>
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
                <label>
                  <span>Region filter</span>
                  <select value={queueRegion} onChange={(e) => setQueueRegion(e.currentTarget.value as "all" | RegionTag)}>
                    <option value="all">All regions</option>
                    {REGION_OPTIONS.map((region) => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Search queue</span>
                  <input type="text" value={queueSearch} onChange={(e) => setQueueSearch(e.currentTarget.value)} placeholder="Search jobs" />
                </label>
              </div>
              <div className="hero-actions">
                <button type="button" className="btn btn-secondary" onClick={refreshQueue} disabled={isRefreshing}>{isRefreshing ? "Refreshing..." : "Refresh queue"}</button>
              </div>
              <div className="cards-grid cards-grid-3">
                {visibleJobs.length ? visibleJobs.map((job) => (
                  <article key={job.id} className="card garden-proof-card">
                    <h4>Job: {job.id}</h4>
                    <p><strong>Status:</strong> {job.status}</p>
                    <p><strong>Customer:</strong> {job.customer_email}</p>
                    <p><strong>Address:</strong> {job.address} {job.city}</p>
                    <p><strong>Type:</strong> {job.service_type} {job.property_type}</p>
                    <p><strong>Created:</strong> {job.created_at ? new Date(job.created_at).toLocaleDateString("en-CA") : "unknown"}</p>
                    {/* Admin: assign staff */}
                    {isAdmin && (
                      <div>
                        <input type="text" placeholder="Staff Profile ID" onBlur={(e) => assignStaffToJob(job.id, e.target.value)} />
                        <span className="note">(Enter staff profile ID and blur to assign)</span>
                      </div>
                    )}
                    {/* Staff: update status */}
                    {isStaff && (
                      <div className="hero-actions">
                        <button className="btn btn-secondary" onClick={() => updateJobStatus(job.id, "in_progress")}>Mark In Progress</button>
                        <button className="btn btn-secondary" onClick={() => updateJobStatus(job.id, "completed")}>Mark Completed</button>
                      </div>
                    )}
                  </article>
                )) : <div>No jobs found for this view.</div>}
              </div>
            </article>
          )}
          {/* Customer: Own jobs/status */}
          {isCustomer && (
            <article className="card garden-proof-card">
              <h3>Your Jobs</h3>
              <div className="cards-grid cards-grid-2">
                {customerJobs.length ? customerJobs.map((job) => (
                  <article key={job.id} className="card garden-proof-card">
                    <h4>Job: {job.id}</h4>
                    <p><strong>Status:</strong> {job.status}</p>
                    <p><strong>Address:</strong> {job.address} {job.city}</p>
                    <p><strong>Type:</strong> {job.service_type} {job.property_type}</p>
                    <p><strong>Created:</strong> {job.created_at ? new Date(job.created_at).toLocaleDateString("en-CA") : "unknown"}</p>
                  </article>
                )) : <div>No jobs found for your account.</div>}
              </div>
            </article>
          )}
        </>
      )}
    </section>
  );
}
