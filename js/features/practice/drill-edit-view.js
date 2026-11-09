// ドリル1つの編集（名前・課題・やり方・ポイント・球数・時間・場所）と削除

import { esc, confirmDialog } from '../../ui/html.js';
import { TOPICS, PLACES } from './practice-rules.js';
import { saveDrill, deleteDrill } from './practice-store.js';
import { validateDrill } from './drill-model.js';

// onDone(message): 保存・削除・やめたとき（一覧に戻る）
export function renderDrillEdit(root, original, { isNew, onDone }) {
  const d = { ...original, places: [...original.places] };
  root.innerHTML = `
    <h2>${isNew ? 'ドリルを追加' : 'ドリルを編集'}</h2>
    <label class="field">名前<input type="text" id="de-name" value="${esc(d.name)}"></label>
    <label class="field">課題
      <select id="de-topic">${TOPICS.map((t) => `<option value="${t.key}" ${t.key === d.topic ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select>
    </label>
    <label class="field">やり方<textarea id="de-how" rows="4" class="memo-box">${esc(d.how)}</textarea></label>
    <label class="field">意識するポイント<textarea id="de-points" rows="3" class="memo-box">${esc(d.points)}</textarea></label>
    <div class="dist-inputs">
      <label class="field">球数の目安<input type="number" inputmode="numeric" id="de-balls" value="${esc(d.balls)}"></label>
      <label class="field">時間の目安（分）<input type="number" inputmode="numeric" id="de-minutes" value="${esc(d.minutes)}"></label>
    </div>
    <h3>できる場所（いくつでも）</h3>
    <div class="choices cols-3" id="de-places"></div>
    <p class="status error" id="de-error" role="alert"></p>
    <button type="button" class="big-button" id="de-save">保存する</button>
    <button type="button" class="big-button secondary" id="de-cancel">やめる</button>
    ${isNew ? '' : '<button type="button" class="big-button danger" id="de-delete">このドリルを削除</button>'}`;
  window.scrollTo(0, 0);

  const $ = (id) => root.querySelector('#' + id);
  const drawPlaces = () => {
    $('de-places').innerHTML = PLACES.map((p) => `<button type="button" class="choice" data-place="${p.key}" aria-pressed="${d.places.includes(p.key)}">${p.label}</button>`).join('');
  };
  drawPlaces();

  root.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.place) {
      const k = b.dataset.place;
      d.places = d.places.includes(k) ? d.places.filter((x) => x !== k) : [...d.places, k];
      return drawPlaces();
    }
    if (b.id === 'de-cancel') return onDone('');
    if (b.id === 'de-save') {
      Object.assign(d, {
        name: $('de-name').value.trim(), topic: $('de-topic').value, how: $('de-how').value.trim(), points: $('de-points').value.trim(),
        balls: Number($('de-balls').value), minutes: Number($('de-minutes').value),
      });
      const error = validateDrill(d);
      if (error) { $('de-error').textContent = error; return; }
      await saveDrill(d);
      return onDone(`「${d.name}」を保存しました。`);
    }
    if (b.id === 'de-delete' && (await confirmDialog(`「${d.name}」を削除します（練習の記録は残ります）。よろしいですか？`, '削除する', { danger: true }))) {
      await deleteDrill(d.id);
      onDone(`「${d.name}」を削除しました。`);
    }
  };
}
