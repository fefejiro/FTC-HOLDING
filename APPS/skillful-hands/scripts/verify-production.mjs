import { resolve4, resolve6 } from "node:dns/promises";

const args = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, "").split("=");
    return [key, value.join("=")];
  }),
);

const domain = args.domain ?? process.env.SITE_DOMAIN ?? "skillfulhandscic.uk";
const expectedEmail =
  args.email ?? process.env.SITE_EMAIL ?? "skillfulhandcic@gmail.com";
const forbiddenText =
  args.forbid ?? process.env.SITE_FORBIDDEN_TEXT ?? "Rejesha Crown";
const origin = `https://${domain}`;
const checks = [];

function record(name, passed, detail) {
  checks.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}: ${detail}`);
}

async function request(name, url, expectedStatus, options = {}) {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
      ...options,
    });
    record(name, response.status === expectedStatus, `HTTP ${response.status}`);
    return response;
  } catch (error) {
    record(name, false, error.message);
    return null;
  }
}

try {
  const addresses = [
    ...(await resolve4(domain).catch(() => [])),
    ...(await resolve6(domain).catch(() => [])),
  ];
  record("DNS", addresses.length > 0, addresses.join(", ") || "no addresses");
} catch (error) {
  record("DNS", false, error.message);
}

const home = await request("Apex HTTPS", `${origin}/`, 200);
const html = home ? await home.text() : "";

record(
  "Canonical URL",
  html.includes(`<link rel="canonical" href="${origin}/">`),
  `${origin}/`,
);
record("Contact email", html.includes(expectedEmail), expectedEmail);
record(
  "Forbidden public copy",
  !html.toLowerCase().includes(forbiddenText.toLowerCase()),
  forbiddenText,
);
record(
  "UK English",
  html.includes('<html lang="en-GB">'),
  'html lang="en-GB"',
);

const requiredHeaders = [
  "content-security-policy",
  "permissions-policy",
  "referrer-policy",
  "x-content-type-options",
  "x-frame-options",
];

for (const header of requiredHeaders) {
  record(
    `Header ${header}`,
    Boolean(home?.headers.get(header)),
    home?.headers.get(header) ?? "missing",
  );
}

const httpRedirect = await request(
  "HTTP to HTTPS",
  `http://${domain}/`,
  301,
);
record(
  "HTTP redirect target",
  httpRedirect?.headers.get("location") === `${origin}/`,
  httpRedirect?.headers.get("location") ?? "missing",
);

const wwwRedirect = await request(
  "WWW redirect",
  `https://www.${domain}/qa-path?launch=1`,
  301,
);
record(
  "WWW redirect target",
  wwwRedirect?.headers.get("location") === `${origin}/qa-path?launch=1`,
  wwwRedirect?.headers.get("location") ?? "missing",
);

const robots = await request("Static asset /robots.txt", `${origin}/robots.txt`, 200);
const robotsText = robots ? await robots.text() : "";
const standardRobotsDirectives = new Set([
  "allow",
  "crawl-delay",
  "disallow",
  "host",
  "sitemap",
  "user-agent",
]);
const unknownRobotsDirectives = robotsText
  .split(/\r?\n/)
  .map((line) => line.replace(/#.*$/, "").trim())
  .filter(Boolean)
  .map((line) => line.split(":", 1)[0].toLowerCase())
  .filter((directive) => !standardRobotsDirectives.has(directive));
record(
  "robots.txt directives",
  unknownRobotsDirectives.length === 0,
  unknownRobotsDirectives.length === 0
    ? "standard directives only"
    : `unknown: ${[...new Set(unknownRobotsDirectives)].join(", ")}`,
);

for (const path of [
  "/sitemap-index.xml",
  "/site.webmanifest",
  "/favicon.svg",
]) {
  await request(`Static asset ${path}`, `${origin}${path}`, 200);
}

const failed = checks.filter((check) => !check.passed);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);

if (failed.length > 0) {
  process.exitCode = 1;
}
