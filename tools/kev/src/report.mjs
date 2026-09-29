// Plain and short, like Barb. Leads first. Nothing reads as a pass unless it is one.
export function toMarkdown(r, { ignoredHint = false } = {}) {
  const leads = [];
  const unsure = [];
  const notCheckable = [];
  const errors = [];
  for (const s of r.skills) {
    if (s.error) errors.push(`${s.slug}: ${s.error}`);
    for (const it of s.items) {
      if (it.status === "lead") leads.push({ s, it });
      else if (it.status === "unsure") unsure.push({ s, it });
      else if (it.status === "not-checkable") notCheckable.push({ s, it });
    }
  }
  leads.sort((a, b) => b.it.p - a.it.p);

  const out = [];
  out.push(`**Kev first pass** — ${r.entries.join(", ")}${r.mock ? " _(MOCK — not real judgments)_" : ""}`);
  out.push("");

  if (leads.length) {
    out.push(`**Leads (${leads.length})** — likely violations, not yet verified:`);
    for (const { s, it } of leads) {
      const where = it.where ?? "screen-wide (something required is missing)";
      out.push(`- \`${s.slug}\` — ${it.item} — \`${where}\` (p=${it.p})`);
    }
  } else {
    out.push("No leads.");
  }

  if (unsure.length) {
    const bySkill = {};
    for (const { s } of unsure) bySkill[s.slug] = (bySkill[s.slug] ?? 0) + 1;
    out.push("");
    out.push(`**Unsure (${unsure.length})** — Kev couldn't clear these: ` +
      Object.entries(bySkill).map(([k, n]) => `\`${k}\` ×${n}`).join(", "));
  }

  const gaps = [];
  if (notCheckable.length) gaps.push(`${notCheckable.length} items code can't decide (need a running page, or about process)`);
  const u = r.uncovered ?? {};
  if (u.unmappedImports?.length) gaps.push(`imports with no skill: ${u.unmappedImports.join(", ")}`);
  if (u.ambiguousImports?.length) gaps.push(`ambiguous imports: ${u.ambiguousImports.join(", ")}`);
  if (u.missingSkills?.length) gaps.push(`missing skills: ${u.missingSkills.join(", ")}`);
  if (!r.screenFits) gaps.push("screen too large for the missing-things check, so absence was not checked");
  const withUncovered = r.skills.filter((s) => s.uncoveredList).map((s) => s.slug);
  if (withUncovered.length) gaps.push(`skills with open "ask, do not invent" lists: ${withUncovered.join(", ")}`);
  gaps.push(...errors);
  if (gaps.length) {
    out.push("");
    out.push("**Not checked:** " + gaps.join("; ") + ".");
  }

  if (r.skipped?.length) {
    out.push("");
    out.push("**Skipped as not applying to this screen:** " + r.skipped.map((x) => `\`${x.slug}\``).join(", ") +
      ". If one of these does apply, that's a miss — say so.");
  }

  if (ignoredHint) {
    out.push("");
    out.push("I was given extra direction with the request and ignored it — I review the whole manifest.");
  }

  out.push("");
  const next = leads.length || unsure.length
    ? "Fix the leads, then run me again."
    : "Nothing flagged. Ready for full Barb.";
  out.push(`${next} This is a first pass: full Barb still has to go quiet twice before the designer sees it.`);
  out.push("");
  out.push(`_${r.skills.length} skills · ${r.files.length} files · ${r.usage.requests} engine calls` +
    ` (${r.usage.cacheHits} cached) · ~${Math.round(r.usage.input_tokens / 1000)}k input tokens · ${r.seconds}s · ${r.model}_`);
  return out.join("\n");
}
