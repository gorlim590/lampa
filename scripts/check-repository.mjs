import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const THIRD_PARTY_DIR = path.join(ROOT, 'third-party-branch');
const SKIP_DIRS = new Set(['.git', 'node_modules', '.next', 'dist', 'coverage']);
const failures = [];
const sourceFiles = [];
const allPaths = new Set();

function walk(dir, prefix = '') {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const relative = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) {
      walk(full, relative);
    } else if (entry.isFile()) {
      allPaths.add(relative.replaceAll('\\', '/'));
      if (relative.endsWith('.js')) sourceFiles.push(full);
    }
  }
}

walk(ROOT);
// Add paths from the separately checked out third-party branch without its checkout prefix.
if (fs.existsSync(THIRD_PARTY_DIR)) {
  for (const file of sourceFiles.filter((f) => f.startsWith(THIRD_PARTY_DIR + path.sep))) {
    sourceFiles.splice(sourceFiles.indexOf(file), 1);
  }
  function addThirdPartyPaths(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const relative = prefix ? prefix + '/' + entry.name : entry.name;
      if (entry.isDirectory()) addThirdPartyPaths(full, relative);
      else if (entry.isFile()) {
        allPaths.add(relative.replaceAll('\\', '/'));
        if (relative.endsWith('.js')) sourceFiles.push(full);
      }
    }
  }
  // The checkout itself is a second branch; paths are checked relative to its root.
  allPaths.clear();
  function addMainPaths(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && (SKIP_DIRS.has(entry.name) || entry.name === 'third-party-branch')) continue;
      const full = path.join(dir, entry.name);
      const relative = prefix ? prefix + '/' + entry.name : entry.name;
      if (entry.isDirectory()) addMainPaths(full, relative);
      else if (entry.isFile()) allPaths.add(relative.replaceAll('\\', '/'));
    }
  }
  addMainPaths(ROOT);
  addThirdPartyPaths(THIRD_PARTY_DIR);
}

sourceFiles.sort();
for (const file of sourceFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failures.push('JavaScript syntax error in ' + path.relative(ROOT, file) + '\n' + (result.stderr || result.stdout).trim());
  }
}
console.log('Checked JavaScript syntax in ' + sourceFiles.length + ' files.');

const textFiles = [];
function walkText(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkText(full);
    else if (entry.isFile() && /\.(?:js|md|yml|yaml)$/.test(entry.name)) textFiles.push(full);
  }
}
walkText(ROOT);

const urlPattern = /https?:\/\/[^\s"'<>\\)\]]+/g;
let urlCount = 0;
for (const file of textFiles) {
  if (file.startsWith(THIRD_PARTY_DIR + path.sep)) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const match of content.matchAll(urlPattern)) {
    const raw = match[0].replace(/[.,;:!?]+$/, '');
    // Ignore illustrative URLs such as http://…/file.mp4 in documentation/comments.
    if (raw.includes('…') || raw.includes('...')) continue;
    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      failures.push('Malformed URL in ' + path.relative(ROOT, file) + ': ' + raw);
      continue;
    }
    urlCount++;
    if (parsed.hostname !== 'gorlim590.github.io') continue;
    const prefix = '/lampa/';
    if (!parsed.pathname.startsWith(prefix)) {
      failures.push('First-party URL has unexpected path in ' + path.relative(ROOT, file) + ': ' + raw);
      continue;
    }
    let target;
    try {
      target = decodeURIComponent(parsed.pathname.slice(prefix.length)).replace(/^\/+|\/+$/g, '');
    } catch {
      failures.push('Invalid URL encoding in ' + path.relative(ROOT, file) + ': ' + raw);
      continue;
    }
    if (!target) continue;
    const exists = allPaths.has(target) || [...allPaths].some((p) => p.startsWith(target + '/'));
    if (!exists) failures.push('First-party URL target is not present in main or third-party branch: ' + raw + ' (referenced by ' + path.relative(ROOT, file) + ')');
  }
}
console.log('Parsed ' + urlCount + ' URLs; checked first-party GitHub Pages paths against both branches.');

if (failures.length) {
  console.error('\nValidation failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('All repository checks passed.');
