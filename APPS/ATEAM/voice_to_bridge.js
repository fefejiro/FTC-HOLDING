function fail(message, exitCode = 1) {
  console.error(message);
  process.exit(exitCode);
}

async function main() {
  const args = process.argv.slice(2);
  const shellMode = args.includes("--shell");
  const taskParts = args.filter((arg) => arg !== "--shell");
  const task = taskParts.join(" ").trim();
  const bridgeUrl = String(process.env.ATEAM_BRIDGE_URL || "").trim();
  const apiKey = String(process.env.ATEAM_API_KEY || "").trim();
  const mode = shellMode ? "shell" : "codex";

  if (!task) {
    fail('Usage: node voice_to_bridge.js "list project folders" [--shell]');
  }

  if (!bridgeUrl) {
    fail("ATEAM_BRIDGE_URL is required.");
  }

  if (!apiKey) {
    fail("ATEAM_API_KEY is required.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(bridgeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ateam-key": apiKey
      },
      body: JSON.stringify({
        task,
        mode,
        context: ""
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    let payload;
    try {
      payload = await response.json();
    } catch {
      fail("Bridge returned an invalid response.");
    }

    if (!response.ok || payload?.ok === false) {
      fail(String(payload?.error || payload?.details || `Bridge request failed with status ${response.status}.`));
    }

    const output = String(payload?.stdout || "").trim() || String(payload?.summary || "").trim();
    if (!output) {
      fail("Bridge returned no output.");
    }

    process.stdout.write(`${output}\n`);
  } catch (error) {
    clearTimeout(timeout);
    if (error?.name === "AbortError") {
      fail("Bridge request timed out after 10 seconds.");
    }
    fail(`Bridge request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

main();
