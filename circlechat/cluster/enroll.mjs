// Enroll one approver for the two-factor buttons: prints a new secret and the link an
// authenticator app reads. Save the secret in the password manager and in the GitHub environment
// of the cluster's own stack (site.stack_name) as TOTP_SECRET_<NAME>, such as TOTP_SECRET_PERSON_A.
//
//   node circlechat/cluster/enroll.mjs <name>
import { spawnSync } from "node:child_process";
import { newSecret, otpauthUri } from "./totp.mjs";

const name = process.argv[2];
if (!/^[a-z][a-z0-9-]*$/.test(name ?? "")) { console.error("usage: enroll.mjs <name, lowercase>"); process.exit(1); }
const secret = newSecret();
const uri = otpauthUri(secret, name);
const qr = spawnSync("qrencode", ["-t", "ansiutf8", uri], { encoding: "utf8" });
if (qr.status === 0) console.log(qr.stdout);
else console.log("Install qrencode to show a QR code, or type the secret into the authenticator app.");
console.log(`Secret for ${name}: ${secret}`);
console.log(`GitHub secret name: TOTP_SECRET_${name.toUpperCase().replace(/-/g, "_")}`);
