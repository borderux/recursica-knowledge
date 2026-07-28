const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const skillsDir = path.join(__dirname, '../skills');
const distDir = path.join(__dirname, '../dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Read all directories under skills/, including nested category folders such as
// skills/components/ and skills/design-rules/. A directory holding a SKILL.md is a
// skill; any other directory is treated as a category folder and recursed into.
const EXCLUDED_SKILLS = new Set(['skill-creator']);
const skills = [];

function findSkills(dir, relativePath = '') {
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const relPath = path.join(relativePath, item);

    if (!fs.statSync(fullPath).isDirectory()) return;
    if (EXCLUDED_SKILLS.has(item)) return;

    if (fs.existsSync(path.join(fullPath, 'SKILL.md'))) {
      skills.push({
        name: item,
        path: fullPath,
        relPath: relPath
      });
    } else {
      findSkills(fullPath, relPath);
    }
  });
}

findSkills(skillsDir);

console.log(`Found ${skills.length} skill(s) to package...`);

skills.forEach(skill => {
  const zipName = skill.name;
  const zipPath = path.join(distDir, `${zipName}.zip`);

  // Skip if directory is empty
  if (fs.readdirSync(skill.path).length === 0) {
    console.warn(`⚠️ Skipping empty skill directory: ${skill.name}`);
    return;
  }

  // Clean existing zip if it exists
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  console.log(`Packaging ${skill.name} -> dist/${zipName}.zip...`);

  try {
    // Run zip command inside the skill folder to package files relative to the skill root.
    // Exclude development dependencies, OS files, and test evals.
    execSync(`zip -rq "${zipPath}" . -x "node_modules/*" -x "**/__pycache__/*" -x "**/*.pyc" -x "**/.DS_Store" -x "evals/*"`, {
      cwd: skill.path,
      stdio: 'inherit'
    });
    console.log(`✅ Packaged ${skill.name} successfully.`);
  } catch (error) {
    console.error(`❌ Failed to package ${skill.name}:`, error.message);
    process.exit(1);
  }
});

console.log('🎉 All skills built successfully!');
