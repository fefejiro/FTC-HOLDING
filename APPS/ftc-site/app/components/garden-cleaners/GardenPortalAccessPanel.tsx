"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { GardenPortalUserRole } from "../../../lib/gardenContracts";
import { isGardenPortalAuthConfigured } from "../../../lib/gardenPortalAuth";
import { buildProductCallbackUrl, resolveProductRole } from "../../../lib/productAuth";
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

function getStatusTone(status: string): "calm" | "watch" | "action" {
  const normalized = String(status || "").toLowerCase();
  if (["pending", "assigned", "in_progress"].includes(normalized)) return "watch";
  if (["cancelled", "blocked"].includes(normalized)) return "action";
  return "calm";
}

function getShortLabel(value: string, maxLength = 12): string {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}\u2026`;
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
  const portalAuthConfigured = isGardenPortalAuthConfigured();
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
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("");

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

  const customerSummary = useMemo(() => {
    if (!isCustomer) {
      return {
        nextService: null as JobRecord | null,
        activeRequests: 0,
        locations: [] as string[],
        recentUpdates: [] as JobRecord[]
      };
    }

    const activeStatuses = new Set(["pending", "assigned", "in_progress"]);
    const nextService = [...customerJobs]
      .filter((job) => activeStatuses.has(String(job.status || "").toLowerCase()))
      .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())[0] || null;

    const locations = Array.from(
      new Set(
        customerJobs
          .map((job) => [job.address, job.city, job.region].filter(Boolean).join(" ").trim())
          .filter(Boolean)
      )
    ).slice(0, 4);

    const recentUpdates = [...customerJobs]
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
      .slice(0, 4);

    return {
      nextService,
      activeRequests: customerJobs.filter((job) => activeStatuses.has(String(job.status || "").toLowerCase())).length,
      locations,
      recentUpdates
    };
  }, [customerJobs, isCustomer]);

  const staffSummary = useMemo(() => {
    if (!isStaff) {
      return {
        assigned: 0,
        inProgress: 0,
        completedToday: 0
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    return {
      assigned: visibleJobs.length,
      inProgress: visibleJobs.filter((job) => String(job.status || "").toLowerCase() === "in_progress").length,
      completedToday: visibleJobs.filter((job) => {
        const status = String(job.status || "").toLowerCase();
        const updated = String(job.updated_at || "").slice(0, 10);
        return status === "completed" && updated === today;
      }).length
    };
  }, [isStaff, visibleJobs]);

  const queueSummary = useMemo(() => {
    const pending = visibleJobs.filter((job) => ["pending", "assigned"].includes(String(job.status || "").toLowerCase())).length;
    const inProgress = visibleJobs.filter((job) => String(job.status || "").toLowerCase() === "in_progress").length;
    const completed = visibleJobs.filter((job) => String(job.status || "").toLowerCase() === "completed").length;

    return {
      total: visibleJobs.length,
      pending,
      inProgress,
      completed
    };
  }, [visibleJobs]);

  const customerFlowSummary = useMemo(() => {
    if (!isCustomer) {
      return {
        pending: 0,
        inProgress: 0,
        completed: 0
      };
    }

    return {
      pending: customerJobs.filter((job) => ["pending", "assigned"].includes(String(job.status || "").toLowerCase())).length,
      inProgress: customerJobs.filter((job) => String(job.status || "").toLowerCase() === "in_progress").length,
      completed: customerJobs.filter((job) => String(job.status || "").toLowerCase() === "completed").length
    };
  }, [customerJobs, isCustomer]);

  const adminReporting = useMemo(() => {
    if (!isAdmin) {
      return {
        activeJobs: 0,
        newQuotes: 0,
        dueToday: 0,
        openIssues: 0,
        staffAssigned: 0,
        locationsServed: 0,
        jobsByStatus: [] as Array<{ label: string; count: number }>,
        quotesByRegion: [] as Array<{ label: string; count: number }>,
        issueTrend: [] as Array<{ label: string; count: number }>,
        volumeTrend: [] as Array<{ label: string; count: number }>
      };
    }

    const statusCounts = new Map<string, number>();
    const quoteRegionCounts = new Map<string, number>();
    const issueByDay = new Map<string, number>();
    const volumeByDay = new Map<string, number>();
    const today = new Date().toISOString().slice(0, 10);

    for (const job of jobs) {
      const status = String(job.status || "pending").toLowerCase();
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);

      const day = String(job.created_at || "").slice(0, 10) || today;
      volumeByDay.set(day, (volumeByDay.get(day) || 0) + 1);

      if (status === "pending" || status === "in_progress") {
        const issueDay = String(job.updated_at || job.created_at || "").slice(0, 10) || today;
        issueByDay.set(issueDay, (issueByDay.get(issueDay) || 0) + 1);
      }
    }

    for (const quote of quotes) {
      const region = String(quote.region || "Unspecified");
      quoteRegionCounts.set(region, (quoteRegionCounts.get(region) || 0) + 1);
    }

    const jobsByStatus = Array.from(statusCounts.entries())
      .map(([label, count]) => ({ label: label.replace("_", " "), count }))
      .sort((a, b) => b.count - a.count);

    const quotesByRegion = Array.from(quoteRegionCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const issueTrend = Array.from(issueByDay.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(-7);

    const volumeTrend = Array.from(volumeByDay.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(-7);

    return {
      activeJobs: jobs.filter((job) => !["completed", "cancelled"].includes(String(job.status || "").toLowerCase())).length,
      newQuotes: quotes.filter((quote) => ["new", "pending", ""].includes(String(quote.status || "").toLowerCase())).length,
      dueToday: jobs.filter((job) => String(job.created_at || "").slice(0, 10) === today).length,
      openIssues: jobs.filter((job) => ["pending", "in_progress"].includes(String(job.status || "").toLowerCase())).length,
      staffAssigned: new Set(jobs.map((job) => job.staff_profile_id).filter(Boolean)).size,
      locationsServed: new Set(jobs.map((job) => job.region).filter(Boolean)).size,
      jobsByStatus,
      quotesByRegion,
      issueTrend,
      volumeTrend
    };
  }, [isAdmin, jobs, quotes]);

  const operationsPulse = useMemo(() => {
    if (authState !== "authenticated") return null;

    const notes: string[] = [];
    let tone: "calm" | "watch" | "action" = "calm";

    if (isCustomer) {
      if (customerSummary.activeRequests > 0) {
        notes.push(`${customerSummary.activeRequests} active request${customerSummary.activeRequests === 1 ? "" : "s"} currently in progress.`);
      } else {
        notes.push("No active requests right now. You can schedule your next cleaning any time.");
      }
      if (customerSummary.recentUpdates.length > 0) {
        notes.push(`Recent updates available for ${customerSummary.recentUpdates.length} service item${customerSummary.recentUpdates.length === 1 ? "" : "s"}.`);
      }
    }

    if (isStaff) {
      if (staffSummary.assigned === 0) {
        tone = "watch";
        notes.push("No jobs are assigned yet. Check back after dispatch updates.");
      } else {
        notes.push(`${staffSummary.assigned} assigned job${staffSummary.assigned === 1 ? "" : "s"} in your queue.`);
      }
      if (staffSummary.inProgress > 0) {
        notes.push(`${staffSummary.inProgress} job${staffSummary.inProgress === 1 ? "" : "s"} currently marked in progress.`);
      }
    }

    if (isAdmin) {
      if (adminReporting.openIssues > 0) {
        tone = "watch";
        notes.push(`${adminReporting.openIssues} open issue${adminReporting.openIssues === 1 ? "" : "s"} need monitoring.`);
      }
      if (adminReporting.newQuotes > 0) {
        notes.push(`${adminReporting.newQuotes} new quote${adminReporting.newQuotes === 1 ? "" : "s"} waiting for decision.`);
      }
      if (adminReporting.activeJobs > 0) {
        notes.push(`${adminReporting.activeJobs} active job${adminReporting.activeJobs === 1 ? "" : "s"} currently underway.`);
      }
    }

    if (loadError) {
      tone = "action";
      notes.unshift("Portal data sync warning: some live records may be stale until refresh succeeds.");
    }

    if (queueMessage) {
      notes.push(queueMessage);
    }

    if (notes.length === 0) {
      notes.push("Portal status is stable.");
    }

    return { tone, notes };
  }, [
    authState,
    isCustomer,
    isStaff,
    isAdmin,
    customerSummary.activeRequests,
    customerSummary.recentUpdates.length,
    staffSummary.assigned,
    staffSummary.inProgress,
    adminReporting.openIssues,
    adminReporting.newQuotes,
    adminReporting.activeJobs,
    loadError,
    queueMessage
  ]);

  // (Obsolete: queueCounts/regionCounts, now handled by jobs/quotes filtering and UI)

  // (Obsolete: regionDraftByProjectId effect, removed after jobs/quotes refactor)

  // API fetch helpers
  async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const supabase = getSupabase();
    const authClient = supabase.auth as any;
    const { data: sessionData } = await authClient.getSession();
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
      setLastSyncedAt(new Date().toISOString());
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
        const authClient = supabase.auth as any;
        const { data: sessionData } = await authClient.getSession();
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
        const authClient = supabase.auth as any;
        const { data } = authClient.onAuthStateChange((_event: string, nextSession: { user?: { email?: string } } | null) => {
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
      const authClient = supabase.auth as any;
      await authClient.signOut();
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
    const authClient = supabase.auth as any;
    const redirectTo = buildProductCallbackUrl({
      origin: window.location.origin,
      product: "garden",
      returnTo: "/garden-cleaners/portal#portal-access"
    });
    await authClient.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
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

      <article className="card garden-proof-card garden-portal-hero-card">
        <p className="garden-panel-kicker">Regional portal</p>
        <h3 className="garden-portal-hero-title">Need quote help before sign-in?</h3>
        <p className="muted garden-portal-hero-copy">
          Start a regional quote path or contact operations directly.
        </p>
        <div className="hero-actions garden-portal-hero-actions">
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

        <div className="cards-grid cards-grid-3 garden-portal-region-grid">
          {PORTAL_REGION_CTA_OPTIONS.map((regionName) => (
            <article key={regionName} className="card garden-proof-card garden-portal-region-card">
              <h4>{regionName}</h4>
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
            <div className="garden-auth-cta-wrap">
              <button
                type="button"
                className="btn btn-primary garden-auth-google-btn"
                onClick={handleGoogleSignIn}
              >
                Continue with Google
              </button>
            </div>
          )}
          {authState === "loading" && loadingTimeout && (
            <div className="garden-inline-alert garden-inline-alert--error garden-auth-timeout-alert">
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
            <p className="muted garden-lane-meta">
              Visible records: {isAdmin ? `${jobs.length} jobs, ${quotes.length} quotes` : `${visibleJobs.length} jobs`}
            </p>
          ) : null}
          {authState === "authenticated" && lastSyncedAt ? (
            <p className="muted garden-lane-meta">
              Last synced: {new Date(lastSyncedAt).toLocaleString("en-CA")}
            </p>
          ) : null}
        </article>
      </div>

      {authState !== "authenticated" ? (
      <div className="hero-actions garden-portal-sticky-actions">
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
          Contact operations
        </a>
      </div>
      ) : null}

      {authState === "authenticated" && (
        <>
          {operationsPulse ? (
            <article className={`card garden-proof-card garden-ops-banner garden-ops-banner--${operationsPulse.tone}`}>
              <h3>Operations status</h3>
              <ul>
                {operationsPulse.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </article>
          ) : null}

          <section className="garden-dashboard-shell" aria-label="Portal dashboard">
            {isCustomer && (
              <>
                <div className="section-heading garden-dashboard-heading">
                  <p className="eyebrow">Customer dashboard</p>
                  <h2>Your service summary</h2>
                  <p>Track your next service, recent updates, and request support from one place.</p>
                  <div className="garden-dashboard-notes">
                    <span className="garden-status-chip garden-status-chip--watch">Pending {customerFlowSummary.pending}</span>
                    <span className="garden-status-chip garden-status-chip--watch">In progress {customerFlowSummary.inProgress}</span>
                    <span className="garden-status-chip garden-status-chip--calm">Completed {customerFlowSummary.completed}</span>
                  </div>
                </div>
                <div className="cards-grid cards-grid-4 garden-kpi-grid">
                  <article className="card garden-proof-card garden-kpi-card garden-kpi-card--priority">
                    <span>Next service</span>
                    <strong>{customerSummary.nextService ? String(customerSummary.nextService.status || "Assigned") : "No active service"}</strong>
                    {customerSummary.nextService ? (
                      <span className={`garden-status-chip garden-status-chip--${getStatusTone(String(customerSummary.nextService.status || "assigned"))}`}>
                        {String(customerSummary.nextService.status || "assigned").replace("_", " ")}
                      </span>
                    ) : null}
                    <p>{customerSummary.nextService ? [customerSummary.nextService.address, customerSummary.nextService.city].filter(Boolean).join(" ") : "Create a new request when ready."}</p>
                  </article>
                  <article className="card garden-proof-card garden-kpi-card">
                    <span>Active requests</span>
                    <strong>{customerSummary.activeRequests}</strong>
                    <p>Jobs currently pending, assigned, or in progress.</p>
                  </article>
                  <article className="card garden-proof-card garden-kpi-card">
                    <span>Service locations</span>
                    <strong>{customerSummary.locations.length}</strong>
                    <p>{customerSummary.locations.length ? customerSummary.locations.slice(0, 2).join(" • ") : "No locations on record yet."}</p>
                  </article>
                  <article className="card garden-proof-card garden-kpi-card">
                    <span>Recent updates</span>
                    <strong>{customerSummary.recentUpdates.length}</strong>
                    <p>Latest service history items in your lane.</p>
                  </article>
                </div>

                <article className="card garden-proof-card">
                  <h3>Quick actions</h3>
                  <div className="hero-actions">
                    <a className="btn btn-secondary" href="/garden-cleaners/contact">Report an issue</a>
                    <a className="btn btn-secondary" href="/garden-cleaners/services">Book another service</a>
                    <a className="btn btn-secondary" href="/garden-cleaners/quote">Request a new quote</a>
                    <a className="btn btn-secondary" href="/garden-cleaners/contact">Contact operations</a>
                  </div>
                </article>

                {customerSummary.recentUpdates.length > 0 && (
                  <article className="card garden-proof-card">
                    <h3>Recent service updates</h3>
                    <div className="cards-grid cards-grid-2">
                      {customerSummary.recentUpdates.map((job) => (
                        <article key={job.id} className="card garden-proof-card garden-update-card">
                          <h4>Job {job.id.slice(0, 8)}</h4>
                          <p>
                            <strong>Status:</strong>{" "}
                            <span className={`garden-status-chip garden-status-chip--${getStatusTone(String(job.status || ""))}`}>
                              {String(job.status || "unknown").replace("_", " ")}
                            </span>
                          </p>
                          <p><strong>Updated:</strong> {new Date(job.updated_at || job.created_at || Date.now()).toLocaleDateString("en-CA")}</p>
                          <p><strong>Location:</strong> {[job.address, job.city, job.region].filter(Boolean).join(" ") || "Not provided"}</p>
                        </article>
                      ))}
                    </div>
                  </article>
                )}
              </>
            )}

            {isStaff && (
              <>
                <div className="section-heading garden-dashboard-heading">
                  <p className="eyebrow">Staff dashboard</p>
                  <h2>Assigned job operations</h2>
                  <p>Keep progress current with assignment visibility, location context, and completion actions.</p>
                  <div className="garden-dashboard-notes">
                    <span className="garden-status-chip garden-status-chip--watch">Queue {staffSummary.assigned}</span>
                    <span className="garden-status-chip garden-status-chip--watch">In progress {staffSummary.inProgress}</span>
                    <span className="garden-status-chip garden-status-chip--calm">Completed today {staffSummary.completedToday}</span>
                  </div>
                </div>
                <div className="cards-grid cards-grid-3 garden-kpi-grid">
                  <article className="card garden-proof-card garden-kpi-card">
                    <span>Assigned jobs</span>
                    <strong>{staffSummary.assigned}</strong>
                    <p>Current jobs mapped to your staff profile.</p>
                  </article>
                  <article className="card garden-proof-card garden-kpi-card">
                    <span>In progress</span>
                    <strong>{staffSummary.inProgress}</strong>
                    <p>Jobs actively underway right now.</p>
                  </article>
                  <article className="card garden-proof-card garden-kpi-card">
                    <span>Completed today</span>
                    <strong>{staffSummary.completedToday}</strong>
                    <p>Jobs closed with today&apos;s update timestamp.</p>
                  </article>
                </div>
              </>
            )}

            {isAdmin && (
              <>
                <div className="section-heading garden-dashboard-heading">
                  <p className="eyebrow">Admin dashboard</p>
                  <h2>Operations reporting and workload visibility</h2>
                  <p>Track quote flow, job delivery, team assignment, and issue pressure without leaving the portal.</p>
                  <div className="garden-dashboard-notes">
                    <span className={`garden-status-chip garden-status-chip--${adminReporting.openIssues > 0 ? "action" : "calm"}`}>
                      Open issues {adminReporting.openIssues}
                    </span>
                    <span className={`garden-status-chip garden-status-chip--${adminReporting.newQuotes > 0 ? "watch" : "calm"}`}>
                      New quotes {adminReporting.newQuotes}
                    </span>
                    <span className="garden-status-chip garden-status-chip--calm">Locations {adminReporting.locationsServed}</span>
                  </div>
                </div>
                <div className="cards-grid cards-grid-3 garden-kpi-grid">
                  <article className="card garden-proof-card garden-kpi-card"><span>Active jobs</span><strong>{adminReporting.activeJobs}</strong><p>Open jobs excluding completed and cancelled.</p></article>
                  <article className="card garden-proof-card garden-kpi-card"><span>New quotes</span><strong>{adminReporting.newQuotes}</strong><p>Quotes awaiting decision or conversion.</p></article>
                  <article className="card garden-proof-card garden-kpi-card"><span>Jobs due today</span><strong>{adminReporting.dueToday}</strong><p>Jobs created for today&apos;s workload cycle.</p></article>
                  <article className="card garden-proof-card garden-kpi-card garden-kpi-card--priority"><span>Open issues</span><strong>{adminReporting.openIssues}</strong><p>Pending and in-progress service pressure.</p></article>
                  <article className="card garden-proof-card garden-kpi-card"><span>Staff assigned</span><strong>{adminReporting.staffAssigned}</strong><p>Distinct staff profiles on active records.</p></article>
                  <article className="card garden-proof-card garden-kpi-card"><span>Locations served</span><strong>{adminReporting.locationsServed}</strong><p>Distinct regions currently represented.</p></article>
                </div>

                <div className="garden-report-grid">
                  <article className="card garden-proof-card">
                    <h3>Jobs by status</h3>
                    <div className="garden-mini-chart">
                      {adminReporting.jobsByStatus.map((item) => (
                        <div key={item.label} className={`garden-mini-chart-row${item.count > 0 && item.count === (adminReporting.jobsByStatus[0]?.count || 0) ? " garden-mini-chart-row--top" : ""}`}>
                          <span title={item.label}>{getShortLabel(item.label, 14)}</span>
                          <div className="garden-mini-chart-bar"><i style={{ width: `${Math.min(100, item.count * 12)}%` }} /></div>
                          <strong>{item.count}</strong>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="card garden-proof-card">
                    <h3>Quotes by region</h3>
                    <div className="garden-mini-chart">
                      {adminReporting.quotesByRegion.map((item) => (
                        <div key={item.label} className={`garden-mini-chart-row${item.count > 0 && item.count === (adminReporting.quotesByRegion[0]?.count || 0) ? " garden-mini-chart-row--top" : ""}`}>
                          <span title={item.label}>{getShortLabel(item.label, 14)}</span>
                          <div className="garden-mini-chart-bar"><i style={{ width: `${Math.min(100, item.count * 14)}%` }} /></div>
                          <strong>{item.count}</strong>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="card garden-proof-card">
                    <h3>Issue trend (7 days)</h3>
                    <div className="garden-mini-chart">
                      {adminReporting.issueTrend.map((item) => (
                        <div key={item.label} className={`garden-mini-chart-row${item.count > 0 && item.count === Math.max(...adminReporting.issueTrend.map((trend) => trend.count), 0) ? " garden-mini-chart-row--top" : ""}`}>
                          <span title={item.label.slice(5)}>{getShortLabel(item.label.slice(5), 10)}</span>
                          <div className="garden-mini-chart-bar"><i style={{ width: `${Math.min(100, item.count * 16)}%` }} /></div>
                          <strong>{item.count}</strong>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="card garden-proof-card">
                    <h3>Job volume trend (7 days)</h3>
                    <div className="garden-mini-chart">
                      {adminReporting.volumeTrend.map((item) => (
                        <div key={item.label} className={`garden-mini-chart-row${item.count > 0 && item.count === Math.max(...adminReporting.volumeTrend.map((trend) => trend.count), 0) ? " garden-mini-chart-row--top" : ""}`}>
                          <span title={item.label.slice(5)}>{getShortLabel(item.label.slice(5), 10)}</span>
                          <div className="garden-mini-chart-bar"><i style={{ width: `${Math.min(100, item.count * 16)}%` }} /></div>
                          <strong>{item.count}</strong>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              </>
            )}
          </section>

          {loading && <div className="loading">Loading portal data...</div>}
          {/* Admin/Staff: Tab switcher */}
          {isAdmin && (
            <div className="garden-admin-tabs">
              <button
                type="button"
                className={adminTab === "jobs" ? "btn btn-primary garden-admin-tab-btn" : "btn btn-secondary garden-admin-tab-btn"}
                onClick={() => setAdminTab("jobs")}
              >
                Jobs &amp; Quotes
              </button>
              <button
                type="button"
                className={adminTab === "users" ? "btn btn-primary garden-admin-tab-btn" : "btn btn-secondary garden-admin-tab-btn"}
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
            <article className="card garden-proof-card garden-quotes-convert-card">
              <h3>Quotes to Convert</h3>
              <ul className="garden-quotes-convert-list">
                {quotes.map((q) => (
                  <li key={q.id} className="garden-quotes-convert-item">
                    <div className="garden-quotes-convert-line">
                      Email: {q.email} | {q.address} {q.city} | {q.service_type} | {q.property_type}
                    </div>
                    <div className="garden-quotes-convert-line">
                      <strong>Status:</strong>{" "}
                      <span className={`garden-status-chip garden-status-chip--${getStatusTone(String(q.status || "new"))}`}>
                        {String(q.status || "new").replace("_", " ")}
                      </span>
                    </div>
                    <div className="hero-actions garden-quotes-convert-actions">
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
              <p className="muted">Scan, filter, and update active job records from one queue.</p>
              <div className="garden-dashboard-notes garden-queue-summary-notes">
                <span className="garden-status-chip garden-status-chip--watch">Queue {queueSummary.total}</span>
                <span className="garden-status-chip garden-status-chip--watch">Pending {queueSummary.pending}</span>
                <span className="garden-status-chip garden-status-chip--watch">In progress {queueSummary.inProgress}</span>
                <span className="garden-status-chip garden-status-chip--calm">Completed {queueSummary.completed}</span>
              </div>
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
              <div className="cards-grid cards-grid-3 garden-queue-grid">
                {visibleJobs.length ? visibleJobs.map((job) => (
                  <article key={job.id} className={`card garden-proof-card garden-queue-card garden-queue-card--${getStatusTone(String(job.status || ""))}`}>
                    <h4>Job {job.id.slice(0, 8)}</h4>
                    <p>
                      <strong>Status:</strong>{" "}
                      <span className={`garden-status-chip garden-status-chip--${getStatusTone(String(job.status || ""))}`}>
                        {String(job.status || "unknown").replace("_", " ")}
                      </span>
                    </p>
                    <p><strong>Customer:</strong> {job.customer_email}</p>
                    <p><strong>Address:</strong> {[job.address, job.city].filter(Boolean).join(" ") || "Not provided"}</p>
                    <p><strong>Type:</strong> {[job.service_type, job.property_type].filter(Boolean).join(" • ") || "Not provided"}</p>
                    <p><strong>Created:</strong> {job.created_at ? new Date(job.created_at).toLocaleDateString("en-CA") : "unknown"}</p>
                    {/* Admin: assign staff */}
                    {isAdmin && (
                      <div className="garden-queue-assign">
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
                )) : <div className="garden-queue-empty">No jobs found for this view.</div>}
              </div>
            </article>
          )}
          {/* Admin: User Management tab */}
          {isAdmin && adminTab === "users" && (
            <article className="card garden-proof-card garden-admin-users-panel">
              <div className="garden-admin-users-header">
                <h3>User Management</h3>
                <button
                  type="button"
                  className="btn btn-primary garden-btn-sm"
                  onClick={() => { setShowInviteForm((v) => !v); setInviteFormState("idle"); setInviteFormMessage(""); }}
                >
                  {showInviteForm ? "Cancel" : "+ Invite User"}
                </button>
              </div>
              {/* Invite form */}
              {showInviteForm && (
                <form
                  onSubmit={submitInviteUser}
                  className="garden-admin-invite-form"
                >
                  <h4>Invite new user</h4>
                  <label className="garden-admin-invite-field">
                    <span>Email *</span>
                    <input
                      type="email"
                      value={inviteEmail}
                      required
                      onChange={(e) => setInviteEmail(e.currentTarget.value)}
                      placeholder="user@example.com"
                    />
                  </label>
                  <label className="garden-admin-invite-field">
                    <span>Display name</span>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.currentTarget.value)}
                      placeholder="Full name (optional)"
                    />
                  </label>
                  <label className="garden-admin-invite-field">
                    <span>Role</span>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.currentTarget.value as typeof inviteRole)}
                    >
                      <option value="client">Client</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label className="garden-admin-invite-field">
                    <span>Service region</span>
                    <select
                      value={inviteRegion}
                      onChange={(e) => setInviteRegion(e.currentTarget.value)}
                    >
                      <option value="">- Any -</option>
                      {REGION_OPTIONS.filter((r) => r !== "Unspecified").map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  {inviteFormMessage && (
                    <p className={`garden-inline-alert ${inviteFormState === "error" ? "garden-inline-alert--error" : "garden-inline-alert--success"}`}>
                      {inviteFormMessage}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary garden-btn-sm"
                    disabled={inviteFormState === "submitting"}
                  >
                    {inviteFormState === "submitting" ? "Sending invite..." : "Send invite"}
                  </button>
                </form>
              )}
              {/* Search/filter row */}
              <div className="intake-form-grid garden-admin-users-filters">
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
              <div className="hero-actions garden-admin-users-actions">
                <button type="button" className="btn btn-secondary garden-btn-sm" onClick={() => void loadAdminUsers(1)}>
                  {usersMgmtState === "loading" ? "Loading..." : "Search"}
                </button>
              </div>
              {usersMgmtError && <p className="garden-inline-alert garden-inline-alert--error">{usersMgmtError}</p>}
              {usersMgmtMessage && <p className="garden-inline-alert garden-inline-alert--success">{usersMgmtMessage}</p>}
              {/* User table */}
              {adminUsers.length > 0 ? (
                <div className="garden-admin-table-wrap">
                  <table className="garden-admin-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Region</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map((u) => {
                        const isPending = pendingUserAction === u.id || pendingUserAction === u.email;
                        const isConfirmingDisable = confirmDisableUserId === u.id;
                        return (
                          <tr key={u.id} className={isPending ? "garden-admin-row-pending" : ""}>
                            <td className="garden-break-all">{u.email}</td>
                            <td>{u.display_name || <span className="garden-muted-placeholder">-</span>}</td>
                            <td>
                              <select
                                value={u.role}
                                disabled={isPending}
                                onChange={(e) => void updateUserRole(u.id, e.currentTarget.value as AdminUserRecord["role"])}
                                className="garden-table-select"
                              >
                                <option value="client">Client</option>
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td>{u.service_region || <span className="garden-muted-placeholder">-</span>}</td>
                            <td>
                              <span className={`garden-pill ${u.is_active ? "garden-pill--active" : "garden-pill--disabled"}`}>
                                {u.is_active ? "Active" : "Disabled"}
                              </span>
                            </td>
                            <td>
                              <div className="garden-admin-row-actions">
                                {u.is_active ? (
                                  isConfirmingDisable ? (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-secondary garden-btn-xs garden-btn-danger-soft"
                                        disabled={isPending}
                                        onClick={() => void toggleUserActive(u.id, false)}
                                      >
                                        Confirm disable
                                      </button>
                                      <button type="button" className="btn btn-secondary garden-btn-xs" onClick={() => setConfirmDisableUserId("")}>Cancel</button>
                                    </>
                                  ) : (
                                    <button type="button" className="btn btn-secondary garden-btn-xs" disabled={isPending} onClick={() => toggleUserActive(u.id, false)}>Disable</button>
                                  )
                                ) : (
                                  <button type="button" className="btn btn-secondary garden-btn-xs" disabled={isPending} onClick={() => void toggleUserActive(u.id, true)}>Reactivate</button>
                                )}
                                <button type="button" className="btn btn-secondary garden-btn-xs" disabled={isPending} onClick={() => void resetUserInvite(u.email)}>
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
                  <div className="garden-admin-pagination">
                    <button type="button" className="btn btn-secondary garden-btn-sm" disabled={adminUsersPage <= 1} onClick={() => void loadAdminUsers(adminUsersPage - 1)}>Prev</button>
                    <span>Page {adminUsersPage} - {adminUsersTotal} total</span>
                    <button type="button" className="btn btn-secondary garden-btn-sm" disabled={adminUsersPage * 25 >= adminUsersTotal} onClick={() => void loadAdminUsers(adminUsersPage + 1)}>Next</button>
                  </div>
                </div>
              ) : usersMgmtState === "idle" ? (
                <div className="garden-admin-empty">No users found. Search above or invite a new user.</div>
              ) : null}

              <div className="garden-admin-audit">
                <div className="garden-admin-audit-header">
                  <h4>Recent admin activity</h4>
                  <button
                    type="button"
                    className="btn btn-secondary garden-btn-sm"
                    onClick={() => void loadAdminAudit()}
                    disabled={adminAuditState === "loading"}
                  >
                    {adminAuditState === "loading" ? "Refreshing..." : "Refresh activity"}
                  </button>
                </div>
                {adminAuditError ? (
                  <p className="garden-inline-alert garden-inline-alert--error">
                    {adminAuditError}
                  </p>
                ) : null}
                {adminAuditEntries.length > 0 ? (
                  <div className="garden-admin-table-wrap garden-admin-audit-table-wrap">
                    <table className="garden-admin-table garden-admin-table--compact">
                      <thead>
                        <tr>
                          <th>When</th>
                          <th>Actor</th>
                          <th>Action</th>
                          <th>Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminAuditEntries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="garden-nowrap">
                              {entry.created_at ? new Date(entry.created_at).toLocaleString("en-CA") : "-"}
                            </td>
                            <td className="garden-break-all">{entry.actor_email || "-"}</td>
                            <td>{entry.action || "-"}</td>
                            <td className="garden-break-all">{entry.target_email || entry.target_user_id || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted garden-admin-audit-empty">No recent admin activity yet.</p>
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
