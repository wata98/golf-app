// 飛距離の推移グラフ（Chart.js を使う）。
// Chart.js は vendor/ に同梱しているので圏外でも動く。必要になったときだけ読み込む

import { dailyAverages } from './distance-stats.js';

let loading = null;
function loadChartJs() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/chart.umd.min.js';
      s.onload = () => resolve(window.Chart);
      s.onerror = () => reject(new Error('グラフの部品を読み込めませんでした。'));
      document.head.appendChild(s);
    });
  }
  return loading;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// 「2026-11-09」を日の通し番号（グラフの横軸）にする。目盛りが日付の区切りに合うよう、日単位の整数にする
function dayValue(date) {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

// 通し番号を「11/9」の形に戻す（目盛りの表示）
function dayLabel(value) {
  const d = new Date(value * DAY_MS);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

let current = null; // 表示中のグラフ（描き直す前に片付ける）

// all: そのクラブの全記録（期間で絞ったもの）/ used: 平均の線に使う記録（ミスを除く設定ならミス抜き）
// key: 'carry' または 'total'
export async function drawDistanceChart(canvas, { all, used, key }) {
  const Chart = await loadChartJs();
  if (current) current.destroy();
  const point = (r) => ({ x: dayValue(r.date), y: r[key] });
  const withValue = all.filter((r) => typeof r[key] === 'number');
  current = new Chart(canvas, {
    type: 'scatter',
    data: {
      datasets: [
        { label: '日ごとの平均', type: 'line', data: dailyAverages(used, key).map((d) => ({ x: dayValue(d.date), y: Math.round(d.value) })),
          borderColor: '#0b5d1e', backgroundColor: '#0b5d1e', borderWidth: 3, pointRadius: 4 },
        { label: '1球ごと', data: withValue.filter((r) => !r.isMiss).map(point), backgroundColor: '#000', pointRadius: 4 },
        { label: 'ミスショット', data: withValue.filter((r) => r.isMiss).map(point), backgroundColor: '#999', pointRadius: 4 },
      ],
    },
    options: {
      animation: false,
      scales: {
        x: { type: 'linear', ticks: { precision: 0, callback: (v) => (Number.isInteger(v) ? dayLabel(v) : ''), color: '#000', font: { size: 14 } } },
        y: { title: { display: true, text: 'ヤード', color: '#000' }, ticks: { color: '#000', font: { size: 14 } } },
      },
      plugins: { legend: { labels: { color: '#000', font: { size: 14 } } } },
    },
  });
}
