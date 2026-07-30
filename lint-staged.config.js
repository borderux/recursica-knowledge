const fs = require("fs");

/**
 * Prettier refuses to format a symbolic link and exits non-zero:
 *   [error] Explicitly specified pattern "..." is a symbolic link.
 *
 * Skill folders no longer link a DOCS.md in from docs/components/ — packages ship the
 * SKILL.md alone — so this filter is currently defensive rather than load-bearing.
 * It stays because adding a symlink back would otherwise break every commit, and
 * .prettierignore does not help: prettier raises the error while expanding patterns,
 * before ignore rules apply.
 *
 * Filter symlinks out and format only real files.
 */
const isRealFile = (file) => {
  try {
    return !fs.lstatSync(file).isSymbolicLink();
  } catch {
    return false;
  }
};

module.exports = {
  "*.{json,md,yml,yaml}": (files) => {
    const targets = files.filter(isRealFile);
    if (targets.length === 0) return [];
    return [
      `prettier --write ${targets.map((file) => JSON.stringify(file)).join(" ")}`,
    ];
  },
};
