// コースマネジメントの計算の道具（確率・距離）。判定のルールそのものは course-rules.js にある。

// 標準正規分布の累積確率 Φ(x)（平均0・ばらつき1のとき、x以下になる確率）。
// 有名な近似式（Abramowitz と Stegun の式 7.1.26）を使う。誤差は0.0000002未満
export function normalCdf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

// 平均 mean・ばらつき sd で散らばる球が、from〜to の間に止まる確率
export function probBetween(mean, sd, from, to) {
  if (sd <= 0) return mean >= from && mean <= to ? 1 : 0;
  return Math.max(0, normalCdf((to - mean) / sd) - normalCdf((from - mean) / sd));
}

// 2つの地点（緯度・経度）の間の距離（メートル）。地球を球として計算する（ハバーサインの式）
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // 地球の半径（m）
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const METERS_PER_YARD = 0.9144;
export const metersToYards = (m) => m / METERS_PER_YARD;

// 「35.123, 139.456」のような文字から緯度・経度を読む（Googleマップなどからコピーした座標）。読めなければ null
export function parseLatLng(text) {
  const m = String(text).match(/(-?\d+(?:\.\d+)?)\s*[,，\s]\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
