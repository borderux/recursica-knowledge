/**
 * Where a channel's client settings come from, now that they live in two places.
 *
 * ## The problem with keeping them on the channel
 *
 * A channel canvas has held the whole block — slug, project, dataset, Drive folder, tag sheet —
 * since the beginning. Measured across three communities, exactly one channel in each carries
 * one, so there is no duplication to remove yet. What there is:
 *
 *   - nobody can find it without already knowing which channel to look in
 *   - it dies with the channel it is written on
 *   - the moment a client gets a second working channel, it all gets typed again
 *
 * ## The problem with moving them to the community
 *
 * Doing only that would take a fence down. A channel with no config block today is genuinely
 * unconfigured — six of seven channels in one community have none, and an agent in those simply
 * cannot reach client data. Put the settings at the community level and every channel in it
 * becomes configured for that client, including the ones nobody meant to configure.
 *
 * ## So: details at the community, and the community is one client
 *
 * The community holds what the client *is*. When it describes exactly one client, every channel
 * in it resolves to that client — which is correct, because the community boundary is the fence:
 * one community per client, one agent set per community.
 *
 * That is a change from this module's first version, which required every channel to name its
 * client and argued the line was holding the fence up. It was, while one community could hold
 * several clients. Once it cannot, the line stops being load-bearing and insisting on it is
 * ceremony — six lines of setup replaced by one line of setup, where the honest answer is none.
 *
 * Two things survive from that version, because they are still real:
 *
 *   - **A channel can opt out.** `- client: none` keeps a channel out of client data, for a
 *     welcome or admin channel in a client's community. Explicit, not inferred.
 *   - **A community describing several clients still needs the line.** Nothing resolves by
 *     itself there, because guessing which of two clients a channel means is the failure the
 *     whole design exists to prevent.
 *
 * The old whole-block canvas keeps working and keeps winning, so nothing has to migrate on any
 * particular day. See `mergeConfig` for what happens when the two disagree, which is the part
 * that matters.
 */

/** The keys that decide which client's data is reachable. Disagreement here is never resolved. */
export const FENCE_KEYS = ["slug", "bq_dataset", "drive_folder"];

/** Everything a resolved config may carry. */
export const CONFIG_KEYS = [
  "slug",
  "bq_project",
  "bq_dataset",
  "drive_folder",
  "tag_sheet",
  "sa_slug",
];

/**
 * The `- key: value` pairs under a `## <heading>` in a markdown document.
 *
 * Returns an empty object when the heading is absent, and omits keys whose value is blank —
 * a key present but empty is an unconfigured channel, and reading it as present is the
 * difference between "not set up" and "set up with nothing in it". The prompt has said so
 * for months; this is the same rule in code.
 *
 * Stops at the next `## `, so a document with several blocks does not bleed one into another.
 */
export function parseBlock(markdown, heading) {
  const out = {};
  if (!markdown) return out;

  const lines = String(markdown).split(/\r?\n/);
  let inside = false;
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      inside = line.replace(/^##\s+/, "").trim().toLowerCase() === heading.toLowerCase();
      continue;
    }
    if (!inside) continue;
    const m = line.match(/^\s*[-*]\s*([A-Za-z0-9_]+)\s*:\s*(.*?)\s*$/);
    if (!m) continue;
    const value = m[2].trim();
    if (value) out[m[1].toLowerCase()] = value;
  }
  return out;
}

/**
 * What the channel says, if anything.
 *
 * `client:` is the new form and `slug:` the old one; they mean the same thing and the old one is
 * not going away on a schedule. `- client: none` is an explicit opt-out and is reported as such,
 * distinctly from saying nothing — the caller falls back to the community for silence and must
 * not for a refusal.
 */
export function parseChannel(canvas) {
  const block = parseBlock(canvas, "Claire config");
  const named = block.client ?? block.slug ?? null;

  if (named && /^(none|no|off)$/i.test(named)) {
    return { client: null, optedOut: true, values: {} };
  }
  if (!named) return { client: null, optedOut: false, values: {} };

  const values = {};
  for (const k of CONFIG_KEYS) if (block[k]) values[k] = block[k];
  values.slug = named;
  return { client: named, optedOut: false, values };
}

/**
 * Every client the community note describes.
 *
 * One is the ordinary case and the reason a channel need not name anything. Several is
 * legitimate and means nothing resolves by itself: picking one of two clients for a channel
 * that named neither is the failure this whole module exists to prevent.
 */
export function communityClients(note) {
  if (!note) return [];
  const labelled = [...String(note).matchAll(/^##\s+client:\s*(\S+)\s*$/gim)].map((m) =>
    m[1].trim(),
  );
  if (labelled.length) return [...new Set(labelled)];

  const single = parseBlock(note, "Claire config");
  return single.slug ? [single.slug] : [];
}

/**
 * What the community says about one client.
 *
 * A community note may describe several clients, one `## client: <slug>` block each, so a
 * community that does hold two is not forced to split. Falls back to a single unlabelled
 * `## Claire config` block for the common one-client case.
 */
export function parseCommunity(note, client) {
  const labelled = parseBlock(note, `client: ${client}`);
  const source = Object.keys(labelled).length
    ? labelled
    : parseBlock(note, "Claire config");

  // An unlabelled block belongs to whoever it names. Returning it for a different client
  // would hand this channel another client's dataset, which is the whole failure mode.
  if (source.slug && client && source.slug !== client) return {};

  const values = {};
  for (const k of CONFIG_KEYS) if (source[k]) values[k] = source[k];
  return values;
}

/**
 * Community details underneath, channel values on top — except where they disagree about the
 * fence, which is refused rather than resolved.
 *
 * Precedence is the obvious question and the obvious answer is wrong. "The channel wins" is
 * fine for a tag sheet and unsafe for a dataset name: the two sources disagreeing about which
 * dataset this channel reads means one of them is pointed at another client, and silently
 * preferring either is a fence that fails open. The repo already takes this line for the
 * `bq_dataset` cross-check at deploy time; this is the same rule at runtime.
 *
 * Returns `{ values, conflicts, missing }`. A caller with conflicts must not proceed.
 */
export function mergeConfig(channelValues, communityValues, required = FENCE_KEYS) {
  const conflicts = [];
  for (const key of FENCE_KEYS) {
    const a = channelValues[key];
    const b = communityValues[key];
    if (a && b && a !== b) conflicts.push(key);
  }

  const values = { ...communityValues, ...channelValues };
  const missing = required.filter((k) => !values[k]);
  return { values, conflicts, missing };
}

/** The resolved block, in the format everything already reads. */
export function formatBlock(values) {
  const order = ["slug", "bq_project", "bq_dataset", "drive_folder", "tag_sheet", "sa_slug"];
  const lines = ["## Claire config", ""];
  for (const k of order) if (values[k]) lines.push(`- ${k}: ${values[k]}`);
  return lines.join("\n") + "\n";
}
