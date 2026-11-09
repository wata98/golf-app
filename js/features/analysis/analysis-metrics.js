// 弱点分析の指標（ラウンドごとの数字）の計算。画面や保存から切り離した計算だけ。
// 判定のルール（失点の数え方・目安・課題の決め方）は analysis-rules.js にある。

import { isEntered, isGir } from '../round/round-stats.js';

export const FULL_HOLES = 18;
export const MIN_HOLES = 9; // これより入力が少ないラウンドは分析に使わない

// 期間の切り替え
export const PERIODS = [
  { value: 'last5', label: '直近5ラウンド', count: 5 },
  { value: 'last10', label: '直近10ラウンド', count: 10 },
  { value: 'all', label: '全期間', count: Infinity },
];

// 分析に使うラウンドを選ぶ。完了したラウンドのうち9ホール以上入力したものを、
// 新しいほうから期間の数だけ取り、日付の古い順に並べて返す（グラフを左から古い順にするため）
export function selectRounds(rounds, period) {
  const count = PERIODS.find((p) => p.value === period)?.count ?? Infinity;
  const usable = rounds
    .filter((r) => r.status === 'finished' && r.holes.filter(isEntered).length >= MIN_HOLES)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
  return usable.slice(Math.max(0, usable.length - count));
}

// 割合（分母が0なら null）
const rate = (num, den) => (den > 0 ? num / den : null);

// 1ラウンドの指標。回数・打数は18ホール分に換算する（9ホールのラウンドなら2倍）
export function roundMetrics(round) {
  const holes = round.holes.filter(isEntered);
  const scale = FULL_HOLES / holes.length;
  const sum = (f) => holes.reduce((s, h) => s + (f(h) || 0), 0);
  const fwHoles = holes.filter((h) => h.par >= 4 && h.teeShot);
  const missed = holes.filter((h) => !isGir(h));                       // パーオンしなかったホール
  const missedRecorded = missed.filter((h) => h.aroundGreen != null);  // そのうちグリーン周りを記録したホール
  return {
    date: round.date,
    holes: holes.length,
    scale,
    score: sum((h) => h.strokes) * scale,
    par: sum((h) => h.par) * scale,
    overPar: sum((h) => h.strokes - h.par) * scale,
    putts: sum((h) => h.putts) * scale,
    fwRate: rate(fwHoles.filter((h) => h.teeShot === 'fairway').length, fwHoles.length),
    girRate: rate(holes.filter(isGir).length, holes.length),
    ob: holes.filter((h) => h.teeShot === 'ob').length * scale,
    penalties: sum((h) => h.penalties) * scale,
    bunkerRate: rate(holes.filter((h) => h.bunkers > 0).length, holes.length),
    // 寄せワン率: パーオンしなかったホールでグリーン周りを記録したうち、2打以内（チップイン・寄せワン）で上がった割合
    upDownRate: rate(missedRecorded.filter((h) => h.aroundGreen <= 2).length, missedRecorded.length),
    missedHoles: missed.length * scale,
    missedRecorded: missedRecorded.length * scale,
    threePutts: holes.filter((h) => h.putts >= 3).length * scale,
    bunkerShots: sum((h) => h.bunkers) * scale,
  };
}

// いくつかのラウンドの平均（null の値は除いて平均する）
export function averageMetrics(list) {
  const keys = list.length ? Object.keys(list[0]).filter((k) => typeof list[0][k] === 'number' || list[0][k] === null) : [];
  const out = {};
  for (const k of keys) {
    const vals = list.map((m) => m[k]).filter((v) => typeof v === 'number');
    out[k] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  }
  return out;
}

// パー別の成績: パー3・4・5ごとの、1ホールあたりのパーとの差の平均と、ホール数
export function parStats(rounds) {
  const result = {};
  for (const par of [3, 4, 5]) {
    const holes = rounds.flatMap((r) => r.holes.filter((h) => isEntered(h) && h.par === par));
    result[par] = { holes: holes.length, avgOver: holes.length ? holes.reduce((s, h) => s + h.strokes - h.par, 0) / holes.length : null };
  }
  return result;
}
