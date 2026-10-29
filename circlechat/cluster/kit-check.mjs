// Root runs the cluster's services from the kit checkout in /etc/agent-cluster.conf (KIT). The
// checkout must sit outside the agents' workspace, and only the owner may change the checkout
// (kit/check-kit.sh). Each root service checks the checkout when the service starts.
import { spawnSync } from "node:child_process";
import path from "node:path";

// The reason the checkout is refused, or null.
export function kitProblem(kit, env = process.env, run = spawnSync) {
  const r = run("bash", [path.join(kit, "circlechat/kit/check-kit.sh"), kit, env.OWNER ?? "", env.OWNER_HOME ?? ""],
    { encoding: "utf8", env: { ...process.env, ...(env.WS ? { WS: env.WS } : {}) } });
  return r.status === 0 ? null : `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() || `the kit check of ${kit} failed`;
}

// Stop the service when the checkout is refused.
export function requireKit(kit, env = process.env) {
  const problem = kitProblem(kit, env);
  if (problem) { console.error(problem); process.exit(1); }
}
