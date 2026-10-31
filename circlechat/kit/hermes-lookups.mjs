#!/usr/bin/env node
// Every agent's Hermes settings that stop the lookups the stack's outgoing filter refuses.
// setup-agent.sh runs this for every agent, on each run.
//
//   node hermes-lookups.mjs <handle> < config.yaml   prints the config with each setting set
//
// Hermes's gateway starts on each CircleChat turn and, 30 s later, refreshes its /model picker's
// lists (gateway/run_watchers.py _model_catalog_refresh_watcher -> hermes_cli/model_catalog.py
// refresh_catalogs): the model catalog from hermes-agent.nousresearch.com (then
// raw.githubusercontent.com), OpenRouter's model list from openrouter.ai, and the Nous Portal's
// recommended models from portal.nousresearch.com. The filter refuses the three hosts on every
// turn, and an agent here never uses the picker: the model gateway picks each model.
// model_catalog.enabled: false makes refresh_catalogs return before any of the three. The two
// update checks go off too: updates.check (the passive version check) and
// plugins.auto_update_check_hours (the gateway's plugin update check; 0 turns it off).
//
// Each key is set inside the config's own block (kit/yaml-keys.mjs), and every other key stays. The
// changes go to stderr, by key name only. Exit 1 when the config has a shape that cannot be edited
// safely, with nothing on stdout, so the caller writes nothing. 2 on usage.
import fs from "node:fs";
import { setKeys } from "./yaml-keys.mjs";

export const SETTINGS = [
  [["model_catalog", "enabled"], "false"],
  [["updates", "check"], "false"],
  [["plugins", "auto_update_check_hours"], "0"],
];

export function setLookups(text) {
  const { text: out, changed } = setKeys(text, SETTINGS);
  return { text: out, changed };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [handle] = process.argv.slice(2);
  if (!handle) {
    console.error("usage: hermes-lookups.mjs <handle> < config.yaml");
    process.exit(2);
  }
  try {
    const { text, changed } = setLookups(fs.readFileSync(0, "utf8"));
    for (const key of changed) console.error(`${handle}'s config.yaml: set ${key}`);
    process.stdout.write(text);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
