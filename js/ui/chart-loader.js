// グラフの部品（Chart.js）を読み込む。
// vendor/ に同梱しているので圏外でも動く。グラフを出すときだけ読み込む（起動を遅くしないため）

let loading = null;

export function loadChartJs() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/chart.umd.min.js';
      s.onload = () => resolve(window.Chart);
      s.onerror = () => { loading = null; reject(new Error('グラフの部品を読み込めませんでした。')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

// 見やすい文字の設定（屋外でも読めるよう黒・大きめ）
export const AXIS_TICKS = { color: '#000', font: { size: 14 } };
