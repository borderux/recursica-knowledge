/**
 * Personal contact details: an email address or a phone number that belongs to a person.
 *
 * The redaction rules catch the names somebody has listed — a client, a participant, an
 * operator — and only where `local-redactions.json` exists. A fresh clone, a CI runner and a
 * CircleChat host all start without it. An email address or a phone number needs no list:
 * the shape is the evidence, and it is exactly what a pasted report, a screenshot's text or a
 * mock-data table carries in. So these two rules run everywhere, with or without the file.
 *
 * Labels only, like every other rule here. The matched string is never returned.
 *
 * What is allowed, and why:
 * - Placeholder domains — `example.com`, `.test`, `.invalid`, anything `acme`, `company.com`.
 *   Mock data in this repository uses them on purpose.
 * - Role addresses this repository already publishes: `hi@borderux.com` is the package
 *   author on every skill, `noreply@anthropic.com` is the model's commit credit, `git@` is
 *   an SSH remote.
 * - GitHub's noreply addresses, which exist so a person's real address is not published.
 * - US numbers in the 555 exchange, which are reserved for fiction.
 *
 * Anything else is a finding. A real person's work address is still a person's address.
 */

const EMAIL = /[A-Za-z0-9._%+-]+@((?:[A-Za-z0-9-]+\.)+([A-Za-z]{2,}))/g;

/**
 * Top-level domains an address can end in. Without this, SQL like `name@dataset.table` reads
 * as an address — the stu app has dozens. Two letters is any country code.
 */
const ADDRESS_TLDS = new Set([
  "com",
  "org",
  "net",
  "edu",
  "gov",
  "mil",
  "int",
  "io",
  "co",
  "ai",
  "app",
  "dev",
  "info",
  "biz",
  "me",
  "health",
  "care",
  "email",
  "mail",
  "online",
  "tech",
  "design",
]);

const PUBLIC_ADDRESSES = new Set([
  "hi@borderux.com",
  "noreply@anthropic.com",
  "git@github.com",
  "git@gitlab.com",
]);

const PLACEHOLDER_DOMAIN =
  /(?:^|\.)(?:example\.(?:com|org|net)|company\.com|users\.noreply\.github\.com)$|\.(?:example|test|invalid|localhost)$|(?:^|[.-])acme(?:[.-]|$)/i;

/** North American shape: (NNN) NNN-NNNN, NNN-NNN-NNNN, +1 NNN.NNN.NNNN. */
const NANP =
  /(?<![\w.+-])(?:\+?1[\s.-]?)?\(?(\d{3})\)?[\s.-](\d{3})[\s.-](\d{4})(?![\w.-])/g;

/** International shape with a country code: +CC then three or four groups of digits. */
const INTL =
  /(?<![\w.+-])\+\d{2,3}[\s.-]?\d{1,4}(?:[\s.-]\d{2,4}){2,3}(?![\w.-])/g;

function isAllowedAddress(address, domain, tld) {
  const lower = address.toLowerCase();
  if (PUBLIC_ADDRESSES.has(lower)) return true;
  if (PLACEHOLDER_DOMAIN.test(domain)) return true;
  const t = tld.toLowerCase();
  return !(t.length === 2 || ADDRESS_TLDS.has(t));
}

/** @returns {string[]} labels for what was found, never the text itself */
export function findPersonalData(text) {
  const labels = [];

  for (const m of text.matchAll(EMAIL)) {
    if (!isAllowedAddress(m[0], m[1], m[2])) {
      labels.push("a personal email address");
      break;
    }
  }

  let phone = false;
  for (const m of text.matchAll(NANP)) {
    if (m[2] !== "555") {
      phone = true;
      break;
    }
  }
  if (!phone && INTL.test(text)) phone = true;
  INTL.lastIndex = 0;
  if (phone) labels.push("a phone number");

  return labels;
}

/**
 * The same rules as findPersonalData, applied as a rewrite: every personal email address and
 * phone number becomes a marker. Allowed addresses and fictional numbers are left alone.
 *
 * For text that has to be read but must never be passed on as written — a Snippy comment, the
 * HTML captured from a reviewed page — so an agent working from it cannot quote what it never saw.
 */
export function redactPersonalData(text) {
  let out = text.replace(EMAIL, (address, domain, tld) =>
    isAllowedAddress(address, domain, tld) ? address : "[email removed]",
  );
  out = out.replace(NANP, (number, _area, exchange) =>
    exchange === "555" ? number : "[phone removed]",
  );
  out = out.replace(INTL, "[phone removed]");
  return out;
}
