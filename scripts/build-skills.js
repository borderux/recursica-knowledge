const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const skillsDir = path.join(__dirname, '../skills');
const componentsDir = path.join(__dirname, '../components');
const distDir = path.join(__dirname, '../dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Read all directories under skills/, excluding internal-use skills
const EXCLUDED_SKILLS = new Set(['skill-creator']);
const targets = [];

if (fs.existsSync(skillsDir)) {
  fs.readdirSync(skillsDir).forEach(file => {
    const fullPath = path.join(skillsDir, file);
    if (fs.statSync(fullPath).isDirectory() && !EXCLUDED_SKILLS.has(file)) {
      if (file === 'components') {
        // Read component skills recursively
        fs.readdirSync(fullPath).forEach(subFile => {
          const subPath = path.join(fullPath, subFile);
          if (fs.statSync(subPath).isDirectory()) {
            targets.push({ path: subPath, name: subFile });
          }
        });
      } else {
        targets.push({ path: fullPath, name: file });
      }
    }
  });
}

console.log(`Found ${targets.length} skill(s) to package...`);

targets.forEach(target => {
  const zipPath = path.join(distDir, `${target.name}.zip`);

  // Clean existing zip if it exists
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  console.log(`Packaging ${target.name} -> dist/${target.name}.zip...`);

  try {
    // Run zip command inside the skill folder to package files relative to the skill root.
    // Exclude development dependencies, OS files, test evals, DOCS.md, and assets folder.
    execSync(`zip -rq "${zipPath}" . -x "node_modules/*" -x "**/__pycache__/*" -x "**/*.pyc" -x "**/.DS_Store" -x "evals/*" -x "DOCS.md" -x "assets/*"`, {
      cwd: target.path,
      stdio: 'inherit'
    });
    console.log(`✅ Packaged ${target.name} successfully.`);
  } catch (error) {
    console.error(`❌ Failed to package ${target.name}:`, error.message);
    process.exit(1);
  }
});

console.log('🎉 All skills built successfully!');
