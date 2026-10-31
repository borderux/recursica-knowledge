// The buttons the cluster posts to Slack, and the time math for "4 a.m." in the cluster's time zone.

export const ACTIONS = {
  "reboot-4am": { label: "4 a.m.", twoFactor: false, zoned: true },
  "reboot-tonight": { label: "Tonight", twoFactor: false },
  "reboot-pick": { label: "Pick a time", twoFactor: false, modal: "pick-time" },
  "reboot-skip": { label: "Skip", twoFactor: false },
  "cut-off-now": { label: "Cut off now", twoFactor: false, style: "danger" },
  "keep-watching": { label: "Keep watching 30 min", twoFactor: false },
  "shut-down": { label: "Shut down", twoFactor: false, style: "danger" },
  "release-lockdown": { label: "Release lockdown", twoFactor: true },
  "allow-source": { label: "Allow this source", twoFactor: true },
  "egress-allow-once": { label: "Allow once (15 min)", twoFactor: true },
  "egress-deny": { label: "Deny", twoFactor: false, style: "danger" },
  "upgrade-now": { label: "Upgrade now", twoFactor: true },
  "upgrade-skip": { label: "Skip this version", twoFactor: false },
  "agents-stop": { label: "Stop", twoFactor: false, style: "danger" },
  "agents-resume": { label: "Resume", twoFactor: true },
  // A kit release: the approval goes to every computer in the cluster (cluster: true).
  "release-install": { label: "Install", twoFactor: true, cluster: true },
  // A cloud-model request from CircleChat (cloud-requests.mjs). Only the stack's cloud approvers
  // press these (cloud: true), and the stack's control computer sends the answer to CircleChat.
  "cloud-approve": { label: "Approve", twoFactor: true, cloud: true },
  "cloud-deny": { label: "Deny", twoFactor: false, cloud: true, style: "danger" },
};

export const KINDS = {
  reboot: ["reboot-4am", "reboot-tonight", "reboot-pick", "reboot-skip"],
  lockdown: ["cut-off-now", "keep-watching", "shut-down", "release-lockdown", "allow-source"],
  egress: ["egress-allow-once", "egress-deny"],
  upgrade: ["upgrade-now", "upgrade-skip"],
  release: ["release-install"],
};

// The cluster's time zone: site.timezone in the cluster's site.json, an IANA name such as
// "Europe/Berlin", which install-cluster.sh writes to /etc/agent-cluster.conf as CLUSTER_TZ.
// Without site.timezone, the computer's own time zone.
export const clusterTz = (env = process.env) => env.CLUSTER_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
// A time zone's short name at one moment, such as "EST" or "GMT+1".
export const tzName = (tz = clusterTz(), at = new Date()) =>
  new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? tz;

// One message with a row of buttons. Each button carries the computer and the reference (an
// update batch or a lockdown) it acts on. A button with a time, such as "4 a.m.", names the zone.
export function buttonBlocks(kind, text, computer, ref, tz = clusterTz()) {
  const ids = KINDS[kind];
  if (!ids) throw new Error(`unknown kind ${kind}`);
  return [
    { type: "section", text: { type: "mrkdwn", text } },
    { type: "actions", elements: ids.map((id) => ({
      type: "button", action_id: id, text: { type: "plain_text", text: ACTIONS[id].zoned ? `${ACTIONS[id].label} ${tzName(tz)}` : ACTIONS[id].label },
      value: JSON.stringify({ c: computer, r: ref }),
      ...(ACTIONS[id].style ? { style: ACTIONS[id].style } : {}),
    })) },
  ];
}

// The offset of a time zone from UTC, in milliseconds, at one moment.
export function offsetMs(utcMs, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

// The next moment the clock in a time zone shows hour:minute, after now.
export function nextAt(hour, minute, tz = clusterTz(), now = Date.now()) {
  const local = new Date(now + offsetMs(now, tz));
  for (let add = 0; add < 3; add++) {
    const guess = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + add, hour, minute);
    let at = guess - offsetMs(guess, tz);
    at = guess - offsetMs(at, tz);
    if (at > now) return new Date(at);
  }
  throw new Error("no next time");
}

export function formatTime(date, tz = clusterTz()) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(date);
}

// "2026-10-21" in a time zone, for a date picker.
export const localDate = (d, tz = clusterTz()) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

// A date and an "HH:MM" time on the clock in a time zone, as a UTC moment. A time the clock skips
// at the change to summer time gives 0.
export function localToUtc(day, time, tz = clusterTz()) {
  const [y, m, d] = day.split("-").map(Number), [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let at = guess - offsetMs(guess, tz);
  at = guess - offsetMs(at, tz);
  const shown = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(at));
  return shown === time ? at : 0;
}
