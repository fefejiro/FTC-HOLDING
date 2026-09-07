(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  const acquisition = {
    source: params.get("utm_source") || "",
    medium: params.get("utm_medium") || "",
    campaign: params.get("utm_campaign") || "",
    content: params.get("utm_content") || "",
    term: params.get("utm_term") || "",
    referral: document.referrer || ""
  };
  if (Object.values(acquisition).some(Boolean)) {
    sessionStorage.setItem("jobagent_acquisition", JSON.stringify(acquisition));
  }

  for (const link of document.querySelectorAll("[data-signup]")) {
    link.addEventListener("click", () => {
      const target = new URL(link.href, location.origin);
      for (const [key, value] of params.entries()) {
        if (key.startsWith("utm_") && !target.searchParams.has(key)) {
          target.searchParams.set(key, value);
        }
      }
      link.href = target.toString();
    });
  }

  function money(cents) {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD"
    }).format(Number(cents || 0) / 100);
  }

  fetch("/api/v1/plans", { headers: { accept: "application/json" } })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("plans unavailable")))
    .then(({ plans, checkoutEnabled }) => {
      for (const plan of plans || []) {
        const card = document.querySelector(`[data-plan="${plan.code}"]`);
        if (!card) continue;
        const price = card.querySelector(".price strong");
        if (price) price.textContent = money(plan.amountCadCents);
      }
      if (checkoutEnabled !== true) {
        const status = document.querySelector("#checkout-status");
        if (status) status.textContent = "Start with the free plan. Founding paid plans open after the final payment verification.";
      }
    })
    .catch(() => undefined);

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
})();
