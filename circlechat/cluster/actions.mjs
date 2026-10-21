// The buttons the cluster posts to Slack, and the time math for "4 a.m. ET".

export const ACTIONS = {
  "reboot-4am": { label: "4 a.m. ET", twoFactor: false },
  "reboot-tonight": { label: "Tonight", twoFactor: false },
  "reboot-pick": { label: "Pick a time", twoFactor: false, modal: "pick-time" },
  "reboot-skip": { label: "Skip", twoFactor: false },
  "cut-off-now": { label: "Cut off now", twoFactor: false, style: "danger" },
  "keep-watching": { label: "Keep watching 30 min", twoFactor: false },
  "shut-down": { label: "Shut down", twoFactor: false, style: "danger" },
  "release-lockdown": { label: "Release lockdown", twoFactor: true },
  "allow-source": { label: "Allow this source", twoFactor: true },
};

export const KINDS = {
  reboot: ["reboot-4am", "reboot-tonight", "reboot-pick", "reboot-skip"],
  lockdown: ["cut-off-now", "keep-watching", "shut-down", "release-lockdown", "allow-source"],
};

export const TZ = "America/New_York";

// One message with a row of buttons. Each button carries the computer and the reference (an
// update batch or a lockdown) it acts on.
export function buttonBlocks(kind, text, computer, ref) {
  const ids = KINDS[kind];
  if (!ids) throw new Error(`unknown kind ${kind}`);
  return [
    { type: "section", text: { type: "mrkdwn", text } },
    { type: "actions", elements: ids.map((id) => ({
      type: "button", action_id: id, text: { type: "plain_text", text: ACTIONS[id].label },
      value: JSON.stringify({ c: computer, r: ref }),
      ...(ACTIONS[id].style ? { style: ACTIONS[id].style } : {}),
    })) },
  ];
}

// The offset of a time zone from UTC, in milliseconds, at one moment.
function offsetMs(utcMs, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

// The next moment the clock in a time zone shows hour:minute, after now.
export function nextAt(hour, minute, tz = TZ, now = Date.now()) {
  const local = new Date(now + offsetMs(now, tz));
  for (let add = 0; add < 3; add++) {
    const guess = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + add, hour, minute);
    let at = guess - offsetMs(guess, tz);
    at = guess - offsetMs(at, tz);
    if (at > now) return new Date(at);
  }
  throw new Error("no next time");
}

export function formatEt(date) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(date);
}
