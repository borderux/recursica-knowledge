const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '../components');
const skillsComponentsDir = path.join(__dirname, '../skills/components');

if (!fs.existsSync(componentsDir)) {
  console.error('Components directory not found!');
  process.exit(1);
}

const componentDirs = fs.readdirSync(componentsDir);

componentDirs.forEach(compDir => {
  const compPath = path.join(componentsDir, compDir);
  if (!fs.statSync(compPath).isDirectory()) return;

  const oldFile = path.join(compPath, `${compDir}.md`);
  const newFile = path.join(compPath, 'DOCS.md');

  if (fs.existsSync(oldFile)) {
    console.log(`Renaming ${oldFile} -> ${newFile}`);
    fs.renameSync(oldFile, newFile);
  }
});

// Now update symlinks
const skillDirs = fs.readdirSync(skillsComponentsDir);

function toPascalCase(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

skillDirs.forEach(skillDir => {
  const skillPath = path.join(skillsComponentsDir, skillDir);
  if (!fs.statSync(skillPath).isDirectory()) return;

  const docsLink = path.join(skillPath, 'DOCS.md');
  if (fs.existsSync(docsLink) && fs.lstatSync(docsLink).isSymbolicLink()) {
    const baseName = skillDir.replace('recursica-skill-', '');
    const pascalName = toPascalCase(baseName);
    const newTarget = `../../../components/${pascalName}/DOCS.md`;

    console.log(`Updating symlink: ${skillDir}/DOCS.md -> ${newTarget}`);
    fs.unlinkSync(docsLink);
    fs.symlinkSync(newTarget, docsLink);
  }
});

console.log('Renaming and symlink update complete!');
