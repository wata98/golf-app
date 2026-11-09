// 「ラウンド前」タブの「攻略プラン」: ゴルフ場とティーを選ぶと、18ホールの攻略プランを一覧で出す

import { esc } from '../../ui/html.js';
import { listCourses, saveCourse } from '../round/round-store.js';
import { newCourse, ensureTee } from '../round/round-model.js';
import { renderCourseEditView } from '../round/course-edit-view.js';
import { holeNotesFor, loadPlanContext, planFor } from './course-store.js';
import { describeHazard } from './hazard-model.js';
import { renderHolePlan } from './hole-plan-view.js';

// 選んでいるゴルフ場とティー（タブを開き直しても覚えておく）
const state = { courseId: null, teeName: null };

export async function renderPlanList(root, message = '') {
  const courses = await listCourses();
  if (!courses.some((c) => c.id === state.courseId)) state.courseId = courses[0]?.id ?? null;
  const course = courses.find((c) => c.id === state.courseId);
  if (course && !course.tees.some((t) => t.name === state.teeName)) state.teeName = course.tees[0]?.name ?? null;
  const tee = course?.tees.find((t) => t.name === state.teeName);

  root.innerHTML = `
    ${message ? `<p class="info-box">${esc(message)}</p>` : ''}
    <h2>攻略プラン</h2>
    ${courses.length ? `
      <label class="field">ゴルフ場
        <select id="plan-course">${courses.map((c) => `<option value="${esc(c.id)}" ${c.id === state.courseId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
      </label>
      ${course?.tees.length ? `
        <div class="choices cols-4">${course.tees.map((t) => `<button type="button" class="choice" data-tee="${esc(t.name)}" aria-pressed="${t.name === state.teeName}">${esc(t.name)}</button>`).join('')}</div>` : ''}
    ` : '<p>ゴルフ場がまだ登録されていません。下で追加してください。</p>'}
    <div id="plan-rows"></div>
    <details class="drill-group">
      <summary>＋ ゴルフ場・ティーを追加</summary>
      <label class="field">ゴルフ場の名前（今のゴルフ場に別のティーを足すときは同じ名前）<input type="text" id="new-course-name" value="${course ? esc(course.name) : ''}"></label>
      <label class="field">ティー<input type="text" id="new-tee" placeholder="例: 白"></label>
      <button type="button" class="big-button secondary" id="add-course">追加する</button>
      <p class="status error" id="add-error"></p>
    </details>`;

  const $ = (id) => root.querySelector('#' + id);
  if (tee) {
    const notes = await holeNotesFor(course.id, tee.name);
    const ctx = await loadPlanContext();
    $('plan-rows').innerHTML = `
      <button type="button" class="big-button secondary" id="edit-pars">パー・距離を編集</button>
      ${ctx.profiles.length === 0 ? '<p class="notice-inline">飛距離の記録がないので、自動の提案は出せません。「飛距離を記録」で記録してください。</p>' : ''}
      <ul class="drill-list">
        ${tee.holes.map((h) => {
          const note = notes.get(h.number);
          const p = planFor(h, note, ctx);
          const hz = (note?.hazards ?? []).map(describeHazard).join('・');
          return `<li><button type="button" class="round-item plan-row" data-hole="${h.number}">
            <span><b>${esc(h.number)}番</b> パー${esc(h.par)}${h.yards ? ` ${esc(h.yards)}y` : ''}<br><span class="plan-short">${esc(p.short)}${p.manual ? '<span class="tag">手直し済み</span>' : ''}</span>${hz ? `<br><span class="small">${esc(hz)}</span>` : ''}</span>
          </button></li>`;
        }).join('')}
      </ul>`;
  }

  root.onchange = (e) => {
    if (e.target.id === 'plan-course') { state.courseId = e.target.value; state.teeName = null; renderPlanList(root); }
  };
  root.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const back = (msg) => renderPlanList(root, msg);
    if (b.dataset.tee) { state.teeName = b.dataset.tee; return back(); }
    if (b.dataset.hole) return renderHolePlan(root, { courseId: course.id, teeName: tee.name, holeNumber: Number(b.dataset.hole), onBack: back });
    if (b.id === 'edit-pars') return renderCourseEditView(root, course, tee.name, { onDone: back });
    if (b.id === 'add-course') {
      const name = $('new-course-name').value.trim();
      const teeName = $('new-tee').value.trim();
      if (!name || !teeName) { $('add-error').textContent = 'ゴルフ場の名前とティーを入れてください。'; return; }
      const c = courses.find((x) => x.name === name) ?? newCourse(name, new Date());
      c.greens ??= [];
      ensureTee(c, teeName);
      await saveCourse(c);
      state.courseId = c.id;
      state.teeName = teeName;
      back(`${name}（${teeName}ティー）を追加しました。「パー・距離を編集」でスコアカードの数字を入れてください。`);
    }
  };
}
