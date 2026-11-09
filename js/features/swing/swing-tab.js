// 「振り返り」タブの「スイング」: 解析の一覧・撮り方・新しく解析する

import { esc } from '../../ui/html.js';
import { listSwings } from './swing-store.js';
import { viewLabel } from './swing-format.js';
import { GUIDE_HTML } from './swing-guide.js';
import { renderSwingAnalyze } from './swing-analyze-view.js';
import { renderSwingResult } from './swing-result-view.js';
import { skeletonCanvas } from './swing-draw.js';

export async function renderSwingTab(root, message = '') {
  const swings = await listSwings();
  const back = (msg) => renderSwingTab(root, msg);
  root.onclick = null;
  root.innerHTML = `
    ${message ? `<p class="info-box">${esc(message)}</p>` : ''}
    <button type="button" class="big-button" id="sw-new">新しく解析する</button>
    <details class="drill-group"><summary><b>撮り方（正面・飛球線後方）</b></summary>${GUIDE_HTML}</details>
    <h2>過去の解析（${swings.length}）</h2>
    ${swings.length ? '' : '<p>まだ解析がありません。</p>'}
    <ul class="round-list" id="sw-list">
      ${swings.map((s) => `<li><button type="button" class="round-item swing-item" data-id="${esc(s.id)}"><span>${esc(s.date)} ${esc(viewLabel(s.view))}<br><span class="small">テンポ ${s.metrics.find((m) => m.key === 'tempo')?.value?.toFixed(1) ?? '−'}</span></span><span class="thumb" data-thumb="${esc(s.id)}"></span></button></li>`).join('')}
    </ul>`;

  root.querySelector('#sw-new').onclick = () => renderSwingAnalyze(root, { onDone: (id) => (id ? renderSwingResult(root, id, { onBack: back }) : back('')) });
  root.querySelector('#sw-list').onclick = (e) => {
    const b = e.target.closest('[data-id]');
    if (b) renderSwingResult(root, b.dataset.id, { onBack: back });
  };
  // 一覧の小さな絵（トップの場面）
  for (const s of swings) {
    const holder = root.querySelector(`[data-thumb="${CSS.escape(s.id)}"]`);
    if (holder && s.phases?.top?.image) holder.appendChild(await skeletonCanvas(s.phases.top.image, s.phases.top.landmarks, 72));
  }
}
