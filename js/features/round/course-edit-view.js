// ゴルフ場の18ホールのパー・距離をまとめて編集する画面

import { esc } from '../../ui/html.js';
import { ensureTee } from './round-model.js';
import { saveCourse } from './round-store.js';

const PARS = [3, 4, 5, 6];

// onDone(): 保存またはやめたとき
export function renderCourseEditView(root, course, teeName, { onDone }) {
  const tee = ensureTee(course, teeName);
  root.innerHTML = `
    <h2>${esc(course.name)}（${esc(tee.name)}ティー）</h2>
    <table class="course-table">
      <tr><th>ホール</th><th>パー</th><th>距離（ヤード）</th></tr>
      ${tee.holes.map((h, i) => `
        <tr>
          <td>${h.number}</td>
          <td><select data-par="${i}">${PARS.map((p) => `<option ${p === h.par ? 'selected' : ''}>${p}</option>`).join('')}</select></td>
          <td><input type="number" inputmode="numeric" min="0" max="999" data-yards="${i}" value="${esc(h.yards ?? '')}"></td>
        </tr>`).join('')}
    </table>
    <button type="button" id="course-save" class="big-button">保存する</button>
    <button type="button" id="course-cancel" class="big-button secondary">やめる</button>`;

  root.querySelector('#course-save').addEventListener('click', async () => {
    tee.holes.forEach((h, i) => {
      h.par = Number(root.querySelector(`[data-par="${i}"]`).value);
      const y = root.querySelector(`[data-yards="${i}"]`).value;
      h.yards = y === '' ? null : Math.round(Number(y));
    });
    await saveCourse(course);
    onDone('パー・距離を保存しました。');
  });
  root.querySelector('#course-cancel').addEventListener('click', () => onDone(''));
  window.scrollTo(0, 0);
}
