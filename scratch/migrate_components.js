const fs = require('fs');
const path = require('path');

const skillsComponentsDir = path.join(__dirname, '../skills/components');
const componentsDir = path.join(__dirname, '../components');

if (!fs.existsSync(componentsDir)) {
  fs.mkdirSync(componentsDir, { recursive: true });
}

function toPascalCase(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

const skillDirs = fs.readdirSync(skillsComponentsDir);

skillDirs.forEach(skillDir => {
  const skillPath = path.join(skillsComponentsDir, skillDir);
  if (!fs.statSync(skillPath).isDirectory()) return;

  const docsPath = path.join(skillPath, 'DOCS.md');
  if (!fs.existsSync(docsPath)) {
    console.log(`Skipping ${skillDir} (no DOCS.md found)`);
    return;
  }

  // Extract base name: recursica-skill-accordion -> accordion
  const baseName = skillDir.replace('recursica-skill-', '');
  const pascalName = toPascalCase(baseName);

  const targetDir = path.join(componentsDir, pascalName);
  const targetFile = path.join(targetDir, `${pascalName}.md`);

  console.log(`Moving ${skillDir}/DOCS.md -> components/${pascalName}/${pascalName}.md`);

  // Create target directory
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Move the file
  fs.renameSync(docsPath, targetFile);

  // Create the symlink
  // Relative path from skills/components/recursica-skill-name/DOCS.md 
  // to components/PascalName/PascalName.md is ../../../components/PascalName/PascalName.md
  const linkTarget = `../../../components/${pascalName}/${pascalName}.md`;
  
  try {
    fs.symlinkSync(linkTarget, docsPath);
    console.log(`  ✅ Created symlink: ${docsPath} -> ${linkTarget}`);
  } catch (err) {
    console.error(`  ❌ Failed to create symlink for ${skillDir}:`, err.message);
  }
});

console.log('Migration complete!');
