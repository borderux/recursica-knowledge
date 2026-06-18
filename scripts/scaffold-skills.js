const fs = require('fs');
const path = require('path');

const uiKitJsonPath = '/Users/aaronmartlage/Documents/recursica-forge/recursica-forge-pagination/recursica_ui-kit.json';
const targetComponentsDir = path.join(__dirname, '../components');
const targetSkillsDir = path.join(__dirname, '../skills/components');
const forgeAdaptersDir = '/Users/aaronmartlage/Documents/recursica-forge/recursica-forge-pagination/src/components/adapters';

const componentGroups = {
  'accordion': ['accordion', 'accordion-item'],
  'switch': ['switch', 'switch-item', 'switch-group'],
  'timeline': ['timeline', 'timeline-bullet'],
  'segmented-control': ['segmented-control', 'segmented-control-item'],
  'menu': ['menu', 'menu-item'],
  'checkbox': ['checkbox', 'checkbox-item', 'checkbox-group'],
  'radio-button': ['radio-button', 'radio-button-item', 'radio-button-group']
};

const folderMapping = {
  'accordion': 'Accordion',
  'button': 'Button',
  'toast': 'Toast',
  'tooltip': 'Tooltip',
  'card': 'Card',
  'chip': 'Chip',
  'switch': 'Switch',
  'slider': 'Slider',
  'stepper': 'Stepper',
  'timeline': 'Timeline',
  'tabs': 'Tabs',
  'segmented-control': 'SegmentedControl',
  'avatar': 'Avatar',
  'badge': 'Badge',
  'pagination': 'Pagination',
  'label': 'Label',
  'read-only-field': 'ReadOnlyField',
  'link': 'Link',
  'assistive-element': 'AssistiveElement',
  'text-field': 'TextField',
  'date-picker': 'DatePicker',
  'textarea': 'Textarea',
  'file-input': 'FileInput',
  'file-upload': 'FileUpload',
  'number-input': 'NumberInput',
  'dropdown': 'Select',
  'autocomplete': 'Autocomplete',
  'menu': 'Menu',
  'breadcrumb': 'Breadcrumb',
  'checkbox': 'Checkbox',
  'radio-button': 'RadioButton',
  'modal': 'Dialog',
  'hover-card-popover': 'HoverCardPopover',
  'panel': 'Panel',
  'time-picker': 'TimePicker',
  'loader': 'Loader',
  'transfer-list': 'TransferList'
};

// Map of components that are parts of groups to their parent kebab-case component
const subComponentToParent = {};
Object.entries(componentGroups).forEach(([parent, children]) => {
  children.forEach(child => {
    subComponentToParent[child] = parent;
  });
});

function getTriggerDescription(kebabName, subComponents = []) {
  const listStr = subComponents.length > 0 ? ` (including ${subComponents.join(', ')})` : '';
  return `Trigger this when the developer asks to design, write, or refactor a UI layout containing the ${kebabName} component${listStr}.`;
}

function findAuditFiles(kebabName, folderName) {
  const audits = [];
  const libraries = ['carbon', 'mantine', 'material'];
  
  libraries.forEach(lib => {
    const libDir = path.join(forgeAdaptersDir, lib);
    if (!fs.existsSync(libDir)) return;
    
    // Check multiple possible naming variations for the audit files
    const possiblePaths = [
      path.join(libDir, folderName, 'audit.md'),
      path.join(libDir, folderName, `${folderName}.${lib}.audit.md`),
      path.join(libDir, folderName.charAt(0).toLowerCase() + folderName.slice(1), 'audit.md'),
      path.join(libDir, kebabName, 'audit.md')
    ];
    
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        audits.push({ library: lib, path: p });
        break;
      }
    }
  });
  
  return audits;
}

function cleanHtmlToMarkdown(html) {
  if (!html) return '';
  let md = html;
  
  // Replace guideline grid rows with clean bullet points
  // Handles multi-line matching inside row tags
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

function run() {
  if (!fs.existsSync(uiKitJsonPath)) {
    console.error(`Error: UI kit JSON not found at ${uiKitJsonPath}`);
    process.exit(1);
  }

  const uiKit = JSON.parse(fs.readFileSync(uiKitJsonPath, 'utf8'));
  const componentsList = Object.keys(uiKit['ui-kit'].components);

  console.log(`Loaded UI kit with ${componentsList.length} components.`);

  // Resolve unique target skills
  const skillsToGenerate = {};
  
  componentsList.forEach(comp => {
    const parent = subComponentToParent[comp] || comp;
    const folderName = folderMapping[parent];
    
    if (!folderName) {
      console.warn(`Warning: No folder mapping found for component/group: ${parent}`);
      return;
    }
    
    if (!skillsToGenerate[parent]) {
      skillsToGenerate[parent] = {
        kebabName: parent,
        folderName: folderName,
        subComponents: componentGroups[parent] || []
      };
    }
  });

  console.log(`Resolved ${Object.keys(skillsToGenerate).length} skills to scaffold.`);

  Object.values(skillsToGenerate).forEach(skill => {
    const packageName = `recursica-skill-${skill.kebabName}`;
    const skillDir = path.join(targetSkillsDir, packageName);
    
    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }

    const skillMdPath = path.join(skillDir, 'SKILL.md');
    
    const description = getTriggerDescription(skill.kebabName, skill.subComponents);
    const version = "0.1.0";

    // 2. Build SKILL.md body
    let existingWhenToUse = '';
    let existingWhenNotToUse = '';
    let existingBestPractices = '';
    let existingOverview = '';
    let alternateNamesList = '';

    const existingMdPath = path.join(skillDir, 'DOCS.md');
    if (fs.existsSync(existingMdPath)) {
      const existingContent = fs.readFileSync(existingMdPath, 'utf8');
      
      // Basic extraction of sections
      const overviewMatch = existingContent.match(/# [^\r\n]+[\r\n]+([\s\S]*?)(?=##|$|---)/);
      if (overviewMatch) existingOverview = cleanHtmlToMarkdown(overviewMatch[1]);

      const altNamesMatch = existingContent.match(/## Alternate Names[\r\n]+([\s\S]*?)(?=##|$|---)/);
      if (altNamesMatch) alternateNamesList = cleanHtmlToMarkdown(altNamesMatch[1]);

      const whenToUseMatch = existingContent.match(/## When to Use[\r\n]+([\s\S]*?)(?=##|$|---)/i);
      if (whenToUseMatch) existingWhenToUse = cleanHtmlToMarkdown(whenToUseMatch[1]);

      const whenNotToUseMatch = existingContent.match(/## (When Not to Use|When to avoid)[\r\n]+([\s\S]*?)(?=##|$|---)/i);
      if (whenNotToUseMatch) existingWhenNotToUse = cleanHtmlToMarkdown(whenNotToUseMatch[2]);

      const bestPracticesMatch = existingContent.match(/## Best Practices[\r\n]+([\s\S]*?)(?=##|$|---)/i);
      if (bestPracticesMatch) existingBestPractices = cleanHtmlToMarkdown(bestPracticesMatch[1]);
    }

    const audits = findAuditFiles(skill.kebabName, skill.folderName);
    let referentialLibsContent = '';
    if (audits.length > 0) {
      referentialLibsContent = audits.map(audit => {
        const libName = audit.library.charAt(0).toUpperCase() + audit.library.slice(1);
        return `- [${libName} Implementation Audit](file://${audit.path})`;
      }).join('\n');
    } else {
      referentialLibsContent = `- Carbon Design System: [Carbon ${skill.folderName} Documentation](https://carbondesignsystem.com)\n- Material UI: [MUI ${skill.folderName} Documentation](https://mui.com)`;
    }

    const skillMdContent = `---
name: ${packageName}
description: ${description}
license: MIT
metadata:
  author: hi@borderux.com
  version: ${version}
---

# ${skill.folderName} Skill

${existingOverview || `Triggered when implementing or editing the ${skill.folderName} component.`}

${alternateNamesList ? `## Alternate Names\n\n${alternateNamesList}\n\n---` : ''}

## Anatomy & Sub-components

This skill covers the following component specs defined in the UI Kit:
${(skill.subComponents.length > 0 ? skill.subComponents : [skill.kebabName]).map(sub => `- \`${sub}\``).join('\n')}

---

## When to Use

${existingWhenToUse || `- Use when presenting standard ${skill.folderName} interactions to the user.`}

---

## When Not to Use

${existingWhenNotToUse || `- Do not use when a more specific or custom component is required for the user journey.`}

---

## Best Practices

${existingBestPractices || `- Follow platform accessibility guidelines.\n- Ensure consistent padding and alignments.`}

---

## Referential Libraries & Documentation

${referentialLibsContent}
`;

    fs.writeFileSync(skillMdPath, skillMdContent, 'utf8');
    console.log(`Scaffolded skill for ${skill.folderName} under components/`);
  });
}

run();
