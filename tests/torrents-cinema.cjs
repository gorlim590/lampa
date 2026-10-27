'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(__dirname + '/../torrents-redesign.js', 'utf8');
function fixture(initial = {}) {
  const values = { ...initial }, writes = [];
  const Lampa = { Storage: {
    get: (key, fallback) => Object.hasOwn(values, key) ? values[key] : fallback,
    set: (key, value) => { values[key] = value; writes.push([key, value]); }
  } };
  const context = { window: {}, Lampa, console, Date, Set, WeakMap };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { api: context.window.TorrentsRedesign, values, writes };
}
function row(tracker, quality, seeds, bytes, date, score) {
  return { _ctrData: { tracker, parsed: { quality }, seeds, bytes, date, sortScore: score } };
}

test('release metadata keeps audio and subtitles separate and exposes only identified voiceover', () => {
  const api = fixture().api;
  const release = api.normalizeRelease({
    Title: 'The Others (2001) 1080p', AudioLanguages: ['en', 'uk-UA'],
    SubtitleLanguages: ['ru'], VoiceoverStudio: 'Fixture Dubbing Group',
    ffprobe: [{ codec_type: 'audio', tags: { language: 'eng' } }, { codec_type: 'subtitle', tags: { language: 'uk' } }]
  });
  assert.equal(release.parsed.audio.label, 'English, Українська');
  assert.equal(release.parsed.audio.ua, true);
  assert.equal(release.parsed.subs.label, 'Російська, Українська');
  assert.equal(release.parsed.subs.ua, true);
  assert.equal(release.parsed.voiceover, 'Fixture Dubbing Group');
  const subtitlesOnly = api.normalizeRelease({ Title: 'Movie (2001) 1080p Ukr Subs', SubtitleLanguages: ['uk'] });
  assert.equal(subtitlesOnly.parsed.audio.label, 'Невідомо');
  assert.equal(subtitlesOnly.parsed.audio.ua, false);
  assert.equal(subtitlesOnly.parsed.subs.label, 'Українська');
  const ambiguous = api.normalizeRelease({ Title: 'Movie 1080p', AudioLanguages: ['uk subtitles'], SubtitleLanguages: ['uk subtitles'] });
  assert.equal(ambiguous.parsed.audio.label, 'Невідомо');
  assert.equal(ambiguous.parsed.subs.label, 'Українська');
  const titleOnly = api.normalizeRelease({ Title: 'Movie (2001) Українська Subs 1080p' });
  assert.equal(titleOnly.parsed.audio.label, 'Невідомо');
  assert.equal(titleOnly.parsed.subs.label, 'Українська');
  assert.equal(api.normalizeRelease({ Title: 'Movie 1080p' }).parsed.voiceover, 'Невідомо');
  const groupOnly = api.normalizeRelease({ Title: 'Frieren S01E01 1080p', ReleaseGroup: 'Fixture Release Group' });
  assert.equal(groupOnly.parsed.voiceover, 'Невідомо', 'release-group metadata is not proof of a dubbing studio');
});

test('anime studio aliases and multiple confirmed audio tracks normalize without subtitle inference', () => {
  const api = fixture().api;
  const amanogawa = api.normalizeRelease({
    Title: 'Frieren S01E03 1080p Amanogawa Multi-voice',
    AudioTracks: [{ language: 'uk', type: 'audio' }, { language: 'ja', type: 'audio' }],
    SubtitleLanguages: ['en']
  });
  assert.deepEqual(Array.from(amanogawa.parsed.audio.languages), ['Українська', 'Японська']);
  assert.equal(amanogawa.parsed.voiceover, 'Амоногава');
  assert.equal(amanogawa.parsed.voiceoverType, 'Багатоголосе');
  assert.equal(amanogawa.parsed.subs.label, 'English');
  const dali = api.normalizeRelease({
    Title: 'Frieren S01E03 1080p', VoiceoverStudios: ['Amanogawa', 'Далі Буде'],
    VoiceoverType: 'two-voice', ffprobe: [{ codec_type: 'audio', tags: { language: 'jpn' } }]
  });
  assert.equal(dali.parsed.voiceover, 'Амоногава / Далі Буде');
  assert.equal(dali.parsed.voiceoverType, 'Двоголосе');
  assert.equal(dali.parsed.audio.label, 'Японська');
  const subtitlesOnly = api.normalizeRelease({ Title: 'Frieren S01E03 Ukr Subs', SubtitleLanguages: ['uk'] });
  assert.equal(subtitlesOnly.parsed.audio.label, 'Невідомо');
  assert.equal(subtitlesOnly.parsed.voiceover, 'Невідомо');
});

test('recommendation prioritizes confirmed Ukrainian audio, then Toloka before Mazepa', () => {
  const api = fixture().api;
  const match = { eligible: true, similarity: 1 };
  const toloka = api.normalizeRelease({ Title: 'Series S01E01 1080p', Tracker: 'Toloka', AudioLanguages: ['uk'], Seeders: 1 });
  const mazepa = api.normalizeRelease({ Title: 'Series S01E01 2160p', Tracker: 'Mazepa', AudioLanguages: ['uk'], Seeders: 10000 });
  const audio = api.normalizeRelease({ Title: 'Series S01E01 1080p', Tracker: 'Mazepa', AudioLanguages: ['uk'], Seeders: 1 });
  const noAudioToloka = api.normalizeRelease({ Title: 'Series S01E01 1080p', Tracker: 'Toloka', AudioLanguages: ['en'], Seeders: 10000 });
  assert(api.score(toloka, match) > api.score(mazepa, match), 'Toloka preference survives seed and resolution differences');
  assert(api.score(audio, match) > api.score(noAudioToloka, match), 'confirmed Ukrainian audio outranks tracker priority');
});

test('tracker filters expose actual counts and retain Toloka then Mazepa priority if Toloka is absent', () => {
  const f = fixture(), api = f.api;
  const options = api.trackerOptions([{ tracker: 'Mazepa' }, { tracker: 'Mazepa' }, { tracker: 'Local Indexer' }]);
  assert.deepEqual(Array.from(options, item => [item.key, item.count]), [
    ['all', 3], ['toloka', 0], ['mazepa', 2], ['source:local indexer', 1]
  ]);
  assert.deepEqual([api.trackerKey('Toloka'), api.trackerKey('Mazepa')], ['toloka', 'mazepa']);
  assert.equal(api.trackerMatches('Mazepa', 'mazepa'), true);
  assert.equal(api.trackerMatches('Toloka', 'mazepa'), false);
  assert.equal(api.storeTrackerFilter('mazepa'), true);
  assert.equal(f.values.torrents_cinema_tracker, 'mazepa');
  assert.equal(api.storeSort('tracker'), true);
  assert.equal(f.values.torrents_cinema_sort, 'tracker');
  assert.equal(api.storeSort('arbitrary'), false);
});

test('sorting supports quality, seeders, size, date and tracker while Best Choice remains pinned', () => {
  const api = fixture().api;
  const toloka = row('Toloka', 1080, 12, 900, '2024-01-01', 8);
  const mazepa = row('Mazepa', 2160, 4, 1800, '2025-01-01', 5);
  const other = row('Other Indexer', 720, 50, 500, '2026-01-01', 10);
  assert.deepEqual(Array.from(api.sortReleaseRows([toloka, mazepa, other], 'quality')), [mazepa, toloka, other]);
  assert.deepEqual(Array.from(api.sortReleaseRows([toloka, mazepa, other], 'seeders')), [other, toloka, mazepa]);
  assert.deepEqual(Array.from(api.sortReleaseRows([toloka, mazepa, other], 'size')), [mazepa, toloka, other]);
  assert.deepEqual(Array.from(api.sortReleaseRows([toloka, mazepa, other], 'date')), [other, mazepa, toloka]);
  assert.deepEqual(Array.from(api.sortReleaseRows([other, mazepa, toloka], 'tracker')), [toloka, mazepa, other]);
  assert.deepEqual(Array.from(api.pinBestRow([other, mazepa, toloka], toloka, true)), [toloka, other, mazepa]);
  assert.deepEqual(Array.from(api.pinBestRow([other, mazepa], toloka, true)), [other, mazepa]);
  assert.deepEqual(Array.from(api.pinBestRow([other, mazepa, toloka], toloka, false)), [other, mazepa, toloka]);
});

test('Best Choice requires an exact confident movie/year match and an eligible owner match', () => {
  const api = fixture().api;
  const movie = { title: 'The Others', release_date: '2001-08-10' };
  assert.equal(api.bestMatchAllowed({ year: 2001, parsed: { raw: 'The Others (2001)' } }, movie, { eligible: true, similarity: 1 }), true);
  assert.equal(api.bestMatchAllowed({ year: 2002, parsed: { raw: 'The Others (2002)' } }, movie, { eligible: true, similarity: 1 }), false);
  assert.equal(api.bestMatchAllowed({ year: 2001, parsed: { raw: 'The Others (2001)' } }, movie, { eligible: true, similarity: 0.9 }), false);
  assert.equal(api.bestMatchAllowed({}, movie, { eligible: false, similarity: 1 }), false);
  assert.equal(api.bestMatchAllowed({ year: 2024, parsed: { raw: 'Series S02E01 (2024)' } }, { name: 'Series', first_air_date: '2021-01-01' }, { eligible: true, similarity: 1 }), true);
});
