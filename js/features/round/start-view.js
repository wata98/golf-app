// ラウンド開始の画面（日付・ゴルフ場・ティーを選んでスタート）

import { esc } from '../../ui/html.js';
import { toDateOnly } from '../../core/dates.js';
import { newCourse, ensureTee, newRound } from './round-model.js';
import { listCourses, saveCourse, saveRound } from './round-store.js';
import { openFinderDialog } from '../distance/finder-dialog.js';

const NEW = '__new__'; // 「新しいゴルフ場」を選んだときの値

// onStarted(round): スタートしたとき / onEditCourse(course, teeName): 「ゴルフ場を編集」
export async function renderStartView(root, { message = '', onStarted, onEditCourse }) {
  const courses = await listCourses();
  root.innerHTML = `
    ${message ? `<p class="info-box">${esc(message)}</p>` : ''}
    <button type="button" id="finder-button" class="big-button secondary">番手早見表</button>
    <h2>ラウンドを始める</h2>
    <label class="field">日付
      <input type="date" id="start-date" value="${toDateOnly(new Date())}">
    </label>
    <label class="field">ゴルフ場
      <select id="start-course">
        ${courses.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}
        <option value="${NEW}">＋ 新しいゴルフ場</option>
      </select>
    </label>
    <label class="field" id="new-course-field">新しいゴルフ場の名前
      <input type="text" id="start-course-name" autocomplete="off">
    </label>
    <label class="field">ティー
      <input type="text" id="start-tee" list="tee-list" autocomplete="off" placeholder="例: 白">
      <datalist id="tee-list"></datalist>
    </label>
    <p id="start-error" class="status error" role="alert"></p>
    <button type="button" id="start-button" class="big-button">スタート</button>
    <button type="button" id="edit-course-button" class="big-button secondary">ゴルフ場のパー・距離を編集</button>
    <p class="small">パー・距離を登録していないホールは、パー4で始まります。ラウンド中にも直せます。</p>`;

  const $ = (id) => root.querySelector('#' + id);
  const findCourse = () => courses.find((c) => c.id === $('start-course').value);

  // ゴルフ場を選び直したら、ティーの候補と入力欄を合わせる
  function onCourseChange() {
    const course = findCourse();
    $('new-course-field').hidden = !!course;
    const tees = course ? course.tees.map((t) => t.name) : [];
    $('tee-list').innerHTML = tees.map((t) => `<option value="${esc(t)}">`).join('');
    $('start-tee').value = tees[0] || '';
  }
  $('start-course').addEventListener('change', onCourseChange);
  $('finder-button').addEventListener('click', () => openFinderDialog());
  onCourseChange();

  // 入力を確かめ、ゴルフ場（新しければ作る）とティーを用意する
  async function prepareCourse() {
    const teeName = $('start-tee').value.trim();
    let course = findCourse();
    if (!course) {
      const name = $('start-course-name').value.trim();
      if (!name) throw new Error('ゴルフ場の名前を入れてください。');
      // 同じ名前のゴルフ場がすでにあれば、それを使う
      course = courses.find((c) => c.name === name) || newCourse(name, new Date());
    }
    if (!teeName) throw new Error('ティーを入れてください（例: 白）。');
    ensureTee(course, teeName);
    await saveCourse(course);
    return { course, teeName };
  }

  $('start-button').addEventListener('click', async () => {
    try {
      const { course, teeName } = await prepareCourse();
      const date = $('start-date').value || toDateOnly(new Date());
      const round = newRound({ date, course, teeName }, new Date());
      await saveRound(round);
      onStarted(round);
    } catch (err) {
      $('start-error').textContent = err.message;
    }
  });

  $('edit-course-button').addEventListener('click', async () => {
    try {
      const { course, teeName } = await prepareCourse();
      onEditCourse(course, teeName);
    } catch (err) {
      $('start-error').textContent = err.message;
    }
  });
}
