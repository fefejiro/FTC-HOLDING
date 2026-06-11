"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { GardenPortalUserRole } from "../../../lib/gardenContracts";
import { isGardenPortalAuthConfigured } from "../../../lib/gardenPortalAuth";
import { buildProductCallbackUrl, resolveProductRole } from "../../../lib/productAuth";
import getSupabase, { loadRuntimeSupabaseConfig } from "../../../lib/supabase";

// Types for admin user management
type AdminUserRecord = {
  id: string;
  auth_user_id: string | null;
  email: string;
  display_name: string | null;
  role: "admin" | "staff" | "client";
  is_active: boolean;
  service_region: string | null;
  created_at: string;
  updated_at: string;
};

type AdminAuditRecord = {
  id: string;
  actor_email: string;
  action: string;
  target_email: string | null;
  target_user_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type UsersMgmtState = "idle" | "loading" | "error";
type InviteFormState = "idle" | "submitting" | "success" | "error";

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
  status?: string;
  created_at?: string;
};

type AuthState = "loading" | "authenticated" | "unauthenticated" | "unavailable";
type QueueFilter = "all" | "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
type RegionTag = "Oshawa" | "Whitby" | "Ajax" | "Pickering" | "Courtice" | "Durham Region" | "Unspecified";

const REGION_OPTIONS: RegionTag[] = ["Oshawa", "Whitby", "Ajax", "Pickering", "Courtice", "Durham Region", "Unspecified"];
const PORTAL_REGION_CTA_OPTIONS: Exclude<RegionTag, "Unspecified">[] = ["Oshawa", "Whitby", "Ajax", "Pickering", "Courtice", "Durham Region"];

function normalizePortalEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message || fallback : fallback;
}

function resolveRole(email: string): GardenPortalUserRole {
  const normalizedEmail = normalizePortalEmail(email);
  const productRole = resolveProductRole("garden", normalizedEmail);

  if (productRole === "garden_admin") {
    return "admin";
  }

  if (productRole === "garden_staff") {
    return "staff";
  }

  return "client";
}

async function resolveRoleFromProfile(email: string, authUserId: string | null): Promise<GardenPortalUserRole> {
  const supabase = getSupabase();
  const normalizedEmail = normalizePortalEmail(email);

  try {
    const profileQuery = supabase
      .from("garden_cleaners_profiles")
      .select("id, role, auth_user_id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    const { data: emailProfile } = await profileQuery;
    if (emailProfile?.role) {
      if (authUserId && !emailProfile.auth_user_id) {
        void supabase
          .from("garden_cleaners_profiles")
          .update({ auth_user_id: authUserId })
          .eq("id", emailProfile.id);
      }
      return emailProfile.role as GardenPortalUserRole;
    }

    if (authUserId) {
      const { data: authProfile } = await supabase
        .from("garden_cleaners_profiles")
        .select("role")
        .eq("auth_user_id", authUserId)
        .maybeSingle();
      if (authProfile?.role) {
        return authProfile.role as GardenPortalUserRole;
      }
    }
  } catch {
    // Fall through to legacy email-based role resolution if profile lookup fails.
  }

  return resolveRole(normalizedEmail);
}

export default function GardenPortalAccessPanel() {
  const [portalAuthConfigured, setPortalAuthConfigured] = useState(() => isGardenPortalAuthConfigured());
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [userEmail, setUserEmail] = useState<string>("");
  const [role, setRole] = useState<GardenPortalUserRole | null>(null);
  const [staffProfileId, setStaffProfileId] = useState<string | null>(null);
  // Unified state for jobs/quotes
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [loadError, setLoadError] = useState<string>("");
  const [, setPendingStatusProjectId] = useState<string>("");
  const [queueMessage, setQueueMessage] = useState<string>("");
  const [pendingQuoteActionId, setPendingQuoteActionId] = useState<string>("");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [queueSearch, setQueueSearch] = useState<string>("");
  const [queueRegion, setQueueRegion] = useState<"all" | RegionTag>("all");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Admin: user management tab
  const [adminTab, setAdminTab] = useState<"jobs" | "users">("jobs");
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const [adminUsersTotal, setAdminUsersTotal] = useState<number>(0);
  const [adminUsersPage, setAdminUsersPage] = useState<number>(1);
  const [adminUsersSearch, setAdminUsersSearch] = useState<string>("");
  const [adminUsersRoleFilter, setAdminUsersRoleFilter] = useState<"all" | "admin" | "staff" | "client">("all");
  const [adminUsersStatusFilter, setAdminUsersStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [usersMgmtState, setUsersMgmtState] = useState<UsersMgmtState>("idle");
  const [usersMgmtError, setUsersMgmtError] = useState<string>("");
  const [usersMgmtMessage, setUsersMgmtMessage] = useState<string>("");
  const [adminAuditEntries, setAdminAuditEntries] = useState<AdminAuditRecord[]>([]);
  const [adminAuditState, setAdminAuditState] = useState<UsersMgmtState>("idle");
  const [adminAuditError, setAdminAuditError] = useState<string>("");
  // Invite form
  const [showInviteForm, setShowInviteForm] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteName, setInviteName] = useState<string>("");
  const [inviteRole, setInviteRole] = useState<"admin" | "staff" | "client">("client");
  const [inviteRegion, setInviteRegion] = useState<string>("");
  const [inviteFormState, setInviteFormState] = useState<InviteFormState>("idle");
  const [inviteFormMessage, setInviteFormMessage] = useState<string>("");
  // Confirm disable/delete dialog
  const [confirmDisableUserId, setConfirmDisableUserId] = useState<string>("");
  const [pendingUserAction, setPendingUserAction] = useState<string>("");

  const isAdmin = role === "admin";
  const isStaff = role === "staff";
  const isCustomer = role === "client";
  const signedInRoleLabel =
    role === "client"
      ? "client (customer lane)"
      : role === "staff"
        ? "staff"
        : role === "admin"
          ? "admin"
          : "";

  useEffect(() => {
    let mounted = true;
    void loadRuntimeSupabaseConfig().then((configured) => {
      if (mounted) {
        setPortalAuthConfigured(configured);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

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
      // Filter by staff_profile_id when the current user's profile ID is available
      if (staffProfileId) {
        filtered = filtered.filter((j) => j.staff_profile_id === staffProfileId);
      }
    }
    return filtered;
  }, [jobs, queueFilter, queueRegion, queueSearch, isAdmin, isStaff, staffProfileId]);

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
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error, "Failed to load portal data"));
      setJobs([]);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    if (!portalAuthConfigured) {
      setAuthState("unavailable");
      setUserEmail("");
      setRole(null);
      setStaffProfileId(null);
      setJobs([]);
      setQuotes([]);
      setLoadError("Portal sign-in is not configured for this deployment yet.");
      return () => {
        mounted = false;
      };
    }

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
          setStaffProfileId(null);
          setJobs([]);
          setQuotes([]);
          setLoadError("");
          setQueueMessage("");
          return;
        }
        const nextRole = await resolveRoleFromProfile(sessionEmail, sessionData.session?.user?.id ?? null);
        setAuthState("authenticated");
        setUserEmail(sessionEmail);
        setRole(nextRole);

        // Fetch and store the staff profile ID so that visibleJobs can filter by it
        if (nextRole === "staff") {
          try {
            const supabase = getSupabase();
            const { data: profileRow } = await supabase
              .from("garden_cleaners_profiles")
              .select("id")
              .eq("auth_user_id", sessionData.session?.user?.id ?? "")
              .maybeSingle();
            if (mounted) {
              setStaffProfileId(profileRow?.id ?? null);
            }
          } catch {
            if (mounted) setStaffProfileId(null);
          }
        } else {
          if (mounted) setStaffProfileId(null);
        }

        await loadPortalData(nextRole);
      } catch {
        if (!mounted) return;
        setAuthState("unavailable");
        setUserEmail("");
        setRole(null);
        setStaffProfileId(null);
        setJobs([]);
        setQuotes([]);
        setLoadError("Supabase public environment is not configured for this deployment.");
      }
    }

    async function init() {
      await loadSessionAndData();
      try {
        const supabase = getSupabase();
        const { data } = supabase.auth.onAuthStateChange((_event: string, nextSession: { user?: { email?: string } } | null) => {
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
  }, [portalAuthConfigured]);

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
    } catch (error: unknown) {
      setQueueMessage(getErrorMessage(error, "Unable to update job status"));
    } finally {
      setPendingStatusProjectId("");
    }
  }

  // Admin: convert quote to job
  async function convertQuoteToJob(quoteId: string) {
    if (!isAdmin) return;
    setQueueMessage("");
    setPendingQuoteActionId(quoteId);
    try {
      const res = await fetchWithAuth("/api/garden-cleaners-job", {
        method: "POST",
        body: JSON.stringify({ quote_id: quoteId })
      }).then(r => r.json());
      if (!res.ok) throw new Error(res.error || "Failed to convert quote");
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      setQueueMessage("Quote converted to job");
      await loadPortalData("admin");
    } catch (error: unknown) {
      setQueueMessage(getErrorMessage(error, "Unable to convert quote"));
    } finally {
      setPendingQuoteActionId("");
    }
  }

  async function updateQuoteStatus(quoteId: string, status: "approved" | "rejected") {
    if (!isAdmin) return;
    setQueueMessage("");
    setPendingQuoteActionId(quoteId);
    try {
      const res = await fetchWithAuth("/api/garden-cleaners-quote-status", {
        method: "POST",
        body: JSON.stringify({ quote_id: quoteId, status })
      }).then((r) => r.json());

      if (!res.ok) {
        throw new Error(res.error || "Unable to update quote status");
      }

      setQuotes((prev) =>
        prev.map((quote) => (quote.id === quoteId ? { ...quote, status } : quote))
      );
      setQueueMessage(status === "approved" ? "Quote approved" : "Quote rejected");
    } catch (error: unknown) {
      setQueueMessage(getErrorMessage(error, "Unable to update quote status"));
    } finally {
      setPendingQuoteActionId("");
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
    } catch (error: unknown) {
      setQueueMessage(getErrorMessage(error, "Unable to assign staff"));
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

  // --- Admin: User Management ---
  async function loadAdminUsers(page = adminUsersPage, search = adminUsersSearch, roleF = adminUsersRoleFilter, statusF = adminUsersStatusFilter) {
    if (!isAdmin) return;
    setUsersMgmtState("loading");
    setUsersMgmtError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: "25",
        search,
        role: roleF,
        status: statusF,
      });
      const res = await fetchWithAuth(`/api/garden-cleaners-admin-users?${params}`).then((r) => r.json());
      if (!res.ok) throw new Error(res.error || "Failed to load users");
      setAdminUsers(res.users || []);
      setAdminUsersTotal(res.total || 0);
      setAdminUsersPage(page);
      setUsersMgmtState("idle");
    } catch (error: unknown) {
      setUsersMgmtError(getErrorMessage(error, "Unable to load users"));
      setUsersMgmtState("error");
    }
  }

  async function loadAdminAudit() {
    if (!isAdmin) return;
    setAdminAuditState("loading");
    setAdminAuditError("");
    try {
      const res = await fetchWithAuth("/api/garden-cleaners-admin-users?view=audit&page=1&per_page=20").then((r) => r.json());
      if (!res.ok) throw new Error(res.error || "Failed to load audit log");
      setAdminAuditEntries(res.entries || []);
      setAdminAuditState("idle");
    } catch (error: unknown) {
      setAdminAuditError(getErrorMessage(error, "Unable to load audit log"));
      setAdminAuditState("error");
    }
  }

  async function submitInviteUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAdmin) return;
    const email = inviteEmail.trim().toLowerCase();
    const name = inviteName.trim();
    if (!email) {
      setInviteFormState("error");
      setInviteFormMessage("Email is required.");
      return;
    }
    setInviteFormState("submitting");
    setInviteFormMessage("");
    try {
      const res = await fetchWithAuth("/api/garden-cleaners-admin-users", {
        method: "POST",
        body: JSON.stringify({ email, display_name: name, role: inviteRole, service_region: inviteRegion || undefined }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error || "Failed to invite user");
      setInviteFormState("success");
      setInviteFormMessage(`Invite sent to ${email}.`);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("client");
      setInviteRegion("");
      setShowInviteForm(false);
      await loadAdminUsers(1);
      await loadAdminAudit();
    } catch (error: unknown) {
      setInviteFormState("error");
      setInviteFormMessage(getErrorMessage(error, "Unable to invite user."));
    }
  }

  async function updateUserRole(profileId: string, newRole: "admin" | "staff" | "client") {
    if (!isAdmin) return;
    setPendingUserAction(profileId);
    setUsersMgmtMessage("");
    try {
      const res = await fetchWithAuth("/api/garden-cleaners-admin-users", {
        method: "PATCH",
        body: JSON.stringify({ profile_id: profileId, role: newRole }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error || "Failed to update role");
      setAdminUsers((prev) => prev.map((u) => (u.id === profileId ? { ...u, role: newRole } : u)));
      setUsersMgmtMessage("Role updated.");
      await loadAdminAudit();
    } catch (error: unknown) {
      setUsersMgmtMessage(getErrorMessage(error, "Unable to update role."));
    } finally {
      setPendingUserAction("");
    }
  }

  async function toggleUserActive(profileId: string, isActive: boolean) {
    if (!isAdmin) return;
    if (!isActive && confirmDisableUserId !== profileId) {
      setConfirmDisableUserId(profileId);
      return;
    }
    setPendingUserAction(profileId);
    setUsersMgmtMessage("");
    setConfirmDisableUserId("");
    try {
      const res = await fetchWithAuth("/api/garden-cleaners-admin-users", {
        method: "PATCH",
        body: JSON.stringify({ profile_id: profileId, is_active: isActive }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error || "Failed to update status");
      setAdminUsers((prev) => prev.map((u) => (u.id === profileId ? { ...u, is_active: isActive } : u)));
      setUsersMgmtMessage(isActive ? "User reactivated." : "User disabled.");
      await loadAdminAudit();
    } catch (error: unknown) {
      setUsersMgmtMessage(getErrorMessage(error, "Unable to update user status."));
    } finally {
      setPendingUserAction("");
    }
  }

  async function resetUserInvite(email: string) {
    if (!isAdmin) return;
    setPendingUserAction(email);
    setUsersMgmtMessage("");
    try {
      const res = await fetchWithAuth("/api/garden-cleaners-admin-users", {
        method: "PUT",
        body: JSON.stringify({ email }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error || "Failed to send reset");
      setUsersMgmtMessage(`Reset/invite sent to ${email}.`);
      await loadAdminAudit();
    } catch (error: unknown) {
      setUsersMgmtMessage(getErrorMessage(error, "Unable to send reset."));
    } finally {
      setPendingUserAction("");
    }
  }

  // --- UI ---
  // Loading fallback for infinite loading
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  useEffect(() => {
    if (authState === "loading") {
      const timeout = setTimeout(() => setLoadingTimeout(true), 12000);
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [authState]);

  async function handleGoogleSignIn() {
    const supabase = getSupabase();
    const redirectTo = buildProductCallbackUrl({
      origin: window.location.origin,
      product: "garden",
      returnTo: "/garden-cleaners/portal#portal-access"
    });
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account"
        }
      }
    });
  }

  return (
    <section className="section garden-section" id="portal-access" tabIndex={-1}>
      <div className="section-heading">
        <p className="eyebrow">Portal access</p>
        <h1>Regional service coverage, client intake, and operations routing</h1>
        <p>
          {isAdmin && "Admin: manage all jobs, convert quotes, assign staff."}
          {isStaff && "Staff: view and update assigned jobs."}
          {isCustomer && "Customer: view your job status."}
          {!isAdmin && !isStaff && !isCustomer && "Client lane and operations lane access are available from this portal entry."}
        </p>
      </div>

      <article className="card garden-proof-card" style={{ marginBottom: 16 }}>
        <p className="garden-panel-kicker">Regional portal</p>
        <h3 style={{ marginTop: 0 }}>Need quote help before sign-in?</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Start a regional quote path or contact operations directly.
        </p>
        <div className="hero-actions" style={{ marginBottom: 12 }}>
          <a
            className="btn btn-primary"
            href="/garden-cleaners/quote"
            data-analytics-event="garden_portal_cta_click"
            data-analytics-location="portal_hero"
            data-analytics-label="request_regional_quote"
          >
            Request regional quote
          </a>
          <a
            className="btn btn-secondary"
            href="/garden-cleaners/contact"
            data-analytics-event="garden_portal_cta_click"
            data-analytics-location="portal_hero"
            data-analytics-label="contact_operations"
          >
            Contact operations
          </a>
          <a
            className="btn btn-secondary"
            href="/garden-cleaners/quote?region=Oshawa"
            data-analytics-event="garden_portal_cta_click"
            data-analytics-location="portal_hero"
            data-analytics-label="same_week_quote_oshawa"
          >
            Get same-week quote
          </a>
        </div>

        <div className="cards-grid cards-grid-3" style={{ marginTop: 8 }}>
          {PORTAL_REGION_CTA_OPTIONS.map((regionName) => (
            <article key={regionName} className="card garden-proof-card">
              <h4 style={{ marginTop: 0 }}>{regionName}</h4>
              <p className="muted">Regional quote path for {regionName}.</p>
              <a
                className="inline-link"
                href={`/garden-cleaners/quote?region=${encodeURIComponent(regionName)}`}
                data-analytics-event="garden_portal_region_quote_click"
                data-analytics-location="portal_region_card"
                data-analytics-label={regionName}
              >
                Open {regionName} quote
              </a>
            </article>
          ))}
        </div>
      </article>

      <div className="garden-split-grid">
        <article className="card garden-split-card">
          <p className="garden-panel-kicker">Session state</p>
          <h2>
            {authState === "loading" && "Checking portal session..."}
            {authState === "unauthenticated" && "Sign in required"}
            {authState === "unavailable" && "Portal sign-in setup in progress"}
            {authState === "authenticated" && `Signed in as ${signedInRoleLabel}`}
          </h2>
          {userEmail ? <p>{userEmail}</p> : null}

          {authState === "unauthenticated" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 32 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: 18, padding: "14px 32px", borderRadius: 8 }}
                onClick={handleGoogleSignIn}
              >
                Continue with Google
              </button>
            </div>
          )}
          {authState === "loading" && loadingTimeout && (
            <div style={{ color: "#b94a48", background: "#fff0f0", borderRadius: 8, padding: "12px 16px", marginTop: 16 }}>
              We couldn&apos;t load your portal access yet. Please sign out and try again, or contact support.
            </div>
          )}
          {authState === "unavailable" ? (
            <p>
              {loadError || "Portal sign-in is temporarily unavailable."} Please use quote or contact operations and we will follow up directly.
            </p>
          ) : null}
          {authState === "authenticated" ? (
            <button type="button" className="btn btn-secondary" onClick={signOut}>Sign out of portal session</button>
          ) : null}
        </article>
        <article className="card garden-split-card">
          <p className="garden-panel-kicker">Lane visibility</p>
          <h2>
            {authState === "loading" && "Checking access..."}
            {authState === "unauthenticated" && "Sign in to view your dashboard."}
            {authState === "authenticated" && role && `Role: ${role.charAt(0).toUpperCase() + role.slice(1)}`}
            {authState === "unavailable" && "Access temporarily disabled"}
          </h2>
          {authState === "authenticated" && isAdmin ? (
            <p className="muted">
              You can manage Jobs &amp; Quotes, assign staff, and maintain portal users from the tabs below.
            </p>
          ) : null}
          {authState === "authenticated" && isStaff ? (
            <p className="muted">
              You can view assigned jobs and update progress status from the queue below.
            </p>
          ) : null}
          {authState === "authenticated" && isCustomer ? (
            <p className="muted">
              You can track your service status and recent job records in your customer lane.
            </p>
          ) : null}
          {authState === "authenticated" ? (
            <p className="muted" style={{ marginTop: 8 }}>
              Visible records: {isAdmin ? `${jobs.length} jobs, ${quotes.length} quotes` : `${visibleJobs.length} jobs`}
            </p>
          ) : null}
          {loadError && authState === "authenticated" ? <p>{loadError}</p> : null}
          {queueMessage ? <p>{queueMessage}</p> : null}
        </article>
      </div>

      {authState !== "authenticated" ? (
      <div className="hero-actions" style={{ position: "sticky", bottom: 8, zIndex: 5, marginTop: 16 }}>
        <a
          className="btn btn-primary"
          href="/garden-cleaners/quote"
          data-analytics-event="garden_portal_sticky_click"
          data-analytics-location="portal_sticky"
          data-analytics-label="get_regional_quote"
        >
          Get regional quote
        </a>
        <a
          className="btn btn-secondary"
          href="/garden-cleaners/contact"
          data-analytics-event="garden_portal_sticky_click"
          data-analytics-location="portal_sticky"
          data-analytics-label="contact_ops"
        >
          Contact ops
        </a>
      </div>
      ) : null}

      {authState === "authenticated" && (
        <>
          {loading && <div className="loading">Loading portal data...</div>}
          {/* Admin/Staff: Tab switcher */}
          {isAdmin && (
            <div style={{ display: "flex", gap: 12, margin: "16px 0 8px" }}>
              <button
                type="button"
                className={adminTab === "jobs" ? "btn btn-primary" : "btn btn-secondary"}
                onClick={() => setAdminTab("jobs")}
              >
                Jobs &amp; Quotes
              </button>
              <button
                type="button"
                className={adminTab === "users" ? "btn btn-primary" : "btn btn-secondary"}
                onClick={() => {
                  setAdminTab("users");
                  if (adminUsers.length === 0) void loadAdminUsers(1);
                  if (adminAuditEntries.length === 0) void loadAdminAudit();
                }}
              >
                Users
              </button>
            </div>
          )}
          {/* Admin: Quotes to convert */}
          {isAdmin && adminTab === "jobs" && quotes.length > 0 && (
            <article className="card garden-proof-card">
              <h3>Quotes to Convert</h3>
              <ul>
                {quotes.map((q) => (
                  <li key={q.id}>
                    <div>
                      Email: {q.email} | {q.address} {q.city} | {q.service_type} | {q.property_type}
                    </div>
                    <div>
                      <strong>Status:</strong> {String(q.status || "new")}
                    </div>
                    <div className="hero-actions" style={{ marginTop: 8 }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => updateQuoteStatus(q.id, "approved")}
                        disabled={pendingQuoteActionId === q.id || String(q.status || "new") === "converted"}
                      >
                        {String(q.status || "new") === "approved" ? "Approved" : "Approve"}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => updateQuoteStatus(q.id, "rejected")}
                        disabled={pendingQuoteActionId === q.id || String(q.status || "new") === "converted"}
                      >
                        {String(q.status || "new") === "rejected" ? "Rejected" : "Reject"}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => convertQuoteToJob(q.id)}
                        disabled={pendingQuoteActionId === q.id || String(q.status || "new") !== "approved"}
                      >
                        Convert to Job
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          )}
          {/* Admin/Staff: Job queue */}
          {(isAdmin || isStaff) && (!isAdmin || adminTab === "jobs") && (
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
          {/* Admin: User Management tab */}
          {isAdmin && adminTab === "users" && (
            <article className="card garden-proof-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>User Management</h3>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: 14 }}
                  onClick={() => { setShowInviteForm((v) => !v); setInviteFormState("idle"); setInviteFormMessage(""); }}
                >
                  {showInviteForm ? "Cancel" : "+ Invite User"}
                </button>
              </div>
              {/* Invite form */}
              {showInviteForm && (
                <form
                  onSubmit={submitInviteUser}
                  style={{
                    background: "#f0f7f0",
                    border: "1px solid #cfe3cf",
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    maxWidth: 480,
                  }}
                >
                  <h4 style={{ margin: 0, color: "#2d4a2d" }}>Invite new user</h4>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 13, color: "#2d4a2d", fontWeight: 500 }}>Email *</span>
                    <input
                      type="email"
                      value={inviteEmail}
                      required
                      onChange={(e) => setInviteEmail(e.currentTarget.value)}
                      placeholder="user@example.com"
                      style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #cfe3cf", fontSize: 15 }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 13, color: "#2d4a2d", fontWeight: 500 }}>Display name</span>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.currentTarget.value)}
                      placeholder="Full name (optional)"
                      style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #cfe3cf", fontSize: 15 }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 13, color: "#2d4a2d", fontWeight: 500 }}>Role</span>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.currentTarget.value as typeof inviteRole)}
                      style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #cfe3cf", fontSize: 15 }}
                    >
                      <option value="client">Client</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 13, color: "#2d4a2d", fontWeight: 500 }}>Service region</span>
                    <select
                      value={inviteRegion}
                      onChange={(e) => setInviteRegion(e.currentTarget.value)}
                      style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #cfe3cf", fontSize: 15 }}
                    >
                      <option value="">- Any -</option>
                      {REGION_OPTIONS.filter((r) => r !== "Unspecified").map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  {inviteFormMessage && (
                    <p style={{ margin: 0, fontSize: 14, color: inviteFormState === "error" ? "#b94a48" : "#2d4a2d", background: inviteFormState === "error" ? "#fff0f0" : "#f0fff0", borderRadius: 6, padding: "8px 10px" }}>
                      {inviteFormMessage}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={inviteFormState === "submitting"}
                    style={{ alignSelf: "flex-start", fontSize: 14 }}
                  >
                    {inviteFormState === "submitting" ? "Sending invite..." : "Send invite"}
                  </button>
                </form>
              )}
              {/* Search/filter row */}
              <div className="intake-form-grid" style={{ marginBottom: 12 }}>
                <label>
                  <span>Search</span>
                  <input
                    type="text"
                    value={adminUsersSearch}
                    onChange={(e) => setAdminUsersSearch(e.currentTarget.value)}
                    placeholder="Name or email"
                    onKeyDown={(e) => { if (e.key === "Enter") void loadAdminUsers(1, adminUsersSearch); }}
                  />
                </label>
                <label>
                  <span>Role</span>
                  <select value={adminUsersRoleFilter} onChange={(e) => { setAdminUsersRoleFilter(e.currentTarget.value as typeof adminUsersRoleFilter); void loadAdminUsers(1, adminUsersSearch, e.currentTarget.value as typeof adminUsersRoleFilter); }}>
                    <option value="all">All roles</option>
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="client">Client</option>
                  </select>
                </label>
                <label>
                  <span>Status</span>
                  <select value={adminUsersStatusFilter} onChange={(e) => { setAdminUsersStatusFilter(e.currentTarget.value as typeof adminUsersStatusFilter); void loadAdminUsers(1, adminUsersSearch, adminUsersRoleFilter, e.currentTarget.value as typeof adminUsersStatusFilter); }}>
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </label>
              </div>
              <div className="hero-actions" style={{ marginBottom: 12 }}>
                <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => void loadAdminUsers(1)}>
                  {usersMgmtState === "loading" ? "Loading..." : "Search"}
                </button>
              </div>
              {usersMgmtError && <p style={{ color: "#b94a48", background: "#fff0f0", borderRadius: 6, padding: "8px 10px", fontSize: 14 }}>{usersMgmtError}</p>}
              {usersMgmtMessage && <p style={{ color: "#2d4a2d", background: "#f0fff0", borderRadius: 6, padding: "8px 10px", fontSize: 14 }}>{usersMgmtMessage}</p>}
              {/* User table */}
              {adminUsers.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e6ece6", textAlign: "left" }}>
                        <th style={{ padding: "8px 12px" }}>Email</th>
                        <th style={{ padding: "8px 12px" }}>Name</th>
                        <th style={{ padding: "8px 12px" }}>Role</th>
                        <th style={{ padding: "8px 12px" }}>Region</th>
                        <th style={{ padding: "8px 12px" }}>Status</th>
                        <th style={{ padding: "8px 12px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map((u) => {
                        const isPending = pendingUserAction === u.id || pendingUserAction === u.email;
                        const isConfirmingDisable = confirmDisableUserId === u.id;
                        return (
                          <tr key={u.id} style={{ borderBottom: "1px solid #e6ece6", opacity: isPending ? 0.6 : 1 }}>
                            <td style={{ padding: "8px 12px", wordBreak: "break-all" }}>{u.email}</td>
                            <td style={{ padding: "8px 12px" }}>{u.display_name || <span style={{ color: "#aaa" }}>-</span>}</td>
                            <td style={{ padding: "8px 12px" }}>
                              <select
                                value={u.role}
                                disabled={isPending}
                                onChange={(e) => void updateUserRole(u.id, e.currentTarget.value as AdminUserRecord["role"])}
                                style={{ padding: "4px 6px", borderRadius: 4, border: "1px solid #cfe3cf", fontSize: 13 }}
                              >
                                <option value="client">Client</option>
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td style={{ padding: "8px 12px" }}>{u.service_region || <span style={{ color: "#aaa" }}>-</span>}</td>
                            <td style={{ padding: "8px 12px" }}>
                              <span style={{
                                display: "inline-block",
                                padding: "2px 10px",
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 600,
                                background: u.is_active ? "#e6f7e6" : "#f7e6e6",
                                color: u.is_active ? "#2d6a2d" : "#8b2a2a",
                              }}>
                                {u.is_active ? "Active" : "Disabled"}
                              </span>
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {u.is_active ? (
                                  isConfirmingDisable ? (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ fontSize: 12, background: "#f7e6e6", color: "#8b2a2a", border: "1px solid #e8b4b4" }}
                                        disabled={isPending}
                                        onClick={() => void toggleUserActive(u.id, false)}
                                      >
                                        Confirm disable
                                      </button>
                                      <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setConfirmDisableUserId("")}>Cancel</button>
                                    </>
                                  ) : (
                                    <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} disabled={isPending} onClick={() => toggleUserActive(u.id, false)}>Disable</button>
                                  )
                                ) : (
                                  <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} disabled={isPending} onClick={() => void toggleUserActive(u.id, true)}>Reactivate</button>
                                )}
                                <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} disabled={isPending} onClick={() => void resetUserInvite(u.email)}>
                                  Reset / Resend invite
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {/* Pagination */}
                  <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} disabled={adminUsersPage <= 1} onClick={() => void loadAdminUsers(adminUsersPage - 1)}>Prev</button>
                    <span style={{ fontSize: 13 }}>Page {adminUsersPage} - {adminUsersTotal} total</span>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} disabled={adminUsersPage * 25 >= adminUsersTotal} onClick={() => void loadAdminUsers(adminUsersPage + 1)}>Next</button>
                  </div>
                </div>
              ) : usersMgmtState === "idle" ? (
                <div style={{ color: "#4a6a4a", fontSize: 14 }}>No users found. Search above or invite a new user.</div>
              ) : null}

              <div style={{ marginTop: 20, borderTop: "1px solid #e6ece6", paddingTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <h4 style={{ margin: 0 }}>Recent admin activity</h4>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 13 }}
                    onClick={() => void loadAdminAudit()}
                    disabled={adminAuditState === "loading"}
                  >
                    {adminAuditState === "loading" ? "Refreshing..." : "Refresh activity"}
                  </button>
                </div>
                {adminAuditError ? (
                  <p style={{ color: "#b94a48", background: "#fff0f0", borderRadius: 6, padding: "8px 10px", fontSize: 14, marginTop: 10 }}>
                    {adminAuditError}
                  </p>
                ) : null}
                {adminAuditEntries.length > 0 ? (
                  <div style={{ marginTop: 12, overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e6ece6", textAlign: "left" }}>
                          <th style={{ padding: "8px 10px" }}>When</th>
                          <th style={{ padding: "8px 10px" }}>Actor</th>
                          <th style={{ padding: "8px 10px" }}>Action</th>
                          <th style={{ padding: "8px 10px" }}>Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminAuditEntries.map((entry) => (
                          <tr key={entry.id} style={{ borderBottom: "1px solid #e6ece6" }}>
                            <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                              {entry.created_at ? new Date(entry.created_at).toLocaleString("en-CA") : "-"}
                            </td>
                            <td style={{ padding: "8px 10px", wordBreak: "break-all" }}>{entry.actor_email || "-"}</td>
                            <td style={{ padding: "8px 10px" }}>{entry.action || "-"}</td>
                            <td style={{ padding: "8px 10px", wordBreak: "break-all" }}>{entry.target_email || entry.target_user_id || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted" style={{ marginTop: 10 }}>No recent admin activity yet.</p>
                )}
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
