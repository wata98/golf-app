// ホール入力の画面（打数・パット・ティーショットなど）。
// ボタンを押すたびに保存する。ラウンド中と、振り返りからの修正の両方で使う。

import { esc, confirmDialog } from '../../ui/html.js';
import { summarize, isGir, formatDiff } from './round-stats.js';
import {
  HOLE_COUNT, teeShotOptions, AROUND_GREEN, commitHole, shownStrokes, shownPutts, step, changePar, ensureTee,
} from './round-model.js';
import { saveRound, deleteRound, getCourse, saveCourse } from './round-store.js';
import { onSwipe } from './swipe.js';
import { holeEditDialog } from './hole-edit-dialog.js';
import { openFinderDialog } from '../distance/finder-dialog.js';
import { roundHolePlan, openPlanDialog, showGreenDistance, clearRoundPlanCache } from '../course/round-plan.js';

// opts.mode: 'playing'（ラウンド中）/ 'edit'（振り返りから修正）
// opts.onHalf(): 9番で「次へ」 / opts.onLast(): 18番で「次へ」
// opts.onSummary(): メニューの「集計を見る」 / opts.onDeleted(): 削除したあと / opts.onExit(): 修正を終える
export function renderHoleView(root, round, opts) {
  root.innerHTML = '';
  const el = document.createElement('div');
  root.appendChild(el);
  let index = Math.min(Math.max((opts.startHole ?? round.currentHole ?? 1) - 1, 0), HOLE_COUNT - 1);
  let memoTimer = null;

  const hole = () => round.holes[index];
  const save = () => saveRound(round).catch((err) => alert('保存できませんでした: ' + err.message));

  function render() {
    const h = hole();
    const strokes = shownStrokes(h);
    const putts = shownPutts(h);
    const gir = isGir({ ...h, strokes, putts });
    const total = summarize(round.holes);
    const last = h.number === HOLE_COUNT;
    const nextLabel = last ? (opts.mode === 'edit' ? '修正を終える' : '集計へ ▶') : h.number === 9 && opts.mode === 'playing' ? '前半の集計 ▶' : '次のホール ▶';
    el.innerHTML = `
      <div class="hole-header">
        <div class="hole-total">
          <span>合計 <b>${total.score}</b>（${formatDiff(total.diff)}）<span class="small">${total.holes}H</span></span>
          <button type="button" class="chip" data-act="finder">早見表</button>
        </div>
        <div class="hole-title">
          <span class="hole-no">${h.number}番</span>
          <button type="button" class="chip" data-act="edit-hole">パー${h.par}${h.yards ? `・${h.yards}y` : ''} ✎</button>
          <button type="button" class="chip" data-act="menu">${opts.mode === 'edit' ? '修正を終える' : 'メニュー'}</button>
        </div>
      </div>
      ${opts.mode === 'playing' ? `
        <button type="button" class="plan-line" data-act="plan" hidden></button>
        <div class="gps-line" hidden></div>` : ''}
      ${stepper('打数', strokes, 'strokes')}
      ${stepper('パット', putts, 'putts')}
      <p class="gir-line">${gir ? '● パーオン' : '○ パーオンならず'}</p>
      <h3>ティーショット</h3>
      <div class="choices cols-${h.par === 3 ? 2 : 3}">
        ${teeShotOptions(h.par).map((o) => choice('tee', o.value, o.label, h.teeShot === o.value)).join('')}
      </div>
      ${gir ? '' : `
        <h3>グリーン周りから何打で上がったか</h3>
        <div class="choices cols-4">
          ${AROUND_GREEN.map((o) => choice('around', o.value, o.label, h.aroundGreen === o.value)).join('')}
        </div>`}
      <div class="mini-steppers">
        ${miniStepper('ペナルティ', h.penalties, 'penalties')}
        ${miniStepper('バンカー', h.bunkers, 'bunkers')}
      </div>
      <details class="memo" ${h.note ? 'open' : ''}>
        <summary>一言メモ</summary>
        <textarea rows="2" data-memo>${esc(h.note)}</textarea>
      </details>
      <div class="hole-nav">
        <button type="button" class="big-button secondary" data-act="prev" ${index === 0 ? 'disabled' : ''}>◀ 前のホール</button>
        <button type="button" class="big-button" data-act="next">${nextLabel}</button>
      </div>`;
    if (opts.mode === 'playing') fillPlan(h);
  }

  // 攻略プランの1行とグリーンまでの距離（機能5）。ホールごとに一度だけ読み込んで覚えておく
  const planCache = new Map();
  async function fillPlan(h) {
    if (!planCache.has(h.number)) planCache.set(h.number, roundHolePlan(round, h).catch(() => null));
    const info = await planCache.get(h.number);
    if (hole() !== h) return; // 読み込み中に別のホールへ移った
    const line = el.querySelector('.plan-line');
    if (!line || !info) return;
    line.hidden = false;
    line.textContent = `攻略: ${info.p.short}${info.p.manual ? '' : '（自動）'} ›`;
    showGreenDistance(el.querySelector('.gps-line'), info.green);
  }

  // ボタンが押されたとき。どのボタンかは data-act などで見分ける
  el.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const h = hole();
    const act = btn.dataset.act;
    if (act === 'prev') return move(-1);
    if (act === 'next') return goNext();
    if (act === 'edit-hole') return editHole();
    if (act === 'finder') return openFinderDialog(h.yards); // ホールの距離を最初に入れておく
    if (act === 'plan') {
      const info = await planCache.get(h.number);
      if (info) openPlanDialog(h, info);
      return;
    }
    if (act === 'menu') return opts.mode === 'edit' ? opts.onExit() : openMenu();

    commitHole(h); // 何か押したら、そのホールは入力済みにする
    if (act === 'strokes+') h.strokes = step(h.strokes, 1, 1);
    if (act === 'strokes-') h.strokes = step(h.strokes, -1, 1);
    if (act === 'putts+') h.putts = step(h.putts, 1, 0);
    if (act === 'putts-') h.putts = step(h.putts, -1, 0);
    if (act === 'penalties+') h.penalties = step(h.penalties, 1, 0);
    if (act === 'penalties-') h.penalties = step(h.penalties, -1, 0);
    if (act === 'bunkers+') h.bunkers = step(h.bunkers, 1, 0);
    if (act === 'bunkers-') h.bunkers = step(h.bunkers, -1, 0);
    // 選んでいるものをもう一度押すと、選択を外す
    if (btn.dataset.tee) h.teeShot = h.teeShot === btn.dataset.tee ? null : btn.dataset.tee;
    if (btn.dataset.around) {
      const v = Number(btn.dataset.around);
      h.aroundGreen = h.aroundGreen === v ? null : v;
    }
    if (h.putts > h.strokes) h.putts = h.strokes; // パット数は打数を超えない
    if (isGir(h)) h.aroundGreen = null; // パーオンならグリーン周りの記録は使わない
    save();
    render();
  });

  // メモは文字を打つたびに画面を作り直すと入力が途切れるので、少し待ってから保存だけする
  el.addEventListener('input', (e) => {
    if (!e.target.matches('[data-memo]')) return;
    const h = hole();
    commitHole(h);
    h.note = e.target.value;
    clearTimeout(memoTimer);
    memoTimer = setTimeout(save, 500);
  });

  function move(delta) {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= HOLE_COUNT) return;
    index = nextIndex;
    if (opts.mode === 'playing') {
      round.currentHole = index + 1; // 閉じても、このホールから再開できるように
      save();
    }
    render();
    window.scrollTo(0, 0);
  }

  // 「次へ」: 今のホールを入力済みにしてから進む。9番・18番では集計を出す
  async function goNext() {
    const h = hole();
    commitHole(h);
    clearTimeout(memoTimer);
    if (opts.mode === 'playing') round.currentHole = h.number;
    await save();
    if (h.number === HOLE_COUNT) return opts.mode === 'edit' ? opts.onExit() : opts.onLast();
    if (h.number === 9 && opts.mode === 'playing') return opts.onHalf();
    move(1);
  }

  // パー・距離を直す。ラウンド中はゴルフ場の登録にも反映して、次回から使う
  async function editHole() {
    const h = hole();
    const result = await holeEditDialog(h);
    if (!result) return;
    changePar(h, result.par);
    h.yards = result.yards;
    save();
    if (opts.mode === 'playing') {
      const course = await getCourse(round.courseId);
      if (course) {
        const ch = ensureTee(course, round.teeName).holes[index];
        ch.par = result.par;
        ch.yards = result.yards;
        await saveCourse(course);
      }
      // パー・距離が変わると攻略プランも変わるので、読み込み直す
      planCache.delete(h.number);
      clearRoundPlanCache();
    }
    render();
  }

  async function openMenu() {
    const dialog = document.createElement('dialog');
    dialog.innerHTML = `
      <button type="button" class="big-button" data-m="summary">集計を見る</button>
      <button type="button" class="big-button danger" data-m="delete">このラウンドを削除</button>
      <button type="button" class="big-button secondary" data-m="close">閉じる</button>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('click', async (e) => {
      const m = e.target.closest('button')?.dataset.m;
      if (!m) return;
      dialog.close();
      dialog.remove();
      if (m === 'summary') opts.onSummary();
      if (m === 'delete' && (await confirmDialog('このラウンドを削除します。元に戻せません。よろしいですか？', '削除する', { danger: true }))) {
        await deleteRound(round.id);
        opts.onDeleted();
      }
    });
    dialog.showModal();
  }

  onSwipe(el, { onNext: goNext, onPrev: () => move(-1) });
  render();
}

function stepper(label, value, name) {
  return `
    <div class="stepper">
      <span class="stepper-label">${label}</span>
      <button type="button" class="step-button" data-act="${name}-" aria-label="${label}を1減らす">−</button>
      <span class="stepper-value">${value}</span>
      <button type="button" class="step-button" data-act="${name}+" aria-label="${label}を1増やす">＋</button>
    </div>`;
}

function miniStepper(label, value, name) {
  return `
    <div class="mini-stepper">
      <span>${label}</span>
      <button type="button" class="step-button small-step" data-act="${name}-" aria-label="${label}を1減らす">−</button>
      <span class="stepper-value">${value}</span>
      <button type="button" class="step-button small-step" data-act="${name}+" aria-label="${label}を1増やす">＋</button>
    </div>`;
}

function choice(kind, value, label, selected) {
  return `<button type="button" class="choice" data-${kind}="${value}" aria-pressed="${selected}">${label}</button>`;
}
