// The git author line for a person, from the person's GitHub account: the account's name, and the
// private noreply address GitHub gives every account, so the person's real email address never
// appears in the repo.
//
//   node git-identity.mjs <github username>   ->   Person A <12345+person-a@users.noreply.github.com>
const login = process.argv[2];
if (!/^[A-Za-z0-9-]{1,39}$/.test(login ?? "")) { console.error("usage: git-identity.mjs <github username>"); process.exit(1); }
const token = process.env.GITHUB_TOKEN ?? process.env.BETTY_GITHUB_TOKEN ?? "";
const r = await fetch(`https://api.github.com/users/${login}`, { headers: { accept: "application/vnd.github+json", ...(token ? { authorization: `Bearer ${token}` } : {}) } });
if (!r.ok) { console.error(`No GitHub account named ${login} (GitHub answered ${r.status}).`); process.exit(1); }
const u = await r.json();
console.log(`${u.name || u.login} <${u.id}+${u.login}@users.noreply.github.com>`);
