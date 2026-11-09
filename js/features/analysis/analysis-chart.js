// 弱点分析の指標の推移グラフ（ラウンドごとの折れ線）

import { loadChartJs, AXIS_TICKS } from '../../ui/chart-loader.js';

// 選べる指標。percent: 割合（%で表示）/ perRound: 18ホール換算の数
export const TREND_METRICS = [
  { key: 'score', label: 'スコア', unit: '打' },
  { key: 'putts', label: 'パット数', unit: '' },
  { key: 'fwRate', label: 'FWキープ率', percent: true },
  { key: 'girRate', label: 'パーオン率', percent: true },
  { key: 'ob', label: 'OB数', unit: '回' },
  { key: 'penalties', label: 'ペナルティ数', unit: '打' },
  { key: 'bunkerRate', label: 'バンカー率', percent: true },
  { key: 'upDownRate', label: '寄せワン率', percent: true },
];

let current = null;

// metrics: ラウンドごとの指標（古い順）/ key: 指標 / target: 目標スコア（スコアのときだけ線を引く）
export async function drawTrendChart(canvas, metrics, key, target) {
  const Chart = await loadChartJs();
  if (current) current.destroy();
  const def = TREND_METRICS.find((m) => m.key === key);
  const value = (v) => (v === null ? null : def.percent ? Math.round(v * 100) : Math.round(v * 10) / 10);
  const labels = metrics.map((m) => { const [, mo, d] = m.date.split('-').map(Number); return `${mo}/${d}`; });
  const datasets = [{
    label: def.label + (def.percent ? '（%）' : ''),
    data: metrics.map((m) => value(m[key])),
    borderColor: '#0b5d1e', backgroundColor: '#0b5d1e', borderWidth: 3, pointRadius: 5, spanGaps: true,
  }];
  if (key === 'score') {
    datasets.push({ label: `目標 ${target}`, data: metrics.map(() => target), borderColor: '#b00020', borderDash: [8, 6], borderWidth: 2, pointRadius: 0 });
  }
  current = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      animation: false,
      scales: {
        x: { ticks: AXIS_TICKS },
        y: { ticks: AXIS_TICKS, ...(def.percent ? { min: 0, max: 100 } : {}) },
      },
      plugins: { legend: { labels: AXIS_TICKS } },
    },
  });
}
