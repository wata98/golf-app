// =====================================================================
// 弱点分析の判定ルール（このファイルだけで判定が決まる）
//
// 考え方:
//   1. 各ホールの「パーより多く打った分」を、記録からわかる項目（失点の項目）に分ける
//   2. 項目ごとに「目標スコアの人なら1ラウンドでこれくらい」という目安を決めておく
//   3. 実際の失点（1ラウンド平均）と目安の差が一番大きい項目を「今の一番の課題」にする
//
// 変えたいときは:
//   - 目安を変える → ALLOWANCE_TABLE の数字
//   - バンカー1回を何打と数えるか → BUNKER_STROKES
//   - 参考値と表示するラウンド数 → MIN_ROUNDS
//   - 項目の数え方 → CATEGORIES の perHole
//   - 理由の文章 → CATEGORIES の detail と explain()
// 変えたら tests/analysis-rules.test.js も合わせて直す。
// =====================================================================

import { isGir, formatRate } from '../round/round-stats.js';

// ラウンドがこれより少ないうちは「データが少ないので参考値です」と出す
export const MIN_ROUNDS = 3;

// バンカーに1回入ると何打失ったとみなすか（記録からは正確にわからないので目安）
export const BUNKER_STROKES = 0.5;

// 目標スコアは「パー72のコースで回ったときのスコア」として扱う。
// 例: 目標90 → パーより18打多くてよい。実際の失点も各ラウンドのパーとの差で数えるので、パー71のコースでも比べられる
export const STANDARD_PAR = 72;

// 失点の項目と、1ホールの失点の数え方。
// 5つを足すと、そのホールの「打数 − パー」とちょうど同じになるように作っている（ショットが残り全部を受け持つ）。
export const CATEGORIES = [
  {
    key: 'penalty',
    label: 'OB・ペナルティ',
    // ペナルティの打数そのもの
    perHole: (h) => h.penalties || 0,
    detail: (m) => `OB ${t1(m.ob)}回・ペナルティ ${t1(m.penalties)}打（1ラウンド平均）`,
  },
  {
    key: 'threePutt',
    label: '3パット以上',
    // 2パットを超えた分（3パットなら1打、4パットなら2打）
    perHole: (h) => Math.max(0, h.putts - 2),
    detail: (m) => `3パット以上のホール ${t1(m.threePutts)}個・パット ${t1(m.putts)}（1ラウンド平均）`,
  },
  {
    key: 'approach',
    label: 'アプローチが寄らない',
    // パーオンしなかったホールで、グリーン周りから3打以上かかった分（寄せワンなら2打）。
    // 3パットの分は「3パット以上」で数えるので、ここでは引く（同じ1打を2回数えないため）。
    // グリーン周りを記録していないホールは0として数える
    perHole: (h) => (!isGir(h) && h.aroundGreen != null ? Math.max(0, h.aroundGreen - 2 - Math.max(0, h.putts - 2)) : 0),
    detail: (m) => `寄せワン率 ${formatRate(m.upDownRate)}。パーオンしなかった ${t1(m.missedHoles)}ホールのうち、グリーン周りを記録したのは ${t1(m.missedRecorded)}ホール（記録していないホールは数えていません）`,
  },
  {
    key: 'bunker',
    label: 'バンカー',
    // バンカーに入った回数 × BUNKER_STROKES
    perHole: (h) => (h.bunkers || 0) * BUNKER_STROKES,
    detail: (m) => `バンカーに入った回数 ${t1(m.bunkerShots)}回（1ラウンド平均。1回${BUNKER_STROKES}打で計算）`,
  },
  {
    key: 'shot',
    label: 'ショット（グリーンに乗るまで）',
    // 残り全部: (打数 − パー) から上の4つを引いた分。バーディーなどでマイナスになることもある
    perHole: (h) => (h.strokes - h.par) - CATEGORIES.slice(0, 4).reduce((s, c) => s + c.perHole(h), 0),
    detail: (m) => `パーオン率 ${formatRate(m.girRate)}・FWキープ率 ${formatRate(m.fwRate)}`,
  },
];

// 目標スコアごとの目安（1ラウンドで、その項目の失点がこれくらいまでなら目標どおり）。
// 各行の5つを足すと「目標 − 72」になるようにしている。表の間の目標は比例で計算する。
export const ALLOWANCE_TABLE = [
  { target: 80, penalty: 1, threePutt: 1, approach: 1.5, bunker: 0.5, shot: 4 },
  { target: 90, penalty: 2, threePutt: 2, approach: 3, bunker: 1, shot: 10 },
  { target: 100, penalty: 4, threePutt: 3, approach: 5, bunker: 2, shot: 14 },
  { target: 110, penalty: 6, threePutt: 4, approach: 7, bunker: 3, shot: 18 },
];

// 目標スコアの目安を表から求める。
// 表の間 → 前後の行から比例で。表より上・下 → いちばん近い行を「目標 − 72」の比で大きく・小さくする
export function allowanceFor(target) {
  const rows = ALLOWANCE_TABLE;
  const pick = (f) => Object.fromEntries(CATEGORIES.map((c) => [c.key, f(c.key)]));
  const scaleRow = (row) => {
    const ratio = Math.max(0, target - STANDARD_PAR) / (row.target - STANDARD_PAR);
    return pick((k) => row[k] * ratio);
  };
  if (target <= rows[0].target) return scaleRow(rows[0]);
  if (target >= rows[rows.length - 1].target) return scaleRow(rows[rows.length - 1]);
  const i = rows.findIndex((r) => r.target >= target);
  const lo = rows[i - 1];
  const hi = rows[i];
  const t = (target - lo.target) / (hi.target - lo.target);
  return pick((k) => lo[k] + (hi[k] - lo[k]) * t);
}

// 1ラウンドの項目ごとの失点（18ホール分に換算）
export function roundLosses(round, scale) {
  const holes = round.holes.filter((h) => h.strokes != null);
  return Object.fromEntries(CATEGORIES.map((c) => [c.key, holes.reduce((s, h) => s + c.perHole(h), 0) * scale]));
}

// 判定する。rounds: 分析に使うラウンド / metrics: その各ラウンドの指標（analysis-metrics.js）/ avg: 指標の平均
// 戻り値: { gap: 目標との差, rows: 項目ごと, top: 一番の課題（なければ null）, reason: 理由の文章, fewData: 参考値か }
export function diagnose(rounds, metrics, avg, target, periodLabel) {
  const allowance = allowanceFor(target);
  const losses = rounds.map((r, i) => roundLosses(r, metrics[i].scale));
  const rows = CATEGORIES.map((c) => {
    const actual = losses.reduce((s, l) => s + l[c.key], 0) / losses.length; // 1ラウンド平均
    return { key: c.key, label: c.label, actual, allowance: allowance[c.key], diff: actual - allowance[c.key] };
  });
  // 目標との差 = 各項目の（実際 − 目安）の合計 = 平均の（パーとの差）−（目標 − 72）
  const gap = rows.reduce((s, r) => s + r.diff, 0);
  const worst = [...rows].sort((a, b) => b.diff - a.diff)[0];
  const top = worst.diff > 0 ? worst : null;
  return { gap, rows, top, reason: explain(top, avg, target, periodLabel), fewData: rounds.length < MIN_ROUNDS };
}

// 「なぜそう判定したか」の文章
function explain(top, avg, target, periodLabel) {
  if (!top) return `${periodLabel}では、どの項目も目標${target}の目安以内です。`;
  const cat = CATEGORIES.find((c) => c.key === top.key);
  return `${periodLabel}で、「${top.label}」による失点が1ラウンド平均${t1(top.actual)}打。` +
    `目標${target}の目安${t1(top.allowance)}打より${t1(top.diff)}打多く、ほかの項目より目安との差が大きいため。` +
    `\n使った数字: ${cat.detail(avg)}`;
}

// 小数1桁の表示（例: 4.6、6.0）。表で使う
export function n1(v) {
  return v === null || v === undefined ? '−' : (Math.round(v * 10) / 10).toFixed(1);
}

// 文章の中の数（小数1桁。ちょうどの数は「.0」を付けない。例: 4.6、6）
export function t1(v) {
  return n1(v).replace(/\.0$/, '');
}
