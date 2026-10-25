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
function checkUrl(raw, reference) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    failures.push('Malformed URL in ' + reference);
    return;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    failures.push('Unsupported URL protocol in ' + reference);
    return;
  }
  urlCount++;
  if (parsed.hostname !== 'gorlim590.github.io') return;
  // Diagnostics intentionally omit query/fragment/credentials.
  const display = parsed.origin + parsed.pathname;
  const prefix = '/lampa/';
  if (!parsed.pathname.startsWith(prefix)) {
    failures.push('First-party URL has unexpected path in ' + reference + ': ' + display);
    return;
  }
  let target;
  try {
    target = decodeURIComponent(parsed.pathname.slice(prefix.length)).replace(/^\/+|\/+$/g, '');
  } catch {
    failures.push('Invalid URL encoding in ' + reference);
    return;
  }
  if (!target) return;
  const exists = allPaths.has(target) || [...allPaths].some((p) => p.startsWith(target + '/'));
  if (!exists) failures.push('First-party URL target is not present in main or third-party branch: ' + display + ' (referenced by ' + reference + ')');
}

function checkManifest() {
  let entries;
  try {
    entries = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugins.json'), 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    failures.push('Missing or invalid JSON in plugins.json');
    return;
  }
  if (!Array.isArray(entries)) {
    failures.push('plugins.json must contain an array');
    return;
  }
  entries.forEach((entry, index) => {
    const reference = 'plugins.json[' + index + ']';
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      failures.push(reference + ' must be a plugin object');
      return;
    }
    if (typeof entry.url !== 'string' || !entry.url.trim()) failures.push(reference + '.url must be a nonempty URL');
    else checkUrl(entry.url, reference + '.url');
    if (entry.status !== 0 && entry.status !== 1) failures.push(reference + '.status must be 0 or 1');
    if ('name' in entry && typeof entry.name !== 'string') failures.push(reference + '.name must be a string when provided');
  });
  console.log('Checked plugins.json manifest (' + entries.length + ' entries).');
}

checkManifest();
for (const file of textFiles) {
  if (file.startsWith(THIRD_PARTY_DIR + path.sep)) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const match of content.matchAll(urlPattern)) {
    const raw = match[0].replace(/[.,;:!?]+$/, '');
    // Ignore illustrative URLs such as http://…/file.mp4 in documentation/comments.
    if (raw.includes('…') || raw.includes('...')) continue;
    checkUrl(raw, path.relative(ROOT, file));
  }
}
console.log('Parsed ' + urlCount + ' URLs; checked first-party GitHub Pages paths against both branches.');

if (failures.length) {
  console.error('\nValidation failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('All repository checks passed.');
