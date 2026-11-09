// ラウンド中のホール入力画面に出す「攻略プランの1行」と「グリーン中央までの距離」、詳細の画面

import { esc } from '../../ui/html.js';
import { getCourse } from '../round/round-store.js';
import { getHoleNote, loadPlanContext, planFor } from './course-store.js';
import { describeHazard } from './hazard-model.js';
import { distanceMeters, metersToYards } from './course-math.js';
import { watchGps } from './gps.js';

// ラウンド1つ分の材料を一度だけ読み込んで覚えておく（ボタンを押すたびに読み直さないため）
const cache = new Map(); // roundId → Promise<{ course, ctx }>

function loadFor(round) {
  if (!cache.has(round.id)) {
    cache.set(round.id, Promise.all([getCourse(round.courseId), loadPlanContext()]).then(([course, ctx]) => ({ course, ctx })));
  }
  return cache.get(round.id);
}

// 攻略メモを直したときなどに呼ぶ（次に読み込み直す）
export const clearRoundPlanCache = () => cache.clear();

// hole: ラウンドのホール（パー・距離はラウンドに写したもの）
export async function roundHolePlan(round, hole) {
  const { course, ctx } = await loadFor(round);
  const note = await getHoleNote(round.courseId, round.teeName, hole.number);
  const p = planFor(hole, note, ctx);
  const green = (course?.greens ?? []).find((g) => g.holeNumber === hole.number) ?? null;
  return { p, note, green };
}

// プランの詳細の画面
export function openPlanDialog(hole, { p, note }) {
  const dialog = document.createElement('dialog');
  dialog.innerHTML = `
    <h2>${hole.number}番の攻略プラン</h2>
    <p class="weakness-title" style="font-size:24px">${esc(p.short)}</p>
    ${p.manual ? '<p class="small">自分で手直ししたプラン</p>' : ''}
    <p>${p.suggestion.lines.map(esc).join('<br>')}</p>
    <h3>ハザード</h3>
    <p>${note.hazards.length ? note.hazards.map((h) => esc(describeHazard(h))).join('<br>') : '登録がありません（「ラウンド前」の「攻略プラン」で登録できます）'}</p>
    <button type="button" class="big-button secondary" data-close>閉じる</button>`;
  document.body.appendChild(dialog);
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  dialog.showModal();
}

// グリーン中央までの距離を el に出し続ける。GPSが使えない・グリーン未登録なら隠す
export function showGreenDistance(el, green) {
  if (!green) { el.hidden = true; return; }
  watchGps((pos, failed) => {
    if (!el.isConnected) return;
    if (failed) { el.hidden = true; return; }
    if (!pos) { el.hidden = false; el.textContent = 'グリーン中央まで: 位置を調べています…'; return; }
    const yards = Math.round(metersToYards(distanceMeters(pos.lat, pos.lng, green.lat, green.lng)));
    el.hidden = false;
    el.textContent = `グリーン中央まで ${yards}y（誤差±${Math.round(pos.accuracy)}m）`;
  });
}
