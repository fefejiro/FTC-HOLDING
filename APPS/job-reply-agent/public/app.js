(() => {
  "use strict";

  const state = {
    user: null,
    installPrompt: null,
    mfaPending: false,
    dashboard: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const authView = $("#auth-view");
  const appShell = $("#app-shell");
  const globalStatus = $("#global-status");

  function cookie(name) {
    const prefix = `${name}=`;
    const value = document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(prefix));
    return value ? decodeURIComponent(value.slice(prefix.length)) : "";
  }

  function mutationKey() {
    return globalThis.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function api(path, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers || {});
    const hasBody = options.body !== undefined;
    if (hasBody && !(options.body instanceof FormData) && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const csrf = cookie("jobagent_csrf");
      if (csrf) headers.set("x-csrf-token", csrf);
      if (!headers.has("idempotency-key")) headers.set("idempotency-key", mutationKey());
    }
    const response = await fetch(path, {
      ...options,
      method,
      headers,
      credentials: "same-origin"
    });
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    if (!response.ok) {
      const error = new Error(body?.error || `Request failed (${response.status}).`);
      error.code = body?.code;
      error.status = response.status;
      error.details = body?.details;
      throw error;
    }
    return body;
  }

  function setStatus(text, tone = "neutral") {
    globalStatus.textContent = text;
    globalStatus.className = `status-chip ${tone}`;
  }

  function setResult(target, text, tone = "") {
    const element = typeof target === "string" ? $(target) : target;
    if (!element) return;
    element.textContent = text;
    element.dataset.tone = tone;
  }

  function showNotice(target, text, tone = "warning") {
    const element = typeof target === "string" ? $(target) : target;
    if (!element) return;
    element.textContent = text;
    element.className = `notice ${tone}`;
    element.hidden = !text;
  }

  function splitLines(value) {
    return String(value || "")
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function text(value, fallback = "") {
    return value === null || value === undefined ? fallback : String(value);
  }

  function dateLabel(value) {
    if (!value) return "Not recorded";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? text(value)
      : new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short"
        }).format(parsed);
  }

  function statusLabel(value) {
    return text(value, "unknown").replaceAll("_", " ");
  }

  function emptyItem(message) {
    const item = document.createElement("li");
    item.className = "empty-state";
    item.textContent = message;
    return item;
  }

  function clearAndFill(list, records, renderer, emptyMessage) {
    list.replaceChildren();
    if (!records?.length) {
      list.append(emptyItem(emptyMessage));
      return;
    }
    for (const record of records) list.append(renderer(record));
  }

  function recordItem(title, details = [], options = {}) {
    const item = document.createElement("li");
    const heading = document.createElement(options.url ? "a" : "strong");
    heading.textContent = title;
    if (options.url) {
      heading.href = options.url;
      heading.target = "_blank";
      heading.rel = "noopener noreferrer";
    }
    item.append(heading);
    for (const detail of details.filter(Boolean)) {
      const line = document.createElement("span");
      line.textContent = detail;
      item.append(line);
    }
    if (options.actions) item.append(options.actions);
    return item;
  }

  function actionButton(label, action, value, tone = "secondary") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `button ${tone}`;
    button.textContent = label;
    button.dataset.action = action;
    button.dataset.value = value;
    return button;
  }

  function actionLink(label, href) {
    const link = document.createElement("a");
    link.className = "button secondary";
    link.textContent = label;
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  }

  function showAuthScreen(name) {
    const screens = {
      login: ["#login-form", "Sign in to JobAgent"],
      register: ["#register-form", "Accept your JobAgent invitation"],
      resetRequest: ["#reset-request-form", "Reset your password"],
      resetConfirm: ["#reset-confirm-form", "Choose a new password"]
    };
    for (const [key, [selector]] of Object.entries(screens)) {
      $(selector).hidden = key !== name;
    }
    $("#auth-title").textContent = screens[name][1];
    showNotice("#auth-message", "", "neutral");
  }

  function showAuthenticated(user) {
    state.user = user;
    authView.hidden = true;
    appShell.hidden = false;
    $("#logout").hidden = false;
    $(".auth-only").hidden = false;
    $("#candidate-email").textContent = user.email;
    $("#candidate-role").textContent = `${statusLabel(user.role)} · ${statusLabel(user.status)}`;
    $("#operator-nav").hidden = !["operator", "admin"].includes(user.role);
    $("#verification-state").textContent = user.emailVerified
      ? "Verified"
      : "Verification is required before connecting accounts or enrolling a runner.";
    $("#resend-verification").hidden = Boolean(user.emailVerified);
    $("#setup-mfa").textContent = user.mfaEnabled ? "MFA enabled" : "Set up MFA";
    $("#setup-mfa").disabled = Boolean(user.mfaEnabled);
    if (user.status === "paused") {
      showNotice(
        "#account-banner",
        "This account is paused. Connections and automation are disabled until you resume it.",
        "warning"
      );
    } else if (!user.emailVerified) {
      showNotice(
        "#account-banner",
        "Verify your email before connecting Gmail, forwarding recruiter mail, or enrolling a runner.",
        "warning"
      );
    } else {
      showNotice("#account-banner", "", "warning");
    }
    setStatus(user.status === "paused" ? "Paused" : "Protected", user.status === "paused" ? "warning" : "good");
  }

  function showSignedOut() {
    state.user = null;
    authView.hidden = false;
    appShell.hidden = true;
    $("#logout").hidden = true;
    setStatus(navigator.onLine ? "Signed out" : "Offline", "neutral");
  }

  function populateOnboarding(onboarding) {
    const form = $("#onboarding-form");
    const record = onboarding?.record || {};
    for (const key of [
      "fullName",
      "phone",
      "location",
      "timeZone",
      "linkedIn",
      "compensationFloor",
      "workAuthorization"
    ]) {
      if (record[key] !== undefined) form.elements[key].value = record[key];
    }
    for (const key of ["targetTitles", "excludedTitles", "locations", "employmentTypes"]) {
      if (Array.isArray(record[key])) form.elements[key].value = record[key].join("\n");
    }
    for (const checkbox of $$('input[name="workModes"]', form)) {
      checkbox.checked = Array.isArray(record.workModes) && record.workModes.includes(checkbox.value);
    }
    if (record.sponsorshipRequired !== undefined) {
      form.elements.sponsorshipRequired.value = String(record.sponsorshipRequired);
    }
    const consent = record.consent || {};
    for (const key of [
      "truthConfirmed",
      "recruiterDrafts",
      "recruiterSends",
      "assistedApplications",
      "controlledSubmissions"
    ]) {
      form.elements[key].checked = Boolean(consent[key]);
    }
  }

  function populatePolicy(policy) {
    const form = $("#policy-form");
    if (!policy) return;
    for (const key of [
      "mode",
      "timeZone",
      "maxDraftsPerDay",
      "maxRecruiterSendsPerDay",
      "maxApplicationsPerDay",
      "maxApplicationsPerBoard",
      "quietHoursStart",
      "quietHoursEnd",
      "recruiterDrafts",
      "recruiterSends",
      "assistedApplications",
      "controlledSubmissions"
    ]) {
      if (policy[key] !== undefined) form.elements[key].value = String(policy[key]);
    }
  }

  async function loadResumes() {
    const [{ resumes }, truth] = await Promise.all([
      api("/api/v1/resumes"),
      api("/api/v1/career-truth")
    ]);
    const vault = $("#resume-list");
    vault.replaceChildren();
    if (!resumes.length) {
      const message = document.createElement("p");
      message.className = "empty-state";
      message.textContent = "No resumes are stored yet.";
      vault.append(message);
    } else {
      for (const resume of resumes) {
        const row = document.createElement("article");
        row.className = "vault-row";
        const details = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = resume.filename;
        const meta = document.createElement("span");
        meta.textContent = `${Math.ceil(Number(resume.byteSize) / 1024)} KB · ${resume.storageStatus}`
          + (resume.isDefault ? " · Default" : "");
        details.append(name, meta);
        const actions = document.createElement("div");
        actions.className = "actions";
        const download = document.createElement("a");
        download.className = "button secondary";
        download.href = `/api/v1/resumes/${encodeURIComponent(resume.id)}/download`;
        download.textContent = "Download";
        actions.append(
          download,
          actionButton("Delete", "delete-resume", resume.id, "danger")
        );
        row.append(details, actions);
        vault.append(row);
      }
    }
    $("#truth-form").elements.facts.value = (truth.truthBank?.facts || [])
      .map((fact) => fact.statement)
      .join("\n");
  }

  function renderConnections(connections, connectors) {
    const grid = $("#connection-grid");
    const byProvider = new Map(connections.map((item) => [item.provider, item]));
    grid.replaceChildren();
    for (const connector of connectors) {
      const connection = byProvider.get(connector.source);
      const article = document.createElement("article");
      article.className = "connection-row";
      const summary = document.createElement("div");
      const heading = document.createElement("h2");
      heading.textContent = connector.source === "gmail"
        ? "Gmail"
        : connector.source[0].toUpperCase() + connector.source.slice(1);
      const status = document.createElement("span");
      status.className = `status-chip ${connector.status === "certified_live" ? "good" : "neutral"}`;
      status.textContent = statusLabel(connector.status);
      const capability = document.createElement("p");
      capability.textContent = [
        connector.discovery ? "Discovery" : null,
        connector.packageGeneration ? "Packages" : null,
        connector.assistedSubmission ? "Assisted submission" : null,
        connector.controlledSubmission ? "Controlled submission" : null,
        connector.proofReconciliation ? "Proof reconciliation" : null
      ].filter(Boolean).join(" · ");
      summary.append(heading, status, capability);
      if (connection?.providerAccount) {
        const account = document.createElement("p");
        account.textContent = `Connected identity: ${connection.providerAccount}`;
        summary.append(account);
      }
      const actions = document.createElement("div");
      actions.className = "actions";
      if (connection?.status === "connected") {
        actions.append(actionButton("Revoke", "revoke-connection", connector.source, "danger"));
      } else {
        const label = connector.source === "gmail" ? "Connect Gmail" : "Prepare connection";
        actions.append(actionButton(label, "connect", connector.source, "secondary"));
      }
      article.append(summary, actions);
      grid.append(article);
    }
  }

  function renderInterviewPrep(sessions) {
    clearAndFill(
      $("#interview-list"),
      sessions,
      (session) => recordItem(
        session.title || "Interview preparation",
        [
          session.company,
          `${session.questions?.length || 0} grounded questions`,
          statusLabel(session.status),
          ...(session.questions || []).map((question) => question.prompt)
        ]
      ),
      "No interview preparation sessions have been created."
    );
  }

  function renderDashboard(dashboard, readiness, connectors, analytics) {
    state.dashboard = dashboard;
    $("#metric-recommended").textContent = dashboard.recommendations.length;
    $("#metric-approvals").textContent = dashboard.approvals.length;
    $("#metric-verified").textContent = dashboard.applications
      .filter((item) => item.status === "submitted_verified").length;
    $("#metric-gates").textContent = dashboard.applications
      .filter((item) => ["manual_gate", "submitted_unverified"].includes(item.status)).length;
    $("#metric-replies").textContent = analytics.recruiterReplies || 0;
    $("#metric-interviews").textContent = analytics.interviews || 0;
    $("#metric-offers").textContent = analytics.offers || 0;

    clearAndFill(
      $("#readiness-list"),
      readiness.checks,
      (check) => recordItem(
        check.ready ? "Ready" : "Action required",
        [statusLabel(check.key)]
      ),
      "Activation checks have not been created."
    );
    clearAndFill(
      $("#connector-summary"),
      connectors,
      (connector) => recordItem(
        connector.source.toUpperCase(),
        [
          statusLabel(connector.status),
          connector.accountIdentifier ? `Identity: ${connector.accountIdentifier}` : null,
          connector.evidenceReference ? "Certification evidence recorded" : "No live certification evidence",
          connector.expiresAt ? `Certification expires ${dateLabel(connector.expiresAt)}` : null,
          connector.blockingReason || null
        ]
      ),
      "No channel capabilities are configured."
    );
    clearAndFill(
      $("#application-summary"),
      dashboard.applications.slice(0, 8),
      (application) => recordItem(
        application.title || "Application",
        [
          [application.company, application.source].filter(Boolean).join(" · "),
          `${statusLabel(application.status)} · ${dateLabel(application.updatedAt)}`,
          application.evidenceReference ? "Evidence recorded" : "No verification evidence"
        ]
      ),
      "No applications have been recorded."
    );
    clearAndFill(
      $("#job-list"),
      dashboard.recommendations,
      (job) => {
        const actions = document.createElement("div");
        actions.className = "actions";
        actions.append(
          actionButton("Analyze fit", "job-insight", job.id),
          actionButton("Prepare interview", "interview-prep", job.id)
        );
        return recordItem(
          job.title || "Opportunity",
          [
            [job.company, job.location, job.source].filter(Boolean).join(" · "),
            `${Number(job.score || 0)}% match · ${statusLabel(job.status)}`
          ],
          { url: job.jobUrl, actions }
        );
      },
      "No suitable opportunities are in the ranked queue."
    );
    clearAndFill(
      $("#approval-list"),
      dashboard.approvals,
      (approval) => {
        const actions = document.createElement("div");
        actions.className = "actions";
        actions.append(
          actionButton("Approve", "approval", `${approval.id}:approved`, "primary"),
          actionButton("Reject", "approval", `${approval.id}:rejected`, "danger")
        );
        return recordItem(
          approval.title || approval.action || "Approval request",
          [
            approval.company,
            approval.reason,
            dateLabel(approval.createdAt)
          ],
          { actions }
        );
      },
      "Nothing needs your approval."
    );
    clearAndFill(
      $("#application-list"),
      dashboard.applications,
      (application) => {
        const actions = document.createElement("div");
        actions.className = "actions";
        if (application.evidenceId) {
          actions.append(actionLink(
            "Download proof",
            `/api/v1/application-evidence/${application.evidenceId}/download`
          ));
        }
        actions.append(
          actionButton("Timeline", "timeline", application.id),
          actionButton("Record outcome", "outcome", application.id)
        );
        return recordItem(
          application.title || "Application",
          [
            [application.company, application.source].filter(Boolean).join(" · "),
            statusLabel(application.status),
            application.evidenceId ? "Private verification evidence recorded" : "Verification evidence not recorded",
            dateLabel(application.updatedAt)
          ],
          { url: application.finalUrl, actions }
        );
      },
      "No application attempts are recorded."
    );
  }

  async function loadDashboard() {
    const [dashboard, readiness, capabilityData, analytics, prep] = await Promise.all([
      api("/api/v1/dashboard"),
      api("/api/v1/activation-readiness"),
      api("/api/v1/connectors/capabilities"),
      api("/api/v1/analytics/conversion"),
      api("/api/v1/interview-prep")
    ]);
    renderDashboard(dashboard, readiness, capabilityData.connectors, analytics);
    renderInterviewPrep(prep.sessions);
    const connectionData = await api("/api/v1/connections");
    renderConnections(connectionData.connections, capabilityData.connectors);
  }

  async function loadAudit() {
    const { auditLogs } = await api("/api/v1/audit-logs?limit=50");
    clearAndFill(
      $("#audit-list"),
      auditLogs,
      (entry) => recordItem(
        statusLabel(entry.action),
        [
          `${statusLabel(entry.targetType)} · ${dateLabel(entry.createdAt)}`
        ]
      ),
      "No account activity is recorded."
    );
  }

  async function loadOperator() {
    if (!["operator", "admin"].includes(state.user?.role)) return;
    if (!state.user.mfaEnabled) {
      $("#operator-health").textContent = "Enable MFA to unlock operator health and invitation controls.";
      return;
    }
    try {
      const health = await api("/api/v1/operator/health");
      $("#operator-health").textContent = JSON.stringify(health, null, 2);
    } catch (error) {
      $("#operator-health").textContent = error.message;
    }
  }

  async function loadWorkspace() {
    const [onboarding, policy] = await Promise.all([
      api("/api/v1/onboarding"),
      api("/api/v1/automation-policy")
    ]);
    populateOnboarding(onboarding.onboarding);
    populatePolicy(policy.policy);
    await Promise.all([
      loadResumes(),
      loadDashboard(),
      loadAudit(),
      loadOperator()
    ]);
  }

  async function initializeSession() {
    try {
      const { user } = await api("/api/v1/me");
      showAuthenticated(user);
      await loadWorkspace();
    } catch (error) {
      if (error.status !== 401) showNotice("#auth-message", error.message, "danger");
      showSignedOut();
    }
  }

  function formObject(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = formObject(form);
    if (!payload.mfaCode) delete payload.mfaCode;
    try {
      const { user } = await api("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      state.mfaPending = false;
      showAuthenticated(user);
      await loadWorkspace();
    } catch (error) {
      if (error.code === "MFA_REQUIRED") {
        state.mfaPending = true;
        $("#mfa-field").hidden = false;
        $("#mfa-field input").required = true;
        $("#mfa-field input").focus();
      }
      showNotice("#auth-message", error.message, "danger");
    }
  });

  $("#register-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const { user, verificationEmailSent } = await api("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(formObject(event.currentTarget))
      });
      showAuthenticated(user);
      showNotice(
        "#account-banner",
        verificationEmailSent
          ? "Your account is ready. Check your inbox to verify your email."
          : "Your account is ready, but verification email delivery is unavailable. Contact the operator.",
        "warning"
      );
      await loadWorkspace();
    } catch (error) {
      showNotice("#auth-message", error.message, "danger");
    }
  });

  $("#reset-request-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/api/v1/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify(formObject(event.currentTarget))
      });
      showNotice(
        "#auth-message",
        "If that account exists, a password reset link has been sent.",
        "good"
      );
    } catch (error) {
      showNotice("#auth-message", error.message, "danger");
    }
  });

  $("#reset-confirm-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/api/v1/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify(formObject(event.currentTarget))
      });
      showAuthScreen("login");
      showNotice("#auth-message", "Password reset. Sign in with the new password.", "good");
    } catch (error) {
      showNotice("#auth-message", error.message, "danger");
    }
  });

  $("#onboarding-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      fullName: data.get("fullName"),
      phone: data.get("phone"),
      location: data.get("location"),
      timeZone: data.get("timeZone"),
      linkedIn: data.get("linkedIn"),
      targetTitles: splitLines(data.get("targetTitles")),
      excludedTitles: splitLines(data.get("excludedTitles")),
      locations: splitLines(data.get("locations")),
      workModes: data.getAll("workModes"),
      employmentTypes: splitLines(data.get("employmentTypes")),
      compensationFloor: data.get("compensationFloor"),
      workAuthorization: data.get("workAuthorization"),
      sponsorshipRequired: data.get("sponsorshipRequired") === "true",
      consent: {
        truthConfirmed: data.has("truthConfirmed"),
        recruiterDrafts: data.has("recruiterDrafts"),
        recruiterSends: data.has("recruiterSends"),
        assistedApplications: data.has("assistedApplications"),
        controlledSubmissions: data.has("controlledSubmissions")
      }
    };
    try {
      await api("/api/v1/onboarding", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setResult("#profile-result", "Profile and consent saved.", "good");
      await loadDashboard();
    } catch (error) {
      setResult("#profile-result", error.message, "danger");
    }
  });

  $("#policy-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = formObject(event.currentTarget);
    const payload = {
      mode: data.mode,
      recruiterDrafts: data.recruiterDrafts === "true",
      recruiterSends: data.recruiterSends === "true",
      assistedApplications: data.assistedApplications === "true",
      controlledSubmissions: data.controlledSubmissions === "true",
      maxDraftsPerDay: Number(data.maxDraftsPerDay),
      maxRecruiterSendsPerDay: Number(data.maxRecruiterSendsPerDay),
      maxApplicationsPerDay: Number(data.maxApplicationsPerDay),
      maxApplicationsPerBoard: Number(data.maxApplicationsPerBoard),
      quietHoursStart: Number(data.quietHoursStart),
      quietHoursEnd: Number(data.quietHoursEnd),
      timeZone: data.timeZone
    };
    try {
      await api("/api/v1/automation-policy", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setResult("#policy-result", "Automation policy saved.", "good");
      await loadDashboard();
    } catch (error) {
      setResult("#policy-result", error.message, "danger");
    }
  });

  $("#resume-upload-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.elements.resume.files[0];
    if (!file) return;
    setResult("#resume-result", "Encrypting and uploading…");
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("The resume could not be read."));
        reader.readAsDataURL(file);
      });
      const mimeType = file.type || (
        /\.pdf$/i.test(file.name)
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      await api("/api/v1/resumes", {
        method: "POST",
        body: JSON.stringify({
          filename: file.name,
          mimeType,
          base64,
          isDefault: form.elements.isDefault.checked
        })
      });
      form.reset();
      setResult("#resume-result", "Resume stored in the private vault.", "good");
      await Promise.all([loadResumes(), loadDashboard()]);
    } catch (error) {
      setResult("#resume-result", error.message, "danger");
    }
  });

  $("#resume-list").addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="delete-resume"]');
    if (!button) return;
    if (!confirm("Delete this resume from the private vault?")) return;
    try {
      await api(`/api/v1/resumes/${encodeURIComponent(button.dataset.value)}`, {
        method: "DELETE",
        body: "{}"
      });
      setResult("#resume-result", "Resume deleted.", "good");
      await Promise.all([loadResumes(), loadDashboard()]);
    } catch (error) {
      setResult("#resume-result", error.message, "danger");
    }
  });

  $("#truth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const facts = splitLines(data.get("facts")).map((statement) => ({
      category: "approved",
      statement
    }));
    try {
      await api("/api/v1/career-truth", {
        method: "PUT",
        body: JSON.stringify({ facts })
      });
      setResult("#truth-result", "Career facts approved and versioned.", "good");
      await loadDashboard();
    } catch (error) {
      setResult("#truth-result", error.message, "danger");
    }
  });

  $("#connection-grid").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const provider = button.dataset.value;
    try {
      if (button.dataset.action === "connect") {
        const result = await api("/api/v1/connections", {
          method: "POST",
          body: JSON.stringify({ provider })
        });
        if (result.authorizationUrl) {
          location.assign(result.authorizationUrl);
          return;
        }
        setResult(
          "#inbound-result",
          `${provider} is prepared for trusted-runner authentication. It is not certified yet.`
        );
      } else if (button.dataset.action === "revoke-connection") {
        if (!confirm(`Revoke the ${provider} connection?`)) return;
        await api(`/api/v1/connections/${encodeURIComponent(provider)}`, {
          method: "DELETE",
          body: "{}"
        });
      }
      await loadDashboard();
    } catch (error) {
      setResult("#inbound-result", error.message, "danger");
    }
  });

  $("#approval-list").addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="approval"]');
    if (!button) return;
    const [id, decision] = button.dataset.value.split(":");
    try {
      await api(`/api/v1/approvals/${encodeURIComponent(id)}`, {
        method: "POST",
        body: JSON.stringify({ decision })
      });
      await Promise.all([loadDashboard(), loadAudit()]);
    } catch (error) {
      showNotice("#account-banner", error.message, "danger");
    }
  });

  $("#job-list").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const jobMatchId = button.dataset.value;
    if (button.dataset.action === "job-insight") {
      const form = $("#job-insight-form");
      form.reset();
      form.elements.jobMatchId.value = jobMatchId;
      setResult("#job-insight-result", "");
      $("#job-insight-dialog").showModal();
      return;
    }
    if (button.dataset.action === "interview-prep") {
      try {
        await api(`/api/v1/jobs/${encodeURIComponent(jobMatchId)}/interview-prep`, {
          method: "POST",
          body: "{}"
        });
        await loadDashboard();
        $('[data-view="interview"]').click();
      } catch (error) {
        showNotice("#account-banner", error.message, "danger");
      }
    }
  });

  $("#job-insight-form").addEventListener("submit", async (event) => {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const { insight } = await api(
        `/api/v1/jobs/${encodeURIComponent(form.elements.jobMatchId.value)}/insights`,
        {
          method: "POST",
          body: JSON.stringify({ jobDescription: form.elements.jobDescription.value })
        }
      );
      const match = insight.matchExplanation;
      const ats = insight.atsGapReport;
      setResult(
        "#job-insight-result",
        [
          `Fit score: ${match.score}%`,
          `Verified matches: ${match.matchedRequirements.join(", ") || "None detected"}`,
          `Evidence gaps: ${match.missingRequirements.join(", ") || "None detected"}`,
          `Policy conflicts: ${match.policyConflicts.join(", ") || "None"}`,
          `ATS-supported terms: ${ats.coveredTerms.join(", ") || "None detected"}`,
          `Unsupported terms: ${ats.unsupportedTerms.join(", ") || "None detected"}`
        ].join("\n\n"),
        "good"
      );
    } catch (error) {
      setResult("#job-insight-result", error.message, "danger");
    }
  });

  $("#application-list").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const applicationId = button.dataset.value;
    if (button.dataset.action === "outcome") {
      const form = $("#outcome-form");
      form.reset();
      form.elements.applicationId.value = applicationId;
      $("#outcome-dialog").showModal();
      return;
    }
    if (button.dataset.action === "timeline") {
      try {
        const { events } = await api(
          `/api/v1/applications/${encodeURIComponent(applicationId)}/timeline`
        );
        clearAndFill(
          $("#timeline-list"),
          events,
          (item) => recordItem(
            statusLabel(item.eventType),
            [statusLabel(item.actorType), dateLabel(item.occurredAt)]
          ),
          "No timeline events are recorded."
        );
        $("#timeline-dialog").showModal();
      } catch (error) {
        showNotice("#account-banner", error.message, "danger");
      }
    }
  });

  $("#outcome-form").addEventListener("submit", async (event) => {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await api(
        `/api/v1/applications/${encodeURIComponent(form.elements.applicationId.value)}/outcomes`,
        {
          method: "POST",
          body: JSON.stringify({
            outcomeType: form.elements.outcomeType.value,
            metadata: { note: form.elements.note.value }
          })
        }
      );
      $("#outcome-dialog").close();
      await loadDashboard();
    } catch (error) {
      showNotice("#account-banner", error.message, "danger");
    }
  });

  $$("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => $(`#${button.dataset.closeDialog}`).close());
  });

  $("#create-inbound-alias").addEventListener("click", async () => {
    try {
      const { alias } = await api("/api/v1/inbound-alias", {
        method: "POST",
        body: "{}"
      });
      setResult(
        "#inbound-result",
        `Forward recruiter messages to ${alias}. A new address revokes the previous one.`,
        "good"
      );
      await loadDashboard();
    } catch (error) {
      setResult("#inbound-result", error.message, "danger");
    }
  });

  $("#create-runner-token").addEventListener("click", async () => {
    try {
      const { enrollment } = await api("/api/v1/runner/enrollment-token", {
        method: "POST",
        body: "{}"
      });
      setResult(
        "#runner-result",
        `Enrollment token (shown once): ${enrollment.token}\nExpires: ${dateLabel(enrollment.expiresAt)}`,
        "good"
      );
    } catch (error) {
      setResult("#runner-result", error.message, "danger");
    }
  });

  $("#resend-verification").addEventListener("click", async () => {
    try {
      const result = await api("/api/v1/auth/verification/resend", {
        method: "POST",
        body: "{}"
      });
      setResult(
        "#verification-state",
        result.alreadyVerified
          ? "Email already verified."
          : result.sent
            ? "Verification email sent."
            : "Verification email is temporarily unavailable. Contact the JobAgent operator.",
        result.alreadyVerified || result.sent ? "good" : "danger"
      );
    } catch (error) {
      setResult("#verification-state", error.message, "danger");
    }
  });

  $("#setup-mfa").addEventListener("click", async () => {
    try {
      const result = await api("/api/v1/auth/mfa/setup", {
        method: "POST",
        body: "{}"
      });
      $("#mfa-confirm-form").hidden = false;
      setResult(
        "#mfa-result",
        `Add this secret to your authenticator: ${result.secret}\n${result.otpauthUrl}`,
        "good"
      );
      $("#mfa-confirm-form input").focus();
    } catch (error) {
      setResult("#mfa-result", error.message, "danger");
    }
  });

  $("#mfa-confirm-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/api/v1/auth/mfa/confirm", {
        method: "POST",
        body: JSON.stringify(formObject(event.currentTarget))
      });
      $("#mfa-confirm-form").hidden = true;
      $("#setup-mfa").textContent = "MFA enabled";
      $("#setup-mfa").disabled = true;
      setResult("#mfa-result", "MFA enabled for this account.", "good");
    } catch (error) {
      setResult("#mfa-result", error.message, "danger");
    }
  });

  $("#export-account").addEventListener("click", async () => {
    try {
      const exportData = await api("/api/v1/account/export");
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `jobagent-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (error) {
      setResult("#account-result", error.message, "danger");
    }
  });

  $("#pause-account").addEventListener("click", async () => {
    if (!confirm("Pause JobAgent and revoke the hosted Gmail connection?")) return;
    try {
      await api("/api/v1/account/pause", { method: "POST", body: "{}" });
      location.reload();
    } catch (error) {
      setResult("#account-result", error.message, "danger");
    }
  });

  $("#resume-account").addEventListener("click", async () => {
    try {
      await api("/api/v1/account/resume", { method: "POST", body: "{}" });
      location.reload();
    } catch (error) {
      setResult("#account-result", error.message, "danger");
    }
  });

  $("#delete-account-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!confirm("Permanently delete this account and its private files? This cannot be undone.")) return;
    try {
      await api("/api/v1/account", {
        method: "DELETE",
        body: JSON.stringify(formObject(event.currentTarget))
      });
      location.reload();
    } catch (error) {
      setResult("#account-result", error.message, "danger");
    }
  });

  $("#invite-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = formObject(event.currentTarget);
    payload.expiresInHours = Number(payload.expiresInHours);
    try {
      const result = await api("/api/v1/operator/invitations", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setResult(
        "#invite-result",
        `Invitation sent to ${result.invitation.email}; expires ${dateLabel(result.invitation.expiresAt)}.`,
        "good"
      );
      event.currentTarget.reset();
    } catch (error) {
      setResult("#invite-result", error.message, "danger");
    }
  });

  $("#logout").addEventListener("click", async () => {
    try {
      await api("/api/v1/auth/logout", { method: "POST", body: "{}" });
    } finally {
      location.assign("/");
    }
  });

  $("#show-reset").addEventListener("click", () => showAuthScreen("resetRequest"));
  $$("[data-auth-screen]").forEach((button) => {
    button.addEventListener("click", () => showAuthScreen(button.dataset.authScreen));
  });
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
      $$(".view").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.viewPanel === button.dataset.view);
      });
      if (button.dataset.view === "activity") loadAudit().catch(() => undefined);
      if (button.dataset.view === "operator") loadOperator().catch(() => undefined);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
  $("#refresh-dashboard").addEventListener("click", () => loadDashboard().catch((error) => {
    showNotice("#account-banner", error.message, "danger");
  }));
  $("#refresh-operator").addEventListener("click", () => loadOperator());

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installPrompt = event;
    $("#install-app").hidden = false;
  });
  $("#install-app").addEventListener("click", async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    $("#install-app").hidden = true;
  });
  window.addEventListener("online", () => setStatus(state.user ? "Protected" : "Signed out", state.user ? "good" : "neutral"));
  window.addEventListener("offline", () => setStatus("Offline", "warning"));

  async function handleEntryLink() {
    const params = new URLSearchParams(location.search);
    const pathname = location.pathname;
    if (pathname === "/accept-invite" && params.get("token")) {
      showAuthScreen("register");
      $("#register-form").elements.inviteToken.value = params.get("token");
      if (params.get("email")) $("#register-form").elements.email.value = params.get("email");
      return true;
    }
    if (pathname === "/reset-password" && params.get("token")) {
      showAuthScreen("resetConfirm");
      $("#reset-confirm-form").elements.token.value = params.get("token");
      return true;
    }
    if (pathname === "/verify-email" && params.get("token")) {
      showAuthScreen("login");
      try {
        const result = await api("/api/v1/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token: params.get("token") })
        });
        showNotice("#auth-message", `${result.email} is verified. Sign in to continue.`, "good");
      } catch (error) {
        showNotice("#auth-message", error.message, "danger");
      }
      history.replaceState({}, "", "/");
      return true;
    }
    const connection = params.get("connection");
    if (connection) {
      history.replaceState({}, "", "/");
      if (connection === "gmail-failed") {
        showNotice("#account-banner", "Gmail connection failed. No token was retained.", "danger");
      }
    }
    return false;
  }

  async function start() {
    const entryHandled = await handleEntryLink();
    if (!entryHandled || cookie("jobagent_session")) await initializeSession();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }

  start();
})();
