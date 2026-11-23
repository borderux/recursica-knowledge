// Ollama on a Linux helper computer: the pinned release, and what setup-ollama.sh needs from
// site.json. A helper is a node without "control". On a Mac control computer, the kit runs Ollama as
// a LaunchDaemon instead (kit/lib.sh mac_services).
//
// The release is pinned by version and by the SHA-256 of each archive. setup-ollama.sh refuses an
// archive with any other hash. To move to a newer release, change the version and both hashes here,
// from the release's sha256sum.txt. Version 0.40.15 supports NVIDIA compute capability 12.0, the
// GeForce RTX 50 series (Blackwell), with driver 550 or newer.
export const OLLAMA_RELEASE = {
  version: "0.40.15",
  archives: {
    amd64: { url: "https://github.com/ollama/ollama/releases/download/v0.40.15/ollama-linux-amd64.tar.zst", sha256: "628c018404a4206493efd38e46251c154ede5141b8b8dc85c659b3b027c47379" },
    arm64: { url: "https://github.com/ollama/ollama/releases/download/v0.40.15/ollama-linux-arm64.tar.zst", sha256: "7f699ead5cdb4ae1ed89b888b148a238af188708800871e1889ab9dcee95f247" },
  },
};

// An Ollama server's own settings in site.json, and the variable Ollama reads each one from. The
// kit's Ollama service runs with each setting the server sets, on a Mac control computer and on a
// Linux helper. A setting left out keeps Ollama's default.
//   context_length     OLLAMA_CONTEXT_LENGTH     the tokens each request may hold
//   parallel           OLLAMA_NUM_PARALLEL       the requests each model answers at once
//   keep_alive         OLLAMA_KEEP_ALIVE         how long a model stays loaded: "-1" keeps each model loaded
//   kv_cache_type      OLLAMA_KV_CACHE_TYPE      the working memory's number format: "f16", or "q8_0" or "q4_0" to compress it
//   max_loaded_models  OLLAMA_MAX_LOADED_MODELS  the models loaded at one time
export const OLLAMA_SETTINGS = {
  context_length: "OLLAMA_CONTEXT_LENGTH",
  parallel: "OLLAMA_NUM_PARALLEL",
  keep_alive: "OLLAMA_KEEP_ALIVE",
  kv_cache_type: "OLLAMA_KV_CACHE_TYPE",
  max_loaded_models: "OLLAMA_MAX_LOADED_MODELS",
};
export const KV_CACHE_TYPES = ["f16", "q8_0", "q4_0"];
const KEEP_ALIVE = /^(-1|\d+|\d+(ms|s|m|h)|(\d+h)?(\d+m)?(\d+s)?)$/;

/** Each setting the server sets, as NAME=value. A compressed working memory needs flash attention, so the list then turns flash attention on. */
export function ollamaEnv(sv) {
  const env = Object.entries(OLLAMA_SETTINGS).filter(([k]) => sv[k] !== undefined).map(([k, name]) => `${name}=${sv[k]}`);
  if (sv.kv_cache_type !== undefined && sv.kv_cache_type !== "f16") env.push("OLLAMA_FLASH_ATTENTION=1");
  return env;
}

/** The node runs an Ollama server the kit installs: a Linux helper with a server of kind ollama. */
export const kitRunsLinuxOllama = (n) => n.os === "linux" && !n.control && (n.servers ?? []).some((sv) => sv.kind === "ollama");

/** The address a Linux helper's Ollama server listens on: its listen setting, or the computer's address. */
export const ollamaListen = (n, sv) => sv.listen ?? n.address;

/** A trial server: a Linux helper's Ollama server on 127.0.0.1, which the control computer's gateway cannot reach. */
export const trialServer = (n, sv) => kitRunsLinuxOllama(n) && sv.kind === "ollama" && ollamaListen(n, sv) === "127.0.0.1";

/** The config check's problems with one Ollama server's settings. */
export function ollamaSettingErrors(n, sv, where) {
  const set = [...Object.keys(OLLAMA_SETTINGS), "listen"].filter((k) => sv[k] !== undefined);
  if (set.length && sv.kind !== "ollama") return [`${where}: ${set.join(", ")} ${set.length > 1 ? "are Ollama settings" : "is an Ollama setting"}, and this server is ${sv.kind}`];
  const errs = [];
  for (const k of ["context_length", "parallel", "max_loaded_models"]) if (sv[k] !== undefined && !(Number.isInteger(sv[k]) && sv[k] > 0)) errs.push(`${where}: ${k} must be a whole number above 0`);
  if (sv.keep_alive !== undefined && !(["string", "number"].includes(typeof sv.keep_alive) && String(sv.keep_alive) !== "" && KEEP_ALIVE.test(String(sv.keep_alive)))) {
    errs.push(`${where}: keep_alive must be "-1", to keep each model loaded, or a time such as "30m" or 300 (seconds)`);
  }
  if (sv.kv_cache_type !== undefined && !KV_CACHE_TYPES.includes(sv.kv_cache_type)) errs.push(`${where}: kv_cache_type must be ${KV_CACHE_TYPES.map((t) => `"${t}"`).join(", ")}`);
  if (sv.listen !== undefined) {
    if (!kitRunsLinuxOllama(n)) errs.push(`${where}: listen is for an Ollama server on a Linux helper computer. The kit's Ollama on a Mac control computer listens on 127.0.0.1`);
    else if (sv.listen !== "127.0.0.1" && sv.listen !== n.address) errs.push(`${where}: listen must be "127.0.0.1", for a trial, or the computer's address, ${n.address}, so the gateway reaches the server`);
  }
  return errs;
}

/** The config check's problems with a node's Ollama servers as a whole. */
export function linuxOllamaErrors(n) {
  if (!kitRunsLinuxOllama(n)) return [];
  const errs = [];
  if ((n.servers ?? []).filter((sv) => sv.kind === "ollama").length > 1) errs.push(`node ${n.name}: the kit runs one Ollama server on a Linux helper computer. List each model under that one server`);
  const sv = n.servers.find((x) => x.kind === "ollama");
  const listen = ollamaListen(n, sv);
  if (listen !== "127.0.0.1" && !/^\d{1,3}(\.\d{1,3}){3}$/.test(String(listen ?? ""))) errs.push(`node ${n.name}: the kit's Ollama server listens on the computer's address, so the address must be an IPv4 address, such as 100.64.0.5. Or set the server's listen to "127.0.0.1" for a trial`);
  return errs;
}

/** What setup-ollama.sh needs, in the node's services/<node>.json. Null when the kit runs no Ollama on the node. */
export function linuxOllamaSpec(n) {
  if (!kitRunsLinuxOllama(n)) return null;
  const sv = n.servers.find((x) => x.kind === "ollama");
  return { ...OLLAMA_RELEASE, listen: ollamaListen(n, sv), port: sv.port, env: ollamaEnv(sv), models: (sv.models ?? []).map((m) => m.model) };
}
