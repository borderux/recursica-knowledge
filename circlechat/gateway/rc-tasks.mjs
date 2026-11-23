// The gateway's task source for the RecursicaChat 2.0 server: each task's "Model use" setting, and
// the tasks of an agent's running turns, from the server's gateway listener. router.mjs uses it when
// gateway.json has a recursicachat_tasks block (kit/render.mjs), and noTasks() otherwise.
//
// The server serves four routes on a listener of its own, on the Mac's 127.0.0.1, with one key that
// works nowhere else (Authorization: Bearer <key>):
//   GET  /gateway/tasks/:id                  { task, status, settings, open }
//   GET  /gateway/agents/:handle/tasks       { tasks: [ids] }: the open tasks of the agent's running turns
//   GET  /gateway/agents/:handle/tasks/:id   { on }: the agent created or is assigned to the task
//   POST /gateway/tasks/:id/cloud-switch     { n, reason }: the gateway moved the task to the cloud
//
// The "Model use" choices, which the kit declares to the server (kit/render.mjs taskSettings), and
// what each one means here (policy.mjs):
//   local_only        cluster_only
//   local_then_cloud  cloud_after_wait with only the stall: the wait to start is the stall, 15
//                     minutes unless site.json's site.cloud_models.stall_minutes says otherwise
//   cloud_now         cloud_now
// Any other value, a missing value, a closed task, a wrong key, a timeout or a server that does not
// answer means cluster_only. The stack's cloud permission, and each agent's cloud switch and key,
// still decide in policy.mjs: with any of them off, every choice stays on the cluster.
//
// The gateway names a RecursicaChat agent rc-<handle> (kit/render.mjs rcHandle). handles maps each
// such name to the agent's handle on the server. A name the map lacks has no task.
import fs from "node:fs";

export const MODEL_USE = "model_use";
// The kit's one task setting, as the server's task-settings file declares it.
export const MODEL_USE_SETTING = {
  key: MODEL_USE,
  label: "Model use",
  default: "local_only",
  choices: [
    { value: "local_only", label: "Local only" },
    { value: "local_then_cloud", label: "Local, then cloud if significantly delayed" },
    { value: "cloud_now", label: "Cloud from the start" },
  ],
};
export const DEFAULT_STALL_MINUTES = 15;
// The reason the gateway reports for a move to the cloud, by the task's mode.
export const SWITCH_REASONS = { cloud_now: "cloud_from_start", cloud_after_wait: "stalled" };

const TASK_ID = /^[A-Za-z0-9_-]{1,64}$/;
const HANDLE = /^[a-z0-9][a-z0-9_-]{0,39}$/;

/** The policy row for one "Model use" choice (policy.mjs settingFromRow), or null for cluster only. */
export function rowFromChoice(value, stallMinutes = DEFAULT_STALL_MINUTES) {
  if (value === "cloud_now") return { mode: "cloud_now" };
  if (value === "local_then_cloud") {
    const stall = Number.isInteger(stallMinutes) && stallMinutes > 0 ? stallMinutes : DEFAULT_STALL_MINUTES;
    return { mode: "cloud_after_wait", max_start_wait_minutes: stall };
  }
  if (value === "local_only") return { mode: "cluster_only" };
  return null;
}

// rcTasks({ url, keyFile, key, handles, stallMinutes, timeoutMs, fetchImpl })
//   url       the server's gateway listener, as the gateway's container reaches it, such as
//             http://host.docker.internal:3101
//   keyFile   the file that holds the gateway's key, read at each call, so a key made after the
//             gateway started works at once. key: the key itself, for the tests.
//   handles   { "rc-<handle>": "<handle>" }
export function rcTasks({ url, keyFile, key, handles = {}, stallMinutes = DEFAULT_STALL_MINUTES, timeoutMs = 3000, fetchImpl = globalThis.fetch }) {
  const base = String(url).replace(/\/+$/, "");
  const currentKey = () => {
    if (key) return key;
    let k = "";
    try { k = fs.readFileSync(keyFile, "utf8").trim(); } catch { /* no key yet */ }
    if (!k) throw new Error("no key for the server's gateway listener");
    return k;
  };
  async function call(method, path, body) {
    const r = await fetchImpl(`${base}${path}`, {
      method,
      headers: { authorization: `Bearer ${currentKey()}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    let json = null;
    try { json = await r.json(); } catch { /* no JSON */ }
    return { status: r.status, json };
  }
  const handleOf = (name) => {
    const h = Object.hasOwn(handles, name) ? handles[name] : undefined;
    if (typeof h !== "string" || !HANDLE.test(h)) throw new Error(`${name} is not an agent on the RecursicaChat server`);
    return h;
  };
  const taskPath = (task) => {
    if (typeof task !== "string" || !TASK_ID.test(task)) throw new Error("not a task id");
    return encodeURIComponent(task);
  };
  return {
    // The task ids of the agent's running turns. Throws when the server cannot say: the router then
    // counts the request as outside a task, so cluster only.
    async runTasks(name) {
      const { status, json } = await call("GET", `/gateway/agents/${encodeURIComponent(handleOf(name))}/tasks`);
      if (status !== 200 || !Array.isArray(json?.tasks)) throw new Error(`the server answered ${status}`);
      return json.tasks.filter((t) => typeof t === "string" && TASK_ID.test(t));
    },
    async onTask(name, task) {
      const { status, json } = await call("GET", `/gateway/agents/${encodeURIComponent(handleOf(name))}/tasks/${taskPath(task)}`);
      return status === 200 && json?.on === true;
    },
    // The task's policy row. Never throws: any failure is null, which means cluster only.
    async setting(task) {
      try {
        const { status, json } = await call("GET", `/gateway/tasks/${taskPath(task)}`);
        if (status !== 200 || json?.open !== true || !json.settings || typeof json.settings !== "object") return null;
        return rowFromChoice(json.settings[MODEL_USE], stallMinutes);
      } catch {
        return null;
      }
    },
    // Reports the task's n-th move to the cloud. "recorded" (201) or "duplicate" (200) when the
    // server has the switch, even for a task that has finished since. "refused" for any other 4xx,
    // such as no such task (404), a bad request (400) or a closed task (409): asking again would
    // get the same answer. Throws on a network error or a 5xx: the router tries again later.
    async cloudSwitch(task, n, reason) {
      const { status } = await call("POST", `/gateway/tasks/${taskPath(task)}/cloud-switch`, { n, reason });
      if (status === 201) return "recorded";
      if (status === 200) return "duplicate";
      if (status >= 400 && status < 500) return "refused";
      throw new Error(`the server answered ${status}`);
    },
  };
}
