// 練習メニューを作る画面（場所・量・課題を選んで、球数つきのメニューを出す）

import { esc } from '../../ui/html.js';
import { toDateOnly } from '../../core/dates.js';
import { getAll } from '../../db/database.js';
import { getSettings, saveSettings } from '../settings/settings-store.js';
import { selectRounds, roundMetrics, averageMetrics } from '../analysis/analysis-metrics.js';
import { diagnose } from '../analysis/analysis-rules.js';
import { PLACES, ISSUE_TOPICS, topicLabel, issuesFromAnalysis, issuesFromManual, buildMenu, ratingsByDrill } from './practice-rules.js';
import { listDrills, listSessions, saveSession, getPlannedSession, sessionFromMenu } from './practice-store.js';
import { renderPracticeRecord } from './practice-record-view.js';
import { drillCard } from './drill-card.js';

const AMOUNTS = { balls: [50, 100, 150, 200], minutes: [30, 60, 90] };
export const UNIT_LABEL = { balls: '球', minutes: '分' };
const BLOCK_LABEL = { warmup: 'ウォームアップ', main: '一番の課題', second: '2番目の課題', finish: '仕上げ' };

// 画面の状態（タブを開き直しても覚えておく）
const state = { issueMode: 'auto', manualMain: ISSUE_TOPICS[0], manualSecond: ISSUE_TOPICS[1], menu: null };

// 弱点分析（直近5ラウンド）から課題の候補を作る。ラウンドがなければ null
async function analysisCandidates(targetScore) {
  const rounds = selectRounds(await getAll('rounds'), 'last5');
  if (rounds.length === 0) return null;
  const metrics = rounds.map(roundMetrics);
  return issuesFromAnalysis(diagnose(rounds, metrics, averageMetrics(metrics), targetScore, '直近5ラウンド').rows);
}

export async function renderPracticeMenu(root, message = '') {
  const planned = await getPlannedSession();
  if (planned) return renderPracticeRecord(root, planned, { onDone: (msg) => { state.menu = null; renderPracticeMenu(root, msg); } });

  const s = await getSettings();
  const place = s.lastPracticePlace;
  const unit = s.lastPracticeUnit;
  const amount = AMOUNTS[unit].includes(s.lastPracticeAmount) ? s.lastPracticeAmount : AMOUNTS[unit][1] ?? AMOUNTS[unit][0];
  const auto = await analysisCandidates(s.targetScore);
  if (!auto) state.issueMode = 'manual';
  const btn = (attr, v, on, label) => `<button type="button" class="choice" data-${attr}="${v}" aria-pressed="${on}">${label}</button>`;
  const opt = (sel) => ISSUE_TOPICS.map((k) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(topicLabel(k))}</option>`).join('');

  root.innerHTML = `
    ${message ? `<p class="info-box">${esc(message)}</p>` : ''}
    <h2>練習メニューを作る</h2>
    <h3>場所</h3>
    <div class="choices cols-3">${PLACES.map((p) => btn('place', p.key, p.key === place, p.label)).join('')}</div>
    <h3>量</h3>
    <div class="choices cols-2">${btn('unit', 'balls', unit === 'balls', '球数')}${btn('unit', 'minutes', unit === 'minutes', '時間')}</div>
    <div class="choices cols-4" style="margin-top:8px">${AMOUNTS[unit].map((a) => btn('amount', a, a === amount, a + UNIT_LABEL[unit])).join('')}</div>
    <h3>課題</h3>
    <div class="choices cols-2">
      ${btn('issue-mode', 'auto', state.issueMode === 'auto', '自動（弱点分析）')}${btn('issue-mode', 'manual', state.issueMode === 'manual', '自分で選ぶ')}
    </div>
    ${state.issueMode === 'auto' && auto
      ? `<p>一番: <b>${esc(auto[0].label)}</b>／2番目: <b>${esc(auto[1]?.label ?? '−')}</b><br><span class="small">弱点分析（直近5ラウンド）の目安との差が大きい順</span></p>`
      : `${auto ? '' : '<p class="small">ラウンドの記録がまだないので、課題を自分で選んでください。</p>'}
        <label class="field">一番の課題<select id="manual-main">${opt(state.manualMain)}</select></label>
        <label class="field">2番目の課題<select id="manual-second">${opt(state.manualSecond)}</select></label>`}
    <button type="button" class="big-button" id="make-menu">メニューを作る</button>
    <div id="menu-out"></div>`;

  const $ = (id) => root.querySelector('#' + id);
  const settingsNow = { place, unit, amount };

  async function make() {
    const drills = await listDrills();
    const candidates = state.issueMode === 'auto' && auto ? auto : issuesFromManual(state.manualMain, state.manualSecond);
    const ratings = ratingsByDrill(await listSessions());
    state.menu = { ...buildMenu({ drills, place, amount, candidates, shares: s.practiceShares, ratings }), place, unit, amount, drills };
    drawMenu();
  }

  function drawMenu() {
    const m = state.menu;
    if (!m || m.place !== place || m.unit !== unit || m.amount !== amount) { $('menu-out').innerHTML = ''; return; }
    const total = m.items.reduce((a, it) => a + it.amount, 0);
    $('menu-out').innerHTML = `
      <h2>メニュー（${PLACES.find((p) => p.key === place).label}・合計${total}${UNIT_LABEL[unit]}）</h2>
      ${m.notes.map((n) => `<p class="notice-inline">${esc(n)}</p>`).join('')}
      ${m.items.length === 0 ? '<p>この場所でできるドリルがありません。「ドリル集」でドリルを足してください。</p>' : ''}
      ${m.items.map((it) => drillCard({ block: BLOCK_LABEL[it.block], drill: it.drill, amount: `${it.amount}${UNIT_LABEL[unit]}`, reason: it.reason })).join('')}
      ${m.items.length ? `
        <button type="button" class="big-button secondary" id="remake">別のメニューにする</button>
        <button type="button" class="big-button" id="start">このメニューで練習する</button>` : ''}`;
  }

  root.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.place) settingsNow.place = b.dataset.place;
    if (b.dataset.unit) { settingsNow.unit = b.dataset.unit; settingsNow.amount = AMOUNTS[b.dataset.unit][1]; }
    if (b.dataset.amount) settingsNow.amount = Number(b.dataset.amount);
    if (b.dataset.issueMode) state.issueMode = b.dataset.issueMode;
    if (b.dataset.place || b.dataset.unit || b.dataset.amount) {
      await saveSettings({ lastPracticePlace: settingsNow.place, lastPracticeUnit: settingsNow.unit, lastPracticeAmount: settingsNow.amount });
    }
    if (b.dataset.place || b.dataset.unit || b.dataset.amount || b.dataset.issueMode) return renderPracticeMenu(root);
    if (b.id === 'make-menu' || b.id === 'remake') return make();
    if (b.id === 'start') {
      const session = sessionFromMenu(state.menu, { date: toDateOnly(new Date()), place, unit, amount });
      await saveSession(session);
      state.menu = null;
      return renderPracticeMenu(root);
    }
  };
  root.onchange = (e) => {
    if (e.target.id === 'manual-main') state.manualMain = e.target.value;
    if (e.target.id === 'manual-second') state.manualSecond = e.target.value;
  };
  drawMenu();
}
