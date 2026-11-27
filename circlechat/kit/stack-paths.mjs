// The stack's folders on one computer, for the kit's node code. kit/stack-paths.sh holds the same
// rules for the shell scripts.
//
//   - The stack's folder holds site.json, .env, model-keys.env, kit-out/ and gateway-state/:
//     ~/recursica-stack for the cluster's own stack, and ~/tenants/<name>/stack for a client or demo
//     stack.
//   - The agents' workspace holds the app's checkout and the agents' files: ~/recursica-workspace,
//     and ~/tenants/<name>/workspace for a client or demo stack.
//
// CircleChat 1.x named the folders ~/circlechat, ~/tenants/<name>/circlechat and
// ~/circlechat-workspace. A computer keeps the old names until a person runs
// circlechat/migrate-off-1x.sh. So each folder is the new one when the new one exists, else the
// old one when the old one exists, else the new one.
import fs from "node:fs";
import path from "node:path";

export const STACK_FOLDER = "recursica-stack";
export const OLD_STACK_FOLDER = "circlechat";
export const TENANT_STACK_FOLDER = "stack";
export const WORKSPACE_FOLDER = "recursica-workspace";
export const OLD_WORKSPACE_FOLDER = "circlechat-workspace";

const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };

// The new folder when the new one exists, else the old one when the old one exists, else the new one.
export const pick = (fresh, old) => (isDir(fresh) || !isDir(old) ? fresh : old);

// The stack's folder: the cluster's own stack, or the client or demo stack <tenant>.
export function stackDir(home, tenant = "") {
  if (tenant) return pick(path.join(home, "tenants", tenant, TENANT_STACK_FOLDER), path.join(home, "tenants", tenant, OLD_STACK_FOLDER));
  return pick(path.join(home, STACK_FOLDER), path.join(home, OLD_STACK_FOLDER));
}

// The stack's site.json.
export const siteFile = (home, tenant = "") => path.join(stackDir(home, tenant), "site.json");

// The agents' workspace of the stack.
export function workspaceDir(home, tenant = "") {
  if (tenant) return path.join(home, "tenants", tenant, "workspace");
  return pick(path.join(home, WORKSPACE_FOLDER), path.join(home, OLD_WORKSPACE_FOLDER));
}

// Each client or demo stack in ~/tenants, as { tenant, dir }. A stack whose encrypted disk image is
// locked has neither folder, and gets the new folder's path.
export function tenantStacks(home) {
  const tenants = path.join(home, "tenants");
  if (!isDir(tenants)) return [];
  return fs.readdirSync(tenants).sort().filter((t) => isDir(path.join(tenants, t))).map((tenant) => ({ tenant, dir: stackDir(home, tenant) }));
}

// The tenant of a stack folder, or "" for the cluster's own stack.
export function tenantOf(home, dir) {
  const parent = path.dirname(dir);
  return path.dirname(parent) === path.join(home, "tenants") ? path.basename(parent) : "";
}
