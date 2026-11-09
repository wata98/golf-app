// ドリル集の一覧（課題ごと）。押すと編集、追加、最初のドリル集に戻す

import { esc, confirmDialog } from '../../ui/html.js';
import { TOPICS, placeLabel } from './practice-rules.js';
import { listDrills, resetDrills } from './practice-store.js';
import { newDrill } from './drill-model.js';
import { renderDrillEdit } from './drill-edit-view.js';

export async function renderDrillList(root, message = '') {
  const drills = await listDrills();
  root.innerHTML = `
    ${message ? `<p class="info-box">${esc(message)}</p>` : ''}
    <h2>ドリル集（${drills.length}個）</h2>
    <p class="small">押すと、やり方の確認・編集・削除ができます。</p>
    ${TOPICS.map((t) => {
      const mine = drills.filter((d) => d.topic === t.key).sort((a, b) => a.id.localeCompare(b.id));
      return `
        <details class="drill-group">
          <summary><b>${esc(t.label)}</b>（${mine.length}個）</summary>
          <ul class="drill-list">
            ${mine.map((d) => `
              <li><button type="button" class="round-item" data-drill="${esc(d.id)}">
                <span>${esc(d.name)}</span><span class="small">${d.places.map(placeLabel).join('・')}</span>
              </button></li>`).join('')}
          </ul>
          <button type="button" class="chip" data-add="${t.key}">＋ ${esc(t.label)}のドリルを追加</button>
        </details>`;
    }).join('')}
    <button type="button" class="big-button secondary" id="drills-reset">最初のドリル集に戻す</button>`;

  const back = (msg) => renderDrillList(root, msg);
  root.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.drill) return renderDrillEdit(root, drills.find((d) => d.id === b.dataset.drill), { isNew: false, onDone: back });
    if (b.dataset.add) return renderDrillEdit(root, newDrill(b.dataset.add, new Date()), { isNew: true, onDone: back });
    if (b.id === 'drills-reset' && (await confirmDialog('ドリル集を最初の40個に戻します。自分で足したドリルや直した内容は消えます（練習の記録は残ります）。よろしいですか？', '戻す', { danger: true }))) {
      await resetDrills();
      back('ドリル集を最初の40個に戻しました。');
    }
  };
}
