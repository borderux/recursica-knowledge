#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const packageSkillsDir = path.join(__dirname, '../skills');
const packageComponentsDir = path.join(__dirname, '../components');

if (!fs.existsSync(packageSkillsDir)) {
  console.error('❌ Error: Skills directory not found in the package.');
  process.exit(1);
}

const targetCwd = process.env.INIT_CWD || process.cwd();
const agentSkillsDir = path.join(targetCwd, '.agent/skills');
const claudeSkillsDir = path.join(targetCwd, '.claude/skills');

// Ensure directories exist
fs.mkdirSync(agentSkillsDir, { recursive: true });
fs.mkdirSync(claudeSkillsDir, { recursive: true });

// Read skills inside the package, excluding internal-use skills
const EXCLUDED_SKILLS = new Set(['skill-creator']);
const targets = [];

if (fs.existsSync(packageSkillsDir)) {
  fs.readdirSync(packageSkillsDir).forEach(file => {
    const fullPath = path.join(packageSkillsDir, file);
    if (fs.statSync(fullPath).isDirectory() && !EXCLUDED_SKILLS.has(file)) {
      if (file === 'components') {
        // Scan the components subfolder
        fs.readdirSync(fullPath).forEach(subFile => {
          const subPath = path.join(fullPath, subFile);
          if (fs.statSync(subPath).isDirectory()) {
            targets.push({ type: 'skill', dirName: subFile, relativeDir: 'skills/components' });
          }
        });
      } else {
        targets.push({ type: 'skill', dirName: file, relativeDir: 'skills' });
      }
    }
  });
}



console.log(`Initializing Recursica Knowledge skills in ${targetCwd}...`);

targets.forEach(target => {
  const skill = target.linkName || target.dirName;
  let targetPath;
  const isInOwnRepo = !__dirname.includes('node_modules');

  if (isInOwnRepo) {
    targetPath = `../../${target.relativeDir}/${target.dirName}`;
  } else {
    targetPath = `../../node_modules/@recursica/knowledge/${target.relativeDir}/${target.dirName}`;
  }

  const linkPaths = [
    path.join(agentSkillsDir, skill),
    path.join(claudeSkillsDir, skill)
  ];
  


  linkPaths.forEach(linkPath => {
    let exists = false;
    try {
      fs.lstatSync(linkPath);
      exists = true;
    } catch (e) {
      // File/symlink does not exist
    }

    if (exists) {
      return;
    }

    try {
      fs.symlinkSync(targetPath, linkPath, 'dir');
      console.log(`  Linked ${skill} -> ${linkPath}`);
    } catch (err) {
      console.error(`  ❌ Failed to link ${skill} to ${linkPath}:`, err.message);
    }
  });
});

console.log('🎉 Knowledge symlinks initialized successfully!');
