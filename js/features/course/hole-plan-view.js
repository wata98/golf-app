// 1ホールの攻略プラン: 自動の提案・手直し・ハザードの登録・グリーンの位置

import { esc, confirmDialog } from '../../ui/html.js';
import { getCourse } from '../round/round-store.js';
import { distanceClubs } from '../clubs/club-model.js';
import { HAZARD_KINDS, HAZARD_SIDES, AIMS, describeHazard, validateHazard } from './hazard-model.js';
import { getHoleNote, saveHoleNote, loadPlanContext, planFor } from './course-store.js';
import { renderGreenMap } from './green-map-view.js';

// args: { courseId, teeName, holeNumber, onBack(message) }
export async function renderHolePlan(root, args) {
  const { courseId, teeName, holeNumber, onBack } = args;
  const course = await getCourse(courseId);
  const tee = course.tees.find((t) => t.name === teeName);
  const hole = tee.holes.find((h) => h.number === holeNumber);
  const note = await getHoleNote(courseId, teeName, holeNumber);
  const ctx = await loadPlanContext();
  const p = planFor(hole, note, ctx);
  const clubs = distanceClubs(ctx.clubs);
  const green = (course.greens ?? []).find((g) => g.holeNumber === holeNumber);
  const draft = { kind: 'ob', side: 'right' }; // 追加するハザードの選択
  const plan = { clubId: note.plan?.clubId ?? p.suggestion.club?.id ?? '', aim: note.plan?.aim ?? p.suggestion.aim ?? 'center', note: note.plan?.note ?? '' };
  const go = (n) => renderHolePlan(root, { ...args, holeNumber: n });

  root.innerHTML = `
    <div class="hole-title">
      <button type="button" class="chip" id="hp-back">◀ 一覧</button>
      <span class="hole-no" style="margin-left:auto">${holeNumber}番</span>
    </div>
    <p>${esc(course.name)}（${esc(teeName)}）パー${esc(hole.par)}${hole.yards ? `・${esc(hole.yards)}y` : '・距離未登録'}</p>

    <div class="weakness plan-box">
      <div class="small">${p.manual ? '手直ししたプラン' : '自動の提案'}</div>
      <div class="weakness-title">${esc(p.short)}</div>
      ${p.manual ? '' : `<p class="weakness-reason">${p.suggestion.lines.map(esc).join('<br>')}</p>`}
    </div>
    ${p.manual ? `<details><summary>自動の提案を見る</summary><p><b>${esc(p.suggestion.short)}</b><br>${p.suggestion.lines.map(esc).join('<br>')}</p></details>` : ''}

    <h2>手直し</h2>
    <label class="field">ティーショットのクラブ
      <select id="hp-club">${clubs.map((c) => `<option value="${esc(c.id)}" ${c.id === plan.clubId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    </label>
    <div class="choices cols-3" id="hp-aim">${AIMS.map((a) => `<button type="button" class="choice" data-aim="${a.key}" aria-pressed="${a.key === plan.aim}">${a.label}</button>`).join('')}</div>
    <label class="field">一言メモ<input type="text" id="hp-note" value="${esc(plan.note)}" placeholder="例: 左の木の右を狙う"></label>
    <button type="button" class="big-button" id="hp-save-plan">このプランを保存</button>
    ${p.manual ? '<button type="button" class="big-button secondary" id="hp-clear-plan">手直しを消して自動の提案に戻す</button>' : ''}

    <h2>ハザード（${note.hazards.length}）</h2>
    <ul class="dist-records">
      ${note.hazards.map((h, i) => `<li><span><b>${esc(describeHazard(h))}</b></span><button type="button" class="chip" data-del-hazard="${i}">消す</button></li>`).join('') || '<li>まだ登録がありません。</li>'}
    </ul>
    <details class="drill-group" ${note.hazards.length ? '' : 'open'}>
      <summary>＋ ハザードを追加</summary>
      <h3>種類</h3><div class="choices cols-2" id="hz-kind"></div>
      <h3>位置</h3><div class="choices cols-3" id="hz-side"></div>
      <div class="dist-inputs" id="hz-dist">
        <label class="field">ティーから（y）<input type="number" inputmode="numeric" id="hz-from" placeholder="例: 200"></label>
        <label class="field">〜（y）<input type="number" inputmode="numeric" id="hz-to" placeholder="例: 250"></label>
      </div>
      <p class="small">「キャリー230yで越える」バンカーなら、始まり〜230と入れます。</p>
      <p class="status error" id="hz-error"></p>
      <button type="button" class="big-button secondary" id="hz-add">追加する</button>
    </details>

    <h2>グリーンの位置（GPS用）</h2>
    <p>${green ? `登録済み（${green.lat.toFixed(5)}, ${green.lng.toFixed(5)}）` : 'まだ登録していません。ラウンド中にGPSでグリーン中央までの距離を出すときに使います。'}</p>
    <button type="button" class="big-button secondary" id="hp-map">${green ? '地図で直す' : '地図で登録'}</button>

    <div class="hole-nav">
      <button type="button" class="big-button secondary" data-go="${holeNumber - 1}" ${holeNumber === 1 ? 'disabled' : ''}>◀ ${holeNumber > 1 ? `${holeNumber - 1}番` : '前'}</button>
      <button type="button" class="big-button" data-go="${holeNumber + 1}" ${holeNumber === tee.holes.length ? 'disabled' : ''}>${holeNumber < tee.holes.length ? `${holeNumber + 1}番` : '次'} ▶</button>
    </div>`;
  window.scrollTo(0, 0);

  const $ = (id) => root.querySelector('#' + id);
  const drawDraft = () => {
    $('hz-kind').innerHTML = HAZARD_KINDS.map((k) => `<button type="button" class="choice" data-kind="${k.key}" aria-pressed="${draft.kind === k.key}">${k.label}</button>`).join('');
    $('hz-side').innerHTML = HAZARD_SIDES.map((s) => `<button type="button" class="choice" data-side="${s.key}" aria-pressed="${draft.side === s.key}">${s.label}</button>`).join('');
    $('hz-dist').hidden = draft.side === 'green';
  };
  drawDraft();

  root.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'hp-back') return onBack('');
    if (b.dataset.go) return go(Number(b.dataset.go));
    if (b.dataset.kind) { draft.kind = b.dataset.kind; return drawDraft(); }
    if (b.dataset.side) { draft.side = b.dataset.side; return drawDraft(); }
    if (b.dataset.aim) {
      plan.aim = b.dataset.aim;
      root.querySelectorAll('[data-aim]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.aim === plan.aim)));
      return;
    }
    if (b.id === 'hz-add') {
      const num = (id) => ($(id).value.trim() === '' ? NaN : Math.round(Number($(id).value)));
      const h = draft.side === 'green' ? { kind: draft.kind, side: 'green', from: null, to: null } : { kind: draft.kind, side: draft.side, from: num('hz-from'), to: num('hz-to') };
      const error = validateHazard(h);
      if (error) { $('hz-error').textContent = error; return; }
      note.hazards.push(h);
      await saveHoleNote(note);
      return go(holeNumber);
    }
    if (b.dataset.delHazard && (await confirmDialog(`「${describeHazard(note.hazards[Number(b.dataset.delHazard)])}」を消します。よろしいですか？`, '消す', { danger: true }))) {
      note.hazards.splice(Number(b.dataset.delHazard), 1);
      await saveHoleNote(note);
      return go(holeNumber);
    }
    if (b.id === 'hp-save-plan') {
      note.plan = { clubId: $('hp-club').value, aim: plan.aim, note: $('hp-note').value.trim() };
      await saveHoleNote(note);
      return go(holeNumber);
    }
    if (b.id === 'hp-clear-plan') {
      note.plan = null;
      await saveHoleNote(note);
      return go(holeNumber);
    }
    if (b.id === 'hp-map') return renderGreenMap(root, { course, holeNumber, onDone: () => go(holeNumber) });
  };
}
