const fs = require('fs');

/**
 * Prettier refuses to format a symbolic link and exits non-zero:
 *   [error] Explicitly specified pattern "..." is a symbolic link.
 *
 * Component skills link their specification in from docs/components/ — for example
 * skills/components/recursica-skill-button/DOCS.md -> ../../../docs/components/Button/DOCS.md
 * so any commit touching those links would fail the pre-commit hook. Adding them to
 * .prettierignore does not help, because prettier raises the error while expanding
 * patterns, before ignore rules apply.
 *
 * Filter symlinks out and format only real files. The link targets under
 * docs/components/ are still formatted whenever they are staged directly.
 */
const isRealFile = file => {
  try {
    return !fs.lstatSync(file).isSymbolicLink();
  } catch {
    return false;
  }
};

module.exports = {
  '*.{json,md,yml,yaml}': files => {
    const targets = files.filter(isRealFile);
    if (targets.length === 0) return [];
    return [`prettier --write ${targets.map(file => JSON.stringify(file)).join(' ')}`];
  },
};
