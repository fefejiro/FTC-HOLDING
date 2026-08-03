import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const defaultMetadataUrl = new URL(
  "../ios-prep/app-store-v1.0.1-metadata.json",
  import.meta.url,
);
const metadataPath = process.argv[2]
  ? new URL(process.argv[2], `file://${process.cwd().replaceAll("\\", "/")}/`)
  : defaultMetadataUrl;

const metadata = JSON.parse(await readFile(fileURLToPath(metadataPath), "utf8"));
const failures = [];
const warnings = [];
const forbiddenMarketingTerms = [
  /\bappclose\b/i,
  /\bourfamilywizard\b/i,
  /\btalkingparents\b/i,
  /\bcourt[- ]approved\b/i,
  /\bgovernment[- ]approved\b/i,
  /\bguaranteed admissib/i,
];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function utf8Bytes(value) {
  return Buffer.byteLength(value, "utf8");
}

function compareVersions(left, right) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  const width = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < width; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

function validateUrl(locale, field, value) {
  try {
    const url = new URL(value);
    check(url.protocol === "https:", `${locale}.${field} must use HTTPS`);
  } catch {
    failures.push(`${locale}.${field} must be a valid URL`);
  }
}

check(metadata.appStoreId === "6793350735", "Unexpected App Store ID");
check(metadata.bundleId === "ca.peacepad.family", "Production bundle ID changed");
check(metadata.currentPublicVersion === "1.0", "Unexpected current public version");
check(metadata.targetVersion === "1.0.1", "Unexpected target version");
check(
  compareVersions(metadata.targetVersion, metadata.currentPublicVersion) > 0,
  "Target version must be newer than the current public version",
);
check(
  metadata.packageStatus === "prepared-not-submitted",
  "Package must remain prepared-not-submitted",
);
check(
  metadata.productionMutationAllowed === false,
  "Production mutation guard must remain false",
);

for (const [locale, entry] of Object.entries(metadata.localizations ?? {})) {
  check(entry.name.length >= 2 && entry.name.length <= 30, `${locale}.name must be 2-30 characters`);
  check(entry.subtitle.length <= 30, `${locale}.subtitle exceeds 30 characters`);
  check(entry.promotionalText.length <= 170, `${locale}.promotionalText exceeds 170 characters`);
  check(entry.description.length <= 4000, `${locale}.description exceeds 4000 characters`);
  check(utf8Bytes(entry.keywords) <= 100, `${locale}.keywords exceeds 100 UTF-8 bytes`);
  check(!entry.keywords.includes(", "), `${locale}.keywords must not contain spaces after commas`);

  const terms = entry.keywords.split(",").map((term) => term.trim().toLocaleLowerCase(locale));
  check(terms.every((term) => term.length > 2), `${locale}.keywords contains a term under 3 characters`);
  check(new Set(terms).size === terms.length, `${locale}.keywords contains duplicate terms`);

  validateUrl(locale, "supportUrl", entry.supportUrl);
  validateUrl(locale, "marketingUrl", entry.marketingUrl);
  validateUrl(locale, "privacyPolicyUrl", entry.privacyPolicyUrl);
  check(
    entry.supportUrl === "https://peacepad.ca/support",
    `${locale}.supportUrl must use the canonical support route`,
  );

  const searchableText = [
    entry.name,
    entry.subtitle,
    entry.promotionalText,
    entry.keywords,
    entry.description,
  ].join("\n");
  for (const forbidden of forbiddenMarketingTerms) {
    check(!forbidden.test(searchableText), `${locale} contains prohibited term ${forbidden}`);
  }

  if (entry.readyForSubmission === false && !entry.reviewRequirement) {
    failures.push(`${locale} requires an explicit reviewRequirement`);
  }
  if (entry.readyForSubmission === false) {
    warnings.push(`${locale} is draft-only: ${entry.reviewRequirement}`);
  }
}

check(metadata.screenshots?.length === 6, "Exactly six screenshot briefs are required");
for (const [index, screenshot] of (metadata.screenshots ?? []).entries()) {
  check(screenshot.order === index + 1, `Screenshot order is invalid at index ${index}`);
  check(screenshot.headline.split(/\s+/).length <= 6, `Screenshot ${screenshot.order} headline exceeds six words`);
}

if (failures.length > 0) {
  console.error("App Store metadata validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("App Store metadata validation passed.");
for (const [locale, entry] of Object.entries(metadata.localizations)) {
  console.log(
    `${locale}: name ${entry.name.length}/30, subtitle ${entry.subtitle.length}/30, ` +
      `promotional ${entry.promotionalText.length}/170, keywords ${utf8Bytes(entry.keywords)}/100 bytes, ` +
      `description ${entry.description.length}/4000`,
  );
}
for (const warning of warnings) console.warn(`WARNING: ${warning}`);
