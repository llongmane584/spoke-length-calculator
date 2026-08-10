import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  APP_VERSION,
  CHANGELOG,
  changelogYear,
  changelogYears,
  entriesForYear,
  newestChangelogYear,
  releaseKey,
} from './changelog.ts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readJson = async (relative: string): Promise<unknown> =>
  JSON.parse(await readFile(new URL(relative, import.meta.url), 'utf8'));

const at = (value: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>((acc, key) => (isRecord(acc) ? acc[key] : undefined), value);

// 表示するバージョンの出どころは CHANGELOG だが、package.json は別に持っている。
// version++ を手でやるうちは片方だけ上げる事故が起きるので、ここで縛る。
test('keeps package.json in step with the displayed version', async () => {
  assert.equal(at(await readJson('../package.json'), ['version']), APP_VERSION);
});

test('takes the displayed version from the newest entry', () => {
  assert.equal(APP_VERSION, CHANGELOG[0].version);
});

test('carries an ISO 8601 date on every entry', () => {
  for (const entry of CHANGELOG) {
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/, `${entry.version} needs a YYYY-MM-DD date`);
  }
});

test('keeps the entries in newest-first order', () => {
  const dates = CHANGELOG.map(entry => entry.date);

  assert.deepEqual(dates, [...dates].sort().reverse());
});

// '.' は i18next の keySeparator なので、翻訳キーに残すとネストとして解釈される。
test('mangles the dots out of a release key', () => {
  assert.equal(releaseKey('0.1.0'), 'v0_1_0');
  assert.equal(releaseKey('10.20.30'), 'v10_20_30');
});

test('groups the entries by the year in their date', () => {
  assert.equal(changelogYear({ version: '1.2.3', date: '2027-01-31' }), '2027');

  for (const year of changelogYears()) {
    assert.ok(entriesForYear(year).length > 0, `${year} should have at least one entry`);
  }

  assert.deepEqual(entriesForYear('1999'), []);
});

test('lists the years newest first, without repeats', () => {
  const years = changelogYears();

  assert.deepEqual(years, [...new Set(years)]);
  assert.deepEqual(years, [...years].sort().reverse());
  assert.equal(newestChangelogYear(), years[0]);
});

test('accounts for every entry across the years it lists', () => {
  const grouped = changelogYears().flatMap(entriesForYear);

  assert.equal(grouped.length, CHANGELOG.length);
});

// キーが欠けても i18next は黙って英語へ落ちる (ja で英文が出る) ので、ここで見張る。
test('gives every release notes in both languages', async () => {
  const locales = await Promise.all([
    readJson('./locales/en.json'),
    readJson('./locales/ja.json'),
  ]);

  for (const entry of CHANGELOG) {
    for (const locale of locales) {
      const notes = at(locale, [
        'pages',
        'changelog',
        'releases',
        releaseKey(entry.version),
        'notes',
      ]);

      assert.equal(typeof notes, 'string', `missing notes for ${entry.version}`);
      assert.notEqual(notes, '', `empty notes for ${entry.version}`);
    }
  }
});
