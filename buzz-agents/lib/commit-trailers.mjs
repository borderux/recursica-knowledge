/**
 * Does this `git commit` carry the operator's sign-off?
 *
 * AGENTS.md in the nest requires two trailers on every agent-authored commit, both naming
 * the human operator taken from the working repository's `user.name` / `user.email`:
 *
 *     Co-authored-by: <operator>
 *     Co-authored-by: Claude ...          (optional, and not what this checks)
 *     Signed-off-by:  <operator>
 *
 * It has said MUST for months and 7 of the last 12 commits on `main` landed without the
 * sign-off — the 6 most recent consecutively. A rule that is read-if-remembered gets
 * forgotten, so this is the deterministic version of it, called from a `PreToolUse` hook
 * before the commit runs.
 *
 * The operator `Co-authored-by` looks healthier than it is. GitHub adds one of its own when
 * a squash-merge's author differs from the merger, which is why it appears on commits that
 * never had it — a byproduct of two addresses not matching, not evidence anybody wrote it.
 * If the addresses ever match it disappears. So both trailers are checked, not just the
 * sign-off.
 *
 * Pure functions only, so the parsing can be tested without a repository or a hook:
 *
 *     node --test 'buzz-agents/lib/*.test.mjs'
 */

/* ── shell-ish tokenizer ───────────────────────────────────────────────────── */

/**
 * Split a command into tokens, honouring the three quoting forms that actually appear.
 *
 * Same shape as the one in `hook-guard-published-text.mjs` and for the same reason: this is
 * not a shell parser and does not need to be. It needs to know which word follows `-m` and
 * whether that word was quoted. Anything it gets wrong should fail toward letting a commit
 * through, never toward denying a correct one — a guard that blocks good commits is a guard
 * that gets switched off.
 */
export function tokenize(cmd) {
  const out = [];
  let cur = "";
  let quoted = false;
  let i = 0;
  let started = false;

  const push = () => {
    if (started) out.push({ value: cur, quoted });
    cur = "";
    quoted = false;
    started = false;
  };

  while (i < cmd.length) {
    const c = cmd[i];
    if (c === "'") {
      const end = cmd.indexOf("'", i + 1);
      if (end < 0) { cur += cmd.slice(i + 1); started = true; break; }
      cur += cmd.slice(i + 1, end);
      quoted = true;
      started = true;
      i = end + 1;
    } else if (c === '"') {
      let j = i + 1;
      let buf = "";
      while (j < cmd.length && cmd[j] !== '"') {
        if (cmd[j] === "\\" && j + 1 < cmd.length) { buf += cmd[j + 1]; j += 2; continue; }
        buf += cmd[j];
        j += 1;
      }
      cur += buf;
      quoted = true;
      started = true;
      i = j + 1;
    } else if (c === "\\" && i + 1 < cmd.length) {
      cur += cmd[i + 1];
      started = true;
      i += 2;
    } else if (/\s/.test(c)) {
      push();
      i += 1;
    } else {
      cur += c;
      started = true;
      i += 1;
    }
  }
  push();
  return out;
}

/** Unquoted operators that end one command and begin another. */
const SEPARATORS = new Set(["&&", "||", ";", "|", "&"]);

/**
 * Break a command line into its separate commands.
 *
 * `git add -A && git commit -m "..."` arrives as one Bash tool call, and the commit is the
 * half that matters. Splitting on the token stream rather than the raw string means a `&&`
 * inside a quoted commit message stays inside the message.
 */
export function splitCommands(cmd) {
  const segments = [[]];
  for (const t of tokenize(cmd)) {
    if (!t.quoted && SEPARATORS.has(t.value)) segments.push([]);
    else segments[segments.length - 1].push(t);
  }
  return segments.filter((s) => s.length);
}

/* ── which command is this ─────────────────────────────────────────────────── */

/** Options that sit BEFORE the subcommand and take a separate value. */
const GIT_GLOBAL_WITH_VALUE = new Set([
  "-c", "-C", "--git-dir", "--work-tree", "--namespace", "--exec-path", "--super-prefix",
]);

/** Commit options that take a separate value. Anything else is a flag. */
const COMMIT_WITH_VALUE = new Set([
  "-m", "--message",
  "-F", "--file",
  "--trailer",
  "-C", "--reuse-message",
  "-c", "--reedit-message",
  "--fixup", "--squash",
  "--author", "--date", "--template", "--cleanup",
  "--pathspec-from-file",
]);

/**
 * `-S`/`--gpg-sign` is deliberately absent from the set above: its value is optional and
 * attached (`-Skeyid`), so consuming the next token would swallow the `-m` that follows it.
 */

/**
 * Resolve the two substitutions this guard can work out for itself.
 *
 * The documented way to write the trailers is the one that cannot get the address wrong:
 *
 *     --trailer "Signed-off-by: $(git config user.name) <$(git config user.email)>"
 *
 * That reaches the hook unexpanded, so a naive reader sees no address, finds no matching
 * trailer, and denies a commit that was not merely correct but written in the recommended
 * form. This guard did exactly that the first time it ran against a real commit.
 *
 * These two substitutions resolve to the same values the check compares against — that is
 * the whole point of writing them — so expanding them here is not a guess about what the
 * shell will do. It is the same lookup, done twice.
 */
function expandKnown(text, name, email) {
  const cfg = (key) =>
    new RegExp(String.raw`(?:\$\(|\x60)\s*git\s+config\s+(?:--get\s+)?${key}\s*(?:\)|\x60)`, "g");
  return String(text)
    .replace(cfg(String.raw`user\.email`), email)
    .replace(cfg(String.raw`user\.name`), name);
}

/**
 * Text the shell would still rewrite before git ever saw it, after the two known
 * substitutions above have been resolved.
 *
 * `git commit -m "$(cat msg.txt)"` reaches this hook as the literal fourteen characters
 * `$(cat msg.txt)`. Reading that as the commit message would find no trailers in it and
 * deny over text nobody wrote, so it counts as text this cannot see.
 */
function isUnexpanded(text) {
  return /\$\(|\$\{|`|\$[A-Za-z_]/.test(text);
}

function splitEq(value) {
  if (!value.startsWith("--")) return null;
  const eq = value.indexOf("=");
  return eq > 2 ? [value.slice(0, eq), value.slice(eq + 1)] : null;
}

/**
 * Pull the commit-relevant arguments out of one command, or return null if it is not a
 * `git commit`.
 *
 * The subcommand is found by walking past the global options rather than by matching
 * /commit/ against the string. `git -c commit.gpgsign=false commit` — the exact form used
 * by the commit that prompted this — contains the word twice, and only one of them is the
 * subcommand.
 */
export function parseCommitCommand(tokens) {
  if (!tokens.length) return null;
  const argv0 = tokens[0].value;
  if (argv0 !== "git" && !argv0.endsWith("/git")) return null;

  let i = 1;
  let gitDir = null;
  while (i < tokens.length) {
    const v = tokens[i].value;
    if (!v.startsWith("-")) break;
    const eq = splitEq(v);
    if (eq) {
      if (eq[0] === "--git-dir" || eq[0] === "--work-tree") gitDir = eq[1];
      i += 1;
      continue;
    }
    if (GIT_GLOBAL_WITH_VALUE.has(v)) {
      if (v === "-C") gitDir = tokens[i + 1]?.value ?? null;
      i += 2;
      continue;
    }
    i += 1;
  }
  if (tokens[i]?.value !== "commit") return null;

  const out = {
    gitDir,
    messages: [],
    files: [],
    trailers: [],
    stdin: false,
    signoff: false,
    amend: false,
    reuse: false,
    autoSquash: false,
    dryRun: false,
  };

  for (let k = i + 1; k < tokens.length; k += 1) {
    const raw = tokens[k].value;
    const eq = splitEq(raw);
    const name = eq ? eq[0] : raw;
    const inlineValue = eq ? eq[1] : null;
    const value = inlineValue ?? (COMMIT_WITH_VALUE.has(name) ? tokens[k + 1]?.value : undefined);
    if (inlineValue === null && COMMIT_WITH_VALUE.has(name) && value !== undefined) k += 1;

    switch (name) {
      case "-m": case "--message":
        if (value !== undefined) out.messages.push(value);
        break;
      case "-F": case "--file":
        if (value === "-") out.stdin = true;
        else if (value !== undefined) out.files.push(value);
        break;
      case "--trailer":
        if (value !== undefined) out.trailers.push(value);
        break;
      case "-s": case "--signoff":
        out.signoff = true;
        break;
      case "--no-signoff":
        out.signoff = false;
        break;
      case "--amend":
        out.amend = true;
        break;
      case "-C": case "--reuse-message": case "-c": case "--reedit-message":
        out.reuse = true;
        break;
      case "--fixup": case "--squash":
        out.autoSquash = true;
        break;
      case "--dry-run":
        out.dryRun = true;
        break;
      default:
        break;
    }
  }
  return out;
}

/* ── are the trailers there ────────────────────────────────────────────────── */

const REQUIRED = ["Co-authored-by", "Signed-off-by"];

/**
 * Which of the two required trailers are absent from this message.
 *
 * Every `Key: Value` line is considered, not only git's own definition of the trailer block
 * (the last paragraph). Matching more lines can only let a commit through; matching fewer
 * would deny a correct one over a blank line in the wrong place.
 *
 * The email is what identifies the operator. A `Signed-off-by` naming somebody else — or
 * naming the model, which is how the operator's `Co-authored-by` went missing — does not
 * satisfy the requirement, so the comparison is against the repository's configured address
 * rather than against "some address being present".
 */
export function missingTrailers(message, email) {
  const want = String(email ?? "").trim().toLowerCase();
  if (!want) return REQUIRED.slice();

  const present = new Set();
  for (const line of String(message ?? "").split("\n")) {
    const m = /^\s*([A-Za-z][A-Za-z-]*)\s*:\s*(.+?)\s*$/.exec(line);
    if (!m) continue;
    const key = REQUIRED.find((r) => r.toLowerCase() === m[1].toLowerCase());
    if (!key) continue;
    const addr = /<([^>]*)>/.exec(m[2])?.[1] ?? m[2];
    if (addr.trim().toLowerCase() === want) present.add(key);
  }
  return REQUIRED.filter((r) => !present.has(r));
}

/**
 * The whole verdict for one command.
 *
 * `readFile` and `headMessage` are injected so the decision stays testable without a
 * repository. Both may return null, which makes the message unreadable rather than absent —
 * see the deny reasoning below.
 *
 * `name` is needed only to expand `$(git config user.name)` inside a trailer; the check
 * itself turns on the address.
 *
 * Returns null when the command is none of its business.
 */
export function inspectCommand(tokens, { email, name, readFile, headMessage }) {
  const parsed = parseCommitCommand(tokens);
  if (!parsed) return null;

  // A fixup or squash commit's message is generated by git and squashed away by the rebase
  // that consumes it. It never reaches a published history under its own name.
  if (parsed.autoSquash) return null;

  /**
   * `--dry-run` writes nothing — it reports what a commit would contain. Denying it made the
   * guard block the very command someone would use to check what they are about to commit,
   * which is the opposite of the point. Nothing published means nothing to guard.
   */
  if (parsed.dryRun) return null;

  if (!String(email ?? "").trim()) {
    return { verdict: "deny", reason: "no-identity", gitDir: parsed.gitDir };
  }

  const expand = (t) => expandKnown(t, name ?? "", email);
  const parts = [];
  let sawText = false;
  let unreadable = false;

  for (const raw of parsed.messages) {
    const m = expand(raw);
    if (isUnexpanded(m)) { unreadable = true; continue; }
    parts.push(m);
    sawText = true;
  }
  for (const f of parsed.files) {
    if (isUnexpanded(f)) { unreadable = true; continue; }
    const body = readFile(f);
    if (body === null || body === undefined) { unreadable = true; continue; }
    parts.push(body);
    sawText = true;
  }
  // `--amend` without a new message reuses the one already on HEAD, and so does `-C`/`-c`.
  if ((parsed.amend || parsed.reuse) && !sawText) {
    const head = headMessage();
    if (head === null || head === undefined) unreadable = true;
    else { parts.push(head); sawText = true; }
  }
  for (const t of parsed.trailers) parts.push(expand(t));
  // `-s` is git adding `Signed-off-by` from the committer identity, which is the same
  // user.name/user.email this checks against.
  if (parsed.signoff) parts.push(`Signed-off-by: <${email}>`);

  const missing = missingTrailers(parts.join("\n"), email);
  if (!missing.length) return { verdict: "ok", gitDir: parsed.gitDir };

  /**
   * Part of the message is somewhere this cannot look — piped in on stdin, in a file it
   * could not read, behind a shell substitution, or in an editor that has not opened yet.
   * The trailers may well be sitting in that part.
   *
   * This still denies, and the reason says why. The name guard warns in the equivalent
   * situation because there is nothing the author can do to make a piped message
   * inspectable — but there is here. `--trailer` is an argument, so it is visible whatever
   * the message does, and adding it costs one flag. So the escape hatch is "put the
   * trailers where the guard can see them", not "switch the guard off", and a pipe is not
   * blocked: `git commit -F - --trailer ... --trailer ...` passes.
   */
  const blind = parsed.stdin || unreadable || (!sawText && !parsed.trailers.length && !parsed.signoff);
  const source = parsed.stdin ? "stdin" : unreadable ? "unreadable" : "editor";

  return {
    verdict: "deny",
    reason: blind ? "not-visible" : "missing-trailers",
    source: blind ? source : null,
    missing,
    gitDir: parsed.gitDir,
  };
}
