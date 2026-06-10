#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const packageSkillsDir = path.join(__dirname, '../skills');

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

const skills = fs.readdirSync(packageSkillsDir).filter(file => {
  const fullPath = path.join(packageSkillsDir, file);
  return fs.statSync(fullPath).isDirectory() && !EXCLUDED_SKILLS.has(file);
});

console.log(`Initializing Recursica Knowledge skills in ${targetCwd}...`);

skills.forEach(skill => {
  // We want to create a relative symlink.
  // The destination folder is .agent/skills/ or .claude/skills/
  // The target is node_modules/@recursica/knowledge/skills/<skill>
  // Since .agent/skills is at <root>/.agent/skills, a relative link back to the skill is:
  // ../../node_modules/@recursica/knowledge/skills/<skill>
  // If we are initializing in the recursica-knowledge repository itself:
  // From .agent/skills, the relative link to the local skills folder is:
  // ../../skills/<skill>

  let targetPath;
  // Check if we are running in the package itself or in a project that has it installed
  const isInOwnRepo = !__dirname.includes('node_modules');

  if (isInOwnRepo) {
    targetPath = `../../skills/${skill}`;
  } else {
    targetPath = `../../node_modules/@recursica/knowledge/skills/${skill}`;
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
      const relativeDest = path.relative(targetCwd, linkPath);
      console.warn(`  ⚠️ Warning: Skill "${skill}" already exists at ${relativeDest}. Skipping.`);
      return;
    }

    try {
      // Create symlink
      fs.symlinkSync(targetPath, linkPath, 'dir');
      console.log(`  Linked ${skill} -> ${linkPath}`);
    } catch (err) {
      console.error(`  ❌ Failed to link ${skill} to ${linkPath}:`, err.message);
    }
  });
});

console.log('🎉 Knowledge symlinks initialized successfully!');
