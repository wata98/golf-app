// 1つの解析結果: 4つの場面の静止画（骨格の線つき）と数値。過去の解析と並べて比べる。削除

import { esc, confirmDialog } from '../../ui/html.js';
import { PHASES, metricDiffs } from './swing-rules.js';
import { skeletonCanvas } from './swing-draw.js';
import { getSwing, listSwings, deleteSwing } from './swing-store.js';
import { metricsTable, viewLabel } from './swing-format.js';
import { listClubs } from '../clubs/club-store.js';

// onBack(message): 一覧に戻る
export async function renderSwingResult(root, id, { onBack, compareId = null }) {
  const swing = await getSwing(id);
  if (!swing) return onBack('この解析は見つかりませんでした。');
  const clubs = await listClubs();
  const clubName = (cid) => clubs.find((c) => c.id === cid)?.name ?? '';
  // 比べられるのは、同じ撮影方向の、ほかの解析
  const others = (await listSwings()).filter((s) => s.id !== id && s.view === swing.view);
  const other = compareId ? await getSwing(compareId) : null;
  const title = (s) => `${s.date} ${viewLabel(s.view)}${s.clubId ? `・${clubName(s.clubId)}` : ''}`;

  root.onclick = null;
  root.innerHTML = `
    <button type="button" class="chip" id="sr-back">◀ 一覧に戻る</button>
    <h2>${esc(title(swing))}</h2>
    <label class="field">比べる解析（同じ撮影方向）
      <select id="sr-compare">
        <option value="">比べない</option>
        ${others.map((s) => `<option value="${esc(s.id)}" ${s.id === compareId ? 'selected' : ''}>${esc(title(s))}</option>`).join('')}
      </select>
    </label>
    ${other ? `<p class="small">左が今回（${esc(swing.date)}）、右が比べる回（${esc(other.date)}）</p>` : ''}
    <div id="sr-phases"></div>
    <h2>数値</h2>
    ${metricsTable(swing.metrics, other ? metricDiffs(swing.metrics, other.metrics) : null)}
    ${swing.slow ? '<p class="small">この解析は、端末の速さに合わせて画像を小さくして行いました。</p>' : ''}
    <button type="button" class="big-button danger" id="sr-delete">この解析を削除</button>`;

  // 場面ごとに静止画を並べる（比べるときは左右に）
  const box = root.querySelector('#sr-phases');
  for (const p of PHASES) {
    const row = document.createElement('div');
    row.innerHTML = `<h3>${p.label}</h3><div class="${other ? 'compare-row' : ''}"></div>`;
    box.appendChild(row);
    const holder = row.querySelector('div');
    const width = other ? 300 : 480;
    holder.appendChild(await skeletonCanvas(swing.phases[p.key].image, swing.phases[p.key].landmarks, width));
    if (other?.phases?.[p.key]) holder.appendChild(await skeletonCanvas(other.phases[p.key].image, other.phases[p.key].landmarks, width));
  }

  root.querySelector('#sr-back').onclick = () => onBack('');
  root.querySelector('#sr-compare').onchange = (e) => renderSwingResult(root, id, { onBack, compareId: e.target.value || null });
  root.querySelector('#sr-delete').onclick = async () => {
    if (await confirmDialog(`${title(swing)} の解析を削除します。元に戻せません。よろしいですか？`, '削除する', { danger: true })) {
      await deleteSwing(id);
      onBack('解析を削除しました。');
    }
  };
}
