const fs = require('fs');
const path = require('path');

const srcDocsDir = '/Users/aaronmartlage/Documents/recursica.com/content/knowledge/docs/components';
const targetSkillsDir = path.join(__dirname, '../skills/components');

const recursicaDocsMapping = {
  'tabs': 'recursica-skill-tabs',
  'dropdown': 'recursica-skill-dropdown',
  'pagination': 'recursica-skill-pagination',
  'tooltip': 'recursica-skill-tooltip',
  'radio': 'recursica-skill-radio-button',
  'card': 'recursica-skill-card',
  'panel': 'recursica-skill-panel',
  'segmented-control': 'recursica-skill-segmented-control',
  'time-picker': 'recursica-skill-time-picker',
  'accordion': 'recursica-skill-accordion',
  'toast': 'recursica-skill-toast',
  'chip': 'recursica-skill-chip',
  'text-area': 'recursica-skill-textarea',
  'hover-card': 'recursica-skill-hover-card-popover',
  'checkbox': 'recursica-skill-checkbox',
  'read-only-field': 'recursica-skill-read-only-field',
  'slider': 'recursica-skill-slider',
  'stepper': 'recursica-skill-stepper',
  'transfer-list': 'recursica-skill-transfer-list',
  'number-input': 'recursica-skill-number-input',
  'file-input': 'recursica-skill-file-input',
  'button': 'recursica-skill-button',
  'link': 'recursica-skill-link',
  'date-picker': 'recursica-skill-date-picker',
  'loader': 'recursica-skill-loader',
  'file-upload': 'recursica-skill-file-upload',
  'menu': 'recursica-skill-menu',
  'avatar': 'recursica-skill-avatar',
  'switch': 'recursica-skill-switch',
  'text-field': 'recursica-skill-text-field',
  'breadcrumb': 'recursica-skill-breadcrumb',
  'modal': 'recursica-skill-modal',
  'timeline': 'recursica-skill-timeline',
  'badge': 'recursica-skill-badge'
};

function cleanHtmlToMarkdown(html) {
  if (!html) return '';
  let md = html;
  
  // Replace guideline grid rows with clean bullet points
  md = md.replace(/<div class="rec-guideline-row">[\s\S]*?<div class="rec-guideline-label">([\s\S]*?)<\/div>[\s\S]*?<div class="rec-guideline-desc">([\s\S]*?)<\/div>[\s\S]*?<\/div>/g, '- **$1**: $2');
  
  // Remove formatting/layout container tags
  md = md.replace(/<div[^>]*>/g, '');
  md = md.replace(/<\/div>/g, '');
  
  // Strip JSX component instances
  md = md.replace(/<ComponentPreview[^>]*\/>/g, '');
  md = md.replace(/<Specs[^>]*\/>/g, '');
  md = md.replace(/<Anatomy[^>]*\/>/g, '');
  
  // Clean up excessive whitespace/newlines
  md = md.replace(/\r/g, '');
  md = md.replace(/\n{3,}/g, '\n\n');
  
  return md.trim();
}

function replaceRelativeAssetPaths(content, srcComponentName) {
  const rawUrlPrefix = `https://raw.githubusercontent.com/borderux/recursica.com/main/content/knowledge/docs/components/${srcComponentName}/assets/`;
  return content.replace(/(?:\.\/)?assets\/([a-zA-Z0-9_\-\.]+)/g, `${rawUrlPrefix}$1`);
}

function run() {
  Object.entries(recursicaDocsMapping).forEach(([srcName, destFolder]) => {
    const srcDocPath = path.join(srcDocsDir, srcName, 'index.md');
    const targetFolder = path.join(targetSkillsDir, destFolder);
    const targetDocPath = path.join(targetFolder, 'DOCS.md');
    
    if (fs.existsSync(srcDocPath)) {
      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }
      
      // Read, clean HTML, rewrite asset paths, and write MD file
      const rawContent = fs.readFileSync(srcDocPath, 'utf8');
      const cleanContent = cleanHtmlToMarkdown(rawContent);
      const contentWithAbsoluteAssets = replaceRelativeAssetPaths(cleanContent, srcName);
      
      // Inject skill metadata into DOCS frontmatter
      let contentWithMeta = contentWithAbsoluteAssets;
      const frontmatterMatch = contentWithAbsoluteAssets.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
      if (frontmatterMatch) {
        const metadataBlock = `\nskill:\n  name: ${destFolder}\n  path: skills/components/${destFolder}\n  repository: https://github.com/borderux/recursica-knowledge`;
        contentWithMeta = `---\n${frontmatterMatch[1].trim()}\n${metadataBlock.trim()}\n---` + contentWithAbsoluteAssets.slice(frontmatterMatch[0].length);
      }
      
      fs.writeFileSync(targetDocPath, contentWithMeta, 'utf8');
      console.log(`Copied, cleaned, and asset-rewritten documentation from ${srcName}/index.md to skills/${destFolder}/DOCS.md`);
      
      // Clean up any local assets folder to ensure we don't commit static images
      const targetAssetsFolder = path.join(targetFolder, 'assets');
      if (fs.existsSync(targetAssetsFolder)) {
        fs.rmSync(targetAssetsFolder, { recursive: true, force: true });
        console.log(`  Removed local assets folder from skills/${destFolder}`);
      }
    } else {
      console.warn(`Warning: Source documentation not found for skills/${destFolder} at ${srcDocPath}`);
    }
  });
}

run();
