// 番手の早見表（残り距離を入れると、キャリーの平均が近いクラブを2本まで出す）

import { esc } from '../../ui/html.js';
import { distanceClubs } from '../clubs/club-model.js';
import { listClubs } from '../clubs/club-store.js';
import { listDistanceRecords } from './distance-store.js';
import { filterRecords, statsByClub, yd } from './distance-stats.js';
import { adjustDistance, nearestClubs } from './club-finder.js';
import { getSettings } from '../settings/settings-store.js';

// remaining: 最初に入れておく残り距離（ホールの距離など。なければ空）
export async function openFinderDialog(remaining = null) {
  const settings = await getSettings();
  const records = filterRecords(await listDistanceRecords(), { excludeMiss: settings.distanceExcludeMiss, recentOnly: settings.distanceRecentOnly }, new Date());
  const rows = statsByClub(distanceClubs(await listClubs()), records);
  let direction = 'up'; // 高低差の向き（iPhoneの数字キーボードには「−」がないのでボタンで選ぶ）

  const dialog = document.createElement('dialog');
  dialog.innerHTML = `
    <h2>番手早見表</h2>
    <label class="field">残り距離（ヤード）
      <input type="number" inputmode="numeric" data-remaining value="${remaining ?? ''}">
    </label>
    <label class="field">高低差（メートル・入れたときだけ補正）
      <input type="number" inputmode="decimal" data-elev placeholder="例: 5">
    </label>
    <div class="choices cols-2" data-dir></div>
    <div class="finder-result" data-result role="status"></div>
    <p class="small">条件: ${settings.distanceExcludeMiss ? 'ミスショットを除く' : 'ミスショットも含む'}・${settings.distanceRecentOnly ? '直近90日' : '全期間'}（「振り返り」の飛距離で切り替え）</p>
    <button type="button" class="big-button secondary" data-close>閉じる</button>`;
  document.body.appendChild(dialog);
  const q = (sel) => dialog.querySelector(sel);

  function draw() {
    q('[data-dir]').innerHTML = [['up', '打ち上げ'], ['down', '打ち下ろし']]
      .map(([v, l]) => `<button type="button" class="choice" data-d="${v}" aria-pressed="${direction === v}">${l}</button>`).join('');
    const dist = Number(q('[data-remaining]').value);
    const elevAbs = Math.abs(Number(q('[data-elev]').value) || 0);
    if (!dist) { q('[data-result]').innerHTML = '<p>残り距離を入れてください。</p>'; return; }
    const elev = direction === 'up' ? elevAbs : -elevAbs;
    const target = adjustDistance(dist, elev, { up: settings.elevationUp, down: settings.elevationDown });
    const found = nearestClubs(rows, target);
    q('[data-result]').innerHTML = `
      ${elev ? `<p>補正後 <b>${target}y</b> として計算（${direction === 'up' ? '打ち上げ' : '打ち下ろし'}${elevAbs}m）</p>` : ''}
      ${found.length === 0 ? '<p>飛距離の記録がありません。「ラウンド前」タブで記録してください。</p>' : `
        <ul class="finder-list">
          ${found.map((f) => `<li><b>${esc(f.club.name)}</b> 平均${yd(f.mean)}y（${f.diff >= 0 ? '+' : '−'}${yd(Math.abs(f.diff))}）</li>`).join('')}
        </ul>`}`;
  }

  dialog.addEventListener('input', draw);
  dialog.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.d) { direction = b.dataset.d; draw(); }
    if ('close' in b.dataset) { dialog.close(); dialog.remove(); }
  });
  dialog.addEventListener('close', () => dialog.remove());
  draw();
  dialog.showModal();
}
