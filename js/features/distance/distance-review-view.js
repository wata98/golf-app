// 「振り返り」タブの飛距離（クラブごとの集計表と推移グラフ）

import { esc } from '../../ui/html.js';
import { distanceClubs } from '../clubs/club-model.js';
import { listClubs } from '../clubs/club-store.js';
import { listDistanceRecords } from './distance-store.js';
import { filterRecords, statsByClub, yd, MIN_FOR_SPREAD } from './distance-stats.js';
import { drawDistanceChart } from './distance-chart.js';
import { getSettings, saveSettings } from '../settings/settings-store.js';

// 画面の中だけで覚えておく選択（キャリー/トータル、グラフのクラブ）
const view = { key: 'carry', chartClubId: null };

export async function renderDistanceReview(root) {
  const settings = await getSettings();
  const clubs = distanceClubs(await listClubs());
  const all = await listDistanceRecords();
  const now = new Date();
  // 平均などに使う記録 / グラフの点に使う記録（ミスも灰色で出す）
  const used = filterRecords(all, { excludeMiss: settings.distanceExcludeMiss, recentOnly: settings.distanceRecentOnly }, now);
  const shown = filterRecords(all, { excludeMiss: false, recentOnly: settings.distanceRecentOnly }, now);
  const rows = statsByClub(clubs, used).filter((r) => r[view.key].count > 0);
  if (!view.chartClubId || !clubs.some((c) => c.id === view.chartClubId)) {
    view.chartClubId = (rows[0] ?? { club: clubs[0] })?.club?.id ?? null;
  }
  const toggle = (attr, on, label) => `<button type="button" class="choice" data-${attr} aria-pressed="${on}">${label}</button>`;

  root.innerHTML = `
    <div class="choices cols-2">
      ${toggle('miss', settings.distanceExcludeMiss, 'ミスショットを除く')}
      ${toggle('recent', settings.distanceRecentOnly, '直近90日だけ')}
    </div>
    <div class="choices cols-2" style="margin-top:8px">
      ${toggle('key-carry', view.key === 'carry', 'キャリー')}
      ${toggle('key-total', view.key === 'total', 'トータル')}
    </div>
    ${rows.length === 0 ? '<p>この条件の飛距離の記録がありません。「ラウンド前」タブで記録してください。</p>' : `
      <table class="dist-table">
        <tr><th>クラブ</th><th>球数</th><th>平均</th><th>中央値</th><th>ばらつき</th></tr>
        ${rows.map((r) => { const s = r[view.key]; return `
          <tr><td><b>${esc(r.club.name)}</b></td><td>${s.count}</td><td><b>${yd(s.mean)}</b></td><td>${yd(s.median)}</td>
          <td>${s.low === null ? '−' : `${yd(s.low)}〜${yd(s.high)}`}</td></tr>`; }).join('')}
      </table>
      <p class="small">ヤード。ばらつき＝上位25%と下位25%を除いた、真ん中の半分の球が入る幅（${MIN_FOR_SPREAD}球以上のとき）。</p>`}
    <h2>飛距離の推移</h2>
    <select id="chart-club" aria-label="グラフのクラブ">
      ${clubs.map((c) => `<option value="${esc(c.id)}" ${c.id === view.chartClubId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
    </select>
    <div class="chart-box"><canvas id="dist-chart" height="260"></canvas></div>
    <p class="status error" id="chart-error"></p>`;

  const rerender = () => renderDistanceReview(root);
  root.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if ('miss' in b.dataset) await saveSettings({ distanceExcludeMiss: !settings.distanceExcludeMiss });
    else if ('recent' in b.dataset) await saveSettings({ distanceRecentOnly: !settings.distanceRecentOnly });
    else if ('keyCarry' in b.dataset) view.key = 'carry';
    else if ('keyTotal' in b.dataset) view.key = 'total';
    else return;
    rerender();
  };
  root.querySelector('#chart-club').onchange = (e) => { view.chartClubId = e.target.value; rerender(); };

  const mine = (list) => list.filter((r) => r.clubId === view.chartClubId);
  try {
    await drawDistanceChart(root.querySelector('#dist-chart'), { all: mine(shown), used: mine(used), key: view.key });
  } catch (err) {
    root.querySelector('#chart-error').textContent = err.message;
  }
}
