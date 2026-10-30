// List the starter repos for a new project: each borderux repo tagged recursica-starter that this
// token can see. With no token, only the public starters show; Border UX's own token also sees
// the private ones.
//
//   node starters.mjs [owner]        (owner defaults to borderux; GITHUB_TOKEN is optional)
const owner = process.argv[2] ?? "borderux";
const token = process.env.GITHUB_TOKEN ?? process.env.BETTY_GITHUB_TOKEN ?? "";
const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(`topic:recursica-starter org:${owner}`)}&sort=updated&per_page=50`;
const r = await fetch(url, { headers: { accept: "application/vnd.github+json", ...(token ? { authorization: `Bearer ${token}` } : {}) } });
if (!r.ok) { console.error(`GitHub answered ${r.status}`); process.exit(1); }
const items = (await r.json()).items ?? [];
if (!items.length) { console.log(`No repos tagged recursica-starter in ${owner} are visible.`); process.exit(0); }
items.forEach((x, i) => console.log(`${i + 1}. ${x.full_name}${x.private ? " (private)" : ""}: ${x.description ?? "no description"}\n   ${x.html_url}`));
