#!/usr/bin/env node
// The gateway key of an agent on the RecursicaChat 2.0 server: rc-<handle>, never a 1.x agent's
// handle. circlechat/rc-sync.sh runs this as root, and pipes a new key straight into the server's CLI
// (`cli.ts set-provider gw-<handle>`): no argument, environment variable, file, clipboard or output
// line ever holds the key.
//
//   node rc-gateway-key.mjs hash <state dir> <rc handle>
//        prints the SHA-256 the gateway records for the handle's key, or nothing
//   node rc-gateway-key.mjs issue <state dir> <rc handle> <gateway url> <model> <routes>
//        issues a new key for the handle and checks the key on the gateway. The check asks the
//        gateway's GET <gateway url>/models with the key: the list must hold <model>, and nothing
//        outside <routes> (comma-separated). Then prints the key on stdout, for the pipe alone.
//        A failed check revokes the new key, prints nothing on stdout, and exits 1.
//
// A key for a handle the running gateway does not list reaches no route, so the check also proves
// that the gateway was started with the handle in site.json.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { HANDLE, issue, loadKeys, revoke } from "../gateway/keys.mjs";

// The gateway reads the key file from the owner's folder on a Mac (Colima's Docker reads files as
// the owner), so a file root writes there goes back to the folder's owner, as own_for_docker does.
function giveBack(dir, platform = process.platform) {
  if (platform !== "darwin") return;
  const st = fs.statSync(dir);
  const f = path.join(dir, "agent-keys.json");
  if (fs.existsSync(f)) fs.chownSync(f, st.uid, st.gid);
}

export function recordedHash(dir, handle) {
  return loadKeys(dir)[handle]?.sha256 ?? "";
}

// What the gateway lists for a key, or the reason it lists nothing.
export async function listed(url, key, fetchImpl = globalThis.fetch) {
  const r = await fetchImpl(`${String(url).replace(/\/+$/, "")}/models`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) });
  if (!r.ok) return { error: `the gateway answered ${r.status}` };
  const j = await r.json().catch(() => ({}));
  return { ids: (j.data ?? []).map((m) => m.id) };
}

// Issues the key and checks the key. Returns the key, or throws after revoking the new key.
export async function issueChecked({ dir, handle, url, model, routes, fetchImpl, platform }) {
  if (!HANDLE.test(handle) || !handle.startsWith("rc-")) throw new Error(`${handle} is not a RecursicaChat gateway handle (rc-<handle>)`);
  const key = issue(dir, handle);
  giveBack(dir, platform);
  let why = "";
  try {
    const got = await listed(url, key, fetchImpl);
    if (got.error) why = got.error;
    else if (!got.ids.includes(model)) why = got.ids.length ? `the gateway gives ${handle} ${got.ids.join(", ")}, not ${model}` : `the gateway gives ${handle} no route. Rerun setup-host.sh, which restarts the gateway with ${handle} from site.json`;
    else if (got.ids.some((id) => !routes.includes(id))) why = `the gateway gives ${handle} more than the agent's routes (${got.ids.join(", ")})`;
  } catch (e) {
    why = `the gateway did not answer: ${e.message}`;
  }
  if (why) {
    revoke(dir, handle);
    giveBack(dir, platform);
    throw new Error(`${handle}'s new key failed the check, and is revoked: ${why}`);
  }
  return key;
}

export async function main(argv = process.argv.slice(2), { out = process.stdout, err = process.stderr, fetchImpl, platform } = {}) {
  const [cmd, dir, handle, url, model, routes] = argv;
  try {
    if (cmd === "hash" && dir && handle) {
      const h = recordedHash(dir, handle);
      if (h) out.write(h + "\n");
      return 0;
    }
    if (cmd === "issue" && dir && handle && url && model && routes) {
      const key = await issueChecked({ dir, handle, url, model, routes: routes.split(",").filter(Boolean), fetchImpl, platform });
      out.write(key + "\n");
      return 0;
    }
    err.write("usage: rc-gateway-key.mjs hash <state dir> <rc handle> | issue <state dir> <rc handle> <gateway url> <model> <routes>\n");
    return 2;
  } catch (e) {
    err.write(e.message + "\n");
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await main();
