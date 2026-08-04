/**
 * Avatar handling for the export and restore scripts.
 *
 * An agent's picture is part of its identity — a restored agent with a blank avatar
 * is not the same agent to the people talking to it. Buzz Desktop stores only an
 * `avatar_url`, so the image itself lives on the relay and nowhere else. This module
 * pulls the bytes down so the repository holds the picture, not a link to it.
 *
 * The URL is never stored. For our agents it points at the current community's relay
 * (`https://<community>.communities.buzz.xyz/media/<sha256>.png`), which names the
 * installation and is meaningless in a different one — the same reason the prompts
 * carry `{{TOKEN}}` markers instead of real identifiers.
 *
 * What is stored instead is `avatar_source_sha256`. Relay media is content-addressed:
 * the filename in the URL *is* the sha256 of the bytes. That makes drift detection
 * free — comparing the hash in the live URL against the recorded one says whether the
 * avatar changed without downloading anything.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

export const AVATAR_FILE = "avatar.png";

/**
 * Stored avatars are downscaled to this width. The originals are ~1856x2304 and
 * ~6.5 MB each; three of them would grow this repository from 1.1 MB to over 20 MB,
 * and it is cloned by everyone installing the Recursica plugin. 512px is more than a
 * profile picture needs, and the full-resolution original stays on the relay,
 * identified by `avatar_source_sha256`.
 */
export const AVATAR_WIDTH = 512;

const SHA256_HEX = /^[0-9a-f]{64}$/;

export function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Work out the content hash of an avatar from its URL alone.
 *
 * Returns `{ hash, inline }` where `inline` holds the bytes if the URL carried them
 * (built-in agents use multi-KB `data:` URIs), or null if they must be fetched.
 * Returns null for a URL in neither shape, so an unrecognised form is skipped rather
 * than guessed at.
 */
export function describeAvatar(avatarUrl) {
  if (!avatarUrl) return null;

  if (avatarUrl.startsWith("data:")) {
    const comma = avatarUrl.indexOf(",");
    if (comma === -1 || !avatarUrl.slice(0, comma).includes(";base64")) {
      return null;
    }
    const inline = Buffer.from(avatarUrl.slice(comma + 1), "base64");
    return { hash: sha256(inline), inline };
  }

  let name;
  try {
    name = path.basename(new URL(avatarUrl).pathname);
  } catch {
    return null;
  }
  const hash = name.replace(/\.[a-z0-9]+$/i, "");
  return SHA256_HEX.test(hash) ? { hash, inline: null } : null;
}

/**
 * Download relay media. Blossom GETs are authenticated, so this goes through the
 * `buzz` CLI rather than plain fetch — it holds the signing key.
 *
 * The bytes are checked against the hash in the URL. Content-addressed storage makes
 * that check exact: a mismatch means the relay returned something other than what was
 * asked for, and silently committing it would put the wrong face on an agent.
 */
export function fetchAvatar(avatarUrl, expectedHash) {
  const bytes = execFileSync("buzz", ["media", "get", avatarUrl, "-o", "-"], {
    maxBuffer: 64 * 1024 * 1024,
  });
  const actual = sha256(bytes);
  if (actual !== expectedHash) {
    throw new Error(
      `downloaded avatar hashes to ${actual}, but its URL says ${expectedHash}`,
    );
  }
  return bytes;
}

/**
 * Downscale to `AVATAR_WIDTH`, preserving aspect ratio.
 *
 * `sips` ships with macOS, which is where Buzz Desktop keeps the state this script
 * reads. Rather than take an image dependency for one resize, it shells out — and if
 * `sips` is missing it stores the original bytes and says so, because an oversized
 * avatar is a worse outcome than no avatar only in repository size.
 *
 * Resizing is why the export compares `avatar_source_sha256` rather than the stored
 * file's own hash: a future `sips` could encode the same pixels differently, and
 * checking the source hash means that never shows up as phantom drift.
 */
export function renderAvatar(bytes, hash) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzz-avatar-"));
  const src = path.join(dir, `${hash}.png`);
  const out = path.join(dir, "resized.png");
  try {
    fs.writeFileSync(src, bytes);
    execFileSync("sips", [
      "--resampleWidth",
      String(AVATAR_WIDTH),
      src,
      "--out",
      out,
    ]);
    return { bytes: fs.readFileSync(out), resized: true };
  } catch {
    return { bytes, resized: false };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
