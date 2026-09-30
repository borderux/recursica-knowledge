#!/usr/bin/env node
/**
 * Resolve one channel's client settings, from the community and the channel together.
 *
 * THE INSTALLED COPY IS GENERATED. scripts/bootstrap-nest.mjs installs this into ~/.buzz/bin/.
 * Edit it here, in nest/bin/ — an edit to the installed copy is destroyed by the next bootstrap
 * with no diff and no log line to notice it by.
 *
 * See ./lib/client-config.mjs for why the settings live in two places and what happens when the
 * two disagree. In short: the community says what the client is, the channel says which client
 * it is for, and a channel that says nothing stays unconfigured.
 *
 * Usage:
 *   client-config.mjs resolve --channel <uuid> [--owner <pubkey>] [--json]
 *   client-config.mjs publish --from-channel <uuid> [--owner <pubkey>] [--write]
 *   client-config.mjs --help
 *
 *   resolve   print the channel's settings, or say why there are none
 *   publish   take a channel's existing whole block and write it to the community,
 *             printing what it would do unless --write is given
 *
 *   --channel <uuid>       the channel being asked about
 *   --from-channel <uuid>  the channel whose block is being promoted to the community
 *   --owner <pubkey>       whose community note to read. Defaults to the note's sole author
 *   --json                 machine-readable, for a caller that is not a person
 *   --write                actually publish. Without it, publish is a dry run
 *
 * ## Why a script rather than two paragraphs in a prompt
 *
 * The lookup has an order, a precedence rule and a refusal case. Prose describing all three to
 * a model is three chances to get it wrong on a turn where nobody is checking, and the cost of
 * getting it wrong is reading another client's dataset. A script gets it right the same way
 * every time, and the prompt shrinks to one command and what to do with its output.
 *
 * Exit codes are the contract: 0 resolved, 3 unconfigured channel, 4 conflict or incomplete.
 * `unconfigured` is deliberately not an error condition in the ordinary sense — most channels
 * are not client channels, and the caller is expected to treat it as "nothing to do here".
 */

import { execFileSync } from "node:child_process";
import {
  parseChannel,
  parseCommunity,
  communityClients,
  mergeConfig,
  formatBlock,
  FENCE_KEYS,
} from "./lib/client-config.mjs";

const NOTE_SLUG = "client-config";

const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (n) => argv.includes(n);
const opt = (n) => {
  const i = argv.indexOf(n);
  return i === -1 ? null : argv[i + 1];
};

if (!cmd || flag("--help") || flag("-h")) {
  const header = await import("node:fs").then((fs) =>
    fs.readFileSync(new URL(import.meta.url), "utf8"),
  );
  const usage = header.slice(
    header.indexOf(" * Usage:"),
    header.indexOf(" * ## Why a script"),
  );
  console.log(usage.replace(/^ \* ?/gm, "").trimEnd());
  process.exit(cmd ? 0 : 1);
}

const asJson = flag("--json");
const owner = opt("--owner");

function buzz(args, { allowFail = false } = {}) {
  try {
    // A tolerated failure keeps its stderr to itself. "note not found" is the ordinary state
    // of a community that has not published one yet, and printing the CLI's error JSON above
    // a perfectly good answer reads as a broken command.
    return execFileSync("buzz", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", allowFail ? "ignore" : "pipe"],
    });
  } catch (err) {
    if (allowFail) return null;
    console.error(
      `buzz ${args[0]} ${args[1] ?? ""} failed: ${err.stderr?.toString().trim() || err.message}`,
    );
    process.exit(2);
  }
}

/**
 * The community note, or null when there is none.
 *
 * `--author` matters more than it looks. Lookup by name is across authors, so a community where
 * two people have each written a `client-config` returns whichever sorts first — and on the day
 * those two disagree, the answer would depend on nothing the operator can see. With no `--owner`
 * given this asks for the note without one and lets the CLI report the ambiguity rather than
 * resolving it here.
 */
function communityNote() {
  const args = ["notes", "get", "--name", NOTE_SLUG, "--content-only"];
  if (owner) args.push("--author", owner);
  return buzz(args, { allowFail: true });
}

function channelCanvas(uuid) {
  return buzz(["canvas", "get", "--channel", uuid], { allowFail: true }) ?? "";
}

/* ------------------------------------------------------------------ resolve */

if (cmd === "resolve") {
  const uuid = opt("--channel");
  if (!uuid) {
    console.error("resolve needs --channel <uuid>");
    process.exit(1);
  }

  const {
    client: named,
    optedOut,
    values: channelValues,
  } = parseChannel(channelCanvas(uuid));

  const note = communityNote();
  const clients = communityClients(note);

  /**
   * A channel that says nothing inherits the community's client, when there is exactly one.
   *
   * That is the whole point of one community per client: the community boundary is the fence,
   * so a channel inside it does not have to re-declare which client it is in. Where the
   * community describes several, nothing is inherited — guessing which of two a silent channel
   * meant is the failure this exists to prevent.
   */
  const client = named ?? (!optedOut && clients.length === 1 ? clients[0] : null);
  const how = named ? "channel" : client ? "community" : null;

  if (!client) {
    const reason = optedOut
      ? "this channel opts out of client data"
      : clients.length > 1
        ? `this community describes ${clients.length} clients, so a channel has to name one`
        : "no client is configured for this channel or this community";
    const out = { status: "unconfigured", reason };
    console.log(asJson ? JSON.stringify(out, null, 2) : `unconfigured — ${reason}`);
    process.exit(3);
  }

  const communityValues = parseCommunity(note, client);
  const { values, conflicts, missing } = mergeConfig(channelValues, communityValues);

  if (conflicts.length) {
    const out = {
      status: "conflict",
      client,
      conflicts: conflicts.map((k) => ({
        key: k,
        channel: channelValues[k],
        community: communityValues[k],
      })),
    };
    if (asJson) console.log(JSON.stringify(out, null, 2));
    else {
      console.error(
        `conflict — the channel and the community disagree about ${conflicts.join(", ")}.`,
      );
      for (const c of out.conflicts)
        console.error(`  ${c.key}: channel "${c.channel}" / community "${c.community}"`);
      console.error(
        "\nThese decide which client's data is reachable, so neither is preferred and\n" +
          "nothing is resolved. One of them points at a different client; find out which\n" +
          "before changing either.",
      );
    }
    process.exit(4);
  }

  if (missing.length) {
    const out = { status: "incomplete", client, missing };
    if (asJson) console.log(JSON.stringify(out, null, 2));
    else {
      console.error(`incomplete — ${client} is missing ${missing.join(", ")}.`);
      console.error(
        "\nAdd them to the community note so every channel for this client gets them:\n" +
          `  buzz notes get --name ${NOTE_SLUG} --content-only`,
      );
    }
    process.exit(4);
  }

  if (asJson)
    console.log(JSON.stringify({ status: "ok", client, from: how, values }, null, 2));
  else process.stdout.write(formatBlock(values));
  process.exit(0);
}

/* ------------------------------------------------------------------ publish */

if (cmd === "publish") {
  const uuid = opt("--from-channel");
  if (!uuid) {
    console.error("publish needs --from-channel <uuid>");
    process.exit(1);
  }

  const { client, values } = parseChannel(channelCanvas(uuid));
  if (!client) {
    console.error(
      "that channel names no client, so there is nothing to promote to the community.",
    );
    process.exit(3);
  }

  const existing = communityNote();
  const already = parseCommunity(existing, client);
  const disagrees = FENCE_KEYS.filter(
    (k) => already[k] && values[k] && already[k] !== values[k],
  );
  if (disagrees.length) {
    console.error(
      `the community already describes ${client} differently (${disagrees.join(", ")}).`,
    );
    console.error(
      "Publishing would overwrite it. Work out which is right first — one of them is\n" +
        "pointed at a different client.",
    );
    process.exit(4);
  }

  /**
   * The note is written as one labelled block per client, even when there is only one. A
   * community that later takes on a second client then needs no migration and no decision
   * about what an unlabelled block meant.
   */
  const block =
    formatBlock(values).replace("## Claire config", `## client: ${client}`) + "\n";

  const body = existing?.includes(`## client: ${client}`)
    ? replaceBlock(existing, `## client: ${client}`, block)
    : (existing ? existing.trimEnd() + "\n\n" : "") + block;

  if (!flag("--write")) {
    console.log("--- would publish (pass --write to do it) ---\n");
    process.stdout.write(body);
    console.log(
      "\nEveryone in this community will be able to read this. It carries names and ids\n" +
        "only — never a key — which is the same rule the channel canvas has always had.",
    );
    process.exit(0);
  }

  const args = ["notes", "set", "--name", NOTE_SLUG, "--content", "-"];
  if (!existing) args.push("--title", "Client configuration");
  try {
    const out = execFileSync("buzz", args, { input: body, encoding: "utf8" });
    console.log(out.trim());
    console.log(
      `\nPublished. Each working channel for ${client} now needs only:\n\n` +
        "## Claire config\n" +
        `- client: ${client}\n`,
    );
  } catch (err) {
    console.error(
      `could not publish: ${err.stderr?.toString().trim() || err.message}`,
    );
    process.exit(2);
  }
  process.exit(0);
}

console.error(`unknown command: ${cmd}`);
process.exit(1);

/** Swap one `## heading` section for new text, leaving the rest of the document alone. */
function replaceBlock(doc, heading, replacement) {
  const lines = doc.split(/\r?\n/);
  const out = [];
  let skipping = false;
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      skipping = line.trim() === heading;
      if (skipping) {
        out.push(replacement.trimEnd());
        continue;
      }
    }
    if (!skipping) out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
