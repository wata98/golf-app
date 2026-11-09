// 練習の振り返りの集計とドリルの確かめのテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { practiceCounts, topicBreakdown, doneSessions } from '../js/features/practice/practice-stats.js';
import { validateDrill, defaultDrillRecords, newDrill } from '../js/features/practice/drill-model.js';

const NOW = new Date(2026, 10, 9, 12);

const sessions = [
  { date: '2026-11-08', status: 'done', unit: 'balls', items: [{ topic: 'iron', amount: 30, rating: 2 }, { topic: 'iron', amount: 30, rating: 4 }, { topic: 'warmup', amount: 10, rating: null }] },
  { date: '2026-09-01', status: 'done', unit: 'minutes', items: [{ topic: 'longPutt', amount: 20, rating: 5 }] },
  { date: '2026-11-09', status: 'planned', unit: 'balls', items: [{ topic: 'iron', amount: 30, rating: null }] },
];

test('練習回数: 完了したものだけ。直近30日', () => {
  assert.deepEqual(practiceCounts(sessions, NOW), { total: 2, recent: 1 });
  assert.deepEqual(doneSessions(sessions).map((s) => s.date), ['2026-11-08', '2026-09-01']);
});

test('課題ごとの内訳: ドリル数・球数・分・手応えの平均', () => {
  const rows = topicBreakdown(sessions);
  const iron = rows.find((r) => r.key === 'iron');
  assert.deepEqual([iron.drills, iron.balls, iron.minutes, iron.avgRating], [2, 60, 0, 3]);
  const lp = rows.find((r) => r.key === 'longPutt');
  assert.deepEqual([lp.drills, lp.balls, lp.minutes, lp.avgRating], [1, 0, 20, 5]);
  assert.equal(rows.find((r) => r.key === 'warmup').avgRating, null);
});

test('ドリルの入力の確かめ', () => {
  const d = { ...newDrill('iron', NOW), name: 'テスト' };
  assert.equal(validateDrill(d), null);
  assert.match(validateDrill({ ...d, name: ' ' }), /名前/);
  assert.match(validateDrill({ ...d, places: [] }), /場所/);
  assert.match(validateDrill({ ...d, balls: 1.5 }), /球数/);
  assert.match(validateDrill({ ...d, topic: 'xxx' }), /課題/);
});

test('最初のドリル集を保存する形にしても、元のデータは変わらない', () => {
  const recs = defaultDrillRecords(NOW);
  recs[0].places.push('home');
  assert.equal(defaultDrillRecords(NOW)[0].places.includes('home'), false);
  assert.ok(recs.every((r) => r.isDefault && r.createdAt));
});
