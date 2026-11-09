// 集計（スコア・パット数・FWキープ率・パーオン率・OB数）の表示

import { formatDiff, formatRate } from './round-stats.js';

// 集計1つ分の表。s は round-stats.js の summarize() の結果、expected はそのまとまりのホール数（9か18）
export function summaryTable(title, s, expected) {
  if (s.holes === 0) return `<h2>${title}</h2><p>まだ入力したホールがありません。</p>`;
  return `
    <h2>${title}</h2>
    <table class="summary-table">
      <tr><th>スコア</th><td>${s.score}（${formatDiff(s.diff)}）</td></tr>
      <tr><th>パット数</th><td>${s.putts}</td></tr>
      <tr><th>FWキープ率</th><td>${formatRate(s.fwRate)}${s.fwTotal ? `（${s.fwKept}/${s.fwTotal}）` : ''}</td></tr>
      <tr><th>パーオン率</th><td>${formatRate(s.girRate)}（${s.gir}/${s.holes}）</td></tr>
      <tr><th>OB数</th><td>${s.ob}</td></tr>
    </table>
    ${s.holes < expected ? `<p class="small">入力済みの${s.holes}ホール分です。</p>` : ''}`;
}
