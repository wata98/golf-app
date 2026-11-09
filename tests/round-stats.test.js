// ラウンドの集計のテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isGir, summarize, summarizeRound, formatDiff, formatRate } from '../js/features/round/round-stats.js';

const hole = (number, par, strokes, putts, extra = {}) => ({ number, par, strokes, putts, teeShot: null, ...extra });

test('パーオン: (打数−パット) が (パー−2) 以下', () => {
  assert.equal(isGir(hole(1, 4, 4, 2)), true);  // 2打でオン → パーオン
  assert.equal(isGir(hole(1, 4, 5, 3)), true);  // 2打でオン・3パット
  assert.equal(isGir(hole(1, 4, 5, 2)), false); // 3打でオン
  assert.equal(isGir(hole(1, 3, 3, 2)), true);  // パー3は1打でオン
  assert.equal(isGir(hole(1, 5, 5, 2)), true);  // パー5は3打でオン
  assert.equal(isGir(hole(1, 5, 6, 2)), false);
  assert.equal(isGir(hole(1, 4, 3, 1)), true);  // バーディー
  assert.equal(isGir(hole(1, 4, null, null)), false); // 未入力
});

test('集計は入力済みのホールだけを数える', () => {
  const s = summarize([hole(1, 4, 5, 2), hole(2, 3, 3, 2), hole(3, 5, null, null)]);
  assert.equal(s.holes, 2);
  assert.equal(s.score, 8);
  assert.equal(s.par, 7);
  assert.equal(s.diff, 1);
  assert.equal(s.putts, 4);
});

test('FWキープ率: パー4・5でティーショットを記録したホールのうちフェアウェイの割合（パー3は数えない）', () => {
  const s = summarize([
    hole(1, 4, 4, 2, { teeShot: 'fairway' }),
    hole(2, 5, 6, 2, { teeShot: 'leftRough' }),
    hole(3, 4, 5, 2, { teeShot: 'ob' }),
    hole(4, 4, 5, 2), // ティーショット未記録 → 数えない
    hole(5, 3, 3, 2, { teeShot: 'green' }), // パー3 → 数えない
  ]);
  assert.equal(s.fwKept, 1);
  assert.equal(s.fwTotal, 3);
  assert.equal(formatRate(s.fwRate), '33%');
  assert.equal(s.ob, 1);
});

test('パーオン率とOB数', () => {
  const s = summarize([hole(1, 4, 4, 2), hole(2, 4, 6, 2, { teeShot: 'ob' }), hole(3, 3, 3, 2), hole(4, 5, 7, 2)]);
  assert.equal(s.gir, 2);
  assert.equal(formatRate(s.girRate), '50%');
  assert.equal(s.ob, 1);
});

test('何も入力していなければ割合は「−」', () => {
  const s = summarize([hole(1, 4, null, null)]);
  assert.equal(s.holes, 0);
  assert.equal(formatRate(s.fwRate), '−');
  assert.equal(formatRate(s.girRate), '−');
});

test('前半・後半・全体', () => {
  const holes = Array.from({ length: 18 }, (_, i) => hole(i + 1, 4, i < 9 ? 5 : 4, 2));
  const s = summarizeRound({ holes });
  assert.equal(s.front.score, 45);
  assert.equal(s.back.score, 36);
  assert.equal(s.total.score, 81);
  assert.equal(s.total.diff, 9);
});

test('パーとの差の表示', () => {
  assert.equal(formatDiff(0), '±0');
  assert.equal(formatDiff(5), '+5');
  assert.equal(formatDiff(-2), '−2');
});
