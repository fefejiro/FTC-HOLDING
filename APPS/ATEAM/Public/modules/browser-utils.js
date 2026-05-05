(function () {
  const modules = window.ATEAMModules || (window.ATEAMModules = {});

  function safeJsonParse(raw, fallback) {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function safeJsonStringify(value) {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  function countWords(text = "") {
    const cleaned = String(text || "").trim();
    if (!cleaned) return 0;
    return cleaned.split(/\s+/).filter(Boolean).length;
  }

  function formatBytes(bytes) {
    const n = Number(bytes || 0);
    if (!Number.isFinite(n) || n <= 0) return "0 B";
    if (n < 1024) return `${n} B`;
    const kb = n / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  function isoDateToHuman(dateStr) {
    try {
      const d = new Date(dateStr + "T12:00:00");
      const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
      const month = d.toLocaleDateString(undefined, { month: "long" });
      const day = d.getDate();
      const year = d.getFullYear();
      return `${weekday} • ${month} ${day}, ${year}`;
    } catch {
      return dateStr;
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;");
  }

  function renderMiniMarkdown(text = "") {
    const src = String(text || "");
    const lines = src.split(/\r?\n/);
    let html = "";
    let listOpen = false;
    const flushList = () => {
      if (!listOpen) return;
      html += "</ul>";
      listOpen = false;
    };
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim()) {
        flushList();
        continue;
      }
      if (line.startsWith("## ")) {
        flushList();
        html += `<h3>${escapeHtml(line.slice(3))}</h3>`;
        continue;
      }
      if (line.startsWith("- ")) {
        if (!listOpen) {
          html += "<ul>";
          listOpen = true;
        }
        html += `<li>${escapeHtml(line.slice(2))}</li>`;
        continue;
      }
      flushList();
      const safe = escapeHtml(line).replace(
        /^(What|Decisions|Key Insight|Next|Notes):/i,
        (_, label) => `<strong>${label}:</strong>`
      );
      html += `<p>${safe}</p>`;
    }
    flushList();
    return html;
  }

  function normalizedSpace(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function compactText(text, limit = 180) {
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, limit);
  }

  modules.browserUtils = Object.freeze({
    safeJsonParse,
    safeJsonStringify,
    countWords,
    formatBytes,
    isoDateToHuman,
    escapeHtml,
    renderMiniMarkdown,
    normalizedSpace,
    compactText
  });
})();
