#!/usr/bin/env npx tsx
// Automated version bump script for PeacePad
// Usage: npx tsx scripts/bump-version.ts <major|minor|patch> "<change description>"
// Example: npx tsx scripts/bump-version.ts patch "Fixed AI integration bug"

import fs from 'fs';
import path from 'path';

const CHANGELOG_PATH = path.join(process.cwd(), 'client/src/components/WhatsNewModal.tsx');

type ChangeType = 'feature' | 'improvement' | 'bugfix' | 'announcement';
type BumpType = 'major' | 'minor' | 'patch';

interface Change {
  type: ChangeType;
  title: string;
  description: string;
}

interface VersionEntry {
  version: string;
  date: string;
  changes: Change[];
}

function getCurrentDate(): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

function bumpVersion(currentVersion: string, bumpType: BumpType): string {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid bump type: ${bumpType}`);
  }
}

function inferChangeType(description: string): ChangeType {
  const lower = description.toLowerCase();
  
  if (lower.includes('fix') || lower.includes('bug') || lower.includes('issue')) {
    return 'bugfix';
  }
  
  if (lower.includes('new') || lower.includes('add') || lower.includes('feature')) {
    return 'feature';
  }
  
  if (lower.includes('improve') || lower.includes('enhance') || lower.includes('update')) {
    return 'improvement';
  }
  
  return 'bugfix'; // Default to bugfix
}

function extractCurrentVersion(content: string): string {
  const match = content.match(/version:\s*"(\d+\.\d+\.\d+)"/);
  if (!match) {
    throw new Error('Could not find current version in changelog');
  }
  return match[1];
}

function addChangelogEntry(
  content: string,
  newVersion: string,
  date: string,
  changes: Change[]
): string {
  // Find the changelog array
  const arrayStart = content.indexOf('const changelog: ChangelogEntry[] = [');
  if (arrayStart === -1) {
    throw new Error('Could not find changelog array in file');
  }
  
  // Build new entry
  const changesStr = changes.map(change => `      {
        type: "${change.type}",
        title: "${change.title}",
        description: "${change.description}",
      }`).join(',\n');
  
  const newEntry = `  {
    version: "${newVersion}",
    date: "${date}",
    changes: [
${changesStr}
    ],
  },\n  `;
  
  // Insert after the opening bracket
  const insertPoint = content.indexOf('[', arrayStart) + 1;
  const before = content.substring(0, insertPoint);
  const after = content.substring(insertPoint);
  
  return before + '\n' + newEntry + after;
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: npx tsx scripts/bump-version.ts <major|minor|patch> "<change description>" [<additional changes>...]');
    console.error('');
    console.error('Examples:');
    console.error('  npx tsx scripts/bump-version.ts patch "Fixed AI integration bug"');
    console.error('  npx tsx scripts/bump-version.ts minor "Added new feature" "Improved UI"');
    process.exit(1);
  }
  
  const bumpType = args[0] as BumpType;
  const changeDescriptions = args.slice(1);
  
  if (!['major', 'minor', 'patch'].includes(bumpType)) {
    console.error('Error: Bump type must be major, minor, or patch');
    process.exit(1);
  }
  
  // Read changelog file
  let content: string;
  try {
    content = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
  } catch (error) {
    console.error(`Error reading changelog: ${error}`);
    process.exit(1);
  }
  
  // Extract current version
  const currentVersion = extractCurrentVersion(content);
  const newVersion = bumpVersion(currentVersion, bumpType);
  const date = getCurrentDate();
  
  // Build changes array
  const changes: Change[] = changeDescriptions.map(desc => ({
    type: inferChangeType(desc),
    title: desc.split('.')[0].trim(), // First sentence as title
    description: desc,
  }));
  
  console.log(`\n🎯 Version Bump: ${currentVersion} → ${newVersion}`);
  console.log(`📅 Date: ${date}`);
  console.log(`📝 Changes:`);
  changes.forEach((change, i) => {
    console.log(`  ${i + 1}. [${change.type}] ${change.title}`);
  });
  console.log('');
  
  // Add new entry
  const newContent = addChangelogEntry(content, newVersion, date, changes);
  
  // Write back to file
  try {
    fs.writeFileSync(CHANGELOG_PATH, newContent, 'utf-8');
    console.log(`✅ Updated ${CHANGELOG_PATH}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Review the changes in WhatsNewModal.tsx');
    console.log('  2. Commit: git add . && git commit -m "Bump version to ' + newVersion + '"');
    console.log('  3. Deploy to production');
  } catch (error) {
    console.error(`Error writing changelog: ${error}`);
    process.exit(1);
  }
}

main();
