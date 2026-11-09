// 弱点分析の指標のテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectRounds, roundMetrics, averageMetrics, parStats } from '../js/features/analysis/analysis-metrics.js';
import { makeRound } from './helpers.js';

test('分析に使うラウンド: 完了・9ホール以上・新しいほうから期間の数だけ・古い順', () => {
  const rounds = [
    makeRound('2026-05-01'), makeRound('2026-03-01'), makeRound('2026-04-01', 8), // 8ホールは使わない
    { ...makeRound('2026-06-01'), status: 'playing' }, // 記録中は使わない
    ...Array.from({ length: 6 }, (_, i) => makeRound(`2026-0${i + 1}-15`)),
  ];
  const last5 = selectRounds(rounds, 'last5');
  assert.equal(last5.length, 5);
  assert.deepEqual(last5.map((r) => r.date), ['2026-03-01', '2026-03-15', '2026-04-15', '2026-05-01', '2026-05-15', '2026-06-15'].slice(1));
  assert.equal(selectRounds(rounds, 'all').length, 8);
});

test('1ラウンドの指標', () => {
  const r = makeRound('2026-11-01', 18, (i) => ({
    teeShot: i < 7 ? 'fairway' : i < 14 ? 'leftRough' : 'ob', // パー4が18ホール → FW 7/18
    strokes: i === 0 ? 4 : 5,                                   // 1番だけパーオン（4打2パット）
    penalties: i >= 14 ? 1 : 0,
    bunkers: i === 1 ? 2 : 0,
    putts: i === 2 ? 3 : 2,
    aroundGreen: i === 3 ? 2 : i === 4 ? 3 : null,
  }));
  const m = roundMetrics(r);
  assert.equal(m.score, 89);
  assert.equal(m.overPar, 17);
  assert.equal(m.putts, 37);
  assert.equal(m.fwRate, 7 / 18);
  assert.equal(m.girRate, 2 / 18); // 1番と、3パットした3番（5打3パット→2打でオン）
  assert.equal(m.ob, 4);
  assert.equal(m.penalties, 4);
  assert.equal(m.bunkerRate, 1 / 18);
  assert.equal(m.upDownRate, 1 / 2); // 記録した2ホールのうち寄せワン1つ
  assert.equal(m.threePutts, 1);
});

test('9ホールのラウンドは2倍して18ホール分にする（割合はそのまま）', () => {
  const m = roundMetrics(makeRound('2026-11-01', 9, (i) => ({ teeShot: i === 0 ? 'ob' : 'fairway' })));
  assert.equal(m.holes, 9);
  assert.equal(m.score, 90);
  assert.equal(m.ob, 2);
  assert.equal(m.fwRate, 8 / 9);
});

test('平均は null を除いて出す', () => {
  const avg = averageMetrics([{ date: 'x', score: 90, upDownRate: null }, { date: 'y', score: 100, upDownRate: 0.5 }]);
  assert.equal(avg.score, 95);
  assert.equal(avg.upDownRate, 0.5);
  assert.equal(avg.date, undefined);
});

test('パー別の成績', () => {
  const r = makeRound('2026-11-01', 18, (i) => (i === 0 ? { par: 3, strokes: 4 } : i === 1 ? { par: 5, strokes: 5 } : {}));
  const p = parStats([r]);
  assert.deepEqual(p[3], { holes: 1, avgOver: 1 });
  assert.deepEqual(p[5], { holes: 1, avgOver: 0 });
  assert.equal(p[4].holes, 16);
  assert.equal(p[4].avgOver, 1);
});
