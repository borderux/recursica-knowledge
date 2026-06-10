const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const skillsDir = path.join(__dirname, '../skills');
const distDir = path.join(__dirname, '../dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Read all directories under skills/, excluding internal-use skills
const EXCLUDED_SKILLS = new Set(['skill-creator']);

const skills = fs.readdirSync(skillsDir).filter(file => {
  const fullPath = path.join(skillsDir, file);
  return fs.statSync(fullPath).isDirectory() && !EXCLUDED_SKILLS.has(file);
});


console.log(`Found ${skills.length} skill(s) to package...`);

skills.forEach(skill => {
  const skillPath = path.join(skillsDir, skill);
  const zipPath = path.join(distDir, `${skill}.zip`);

  // Clean existing zip if it exists
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  console.log(`Packaging ${skill} -> dist/${skill}.zip...`);

  try {
    // Run zip command inside the skill folder to package files relative to the skill root.
    // Exclude development dependencies, OS files, and test evals.
    execSync(`zip -rq "${zipPath}" . -x "node_modules/*" -x "**/__pycache__/*" -x "**/*.pyc" -x "**/.DS_Store" -x "evals/*"`, {
      cwd: skillPath,
      stdio: 'inherit'
    });
    console.log(`✅ Packaged ${skill} successfully.`);
  } catch (error) {
    console.error(`❌ Failed to package ${skill}:`, error.message);
    process.exit(1);
  }
});

console.log('🎉 All skills built successfully!');
