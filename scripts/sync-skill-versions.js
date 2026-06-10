/**
 * @file sync-skill-versions.js
 * @description Synchronizes metadata (name, version, description, license, and author) 
 * from each skill's package.json file into the corresponding SKILL.md YAML frontmatter.
 * 
 * This script runs automatically after "changeset version" is executed.
 * It ensures that the package.json is the single source of truth for all metadata.
 * 
 * Usage: node scripts/sync-skill-versions.js
 */

const fs = require('fs');
const path = require('path');

const skillsDir = path.join(__dirname, '../skills');
const templateDir = path.join(__dirname, '../template');

const targets = [];

// Add the template folder itself as a target to keep it synced
if (fs.existsSync(templateDir)) {
  targets.push({ dir: templateDir, name: 'template' });
}

// Add all active skill directories
if (fs.existsSync(skillsDir)) {
  const dirs = fs.readdirSync(skillsDir);
  dirs.forEach(dir => {
    const dirPath = path.join(skillsDir, dir);
    if (fs.statSync(dirPath).isDirectory()) {
      targets.push({ dir: dirPath, name: dir });
    }
  });
}

targets.forEach(({ dir, name }) => {
  const pkgPath = path.join(dir, 'package.json');
  const skillMdPath = path.join(dir, 'SKILL.md');

  if (fs.existsSync(pkgPath) && fs.existsSync(skillMdPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    
    // Extract values from package.json
    const nameVal = pkg.name || '';
    const version = pkg.version || '0.1.0';
    const description = pkg.description || '';
    const license = pkg.license || '';
    const author = typeof pkg.author === 'object' ? pkg.author.name : (pkg.author || '');

    let content = fs.readFileSync(skillMdPath, 'utf8');

    // Extract frontmatter block between the first two "---" lines
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (frontmatterMatch) {
      let frontmatter = frontmatterMatch[1];
      const originalFrontmatter = frontmatter;

      // 1. Sync name
      if (nameVal) {
        const nameMatch = frontmatter.match(/(name:\s*)([^\r\n]+)/);
        if (nameMatch) {
          frontmatter = frontmatter.replace(/(name:\s*)([^\r\n]+)/, `$1${nameVal}`);
        } else {
          frontmatter = `name: ${nameVal}\n` + frontmatter;
        }
      }

      // 2. Sync description
      if (description) {
        const descMatch = frontmatter.match(/(description:\s*)([^\r\n]+)/);
        if (descMatch) {
          frontmatter = frontmatter.replace(/(description:\s*)([^\r\n]+)/, `$1${description}`);
        } else {
          frontmatter = frontmatter.trimEnd() + `\ndescription: ${description}`;
        }
      }

      // 3. Sync license
      if (license) {
        const licMatch = frontmatter.match(/(license:\s*)([^\r\n]+)/);
        if (licMatch) {
          frontmatter = frontmatter.replace(/(license:\s*)([^\r\n]+)/, `$1${license}`);
        } else {
          frontmatter = frontmatter.trimEnd() + `\nlicense: ${license}`;
        }
      }

      // 4. Sync metadata block (author & version)
      const metadataMatch = frontmatter.match(/metadata:\s*\r?\n([\s\S]*?)(?=\r?\n[^\s]|$)/);
      if (metadataMatch) {
        let metadata = metadataMatch[1];
        const originalMetadata = metadata;

        // Sync author under metadata
        if (author) {
          const authorMatch = metadata.match(/(author:\s*)([^\r\n]+)/);
          if (authorMatch) {
            metadata = metadata.replace(/(author:\s*)([^\r\n]+)/, `$1${author}`);
          } else {
            const indent = metadata.match(/^\s+/)?.[0] || '  ';
            metadata = metadata.trimEnd() + `\n${indent}author: ${author}\n`;
          }
        }

        // Sync version under metadata
        const versionMatch = metadata.match(/(version:\s*)([^\r\n]+)/);
        if (versionMatch) {
          metadata = metadata.replace(/(version:\s*)([^\r\n]+)/, `$1${version}`);
        } else {
          const indent = metadata.match(/^\s+/)?.[0] || '  ';
          metadata = metadata.trimEnd() + `\n${indent}version: ${version}\n`;
        }

        if (metadata !== originalMetadata) {
          frontmatter = frontmatter.replace(metadataMatch[1], metadata);
        }
      } else {
        // Create metadata block if it doesn't exist
        let metadataBlock = `\nmetadata:\n  version: ${version}`;
        if (author) {
          metadataBlock += `\n  author: ${author}`;
        }
        frontmatter = frontmatter.trimEnd() + metadataBlock;
      }

      // If frontmatter changed, rewrite the SKILL.md file
      if (frontmatter !== originalFrontmatter) {
        content = content.replace(/^---\r?\n([\s\S]*?)\r?\n---/, `---\n${frontmatter.trim()}\n---`);
        fs.writeFileSync(skillMdPath, content, 'utf8');
        console.log(`Updated metadata (name, version, description, license, author) of skill "${name}" in SKILL.md`);
      }
    }
  }
});
