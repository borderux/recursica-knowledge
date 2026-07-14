const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const skillsDir = path.join(__dirname, '../skills');
const distDir = path.join(__dirname, '../dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Read all directories under skills/, including nested ones like skills/components/
const EXCLUDED_SKILLS = new Set(['skill-creator']);
const skills = [];

function findSkills(dir, relativePath = '') {
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const relPath = path.join(relativePath, item);
    
    if (fs.statSync(fullPath).isDirectory()) {
      if (item === 'components') {
        findSkills(fullPath, relPath);
      } else if (!EXCLUDED_SKILLS.has(item)) {
        skills.push({
          name: item,
          path: fullPath,
          relPath: relPath
        });
      }
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
