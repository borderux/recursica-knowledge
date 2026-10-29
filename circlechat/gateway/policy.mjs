// Which model answers one request: the cluster's own models, or the agent's cloud key. Pure rules,
// safe to import from tests; router.mjs does the reads and the waiting.
//
// A task's "Cloud models" setting (CircleChat's task_cloud_models table) has three modes:
//   cluster_only      never a cloud model. The request waits for the cluster as long as needed.
//   cloud_after_wait  the cluster first. The agent's cloud key answers once the task passes its
//                     wait to start (no cluster answer yet) or its time to finish.
//   cloud_now         the agent's cloud key from the first request, so the work runs beside the
//                     cluster's other work.
// A busy cluster is never a reason to call a cloud model: only the task's setting and its clock are.
//
// A task's clock starts at the gateway's first request for the task. The task has started once a
// cluster model answers a request for the task.

export const MODES = ["cluster_only", "cloud_after_wait", "cloud_now"];
const MINUTE = 60_000;

// What a stored row means. A missing or half-filled row means cluster only, never a guess at cloud use.
export function settingFromRow(row) {
  if (!row) return { mode: "cluster_only" };
  if (row.mode === "cloud_now") return { mode: "cloud_now" };
  const start = Number(row.max_start_wait_minutes ?? row.maxStartWaitMinutes);
  const finish = Number(row.max_finish_minutes ?? row.maxFinishMinutes);
  if (row.mode === "cloud_after_wait" && start > 0 && finish > 0) return { mode: "cloud_after_wait", maxStartWaitMinutes: start, maxFinishMinutes: finish };
  return { mode: "cluster_only" };
}

// The moment a cloud_after_wait task may use the cloud, or null when the clock cannot pass.
export function cloudFrom(setting, clock) {
  if (setting.mode !== "cloud_after_wait" || clock?.firstRequestAt == null) return null;
  const finish = clock.firstRequestAt + setting.maxFinishMinutes * MINUTE;
  const start = clock.startedAt != null ? Infinity : clock.firstRequestAt + setting.maxStartWaitMinutes * MINUTE;
  return Math.min(start, finish);
}

// decide({ task, setting, agent, clock, now })
//   task     the task id, or null for a request outside a task
//   agent    { cloud: the agent's switch in site.json, key: the agent's cloud key name or null,
//              local: true when the agent's route has a cluster model }
// Returns { target: "cluster" | "cloud" | "fail", until?: ms, reason }.
//   until    for target "cluster": the moment to give up waiting and use the cloud key instead.
export function decide({ task, setting, agent, clock, now }) {
  const mode = task ? setting?.mode ?? "cluster_only" : "cluster_only";
  const may = (why) => {
    if (!task) return [false, "the request is outside a task"];
    if (!agent.cloud) return [false, "the agent's cloud switch is off in site.json"];
    if (!agent.key) return [false, "the agent has no cloud key in site.json"];
    return [true, why];
  };
  if (mode === "cloud_now") {
    const [ok, why] = may("the task allows cloud now");
    if (ok) return { target: "cloud", reason: why };
    return agent.local ? { target: "cluster", reason: why } : { target: "fail", reason: `no cluster model, and ${why}` };
  }
  if (mode === "cloud_after_wait") {
    const [ok, why] = may("the task passed its wait");
    if (ok) {
      const at = cloudFrom(setting, clock);
      if (at !== null && now >= at) return { target: "cloud", reason: why };
      // With no cluster model, the request waits out the task's wait, then goes to the cloud key.
      return { target: "cluster", until: at ?? undefined, reason: agent.local ? "the task is inside its wait" : "no cluster model: waiting out the task's wait" };
    }
    return agent.local ? { target: "cluster", reason: why } : { target: "fail", reason: `no cluster model, and ${why}` };
  }
  return agent.local ? { target: "cluster", reason: task ? "the task is cluster only" : "the request is outside a task" } : { target: "fail", reason: "no cluster model, and the task is cluster only" };
}
