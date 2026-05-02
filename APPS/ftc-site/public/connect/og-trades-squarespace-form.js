(function () {
  "use strict";

  var API_URL = window.OG_TRADES_API_URL || "https://og.unalabs.cloud/api/og-trades-leads";
  var FORM_SELECTOR = window.OG_TRADES_FORM_SELECTOR || "form[data-og-trades-form], form";
  var submittedFlag = "data-og-trades-bound";
  var formStartTimes = new WeakMap();

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function normalizeChoice(value, mapping, fallback) {
    var text = normalizeText(value).toLowerCase();
    if (!text) return fallback;
    var key = text.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return mapping[text] || mapping[key] || fallback;
  }

  function getValue(fd, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      var value = fd.get(keys[i]);
      var normalized = normalizeText(value);
      if (normalized) return normalized;
    }
    return "";
  }

  function buildPayload(form, fd) {
    var startedAt = formStartTimes.get(form) || Date.now() - 2000;

    return {
      name: getValue(fd, ["name", "Name", "fullName", "Full Name"]),
      email: getValue(fd, ["email", "Email"]),
      phone: getValue(fd, ["phone", "Phone"]),
      interest: normalizeChoice(
        getValue(fd, ["interest", "Interest"]),
        {
          "8-week-beginner-forex-course": "8-week-beginner-forex-course",
          "8-week-course": "8-week-beginner-forex-course",
          "8 week beginner forex course": "8-week-beginner-forex-course",
          "community": "community-access",
          "community-access": "community-access",
          "free-resources": "free-resources",
          "resources": "free-resources",
          "not-sure-yet": "not-sure-yet",
          "not sure yet": "not-sure-yet"
        },
        "not-sure-yet"
      ),
      experienceLevel: normalizeChoice(
        getValue(fd, ["experienceLevel", "experience", "Experience"]),
        {
          "brand-new": "brand-new",
          "brand new": "brand-new",
          "learning-basics": "learning-basics",
          "learning basics": "learning-basics",
          "demo-trading": "demo-trading",
          "live-trading": "live-trading",
          "live trading": "live-trading",
          "prop-firm-focused": "prop-firm-focused"
        },
        "brand-new"
      ),
      primaryGoal: normalizeChoice(
        getValue(fd, ["primaryGoal", "goal", "Goal"]),
        {
          "build-foundation": "build-foundation",
          "build foundation": "build-foundation",
          "improve-risk-management": "improve-risk-management",
          "improve risk management": "improve-risk-management",
          "learn-a-repeatable-strategy": "learn-a-repeatable-strategy",
          "learn a repeatable strategy": "learn-a-repeatable-strategy",
          "gain-consistency": "gain-consistency",
          "gain consistency": "gain-consistency"
        },
        "build-foundation"
      ),
      timeline: normalizeChoice(
        getValue(fd, ["timeline", "Timeline"]),
        {
          "ready-now": "ready-now",
          "ready now": "ready-now",
          "this-month": "this-month",
          "this month": "this-month",
          "next-month": "next-month",
          "next month": "next-month",
          "just-looking": "just-looking",
          "just looking": "just-looking"
        },
        "just-looking"
      ),
      notes: getValue(fd, ["notes", "message", "Message"]),
      website: "",
      startedAt: startedAt
    };
  }

  function bindForm(form) {
    if (!form || form.getAttribute(submittedFlag) === "1") return;

    form.setAttribute(submittedFlag, "1");
    formStartTimes.set(form, Date.now());

    form.addEventListener("focusin", function () {
      if (!formStartTimes.has(form)) {
        formStartTimes.set(form, Date.now());
      }
    });

    form.addEventListener("submit", function (event) {
      var fd = new FormData(form);
      var email = getValue(fd, ["email", "Email"]);
      var name = getValue(fd, ["name", "Name", "fullName", "Full Name"]);

      if (!email || !name) {
        return;
      }

      event.preventDefault();
      var payload = buildPayload(form, fd);
      var submitButton = form.querySelector("button[type='submit'], input[type='submit']");
      var originalButtonText = submitButton ? submitButton.textContent : "";

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
      }

      fetch(API_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () {
            return { ok: false, message: "Invalid response" };
          });
        })
        .then(function (body) {
          if (!body || !body.ok) {
            throw new Error((body && body.message) || "Submission failed");
          }

          form.reset();
          formStartTimes.set(form, Date.now());
          alert("Submitted successfully. OG Trades will follow up.");
        })
        .catch(function (err) {
          console.error("OG Trades submit error", err);
          alert("Submission failed. Please try again.");
        })
        .finally(function () {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText || "Submit";
          }
        });
    });
  }

  function bindAllForms() {
    var forms = document.querySelectorAll(FORM_SELECTOR);
    for (var i = 0; i < forms.length; i += 1) {
      bindForm(forms[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindAllForms);
  } else {
    bindAllForms();
  }
})();
