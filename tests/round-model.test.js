// ラウンドとゴルフ場の記録を作る処理のテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCourse, ensureTee, newRound, commitHole, changePar, step, shownStrokes, shownPutts } from '../js/features/round/round-model.js';

const NOW = new Date(2026, 10, 9, 8, 0, 0);

test('新しいゴルフ場の新しいティーは18ホールすべてパー4・距離なし', () => {
  const c = newCourse('  テストCC  ', NOW);
  assert.equal(c.name, 'テストCC');
  const tee = ensureTee(c, '白');
  assert.equal(tee.holes.length, 18);
  assert.ok(tee.holes.every((h) => h.par === 4 && h.yards === null));
  assert.deepEqual(tee.holes.map((h) => h.number), Array.from({ length: 18 }, (_, i) => i + 1));
});

test('同じティーは2つ作らない。別のティーはパーを写し、距離は空', () => {
  const c = newCourse('テストCC', NOW);
  const white = ensureTee(c, '白');
  white.holes[0].par = 5;
  white.holes[0].yards = 500;
  assert.equal(ensureTee(c, '白'), white);
  const blue = ensureTee(c, '青');
  assert.equal(c.tees.length, 2);
  assert.equal(blue.holes[0].par, 5);
  assert.equal(blue.holes[0].yards, null);
});

test('ラウンドはゴルフ場のパー・距離を写して始まり、全ホール未入力', () => {
  const c = newCourse('テストCC', NOW);
  const tee = ensureTee(c, '白');
  tee.holes[2].par = 3;
  tee.holes[2].yards = 150;
  const r = newRound({ date: '2026-11-09', course: c, teeName: '白' }, NOW);
  assert.equal(r.status, 'playing');
  assert.equal(r.currentHole, 1);
  assert.equal(r.courseName, 'テストCC');
  assert.equal(r.holes[2].par, 3);
  assert.equal(r.holes[2].yards, 150);
  assert.ok(r.holes.every((h) => h.strokes === null && h.putts === null));
  // ゴルフ場を直しても、ラウンドの記録は変わらない
  tee.holes[2].par = 4;
  assert.equal(r.holes[2].par, 3);
});

test('未入力のホールは、画面ではパー・2パットを出し、入力済みにするとその値が入る', () => {
  const h = { par: 5, strokes: null, putts: null };
  assert.equal(shownStrokes(h), 5);
  assert.equal(shownPutts(h), 2);
  commitHole(h);
  assert.equal(h.strokes, 5);
  assert.equal(h.putts, 2);
  h.strokes = 7;
  commitHole(h); // 入力済みなら変えない
  assert.equal(h.strokes, 7);
});

test('数の増減は下限より下がらない', () => {
  assert.equal(step(1, -1, 1), 1);
  assert.equal(step(0, -1, 0), 0);
  assert.equal(step(4, 1, 1), 5);
});

test('パーを3に変えると、パー4用のティーショットの記録は消える（逆も同じ）', () => {
  const h = changePar({ par: 4, teeShot: 'leftRough' }, 3);
  assert.equal(h.teeShot, null);
  const h2 = changePar({ par: 3, teeShot: 'green' }, 4);
  assert.equal(h2.teeShot, null);
  const h3 = changePar({ par: 4, teeShot: 'fairway' }, 5);
  assert.equal(h3.teeShot, 'fairway');
});
