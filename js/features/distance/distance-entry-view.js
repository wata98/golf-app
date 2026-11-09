// 「ラウンド前」タブの飛距離の記録（クラブを選んで、キャリー・トータルを続けて入れる）

import { esc, confirmDialog } from '../../ui/html.js';
import { toDateOnly } from '../../core/dates.js';
import { distanceClubs } from '../clubs/club-model.js';
import { listClubs } from '../clubs/club-store.js';
import { listDistanceRecords, addDistanceRecord, deleteDistanceRecord } from './distance-store.js';
import { getSettings, saveSettings } from '../settings/settings-store.js';

const PLACES = [{ value: 'range', label: '練習場' }, { value: 'course', label: 'コース' }];
const MAX_YARDS = 450;

export async function renderDistanceEntry(root) {
  const clubs = distanceClubs(await listClubs());
  const settings = await getSettings();
  // 画面の状態（タブを開き直すまで覚えておく）
  const state = { date: toDateOnly(new Date()), place: settings.lastDistancePlace, clubId: null, isMiss: false };

  root.innerHTML = `
    <h2>飛距離を記録</h2>
    <label class="field">日付 <input type="date" id="dist-date" value="${state.date}"></label>
    <div class="choices cols-2" id="dist-place"></div>
    <h3>クラブ</h3>
    <div class="choices cols-4 club-grid" id="dist-clubs">
      ${clubs.map((c) => `<button type="button" class="choice" data-club="${esc(c.id)}" aria-pressed="false">${esc(c.name)}</button>`).join('')}
    </div>
    ${clubs.length ? '' : '<p>クラブが登録されていません。「設定」のマイクラブで登録してください。</p>'}
    <div class="dist-inputs">
      <label class="field">キャリー（y）<input type="number" inputmode="numeric" id="dist-carry" min="1" max="${MAX_YARDS}"></label>
      <label class="field">トータル（y）<input type="number" inputmode="numeric" id="dist-total" min="1" max="${MAX_YARDS}"></label>
    </div>
    <button type="button" class="choice" id="dist-miss" aria-pressed="false">ミスショット</button>
    <button type="button" class="big-button" id="dist-save">記録</button>
    <p class="status" id="dist-status" role="status"></p>
    <div id="dist-list"></div>`;

  const $ = (id) => root.querySelector('#' + id);
  const status = (text, isError = false) => { $('dist-status').textContent = text; $('dist-status').classList.toggle('error', isError); };
  const clubName = (id) => clubs.find((c) => c.id === id)?.name ?? '（外したクラブ）';

  function drawToggles() {
    $('dist-place').innerHTML = PLACES.map((p) => `<button type="button" class="choice" data-place="${p.value}" aria-pressed="${state.place === p.value}">${p.label}</button>`).join('');
    for (const b of root.querySelectorAll('[data-club]')) b.setAttribute('aria-pressed', String(b.dataset.club === state.clubId));
    $('dist-miss').setAttribute('aria-pressed', String(state.isMiss));
  }

  // その日の記録の一覧（新しい順）。打ち間違いはここで消す
  async function drawList() {
    const records = (await listDistanceRecords()).filter((r) => r.date === state.date)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    $('dist-list').innerHTML = records.length === 0 ? '' : `
      <h3>${esc(state.date)} の記録（${records.length}球）</h3>
      <ul class="dist-records">
        ${records.map((r) => `
          <li><span><b>${esc(clubName(r.clubId))}</b> キャリー${r.carry ?? '−'} / トータル${r.total ?? '−'}${r.isMiss ? '（ミス）' : ''}</span>
          <button type="button" class="chip" data-del="${esc(r.id)}">消す</button></li>`).join('')}
      </ul>`;
  }

  // 数字の欄を読む。空なら null、おかしな数ならエラー
  function readYards(id) {
    const text = $(id).value.trim();
    if (text === '') return null;
    const v = Number(text);
    if (!Number.isFinite(v) || v <= 0 || v > MAX_YARDS) throw new Error(`1〜${MAX_YARDS}ヤードの数を入れてください。`);
    return Math.round(v);
  }

  async function save() {
    try {
      if (!state.clubId) throw new Error('クラブを選んでください。');
      const carry = readYards('dist-carry');
      const total = readYards('dist-total');
      if (carry === null && total === null) throw new Error('キャリーかトータルを入れてください。');
      if (carry !== null && total !== null && total < carry) throw new Error('トータルがキャリーより短くなっています。');
      // 次の球をすぐ入れられるよう、先に数字の欄を空にしてキャリーの欄に戻る（クラブ・日付・場所はそのまま）
      $('dist-carry').value = '';
      $('dist-total').value = '';
      $('dist-carry').focus();
      const wasMiss = state.isMiss;
      state.isMiss = false;
      drawToggles();
      await addDistanceRecord({ clubId: state.clubId, date: state.date, place: state.place, carry, total, isMiss: wasMiss });
      status(`${clubName(state.clubId)} キャリー${carry ?? '−'} / トータル${total ?? '−'}${wasMiss ? '（ミス）' : ''} を記録しました。`);
      await drawList();
    } catch (err) {
      status(err.message, true);
    }
  }

  root.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.place) { state.place = b.dataset.place; saveSettings({ lastDistancePlace: state.place }); }
    if (b.dataset.club) {
      state.clubId = b.dataset.club;
      // クラブを選んだら数字の欄を画面の上に出す（キーボードが出ても「記録」ボタンが隠れないように）
      $('dist-carry').focus({ preventScroll: true });
      root.querySelector('.dist-inputs').scrollIntoView({ block: 'start' });
    }
    if (b.id === 'dist-miss') state.isMiss = !state.isMiss;
    if (b.id === 'dist-save') return save();
    if (b.dataset.del && (await confirmDialog('この記録を消します。よろしいですか？', '消す', { danger: true }))) {
      await deleteDistanceRecord(b.dataset.del);
      await drawList();
      return;
    }
    drawToggles();
  };
  $('dist-date').onchange = (e) => { state.date = e.target.value || toDateOnly(new Date()); drawList(); };

  drawToggles();
  await drawList();
}
