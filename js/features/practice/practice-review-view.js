// 「振り返り」タブの「練習」（練習回数・課題の内訳・最近の練習）

import { esc } from '../../ui/html.js';
import { listSessions } from './practice-store.js';
import { practiceCounts, topicBreakdown, doneSessions, RECENT_DAYS } from './practice-stats.js';
import { placeLabel } from './practice-rules.js';

const one = (v) => (v == null ? '−' : (Math.round(v * 10) / 10).toFixed(1));

export async function renderPracticeReview(root) {
  const sessions = await listSessions();
  const counts = practiceCounts(sessions, new Date());
  const rows = topicBreakdown(sessions);
  const maxDrills = Math.max(1, ...rows.map((r) => r.drills));
  const recent = doneSessions(sessions).slice(0, 10);

  root.innerHTML = `
    <h2>練習回数</h2>
    <table class="summary-table">
      <tr><th>全期間</th><td>${counts.total}回</td></tr>
      <tr><th>直近${RECENT_DAYS}日</th><td>${counts.recent}回</td></tr>
    </table>
    ${counts.total === 0 ? '<p>まだ練習の記録がありません。「ラウンド前」タブの練習メニューから記録できます。</p>' : `
      <h2>練習した課題の内訳</h2>
      <ul class="bar-list">
        ${rows.filter((r) => r.drills > 0).map((r) => `
          <li>
            <div class="bar-label"><b>${esc(r.label)}</b><span>${r.drills}ドリル${r.balls ? `・${r.balls}球` : ''}${r.minutes ? `・${r.minutes}分` : ''}・手応え${one(r.avgRating)}</span></div>
            <div class="bar"><div class="bar-fill" style="width:${Math.round((r.drills / maxDrills) * 100)}%"></div></div>
          </li>`).join('')}
      </ul>
      <p class="small">手応えは1〜5の平均（入れたものだけ）。</p>
      <h2>最近の練習</h2>
      <ul class="dist-records">
        ${recent.map((s) => {
          const rated = s.items.filter((it) => it.rating != null);
          const avg = rated.length ? rated.reduce((a, it) => a + it.rating, 0) / rated.length : null;
          return `<li><span><b>${esc(s.date)}</b> ${esc(placeLabel(s.place))}・${esc(s.mainLabel || '−')}<br><span class="small">手応え${one(avg)}${s.note ? `・${esc(s.note)}` : ''}</span></span></li>`;
        }).join('')}
      </ul>`}`;
}
