// The settings that protect-repo.sh gives each repo: the two rulesets, and the dependabot.yml for
// the package systems in the repo. Only node's own modules.
//
//   node protect-repo.mjs ruleset <name>   the ruleset's JSON, for GitHub's rulesets API
//   node protect-repo.mjs dependabot       the repo's file paths on stdin, the dependabot.yml on
//                                          stdout (nothing for a repo with no package system)

// "Protect main": no deletion and no force push on the default branch, and each change arrives
// in a pull request. "Only admins merge": nobody updates the default branch, except a repo admin
// who merges a pull request. Actor 5 is GitHub's Repository admin role. ~DEFAULT_BRANCH follows the
// default branch, even after a rename.
const DEFAULT_BRANCH = { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } };
export const RULESETS = {
  "Protect main": {
    name: "Protect main",
    target: "branch",
    enforcement: "active",
    conditions: DEFAULT_BRANCH,
    rules: [
      { type: "deletion" },
      { type: "non_fast_forward" },
      { type: "pull_request", parameters: {
        allowed_merge_methods: ["merge", "squash", "rebase"],
        dismiss_stale_reviews_on_push: false,
        require_code_owner_review: false,
        require_last_push_approval: false,
        required_approving_review_count: 0,
        required_review_thread_resolution: false,
      } },
    ],
    bypass_actors: [],
  },
  "Only admins merge": {
    name: "Only admins merge",
    target: "branch",
    enforcement: "active",
    conditions: DEFAULT_BRANCH,
    rules: [{ type: "update" }],
    bypass_actors: [{ actor_id: 5, actor_type: "RepositoryRole", bypass_mode: "pull_request" }],
  },
};

// Each package system Dependabot reads, and the files that mark a folder that uses the system. A folder
// inside node_modules, vendor or a hidden folder other than .github doesn't count.
const MARKERS = [
  ["npm", /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml)$/],
  ["pip", /(^|\/)(requirements[^/]*\.txt|pyproject\.toml|Pipfile|setup\.py)$/],
  ["gomod", /(^|\/)go\.mod$/],
  ["cargo", /(^|\/)Cargo\.toml$/],
  ["bundler", /(^|\/)Gemfile$/],
  ["composer", /(^|\/)composer\.json$/],
  ["maven", /(^|\/)pom\.xml$/],
  ["gradle", /(^|\/)build\.gradle(\.kts)?$/],
  ["docker", /(^|\/)Dockerfile$/],
];
const SKIP = /(^|\/)(node_modules|vendor)\/|(^|\/)\.(?!github\/)[^/]+\//;

export function ecosystems(paths) {
  const out = new Map();
  const add = (eco, dir) => { if (!out.has(eco)) out.set(eco, new Set()); out.get(eco).add(dir); };
  const npmDirs = new Set(), pkgDirs = new Set();
  for (const p of paths.map((x) => String(x).trim()).filter(Boolean)) {
    if (SKIP.test(p)) continue;
    const dir = p.includes("/") ? `/${p.slice(0, p.lastIndexOf("/"))}` : "/";
    if (/^\.github\/workflows\/[^/]+\.ya?ml$/.test(p)) add("github-actions", "/");
    if (/(^|\/)package\.json$/.test(p)) pkgDirs.add(dir);
    for (const [eco, re] of MARKERS) if (re.test(p)) (eco === "npm" ? npmDirs.add(dir) : add(eco, dir));
  }
  // npm: each folder with a lock file. A repo with package.json files and no lock file gets each
  // package.json folder instead.
  for (const d of npmDirs.size ? npmDirs : pkgDirs) add("npm", d);
  return [...out].map(([ecosystem, dirs]) => ({ ecosystem, directories: [...dirs].sort() })).sort((a, b) => a.ecosystem.localeCompare(b.ecosystem));
}

// Daily version updates, with a 7-day cooldown, and one pull request for each package system.
// Security updates skip the cooldown.
export function dependabotYaml(list) {
  if (!list.length) return "";
  const lines = [
    "# Dependabot version updates: daily, with a 7-day cooldown, one pull request per package system.",
    "# Security updates skip the cooldown.",
    "version: 2",
    "updates:",
  ];
  for (const { ecosystem, directories } of list) {
    lines.push(`  - package-ecosystem: ${ecosystem}`);
    if (directories.length === 1) lines.push(`    directory: "${directories[0]}"`);
    else { lines.push("    directories:"); for (const d of directories) lines.push(`      - "${d}"`); }
    lines.push("    schedule:", "      interval: daily", "    cooldown:", "      default-days: 7",
      "    groups:", `      ${ecosystem}:`, '        patterns: ["*"]');
  }
  return lines.join("\n") + "\n";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, name] = process.argv.slice(2);
  if (cmd === "ruleset" && RULESETS[name]) process.stdout.write(JSON.stringify(RULESETS[name]));
  else if (cmd === "dependabot") {
    let input = "";
    for await (const c of process.stdin) input += c;
    process.stdout.write(dependabotYaml(ecosystems(input.split("\n"))));
  } else { console.error("usage: protect-repo.mjs ruleset <name> | dependabot"); process.exit(2); }
}
