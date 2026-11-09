// 「ラウンド中」タブ全体の切り替え
// 記録中のラウンドがなければ開始の画面、あればホール入力の画面を出す。

import { renderStartView } from './start-view.js';
import { renderCourseEditView } from './course-edit-view.js';
import { renderHoleView } from './hole-view.js';
import { summaryTable } from './summary-view.js';
import { summarizeRound } from './round-stats.js';
import { getPlayingRound, saveRound } from './round-store.js';

export function setupRoundTab(root) {
  // タブを開いたとき・アプリを開いたときに呼ぶ
  async function show(message = '') {
    const round = await getPlayingRound();
    if (round) showHole(round);
    else showStart(message);
  }

  function showStart(message) {
    renderStartView(root, {
      message,
      onStarted: (round) => showHole(round),
      onEditCourse: (course, teeName) => renderCourseEditView(root, course, teeName, { onDone: (msg) => showStart(msg) }),
    });
  }

  function showHole(round, startHole) {
    renderHoleView(root, round, {
      mode: 'playing',
      startHole,
      onHalf: () => showSummary(round, 'half'),
      onLast: () => showSummary(round, 'last'),
      onSummary: () => showSummary(round, 'menu'),
      onDeleted: () => showStart('ラウンドを削除しました。'),
    });
  }

  // 集計の画面。kind: 'half'（9番のあと）/ 'last'（18番のあと）/ 'menu'（メニューから）
  function showSummary(round, kind) {
    const s = summarizeRound(round);
    const buttons = {
      half: `
        <button type="button" class="big-button" data-s="back9">後半へ（10番） ▶</button>
        <button type="button" class="big-button secondary" data-s="finish">9ホールで終える</button>
        <button type="button" class="big-button secondary" data-s="return">◀ 9番に戻る</button>`,
      last: `
        <button type="button" class="big-button" data-s="finish">ラウンドを終える</button>
        <button type="button" class="big-button secondary" data-s="return">◀ 18番に戻る</button>`,
      menu: `<button type="button" class="big-button secondary" data-s="return">◀ ホール入力に戻る</button>`,
    }[kind];
    root.innerHTML = `
      ${kind === 'half' ? summaryTable('前半の集計', s.front, 9) : ''}
      ${kind !== 'half' ? summaryTable('この日の集計', s.total, 18) : ''}
      ${kind !== 'half' ? summaryTable('前半', s.front, 9) + summaryTable('後半', s.back, 9) : ''}
      ${buttons}`;
    window.scrollTo(0, 0);

    root.querySelector('[data-s="back9"]')?.addEventListener('click', async () => {
      round.currentHole = 10;
      await saveRound(round);
      showHole(round, 10);
    });
    root.querySelector('[data-s="return"]').addEventListener('click', () => showHole(round));
    root.querySelector('[data-s="finish"]')?.addEventListener('click', async () => {
      round.status = 'finished';
      await saveRound(round);
      showStart('ラウンドを記録しました。「振り返り」タブで見られます。');
    });
  }

  return { show };
}
