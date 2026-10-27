#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inventoryPath = path.join(root, 'audit/settings/settings-inventory.json');
const outputPath = path.join(root, 'audit/settings/settings-audit-summary.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const controlRows = inventory.settings.filter(row => row.kind === 'control');
const presentationRows = inventory.settings.filter(row => row.kind !== 'control');
const functionalManifestPath = path.join(root, 'tests/fixtures/settings-functional-evidence.json');
const functionalControls = JSON.parse(fs.readFileSync(functionalManifestPath, 'utf8')).controls;
const functionalById = new Map(functionalControls.map(item => [item.id, item]));
const duplicateIds = new Set(inventory.duplicateIds || []);
const storageOwners = new Map();

for (const row of controlRows) {
  for (const key of row.storageKeys || []) {
    if (!storageOwners.has(key)) storageOwners.set(key, new Set());
    storageOwners.get(key).add(row.owner);
  }
}

const statusOf = row => {
  if (functionalById.has(row.id)) return functionalById.get(row.id).status;
  if (row.id === 'addCategory:ncInfo' && row.owner === 'community/new-category.js') return 'Fixed in source; runtime not verified (merged PR #99)';
  if (row.status === 'Requires dependency') return 'Unavailable; lazy owner template requires native owner panel';
  if (row.status === 'Partially works') return 'Partially verified from owner source; runtime not verified';
  if (row.status === 'Fixed in working tree; runtime not verified') return 'Fixed in source; runtime not verified';
  return row.status;
};

const group = rows => {
  const result = { total: rows.length, verifiedIsolated: 0, verifiedRuntime: 0, broken: 0, partial: 0, fixedSourceRuntimeUnverified: 0, unsupported: 0, unverified: 0, unavailable: 0 };
  for (const row of rows) {
    const status = statusOf(row).toLowerCase();
    if (status.startsWith('verified in isolated tests')) result.verifiedIsolated++;
    else if (status.startsWith('verified in live runtime')) result.verifiedRuntime++;
    else if (status === 'broken') result.broken++;
    else if (status.includes('unsupported') || status.includes('obsolete')) result.unsupported++;
    else if (status.includes('unavailable') || status.includes('requires dependency')) result.unavailable++;
    else if (status.includes('fixed in source')) result.fixedSourceRuntimeUnverified++;
    else if (status.includes('partial')) result.partial++;
    else result.unverified++;
  }
  return result;
};

const categories = {};
for (const row of controlRows) {
  const category = row.newCategory || 'unclassified';
  (categories[category] ||= []).push(row);
}

const records = controlRows.map(row => {
  const flags = [];
  if (row.owner === 'Unresolved' || row.ownerConfidence === 'unresolved') flags.push('ambiguous-handler-owner');
  if (duplicateIds.has(row.id)) flags.push('duplicate-control-identity-review');
  if ((row.storageKeys || []).some(key => (storageOwners.get(key)?.size || 0) > 1)) flags.push('cross-owner-storage-key-collision-review');
  if (row.status === 'Requires dependency') flags.push('missing-or-unavailable-dependency');
  if (/unsupported|obsolete/i.test(row.status)) flags.push('obsolete-or-unsupported-option');
  if (row.newCategory === 'appearance') flags.push('visual-override-review-candidate');
  if (!statusOf(row).startsWith('Verified in live runtime')) flags.push('runtime-or-device-verification-required');
  return {
    id: row.id,
    instanceId: row.instanceId,
    category: row.newCategory || 'unclassified',
    label: row.label,
    owner: row.owner,
    ownerEvidence: row.ownerConfidence,
    status: statusOf(row),
    evidence: functionalById.get(row.id)?.test || row.verification || 'No control-specific functional evidence recorded.',
    storageKeys: row.storageKeys || [],
    findings: flags
  };
});

const report = {
  schemaVersion: 1,
  generatedFrom: {
    inventorySchema: inventory.runtimeSchema,
    inventoryCaptureMetrics: inventory.metrics,
    captureCheckpoint: '87b43a8 (published equivalent 8822b88d9a078be7f321e8d7c56c7e213404571f)',
    note: 'This is an offline reconciliation of the existing captured inventory with current source-confirmed repair status. It is not a fresh runtime census.'
  },
  counts: {
    capturedRecords: inventory.settings.length,
    identifiableControls: controlRows.length,
    presentationRecords: presentationRows.length,
    recordedDuplicateIds: duplicateIds.size,
    distinctControlsExercised: functionalControls.length,
    verifiedInIsolation: functionalControls.filter(item => item.status === 'Verified in isolated tests').length,
    partiallyExercisedInIsolation: functionalControls.filter(item => item.status === 'Partially verified').length
  },
  functionalTests: {
    file: 'tests/settings-functional.cjs',
    isolatedCases: 7,
    mode: 'Source owner functions/registrations with disposable Storage, mocked UI effects and intercepted Trakt API; no live credentials or writes.',
    liveRuntimeVerified: 0
  },
  categories: Object.fromEntries(Object.entries(categories).sort(([a], [b]) => a.localeCompare(b)).map(([name, rows]) => [name, group(rows)])),
  findings: {
    ambiguousHandlerOwner: records.filter(row => row.findings.includes('ambiguous-handler-owner')).length,
    duplicateControlIdentityReview: records.filter(row => row.findings.includes('duplicate-control-identity-review')).length,
    potentialStorageKeyCollisionReview: records.filter(row => row.findings.includes('cross-owner-storage-key-collision-review')).length,
    missingOrUnavailableDependency: records.filter(row => row.findings.includes('missing-or-unavailable-dependency')).length,
    obsoleteOrUnsupportedOption: records.filter(row => row.findings.includes('obsolete-or-unsupported-option')).length,
    visualOverrideReviewCandidates: records.filter(row => row.findings.includes('visual-override-review-candidate')).length,
    requiresRuntimeOrDeviceVerification: records.filter(row => row.findings.includes('runtime-or-device-verification-required')).length
  },
  confirmedDefects: [],
  previouslyFixedFindings: [
    {
      priority: 'P1',
      id: 'addCategory:ncInfo',
      owner: 'community/new-category.js',
      evidence: 'The earlier source-confirmed Back self-loop was fixed in merged PR #99 and its isolated regression remains in tests/settings-nc-info.cjs.',
      status: 'Already fixed on baseline; runtime and TV remain unverified.'
    }
  ],
  followUpQueue: [
    { rank: 1, priority: 'P1 verification', owner: 'external/core-app.js / device player integrations', controls: ['player:player', 'player:player_torrent', 'player:player_iptv'], reason: 'Playback routing controls are captured but their effects and device fallback behavior have no acceptance evidence.' },
    { rank: 2, priority: 'P1 verification', owner: 'trakt/trakt.js', controls: ['trakt:trakt_auth', 'trakt:trakt_full_clear'], reason: 'Missing-token auth rendering was exercised without network access; authenticated action and destructive full-reset semantics still need isolated coverage.' },
    { rank: 3, priority: 'P1 verification', owner: 'trakt/trakt.js', controls: ['trakt:nav_trakt_sync'], reason: 'The Trakt+ preferences and cache reset run against mocked services; core sync action and account-isolation semantics remain unverified.' },
    { rank: 4, priority: 'P1 verification', owner: 'BWA external plugin; owner unresolved in capture', controls: controlRows.filter(row => row.component === 'bwa').map(row => row.id), reason: 'Ten controls have no attributable source/handler; resolve delivery and owner before claiming support or changing them.' },
    { rank: 5, priority: 'P1 verification', owner: 'ui/settings-hub.js plus PR #98 Hybrid/Settings owners', controls: ['settings_hub lifecycle', 'native Settings fallback'], reason: 'Mocks cover lifecycle/focus and fallback; verify exact delivered assets in one existing browser session when safe access permits.' },
    { rank: 6, priority: 'P1 verification', owner: 'providers/tmdb-networks.js', controls: ['platforms_margins:*'], reason: 'Four related margin controls share owner-reported storage access; inspect key-level writes and reset semantics in an isolated fixture.' },
    { rank: 7, priority: 'P1 verification', owner: 'ui/design-optimized.js and ui/interface-plus.js', controls: controlRows.filter(row => row.newCategory === 'appearance' && /ydesign|interface/i.test(row.component)).slice(0, 12).map(row => row.id), reason: 'Appearance is the largest category; verify representative high-impact controls against the merged single presentation owner boundaries.' },
    { rank: 8, priority: 'P1 verification', owner: 'loader.js and plugins-to-enable/*', controls: ['plugins:plugins', 'plugins:install'], reason: 'Installation, enable/disable and missing-plugin fallback must be isolated from real user plugin configuration.' },
    { rank: 9, priority: 'P1 verification', owner: 'ui/menu-hide.js', controls: controlRows.filter(row => row.component === 'menu_filter').map(row => row.id), reason: 'Anonymous repeated registrations prevent stable per-control identity; determine whether they are duplicate controls or intentional per-item handlers.' },
    { rank: 10, priority: 'P2 verification', owner: 'community/new-category.js', controls: ['ncInfo:group'], reason: 'The self-Back defect is fixed, while the owner template remains lazy and represented as a dependency gap until opened through its native owner.' },
    { rank: 11, priority: 'P2 verification', owner: 'all current setting owners', controls: ['settings with account/profile/device scope'], reason: 'The inventory has no per-control reset, restart or profile-scope certification; derive boundaries from owner code before any migration.' },
    { rank: 12, priority: 'P2 verification', owner: 'registered UI plugin owners', controls: ['Appearance category'], reason: 'Review visual override candidates using existing ownership and compatibility evidence; the category flag alone is not a confirmed CSS conflict.' }
  ],
  records
};

const serialized = JSON.stringify(report, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, 'utf8') !== serialized) {
    console.error('Settings audit summary is stale. Run: node scripts/settings-audit-summary.mjs');
    process.exitCode = 1;
  }
} else {
  fs.writeFileSync(outputPath, serialized);
  console.log(`Wrote ${path.relative(root, outputPath)} (${controlRows.length} controls; ${presentationRows.length} presentation records).`);
}
