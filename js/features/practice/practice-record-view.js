// 練習の記録（練習後に、ドリルごとの手応えを5段階で入れ、メモを残す）

import { esc, confirmDialog } from '../../ui/html.js';
import { placeLabel } from './practice-rules.js';
import { listDrills, saveSession, deleteSession } from './practice-store.js';
import { drillCard } from './drill-card.js';

const UNIT_LABEL = { balls: '球', minutes: '分' };
const BLOCK_LABEL = { warmup: 'ウォームアップ', main: '一番の課題', second: '2番目の課題', finish: '仕上げ' };

// onDone(message): 記録を保存したとき・やめたとき
export async function renderPracticeRecord(root, session, { onDone }) {
  const drills = await listDrills();
  const byId = new Map(drills.map((d) => [d.id, d]));

  function draw() {
    root.innerHTML = `
      <h2>練習中（${esc(session.date)}・${esc(placeLabel(session.place))}）</h2>
      <p class="small">練習が終わったら、ドリルごとの手応えを1〜5で入れてください（5が一番よい）。手応えが低いドリルは、次のメニューに出やすくなります。</p>
      ${session.items.map((it, i) => drillCard({
        block: BLOCK_LABEL[it.block] ?? '',
        drill: byId.get(it.drillId),
        name: it.drillName,
        amount: `${it.amount}${UNIT_LABEL[session.unit] ?? ''}`,
        reason: it.reason,
        extra: `
          <div class="small" style="margin-top:8px">手応え</div>
          <div class="choices cols-5 rating">
            ${[1, 2, 3, 4, 5].map((r) => `<button type="button" class="choice" data-item="${i}" data-rating="${r}" aria-pressed="${it.rating === r}">${r}</button>`).join('')}
          </div>`,
      })).join('')}
      <label class="field">メモ<textarea rows="3" id="practice-note" class="memo-box">${esc(session.note)}</textarea></label>
      <button type="button" class="big-button" id="practice-done">練習を記録する</button>
      <button type="button" class="big-button danger" id="practice-cancel">この練習をやめる（記録を消す）</button>`;
  }

  root.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.rating) {
      const item = session.items[Number(b.dataset.item)];
      const r = Number(b.dataset.rating);
      item.rating = item.rating === r ? null : r; // もう一度押すと取り消し
      await saveSession(session);
      draw();
    }
    if (b.id === 'practice-done') {
      const unrated = session.items.filter((it) => it.rating == null).length;
      if (unrated && !(await confirmDialog(`手応えを入れていないドリルが${unrated}個あります。このまま記録しますか？`, '記録する'))) return;
      session.status = 'done';
      await saveSession(session);
      onDone('練習を記録しました。「振り返り」タブの「練習」で見られます。');
    }
    if (b.id === 'practice-cancel' && (await confirmDialog('この練習の記録を消します。元に戻せません。よろしいですか？', '消す', { danger: true }))) {
      await deleteSession(session.id);
      onDone('練習をやめました。');
    }
  };
  // メモは入力のたびに少し待って保存する
  let timer = null;
  root.oninput = (e) => {
    if (e.target.id !== 'practice-note') return;
    session.note = e.target.value;
    clearTimeout(timer);
    timer = setTimeout(() => saveSession(session), 500);
  };
  draw();
}
