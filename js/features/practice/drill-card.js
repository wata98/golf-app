// ドリル1つ分の表示（メニュー・練習の記録で使う）

import { esc } from '../../ui/html.js';

// block: 「一番の課題」など / drill: ドリル（なければ名前だけ）/ amount: 「30球」など / reason: 選んだ理由
// extra: カードの下に足すもの（手応えのボタンなど）
export function drillCard({ block, drill, name, amount, reason, extra = '' }) {
  return `
    <div class="drill-card">
      <div class="drill-head">
        <span class="small">${esc(block)}</span>
        <b class="drill-amount">${esc(amount)}</b>
      </div>
      <div class="drill-name">${esc(drill?.name ?? name)}</div>
      ${reason ? `<div class="small">理由: ${esc(reason)}</div>` : ''}
      ${drill ? `
        <details>
          <summary>やり方とポイント</summary>
          <p><b>やり方</b><br>${esc(drill.how)}</p>
          <p><b>意識するポイント</b><br>${esc(drill.points)}</p>
        </details>` : ''}
      ${extra}
    </div>`;
}
