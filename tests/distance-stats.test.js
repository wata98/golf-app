// 飛距離の集計のテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describe, filterRecords, statsByClub, dailyAverages, yd } from '../js/features/distance/distance-stats.js';

const NOW = new Date(2026, 10, 9, 12); // 2026-11-09

test('平均と中央値', () => {
  const s = describe([150, 160, 140, 170, 155]);
  assert.equal(s.count, 5);
  assert.equal(s.mean, 155);
  assert.equal(s.median, 155);
  assert.equal(describe([150, 160]).median, 155); // 偶数個なら真ん中2つの間
});

test('ばらつき: 上位25%と下位25%を除いた幅（4球以上）', () => {
  // 並べると 100,110,120,130,140 → 25%の位置=110、75%の位置=130
  const s = describe([140, 100, 130, 110, 120]);
  assert.equal(s.low, 110);
  assert.equal(s.high, 130);
  // 1球だけ大きく外れても、幅には効きにくい
  const t = describe([150, 152, 154, 156, 158, 160, 162, 250]);
  assert.ok(t.high < 170, `high=${t.high}`);
});

test('3球以下ならばらつきは出さない。記録がなければ全部 null', () => {
  const s = describe([150, 160, 170]);
  assert.equal(s.low, null);
  assert.equal(s.high, null);
  assert.equal(s.mean, 160);
  assert.deepEqual(describe([]), { count: 0, mean: null, median: null, low: null, high: null });
});

test('数字がない球（キャリーだけ・トータルだけ）は、その項目の集計に入れない', () => {
  assert.equal(describe([150, null, undefined, 160]).count, 2);
});

test('ミスショットを除く・直近90日だけ', () => {
  const records = [
    { date: '2026-11-09', isMiss: false },
    { date: '2026-11-09', isMiss: true },
    { date: '2026-08-12', isMiss: false }, // 89日前 → 入る
    { date: '2026-08-11', isMiss: false }, // 90日前 → 入らない
  ];
  assert.equal(filterRecords(records, { excludeMiss: false, recentOnly: false }, NOW).length, 4);
  assert.equal(filterRecords(records, { excludeMiss: true, recentOnly: false }, NOW).length, 3);
  assert.equal(filterRecords(records, { excludeMiss: false, recentOnly: true }, NOW).length, 3);
  assert.equal(filterRecords(records, { excludeMiss: true, recentOnly: true }, NOW).length, 2);
});

test('クラブごとに分けて集計し、クラブの並び順のまま返す', () => {
  const clubs = [{ id: 'a', name: '7I' }, { id: 'b', name: 'PW' }];
  const records = [
    { clubId: 'b', carry: 110, total: 115 },
    { clubId: 'a', carry: 150, total: null },
    { clubId: 'a', carry: 160, total: 170 },
  ];
  const rows = statsByClub(clubs, records);
  assert.deepEqual(rows.map((r) => r.club.name), ['7I', 'PW']);
  assert.equal(rows[0].carry.mean, 155);
  assert.equal(rows[0].total.count, 1);
  assert.equal(rows[1].carry.mean, 110);
});

test('日ごとの平均は古い順', () => {
  const out = dailyAverages([
    { date: '2026-11-09', carry: 150 }, { date: '2026-11-01', carry: 140 }, { date: '2026-11-09', carry: 160 },
  ], 'carry');
  assert.deepEqual(out, [{ date: '2026-11-01', value: 140 }, { date: '2026-11-09', value: 155 }]);
});

test('ヤードの表示は整数に丸める', () => {
  assert.equal(yd(152.4), '152');
  assert.equal(yd(152.5), '153');
  assert.equal(yd(null), '−');
});
