// The update job's notices: a post about a wait for a person, such as a refused kit
// checkout, an update that waits until RecursicaChat is quiet, or network changes held for a person.
// A notice posts once. The notice posts again only when its reason changes, or 24 hours after the
// last post while the same reason holds.
export const REPEAT_MS = 24 * 3600_000;

/** The last post's { key, at }. A job from before the repeat kept only the key: its 24 hours start now. */
function last(store, field, now) {
  const v = store[field];
  if (typeof v === "string") return (store[field] = { key: v, at: now });
  return v && typeof v === "object" ? v : null;
}

/** Whether the notice for this reason is due. */
export function noticeDue(store, field, key, now = Date.now()) {
  const l = last(store, field, now);
  return !l || l.key !== key || !(now - l.at < REPEAT_MS);
}

/**
 * Posts the notice when the notice is due, and records the post in store[field]. A failed post
 * records nothing, so the next run tries again. text may be a function, called only for a due post.
 * Returns whether the notice posted.
 */
export async function notice(store, field, key, text, post, now = Date.now()) {
  if (!noticeDue(store, field, key, now)) return false;
  const r = await post(typeof text === "function" ? text() : text).catch(() => ({ ok: false }));
  if (r?.ok === false) return false;
  store[field] = { key, at: now };
  return true;
}
