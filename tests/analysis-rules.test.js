// 弱点分析の判定ルールのテスト（analysis-rules.js を変えたら、ここも合わせて直す）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, ALLOWANCE_TABLE, allowanceFor, roundLosses, diagnose, n1, t1, STANDARD_PAR } from '../js/features/analysis/analysis-rules.js';
import { roundMetrics, averageMetrics } from '../js/features/analysis/analysis-metrics.js';
import { makeRound } from './helpers.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
const hole = (o) => ({ par: 4, strokes: 4, putts: 2, penalties: 0, bunkers: 0, aroundGreen: null, ...o });
const loss = (key, h) => CATEGORIES.find((c) => c.key === key).perHole(hole(h));

test('目安の表: どの行も合計が「目標 − 72」', () => {
  for (const row of ALLOWANCE_TABLE) {
    close(CATEGORIES.reduce((s, c) => s + row[c.key], 0), row.target - STANDARD_PAR);
  }
});

test('目安: 表の行そのもの・間は比例・表の外は比で伸び縮み', () => {
  assert.equal(allowanceFor(90).penalty, 2);
  close(allowanceFor(95).penalty, 3);   // 90の2と100の4の間
  close(allowanceFor(95).shot, 12);
  close(allowanceFor(76).shot, 2);      // 80の行（+8）を +4/+8 倍
  close(allowanceFor(120).penalty, 6 * 48 / 38);
  for (const t of [70, 76, 85, 95, 105, 125]) {
    const sum = Object.values(allowanceFor(t)).reduce((s, v) => s + v, 0);
    close(sum, Math.max(0, t - STANDARD_PAR));
  }
});

test('1ホールの失点: OB・ペナルティ / 3パット / バンカー', () => {
  assert.equal(loss('penalty', { strokes: 7, penalties: 2 }), 2);
  assert.equal(loss('threePutt', { strokes: 6, putts: 3 }), 1);
  assert.equal(loss('threePutt', { strokes: 7, putts: 4 }), 2);
  assert.equal(loss('threePutt', { strokes: 4, putts: 1 }), 0);
  assert.equal(loss('bunker', { strokes: 6, bunkers: 2 }), 1);
});

test('アプローチが寄らない: パーオンしなかったホールで3打以上。3パットの分は引く。記録がなければ0', () => {
  assert.equal(loss('approach', { strokes: 6, putts: 1, aroundGreen: 3 }), 1);  // 寄らず1パット
  assert.equal(loss('approach', { strokes: 7, putts: 3, aroundGreen: 4 }), 1);  // 寄らず3パット → 3パット分の1は引く
  assert.equal(loss('approach', { strokes: 6, putts: 3, aroundGreen: 3 }), 0);  // 寄ったが3パット → 3パットだけ
  assert.equal(loss('approach', { strokes: 5, putts: 1, aroundGreen: 2 }), 0);  // 寄せワン
  assert.equal(loss('approach', { strokes: 6, putts: 2, aroundGreen: null }), 0);
  assert.equal(loss('approach', { strokes: 4, putts: 2, aroundGreen: 3 }), 0);  // パーオンなら数えない
});

test('5つの失点を足すと、ちょうど「打数 − パー」になる', () => {
  const holes = [
    { strokes: 9, putts: 3, penalties: 2, bunkers: 1, aroundGreen: 4 },
    { strokes: 3, putts: 1 },
    { par: 3, strokes: 6, putts: 2, bunkers: 2, aroundGreen: 3 },
    { par: 5, strokes: 5, putts: 2 },
  ];
  for (const h of holes) {
    const sum = CATEGORIES.reduce((s, c) => s + c.perHole(hole(h)), 0);
    close(sum, hole(h).strokes - hole(h).par);
  }
});

test('9ホールのラウンドの失点は2倍にする', () => {
  const r = makeRound('2026-11-01', 9, () => ({ penalties: 1, strokes: 6 }));
  assert.equal(roundLosses(r, roundMetrics(r).scale).penalty, 18);
});

function run(rounds, target) {
  const metrics = rounds.map(roundMetrics);
  return diagnose(rounds, metrics, averageMetrics(metrics), target, '直近5ラウンド');
}

test('一番の課題: 目安との差が一番大きい項目。理由に数字が入る', () => {
  // 全ホールパー4で5打（+18 = 90）。うち6ホールはOBで +1打のペナルティ込み
  const rounds = [1, 2, 3].map((d) => makeRound(`2026-11-0${d}`, 18, (i) => (i < 6 ? { teeShot: 'ob', penalties: 1 } : {})));
  const d = run(rounds, 90);
  close(d.gap, 0);                       // 平均90、目標90
  assert.equal(d.top.key, 'penalty');    // ペナルティ6打 − 目安2打 = +4 が一番大きい
  close(d.top.diff, 4);
  assert.match(d.reason, /「OB・ペナルティ」による失点が1ラウンド平均6打/);
  assert.match(d.reason, /目標90の目安2打より4打多く/);
  assert.match(d.reason, /OB 6回/);
  assert.equal(d.fewData, false);
});

test('目標との差は、各項目の差の合計（＝平均のパーとの差 −（目標 − 72））', () => {
  const rounds = [makeRound('2026-11-01', 18, (i) => ({ strokes: i < 10 ? 6 : 5 }))]; // +28
  const d = run(rounds, 90);
  close(d.gap, 10);
  close(d.rows.reduce((s, r) => s + r.actual, 0), 28);
});

test('どの項目も目安以内なら課題なし。3ラウンド未満は参考値', () => {
  const d = run([makeRound('2026-11-01', 18, () => ({ strokes: 4 }))], 90);
  assert.equal(d.top, null);
  assert.match(d.reason, /どの項目も目標90の目安以内/);
  assert.equal(d.fewData, true);
});

test('小数1桁の表示（表は .0 を付け、文章では付けない）', () => {
  assert.equal(n1(4.56), '4.6');
  assert.equal(n1(2), '2.0');
  assert.equal(n1(null), '−');
  assert.equal(t1(2), '2');
  assert.equal(t1(4.56), '4.6');
});
