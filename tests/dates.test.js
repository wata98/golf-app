// 日付の計算とバックアップのお知らせのテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysSince, needsBackupReminder, formatJapaneseDate, toLocalIso } from '../js/core/dates.js';

const d = (y, m, day, h = 12) => new Date(y, m - 1, day, h);

test('日数はカレンダーの日付で数える', () => {
  assert.equal(daysSince(toLocalIso(d(2026, 11, 9, 23)), d(2026, 11, 9, 1)), 0);
  assert.equal(daysSince(toLocalIso(d(2026, 11, 9, 23)), d(2026, 11, 10, 0)), 1);
  assert.equal(daysSince(toLocalIso(d(2026, 12, 31)), d(2027, 1, 30)), 30);
});

test('最後のバックアップから29日はお知らせなし、30日でお知らせ', () => {
  const meta = { createdAt: toLocalIso(d(2026, 1, 1)), lastExportedAt: toLocalIso(d(2026, 11, 1)) };
  assert.equal(needsBackupReminder(meta, d(2026, 11, 30)), false);
  assert.equal(needsBackupReminder(meta, d(2026, 12, 1)), true);
});

test('一度もバックアップしていなければ、使い始めて30日でお知らせ', () => {
  const meta = { createdAt: toLocalIso(d(2026, 11, 9)), lastExportedAt: null };
  assert.equal(needsBackupReminder(meta, d(2026, 12, 8)), false);
  assert.equal(needsBackupReminder(meta, d(2026, 12, 9)), true);
});

test('日付が何もなければお知らせなし', () => {
  assert.equal(needsBackupReminder({}, d(2026, 11, 9)), false);
});

test('画面に出す日付', () => {
  assert.equal(formatJapaneseDate(toLocalIso(d(2026, 11, 9))), '2026年11月9日');
});
