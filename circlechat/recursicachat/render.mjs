// Renders the RecursicaChat 2.0 server's scripts and launchd jobs from site.json. install.sh runs it
// as root and installs what it writes. Each @TOKEN@ in a template gets one value:
//
//   GOOGLE_CLIENT_ID  site.json recursicachat.google_client_id   run.sh
//   GOOGLE_DOMAIN     site.json recursicachat.google_domain      run.sh
//   PUBLIC_URL        site.json recursicachat.public_url         run.sh
//   OWNER_HOME        the owner's home folder                     backup.sh, restore-test.sh
//   KIT               the kit's circlechat folder                 backup.sh, restore-test.sh
//   CC_DIR            the stack's folder                          backup.sh, restore-test.sh
//   BUILD_NODE        site.json recursicachat.node                rc-deploy.sh: the owner's Node, which builds
//
// Every value is checked against a strict shape, because it lands unquoted in a root script.
//
//   node render.mjs --site <site.json> --out <dir> --owner-home <dir> --kit <dir> --cc-dir <dir>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export const TEMPLATES = [
  "run.sh",
  "backup.sh",
  "restore-test.sh",
  "rc-deploy.sh",
  "io.recursica.recursicachat.plist",
  "io.recursica.recursicachat-colima.plist",
  "io.recursica.recursicachat-backup.plist",
  "io.recursica.recursicachat-restore-test.plist",
];
// Copied as it is: the kit's own Colima service script.
export const COPIED = { "colima-service.sh": join(here, "..", "kit", "colima-service.sh") };

const PATH = /^\/[A-Za-z0-9._/-]+$/;
const SHAPES = {
  GOOGLE_CLIENT_ID: [/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/, "recursicachat.google_client_id must be a Google client ID, such as 123-abc.apps.googleusercontent.com"],
  GOOGLE_DOMAIN: [/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, "recursicachat.google_domain must be the domain people sign in with, such as example.com"],
  PUBLIC_URL: [/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(:[0-9]{1,5})?$/, "recursicachat.public_url must be the https address people open the app at, such as https://chat.example.ts.net"],
  OWNER_HOME: [PATH, "the owner's home folder must be an absolute path"],
  KIT: [PATH, "the kit's folder must be an absolute path"],
  CC_DIR: [PATH, "the stack's folder must be an absolute path"],
  BUILD_NODE: [PATH, "recursicachat.node must be the owner's Node 24, such as /opt/node/v24.22.3/bin/node: rc-deploy builds the server with it"],
};

/** The token values, or the list of what is wrong. */
export function values(site, { ownerHome, kit, ccDir }) {
  const rc = site?.recursicachat ?? {};
  const v = {
    GOOGLE_CLIENT_ID: rc.google_client_id,
    GOOGLE_DOMAIN: rc.google_domain,
    PUBLIC_URL: typeof rc.public_url === "string" ? rc.public_url.replace(/\/+$/, "") : rc.public_url,
    OWNER_HOME: ownerHome,
    KIT: kit,
    CC_DIR: ccDir,
    BUILD_NODE: rc.node,
  };
  const errs = [];
  for (const [k, [shape, msg]] of Object.entries(SHAPES)) if (typeof v[k] !== "string" || !shape.test(v[k])) errs.push(msg);
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
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (k) => {
    const i = process.argv.indexOf(k);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  try {
    const site = JSON.parse(readFileSync(arg("--site"), "utf8"));
    const files = render(site, { ownerHome: arg("--owner-home"), kit: arg("--kit"), ccDir: arg("--cc-dir") });
    const out = arg("--out");
    mkdirSync(out, { recursive: true, mode: 0o700 });
    for (const [name, text] of Object.entries(files)) writeFileSync(join(out, name), text, { mode: 0o600 });
  } catch (e) {
    console.error(`render.mjs: ${e.message}`);
    process.exit(1);
  }
}
