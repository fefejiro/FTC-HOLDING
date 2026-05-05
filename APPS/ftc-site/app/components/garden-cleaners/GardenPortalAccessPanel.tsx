"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { GardenPortalUserRole } from "../../../lib/gardenContracts";
import getSupabase from "../../../lib/supabase";

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
  // Always treat these as admin, even if env is missing
  const defaultAdmins = [
    "hello@unalabs.cloud",
    "fejiro.efiuvwere@gmail.com",
    "uby400@gmail.com"
  ];
  const adminEmails = new Set([
    ...defaultAdmins,
    ...parseEmailList(process.env.NEXT_PUBLIC_GARDEN_PORTAL_ADMIN_EMAILS)
  ]);
  const staffEmails = new Set([
    "garden.staff.qa@gardencleaners.ca",
    ...parseEmailList(process.env.NEXT_PUBLIC_GARDEN_PORTAL_STAFF_EMAILS)
  ]);

  if (adminEmails.has(normalizedEmail)) {
    return "admin";
  }

  if (staffEmails.has(normalizedEmail) || normalizedEmail.endsWith("@gardencleaners.ca")) {
    return "staff";
  }

  return "client";
}

export default function GardenPortalAccessPanel() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [userEmail, setUserEmail] = useState<string>("");
  const [role, setRole] = useState<GardenPortalUserRole | null>(null);
  const [staffProfileId, setStaffProfileId] = useState<string | null>(null);
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
          setStaffProfileId(null);
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
      // Add #portal-access to redirect
      const redirectTo = `${window.location.origin}/garden-cleaners/portal#portal-access`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo
        }
      });
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
    // Scroll/focus to #portal-access after auth if hash present
    useEffect(() => {
      if (typeof window === "undefined") return;
      if (window.location.hash === "#portal-access") {
        const el = document.getElementById("portal-access");
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            el.focus && el.focus();
          }, 300);
        }
      }
    }, [authState]);
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
    } catch (e: any) {
      setUsersMgmtError(e.message || "Unable to load users");
      setUsersMgmtState("error");
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
    } catch (e: any) {
      setInviteFormState("error");
      setInviteFormMessage(e.message || "Unable to invite user.");
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
    } catch (e: any) {
      setUsersMgmtMessage(e.message || "Unable to update role.");
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
    } catch (e: any) {
      setUsersMgmtMessage(e.message || "Unable to update user status.");
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
    } catch (e: any) {
      setUsersMgmtMessage(e.message || "Unable to send reset.");
    } finally {
      setPendingUserAction("");
    }
  }

  // --- UI ---
  return (
    <section className="section garden-section" id="portal-access" tabIndex={-1}>
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
            <form
              className="intake-form garden-login-form"
              onSubmit={async (e) => {
                e.preventDefault();
                // Only submit password login if password is filled
                if (signInPassword) {
                  await signInWithPassword(e);
                }
              }}
              noValidate
              style={{
                background: '#fff',
                borderRadius: 16,
                boxShadow: '0 2px 16px rgba(60,80,60,0.07)',
                padding: 24,
                maxWidth: 400,
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                border: '1px solid #e6ece6',
              }}
            >
              <div style={{ marginBottom: 4 }}>
                <h3 style={{ margin: 0, fontWeight: 600, color: '#2d4a2d', fontSize: 22 }}>Sign in to Garden Cleaners</h3>
                <p style={{ color: '#3a5c3a', fontSize: 15, margin: '8px 0 0 0' }}>
                  No password yet? Enter your email and we’ll send a secure sign-in link.
                </p>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ color: '#2d4a2d', fontWeight: 500 }}>Email</span>
                <input
                  type="email"
                  name="portalEmail"
                  value={signInEmail}
                  autoComplete="email"
                  onChange={(e) => setSignInEmail(e.currentTarget.value)}
                  placeholder="you@example.com"
                  required
                  style={{
                    background: '#f8faf8',
                    border: '1px solid #cfe3cf',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 16,
                    color: '#2d4a2d',
                    outline: 'none',
                    boxShadow: 'none',
                  }}
                  onFocus={e => (e.currentTarget.style.border = '1.5px solid #7fc97f')}
                  onBlur={e => (e.currentTarget.style.border = '1px solid #cfe3cf')}
                />
              </label>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  background: '#7fc97f',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 16,
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 0',
                  marginTop: 6,
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(60,80,60,0.04)',
                }}
                onClick={sendMagicLink}
                disabled={signInState === "submitting"}
              >
                {signInState === "submitting" ? "Sending..." : "Email me a secure login link"}
              </button>
              <div style={{ color: '#4a6a4a', fontSize: 13, marginTop: 2, marginBottom: 8 }}>
                Use this if this is your first time signing in.
              </div>
              <div style={{ borderTop: '1px solid #e6ece6', margin: '12px 0' }} />
              <div style={{ color: '#2d4a2d', fontWeight: 500, fontSize: 14, marginBottom: 2 }}>Already have a password?</div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ color: '#2d4a2d' }}>Password</span>
                <input
                  type="password"
                  name="portalPassword"
                  value={signInPassword}
                  autoComplete="current-password"
                  onChange={(e) => setSignInPassword(e.currentTarget.value)}
                  placeholder="Enter your password"
                  style={{
                    background: '#f8faf8',
                    border: '1px solid #cfe3cf',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 16,
                    color: '#2d4a2d',
                    outline: 'none',
                    boxShadow: 'none',
                  }}
                  onFocus={e => (e.currentTarget.style.border = '1.5px solid #7fc97f')}
                  onBlur={e => (e.currentTarget.style.border = '1px solid #cfe3cf')}
                />
              </label>
              <button
                type="submit"
                className="btn btn-secondary"
                style={{
                  background: '#e6ece6',
                  color: '#2d4a2d',
                  fontWeight: 500,
                  fontSize: 15,
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 0',
                  marginTop: 6,
                  cursor: 'pointer',
                }}
                disabled={signInState === "submitting" || !signInPassword}
              >
                {signInState === "submitting" ? "Signing in..." : "Sign in with password"}
              </button>
              {signInMessage && (
                <p
                  style={{
                    color:
                      signInState === "error"
                        ? "#b94a48"
                        : signInState === "success"
                        ? "#2d4a2d"
                        : "#4a6a4a",
                    background: signInState === "error" ? "#fff0f0" : signInState === "success" ? "#f0fff0" : "#f8faf8",
                    borderRadius: 8,
                    padding: '10px 12px',
                    margin: '10px 0 0 0',
                    fontSize: 15,
                  }}
                >
                  {signInState === "success" && signInMessage.includes("Magic link sent")
                    ? "Check your inbox for your Garden Cleaners login link. It may take a minute."
                    : signInState === "error" && signInMessage.includes("Unable to send magic link")
                    ? "We could not send the link. Please check the email address or contact support."
                    : signInMessage}
                </p>
              )}
            </form>
          ) : null}
          {authState === "unavailable" ? <p>{loadError}</p> : null}
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
            {authState === "unavailable" && "Portal unavailable"}
          </h2>
          {loadError && authState === "authenticated" ? <p>{loadError}</p> : null}
          {queueMessage ? <p>{queueMessage}</p> : null}
        </article>
      </div>
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
                    <div>Email: {q.email} | {q.address} {q.city} | {q.service_type} | {q.property_type}</div>
                    <button className="btn btn-secondary" onClick={() => convertQuoteToJob(q.id)}>Convert to Job</button>
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
                      <option value="">— Any —</option>
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
                            <td style={{ padding: "8px 12px" }}>{u.display_name || <span style={{ color: "#aaa" }}>—</span>}</td>
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
                            <td style={{ padding: "8px 12px" }}>{u.service_region || <span style={{ color: "#aaa" }}>—</span>}</td>
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
                    <span style={{ fontSize: 13 }}>Page {adminUsersPage} · {adminUsersTotal} total</span>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} disabled={adminUsersPage * 25 >= adminUsersTotal} onClick={() => void loadAdminUsers(adminUsersPage + 1)}>Next</button>
                  </div>
                </div>
              ) : usersMgmtState === "idle" ? (
                <div style={{ color: "#4a6a4a", fontSize: 14 }}>No users found. Search above or invite a new user.</div>
              ) : null}
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

