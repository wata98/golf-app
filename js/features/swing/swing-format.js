// スイングの数値の表示（小数の桁・単位・目安の印）

import { esc } from '../../ui/html.js';

export const VIEWS = [
  { key: 'front', label: '正面' },
  { key: 'behind', label: '飛球線後方' },
];
export const viewLabel = (k) => VIEWS.find((v) => v.key === k)?.label ?? k;

// 小数の桁（秒は2桁、テンポは1桁、ほかは整数）と、単位の短い表示
const digitsOf = (m) => (m.unit === '秒' ? 2 : m.key === 'tempo' ? 1 : 0);
const unitOf = (m) => (m.unit.startsWith('%') ? '%' : m.unit);

// 数値を表示用に。向きのある数値（頭・腰の動き、前傾の変化）は＋を付ける
export function fmt(m, value = m.value) {
  if (value == null) return '測れず';
  const signed = m.key.startsWith('head') || m.key.startsWith('hip') || m.key.startsWith('spineChange');
  return `${signed && value > 0 ? '+' : ''}${value.toFixed(digitsOf(m))}${unitOf(m)}`;
}

// 差を表示用に（いつも＋か−を付ける。桁は元の数値と同じ）
export function fmtDiff(m, diff) {
  if (diff == null) return '−';
  return `${diff > 0 ? '+' : ''}${diff.toFixed(digitsOf(m))}${unitOf(m)}`;
}

// 数値の表。diffs があれば「前回」「差」の列も出す（metricDiffs の結果）
export function metricsTable(metrics, diffs = null) {
  const unitNotes = [...new Set(metrics.map((m) => m.unit).filter((u) => u.startsWith('%')))];
  return `
    <table class="loss-table swing-table">
      <tr><th>項目</th><th>${diffs ? '今回' : '値'}</th>${diffs ? '<th>比べる回</th><th>差</th>' : ''}</tr>
      ${(diffs ?? metrics).map((m) => `
        <tr>
          <td>${esc(m.label)}${m.note ? ' <span class="tag">目安</span>' : ''}</td>
          <td><b>${esc(fmt(m))}</b></td>
          ${diffs ? `<td>${esc(fmt(m, m.before))}</td><td><b>${esc(fmtDiff(m, m.diff))}</b></td>` : ''}
        </tr>`).join('')}
    </table>
    ${unitNotes.length ? `<p class="small">${esc(unitNotes.join('・'))}。「設定」で身長を入れると cm の目安で出ます。</p>` : ''}
    <p class="small">「測れず」は、その場面で体の点の信頼度が低かったもの。「目安」は、平面の動画では実際とずれやすいもの。</p>`;
}
