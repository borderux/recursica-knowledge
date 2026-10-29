// Before the kit restarts a Mac: stop each Colima VM cleanly. A VM that is still running when macOS
// restarts can lose writes to the VM's disk, where the stack's containers and volumes live.
//
//   1. Boot out the Colima LaunchDaemon (setup-host.sh), so launchd never starts the VM again.
//   2. Run colima stop for each VM: the cluster's own VMs, and each unlocked client stack's VMs.
//   3. Wait until colima list shows each VM stopped, for up to 2 minutes.
import fs from "node:fs";
import path from "node:path";

export const STOP_WAIT_MS = 2 * 60_000;
const DAEMON = /^io\.recursica\.colima.*\.plist$/;

// colima list --json prints one VM per line: {"name":"default","status":"Running",...}
export function parseColimaList(text) {
  return String(text).split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((v) => v?.name).map((v) => ({ name: v.name, status: v.status }));
}

// Each Colima folder: the owner's own, and the folder inside each unlocked client stack's disk image.
export function colimaHomes(ownerHome) {
  const out = [path.join(ownerHome, ".colima")];
  const tenants = path.join(ownerHome, "tenants");
  if (fs.existsSync(tenants)) for (const t of fs.readdirSync(tenants)) out.push(path.join(tenants, t, "colima"));
  return out.filter((d) => fs.existsSync(d));
}

//   run(cmd, args, opts): the command's output, or "" on a failure
export async function stopColimaVms({ owner, ownerHome, run, envPath = process.env.PATH, daemonDir = "/Library/LaunchDaemons",
  waitMs = STOP_WAIT_MS, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = Date.now } = {}) {
  let daemons = []; try { daemons = fs.readdirSync(daemonDir).filter((f) => DAEMON.test(f)); } catch {}
  for (const f of daemons) await run("launchctl", ["bootout", "system", path.join(daemonDir, f)], { timeout: waitMs });
  const homes = colimaHomes(ownerHome);
  const colima = (home, args) => run("sudo", ["-u", owner, "-H", "env", `PATH=${envPath}`, `COLIMA_HOME=${home}`, "colima", ...args], { timeout: waitMs });
  const list = async () => {
    const out = [];
    for (const home of homes) for (const v of parseColimaList(await colima(home, ["list", "--json"]))) out.push({ ...v, home });
    return out;
  };
  for (const v of await list()) if (v.status !== "Stopped") await colima(v.home, ["stop", "--profile", v.name]);
  const end = now() + waitMs;
  for (;;) {
    const running = (await list()).filter((v) => v.status !== "Stopped");
    if (!running.length || now() >= end) return { running };
    await sleep(5000);
  }
}
