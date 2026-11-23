// Renders the RecursicaChat 2.0 server's scripts and launchd jobs from site.json. install.sh runs it
// as root and installs what it writes. Each @TOKEN@ in a template gets one value:
//
//   GOOGLE_CLIENT_ID  site.json recursicachat.google_client_id   run.sh
//   GOOGLE_DOMAIN     site.json recursicachat.google_domain      run.sh
//   PUBLIC_URL        site.json recursicachat.public_url         run.sh
//   OWNER_HOME        the owner's home folder                     backup.sh, restore-test.sh, stack-*.sh
//   KIT               the kit's circlechat folder                 backup.sh, restore-test.sh, stack-*.sh
//   CC_DIR            the stack's folder                          backup.sh, restore-test.sh, stack-*.sh
//   WS                the agents' workspace                       stack-*.sh
//   BUILD_NODE        site.json recursicachat.node                rc-deploy.sh: the owner's Node, which builds
//   PROGRAMS          site.json recursicachat.services            rc-clear.sh: each entry with a "job"
//   GATEWAY_PORT      the server's gateway listener's port         run.sh (kit/render.mjs
//                     RC_GATEWAY_LISTENER_PORT)
//
// It also writes task-settings.json, the task settings the server offers on each task
// (CIRCLECHAT_TASK_SETTINGS_FILE): the kit's "Model use" setting and the stall, from site.json's
// site.cloud_models.stall_minutes (kit/render.mjs taskSettings).
//
// Every value is checked against a strict shape, because it lands in a root script.
//
//   node render.mjs --site <site.json> --out <dir> --owner-home <dir> --kit <dir> --cc-dir <dir> --ws <dir>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { RC_GATEWAY_LISTENER_PORT, rcServiceErrors, taskSettings } from "../kit/render.mjs";

const here = dirname(fileURLToPath(import.meta.url));

export const TEMPLATES = [
  "run.sh",
  "backup.sh",
  "restore-test.sh",
  "rc-deploy.sh",
  "rc-clear.sh",
  "io.recursica.recursicachat.plist",
  "io.recursica.recursicachat-colima.plist",
  "io.recursica.recursicachat-backup.plist",
  "io.recursica.recursicachat-restore-test.plist",
  // the stack's own files: site.json and the workspace
  "stack-backup.sh",
  "stack-restore-test.sh",
  "io.recursica.stack-backup.plist",
  "io.recursica.stack-restore-test.plist",
];
// Copied as they are: the kit's own Colima service script, the PDF text reader's build, and
// rc-clear's database work.
export const COPIED = {
  "colima-service.sh": join(here, "..", "kit", "colima-service.sh"),
  "build-pdftext.sh": join(here, "build-pdftext.sh"),
  "rc-clear.mjs": join(here, "rc-clear.mjs"),
};

const PATH = /^\/[A-Za-z0-9._/-]+$/;
const SHAPES = {
  GOOGLE_CLIENT_ID: [/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/, "recursicachat.google_client_id must be a Google client ID, such as 123-abc.apps.googleusercontent.com"],
  GOOGLE_DOMAIN: [/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, "recursicachat.google_domain must be the domain people sign in with, such as example.com"],
  PUBLIC_URL: [/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(:[0-9]{1,5})?$/, "recursicachat.public_url must be the https address people open the app at, such as https://chat.example.ts.net"],
  OWNER_HOME: [PATH, "the owner's home folder must be an absolute path"],
  KIT: [PATH, "the kit's folder must be an absolute path"],
  CC_DIR: [PATH, "the stack's folder must be an absolute path"],
  WS: [PATH, "the agents' workspace must be an absolute path"],
  BUILD_NODE: [PATH, "recursicachat.node must be the owner's Node 24, such as /opt/node/v24.22.3/bin/node: rc-deploy builds the server with it"],
};

/**
 * rc-clear's programs, from recursicachat.services: "<name>:<launchd job>:<account>:<state folder>"
 * for each entry with a "job", with a space between two. An entry with no "job" is left out:
 * rc-clear cannot stop a program whose job it does not know. The kit's site check (kit/render.mjs)
 * holds each setting's shape.
 */
export function programs(site) {
  const rc = site?.recursicachat ?? {};
  // The whole site: a service's gateway block names site.json's routes and needs its gateway port.
  const errs = rcServiceErrors(rc, site ?? {});
  if (errs.length) return { value: "", errs };
  const value = (rc.services ?? [])
    .filter((s) => s.job !== undefined)
    .map((s) => `${s.name}:${s.job}:${s.account}:${s.state ?? ""}`)
    .join(" ");
  // The value lands inside double quotes in a root script.
  if (!/^[A-Za-z0-9._/: -]*$/.test(value)) return { value: "", errs: ["recursicachat.services: a name, job, account or state holds a character rc-clear.sh does not take"] };
  return { value, errs: [] };
}

/** The token values, or the list of what is wrong. */
export function values(site, { ownerHome, kit, ccDir, ws }) {
  const rc = site?.recursicachat ?? {};
  const v = {
    GOOGLE_CLIENT_ID: rc.google_client_id,
    GOOGLE_DOMAIN: rc.google_domain,
    PUBLIC_URL: typeof rc.public_url === "string" ? rc.public_url.replace(/\/+$/, "") : rc.public_url,
    OWNER_HOME: ownerHome,
    KIT: kit,
    CC_DIR: ccDir,
    WS: ws,
    BUILD_NODE: rc.node,
    GATEWAY_PORT: String(RC_GATEWAY_LISTENER_PORT),
  };
  const errs = [];
  for (const [k, [shape, msg]] of Object.entries(SHAPES)) if (typeof v[k] !== "string" || !shape.test(v[k])) errs.push(msg);
  // The stall lands in task-settings.json, which the server refuses whole when a value is wrong.
  const stall = site?.site?.cloud_models?.stall_minutes;
  if (stall !== undefined && !(Number.isInteger(stall) && stall >= 1 && stall <= 1440)) errs.push("site.cloud_models.stall_minutes must be a whole number of minutes from 1 to 1440");
  const p = programs(site);
  v.PROGRAMS = p.value;
  errs.push(...p.errs);
  return { values: v, errs };
}

/** One template with its tokens filled. Throws on a token with no value. */
export function fill(text, v) {
  const out = text.replace(/@([A-Z_]+)@/g, (m, k) => {
    if (!(k in v)) throw new Error(`no value for ${m}`);
    return v[k];
  });
  return out;
}

export function render(site, dirs) {
  const { values: v, errs } = values(site, dirs);
  if (errs.length) throw new Error(errs.join("\n"));
  const files = {};
  for (const name of TEMPLATES) files[name] = fill(readFileSync(join(here, name), "utf8"), v);
  for (const [name, from] of Object.entries(COPIED)) files[name] = readFileSync(from, "utf8");
  files["task-settings.json"] = JSON.stringify(taskSettings(site), null, 2) + "\n";
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (k) => {
    const i = process.argv.indexOf(k);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  try {
    const site = JSON.parse(readFileSync(arg("--site"), "utf8"));
    const files = render(site, { ownerHome: arg("--owner-home"), kit: arg("--kit"), ccDir: arg("--cc-dir"), ws: arg("--ws") });
    const out = arg("--out");
    mkdirSync(out, { recursive: true, mode: 0o700 });
    for (const [name, text] of Object.entries(files)) writeFileSync(join(out, name), text, { mode: 0o600 });
  } catch (e) {
    console.error(`render.mjs: ${e.message}`);
    process.exit(1);
  }
}
