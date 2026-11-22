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
//   node rc-gateway-key.mjs revoke <state dir> <svc handle>
//        ends the handle's key, for a service whose key could not reach its file, or whose gateway
//        block is gone. Prints whether there was a key.
//   node rc-gateway-key.mjs current <state dir> <svc handle> <key file>
//        prints "current" when <key file> holds the key the gateway records for the handle, or
//        nothing. Reads the file itself, never through a symlink, and prints nothing of the key.
//
// A key for a handle the running gateway does not list reaches no route, so the check also proves
// that the gateway was started with the handle in site.json.
//
// circlechat/rc-service.sh issues the gateway key of a program in recursicachat.services the same
// way: svc-<name>, with <model> the service's first route. For an svc- handle the check is stricter:
// the gateway must list exactly the service's routes, and the key goes from stdout straight into a
// new file only the service's account reads.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { HANDLE, issue, loadKeys, revoke } from "../gateway/keys.mjs";

const PREFIXES = ["rc-", "svc-"];

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

// True when <file> holds the key the gateway records for <handle>. A missing, empty or unreadable
// file, or a symlink, is not current.
export function keyFileCurrent(dir, handle, file) {
  const want = recordedHash(dir, handle);
  if (!want) return false;
  let fd;
  try { fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW); } catch { return false; }
  try {
    const got = crypto.createHash("sha256").update(fs.readFileSync(fd, "utf8").trim()).digest("hex");
    return got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
  } catch { return false; } finally { fs.closeSync(fd); }
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
  if (!HANDLE.test(handle) || !PREFIXES.some((p) => handle.startsWith(p))) throw new Error(`${handle} is not a RecursicaChat gateway handle (rc-<handle>, or svc-<name> for a service)`);
  // A service's key gets exactly the service's routes.
  const exact = handle.startsWith("svc-");
  const key = issue(dir, handle);
  giveBack(dir, platform);
  let why = "";
  try {
    const got = await listed(url, key, fetchImpl);
    if (got.error) why = got.error;
    else if (!got.ids.includes(model)) why = got.ids.length ? `the gateway gives ${handle} ${got.ids.join(", ")}, not ${model}` : `the gateway gives ${handle} no route. Rerun setup-host.sh, which restarts the gateway with ${handle} from site.json`;
    else if (got.ids.some((id) => !routes.includes(id))) why = `the gateway gives ${handle} more than ${exact ? "the service's" : "the agent's"} routes (${got.ids.join(", ")})`;
    else if (exact && routes.some((r) => !got.ids.includes(r))) why = `the gateway gives ${handle} ${got.ids.join(", ")}, not every route of the service (${routes.join(", ")}). Rerun setup-host.sh, which restarts the gateway with ${handle} from site.json`;
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
    if (cmd === "revoke" && dir && handle) {
      if (!PREFIXES.some((p) => handle.startsWith(p))) throw new Error(`${handle} is not a RecursicaChat gateway handle`);
      const had = revoke(dir, handle);
      giveBack(dir, platform);
      out.write(had ? "revoked\n" : "none\n");
      return 0;
    }
    if (cmd === "current" && dir && handle && url) {
      if (keyFileCurrent(dir, handle, url)) out.write("current\n");
      return 0;
    }
    if (cmd === "issue" && dir && handle && url && model && routes) {
      const key = await issueChecked({ dir, handle, url, model, routes: routes.split(",").filter(Boolean), fetchImpl, platform });
      out.write(key + "\n");
      return 0;
    }
    err.write("usage: rc-gateway-key.mjs hash <state dir> <handle> | revoke <state dir> <handle> | current <state dir> <handle> <key file> | issue <state dir> <handle> <gateway url> <model> <routes>\n");
    return 2;
  } catch (e) {
    err.write(e.message + "\n");
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await main();
