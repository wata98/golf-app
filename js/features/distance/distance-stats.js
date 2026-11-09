// 飛距離の集計（平均・中央値・ばらつき）。画面や保存から切り離した計算だけ。

import { daysSinceDate } from '../../core/dates.js';

export const RECENT_DAYS = 90;      // 「直近90日」
export const MIN_FOR_SPREAD = 4;    // ばらつきを出すのに必要な球数（少ないと当てにならない）

// 集計に使う記録を選ぶ。
// excludeMiss: ミスショットを除く / recentOnly: 今日を含めて直近90日だけ
export function filterRecords(records, { excludeMiss, recentOnly }, now) {
  return records.filter((r) => {
    if (excludeMiss && r.isMiss) return false;
    if (recentOnly && daysSinceDate(r.date, now) >= RECENT_DAYS) return false;
    return true;
  });
}

// 並べた数の、下から p（0〜1）の位置の値。間は比例で補う
function quantile(sorted, p) {
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// 数の一覧から、平均・中央値・ばらつき（上位25%と下位25%を除いた幅）を出す。
// ばらつきは4球以上のときだけ（それ未満は null）
export function describe(values) {
  const sorted = values.filter((v) => typeof v === 'number').sort((a, b) => a - b);
  const count = sorted.length;
  if (count === 0) return { count: 0, mean: null, median: null, low: null, high: null };
  const mean = sorted.reduce((s, v) => s + v, 0) / count;
  const spread = count >= MIN_FOR_SPREAD;
  return {
    count,
    mean,
    median: quantile(sorted, 0.5),
    low: spread ? quantile(sorted, 0.25) : null,
    high: spread ? quantile(sorted, 0.75) : null,
  };
}

// クラブごとの集計。clubs の並び順のまま返す
// 例: [{ club, carry: { count, mean, median, low, high }, total: {...} }]
export function statsByClub(clubs, records) {
  return clubs.map((club) => {
    const mine = records.filter((r) => r.clubId === club.id);
    return {
      club,
      carry: describe(mine.map((r) => r.carry)),
      total: describe(mine.map((r) => r.total)),
    };
  });
}

// 画面に出すヤード（整数に丸める。なければ「−」）
export function yd(value) {
  return value === null || value === undefined ? '−' : String(Math.round(value));
}

// 日ごとの平均（グラフの線に使う）。日付の古い順
export function dailyAverages(records, key) {
  const byDate = new Map();
  for (const r of records) {
    if (typeof r[key] !== 'number') continue;
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date).push(r[key]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, value: vals.reduce((s, v) => s + v, 0) / vals.length }));
}
