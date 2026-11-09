// 「振り返り」タブ: 過去のラウンドの一覧・詳細・修正・削除

import { esc, confirmDialog } from '../../ui/html.js';
import { summarize, summarizeRound, formatDiff, isGir, isEntered } from '../round/round-stats.js';
import { teeShotShort } from '../round/round-model.js';
import { listFinishedRounds, getRound, deleteRound } from '../round/round-store.js';
import { summaryTable } from '../round/summary-view.js';
import { renderHoleView } from '../round/hole-view.js';
import { renderDistanceReview } from '../distance/distance-review-view.js';
import { renderAnalysis } from '../analysis/analysis-view.js';
import { renderPracticeReview } from '../practice/practice-review-view.js';
import { renderSwingTab } from '../swing/swing-tab.js';

export function setupReviewTab(root) {
  let mode = 'rounds'; // 'rounds'（ラウンド）/ 'distance'（飛距離）/ 'analysis'（分析）/ 'practice'（練習）/ 'swing'（スイング）
  const MODES = [['rounds', 'ラウンド'], ['distance', '飛距離'], ['analysis', '分析'], ['practice', '練習'], ['swing', 'スイング']];

  // 上の切り替え（ラウンド / 飛距離 / 分析 / 練習 / スイング）と、その中身
  async function show(message = '') {
    root.innerHTML = `
      <div class="choices cols-3 review-switch">
        ${MODES.map(([v, l]) => `<button type="button" class="choice" data-mode="${v}" aria-pressed="${mode === v}">${l}</button>`).join('')}
      </div>
      <div id="review-body"></div>`;
    root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; show(); }));
    const body = root.querySelector('#review-body');
    if (mode === 'distance') await renderDistanceReview(body);
    else if (mode === 'analysis') await renderAnalysis(body);
    else if (mode === 'practice') await renderPracticeReview(body);
    else if (mode === 'swing') await renderSwingTab(body);
    else await showRounds(body, message);
  }

  // ラウンドの一覧（新しい順）
  async function showRounds(body, message) {
    const rounds = await listFinishedRounds();
    body.innerHTML = `
      ${message ? `<p class="info-box">${esc(message)}</p>` : ''}
      <h2>過去のラウンド</h2>
      ${rounds.length === 0 ? '<p>まだ記録したラウンドがありません。</p>' : ''}
      <ul class="round-list">
        ${rounds.map((r) => {
          const s = summarize(r.holes);
          return `
            <li><button type="button" class="round-item" data-id="${esc(r.id)}">
              <span>${esc(r.date)}　${esc(r.courseName)}</span>
              <b>${s.score}（${formatDiff(s.diff)}）${s.holes < 18 ? `<span class="small"> ${s.holes}H</span>` : ''}</b>
            </button></li>`;
        }).join('')}
      </ul>`;
    body.querySelectorAll('.round-item').forEach((b) => b.addEventListener('click', () => showDetail(b.dataset.id)));
  }

  // 1ラウンドの詳細
  async function showDetail(id) {
    const round = await getRound(id);
    if (!round) return show('このラウンドは見つかりませんでした。');
    const s = summarizeRound(round);
    const notes = round.holes.filter((h) => h.note);
    root.innerHTML = `
      <button type="button" class="chip" data-d="list">◀ 一覧に戻る</button>
      <h2>${esc(round.date)} ${esc(round.courseName)}（${esc(round.teeName)}）</h2>
      ${summaryTable('この日の集計', s.total, 18)}
      ${holeTable(round)}
      ${notes.length ? `<h2>メモ</h2><ul>${notes.map((h) => `<li>${h.number}番: ${esc(h.note)}</li>`).join('')}</ul>` : ''}
      ${summaryTable('前半', s.front, 9)}
      ${summaryTable('後半', s.back, 9)}
      <button type="button" class="big-button" data-d="edit">修正する</button>
      <button type="button" class="big-button danger" data-d="delete">削除する</button>`;
    window.scrollTo(0, 0);

    root.querySelector('[data-d="list"]').addEventListener('click', () => show());
    root.querySelector('[data-d="edit"]').addEventListener('click', () => {
      renderHoleView(root, round, { mode: 'edit', startHole: 1, onExit: () => showDetail(id) });
      window.scrollTo(0, 0);
    });
    root.querySelector('[data-d="delete"]').addEventListener('click', async () => {
      if (await confirmDialog(`${round.date} ${round.courseName} のラウンドを削除します。元に戻せません。よろしいですか？`, '削除する', { danger: true })) {
        await deleteRound(id);
        show('ラウンドを削除しました。');
      }
    });
  }

  return { show };
}

// ホールごとの表（パー・打数・パット・ティーショット・パーオン・グリーン周り）
function holeTable(round) {
  const rows = round.holes.map((h) => {
    const entered = isEntered(h);
    return `
      <tr>
        <td>${esc(h.number)}</td><td>${esc(h.par)}</td>
        <td><b>${entered ? h.strokes : '−'}</b></td>
        <td>${entered ? h.putts : '−'}</td>
        <td>${teeShotShort(h.teeShot)}</td>
        <td>${entered && isGir(h) ? '●' : ''}</td>
        <td>${h.aroundGreen ? (h.aroundGreen >= 4 ? '4+' : h.aroundGreen) : ''}</td>
      </tr>`;
  }).join('');
  return `
    <table class="hole-table">
      <tr><th>H</th><th>パー</th><th>打数</th><th>パット</th><th>TS</th><th>PO</th><th>寄</th></tr>
      ${rows}
    </table>
    <p class="small">TS=ティーショット（FW/左/右/B=バンカー/OB/P=ペナルティ/乗/外）、PO=パーオン、寄=グリーン周りから何打</p>`;
}
