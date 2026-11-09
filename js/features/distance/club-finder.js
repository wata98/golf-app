// 番手の早見表の計算（高低差の補正と、近いクラブの選び方）。画面や保存から切り離した計算だけ。

// 高低差の補正の初期値: 高低差1メートルにつき1ヤード（一般的な目安。設定で変えられる）
export const DEFAULT_ELEVATION_UP = 1.0;   // 打ち上げ: 1mにつき何ヤード長く見積もるか
export const DEFAULT_ELEVATION_DOWN = 1.0; // 打ち下ろし: 1mにつき何ヤード短く見積もるか

// 残り距離（ヤード）を高低差（メートル。打ち上げは＋、打ち下ろしは−）で補正する。
// 高低差が空（null）や0なら、そのまま返す
export function adjustDistance(remaining, elevationM, { up, down }) {
  if (!elevationM) return remaining;
  const factor = elevationM > 0 ? up : down;
  return Math.round(remaining + elevationM * factor);
}

// キャリーの平均が target に近いクラブを、近い順に n 本まで。
// rows は distance-stats.js の statsByClub() の結果。キャリーの記録がないクラブは使わない
// 戻り値の例: [{ club, mean: 152.4, diff: 2.4 }]（diff = 平均 − 目標。＋なら目標より飛ぶ）
export function nearestClubs(rows, target, n = 2) {
  return rows
    .filter((row) => row.carry.mean !== null)
    .map((row) => ({ club: row.club, mean: row.carry.mean, diff: row.carry.mean - target }))
    .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff))
    .slice(0, n);
}
