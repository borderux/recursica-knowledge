// Starts jobd for a test, on a free port. The tests used a random port from a fixed range, which a
// live jobd or kev-engine on a cluster computer can hold. Only the tests use this file.
import net from "node:net";
import { spawn } from "node:child_process";

// A port that is free right now: the system picks the port, and the probe closes the port again.
export function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
}

// Starts jobd (script) with env on a free port, and waits for jobd's line that says jobd listens.
// Docker's own socket is a path that doesn't exist, so jobd's check of direct Docker access passes.
// Another program can take the port between the probe and jobd's start. Then jobd exits, and the
// next try uses a new port, up to 5 tries.
export async function startJobd(script, env) {
  for (let i = 0; i < 5; i++) {
    const port = await freePort();
    const proc = spawn(process.execPath, [script], { env: { JOBD_DIRECT_SOCKET: "/nonexistent/docker.sock", ...env, JOBD_PORT: String(port), JOBD_HOST: "127.0.0.1" }, stdio: ["ignore", "pipe", "pipe"] });
    proc.stderr.resume();
    const ready = await new Promise((resolve) => {
      let out = "";
      const done = (ok) => { clearTimeout(timer); resolve(ok); };
      const timer = setTimeout(() => done(false), 10_000);
      proc.stdout.on("data", (d) => { out += d; if (out.includes(`on 127.0.0.1:${port},`)) done(true); });
      proc.once("exit", () => done(false));
    });
    if (ready) return { proc, port };
    proc.kill();
  }
  throw new Error("jobd did not start on a free port in 5 tries");
}
