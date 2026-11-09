// 新しいスイングの解析: 撮影方向などを選ぶ → 動画を選ぶ → 解析（進み具合）→ 4つの場面の確認と手直し → 保存
// 動画はこの画面の間だけ使い、保存しない。保存するのは4つの場面の静止画・骨格の点・数値だけ。

import { esc } from '../../ui/html.js';
import { toDateOnly, toLocalIso } from '../../core/dates.js';
import { getSettings } from '../settings/settings-store.js';
import { listClubs } from '../clubs/club-store.js';
import { distanceClubs } from '../clubs/club-model.js';
import { openVideo, closeVideo, analyzeVideo, drawFrame, scaledSize } from './swing-analyzer.js';
import { detectPhases, computeMetrics, PHASES } from './swing-rules.js';
import { drawWithSkeleton } from './swing-draw.js';
import { saveSwing } from './swing-store.js';
import { VIEWS } from './swing-format.js';

const STILL_SIZE = 720; // 保存する静止画の長い辺（ピクセル）

// onDone(id or null): 保存したとき（id）・やめたとき（null）
export async function renderSwingAnalyze(root, { onDone }) {
  const clubs = distanceClubs(await listClubs());
  const form = { view: 'behind', clubId: '', date: toDateOnly(new Date()) };
  const btn = (attr, v, on, label) => `<button type="button" class="choice" data-${attr}="${v}" aria-pressed="${on}">${label}</button>`;

  root.onclick = null;
  root.innerHTML = `
    <h2>スイングを解析する</h2>
    <h3>撮影方向</h3>
    <div class="choices cols-2" id="sw-views">${VIEWS.map((v) => btn('view', v.key, v.key === form.view, v.label)).join('')}</div>
    <label class="field">クラブ（任意）
      <select id="sw-club"><option value="">選ばない</option>${clubs.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select>
    </label>
    <label class="field">撮った日<input type="date" id="sw-date" value="${form.date}"></label>
    <label class="big-button file-button">動画を選んで解析する<input type="file" accept="video/*" id="sw-file" hidden></label>
    <p class="small">動画はこのスマホの中だけで解析し、どこにも送りません。アプリには保存しません（静止画4枚と数値だけを保存します）。10秒以内の動画を選んでください。</p>
    <button type="button" class="big-button secondary" id="sw-cancel">やめる</button>
    <div id="sw-work"></div>`;

  const $ = (id) => root.querySelector('#' + id);
  $('sw-views').onclick = (e) => {
    const b = e.target.closest('[data-view]');
    if (!b) return;
    form.view = b.dataset.view;
    root.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.view === form.view)));
  };
  $('sw-cancel').onclick = () => onDone(null);
  $('sw-file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    form.clubId = $('sw-club').value;
    form.date = $('sw-date').value || form.date;
    await runAnalysis(root, file, form, onDone);
  };
}

async function runAnalysis(root, file, form, onDone) {
  root.innerHTML = `
    <h2>解析中</h2>
    <p id="sw-progress" class="gps-line">準備しています…</p>
    <div class="bar"><div class="bar-fill" id="sw-bar" style="width:0%"></div></div>
    <p class="small" id="sw-note">初めてのときは、骨格推定の部品（約25MB）を読み込むので時間がかかります。</p>
    <button type="button" class="big-button secondary" id="sw-stop">やめる</button>`;
  const ctrl = new AbortController();
  root.querySelector('#sw-stop').onclick = () => ctrl.abort();
  let video;
  try {
    video = await openVideo(file);
    const result = await analyzeVideo(video, {
      signal: ctrl.signal,
      onProgress: (p) => {
        const el = root.querySelector('#sw-progress');
        if (!el) return;
        if (p.stage === 'load') { el.textContent = '骨格推定の部品を読み込んでいます…'; return; }
        el.textContent = `解析中 ${p.done}／${p.total}コマ（残り約${p.remainingSec}秒）`;
        root.querySelector('#sw-bar').style.width = `${Math.round((p.done / p.total) * 100)}%`;
        if (p.slow) root.querySelector('#sw-note').textContent = 'この端末では時間がかかるため、画像を小さくして解析しています（精度は少し下がります）。';
      },
    });
    const found = detectPhases(result.frames, result.size);
    await reviewPhases(root, { video, result, found, form, onDone });
  } catch (err) {
    if (video) closeVideo(video);
    if (err.name === 'AbortError') return onDone(null);
    root.innerHTML = `<div class="notice-inline"><b>${esc(err.message)}</b></div><button type="button" class="big-button secondary" id="sw-back">もどる</button>`;
    root.querySelector('#sw-back').onclick = () => onDone(null);
  }
}

// 4つの場面の確認と手直し。動画を保存しないので、手直しはここでだけできる
async function reviewPhases(root, { video, result, found, form, onDone }) {
  const { frames, size } = result;
  const last = frames.length - 1;
  const chosen = found.error ? (found.guess ?? { address: 0, top: Math.round(last / 3), impact: Math.round(last / 2), finish: last }) : { ...found };
  const auto = { ...chosen };
  let editing = null; // 手直し中の場面

  async function draw() {
    root.innerHTML = `
      <h2>場面の確認</h2>
      ${found.error ? `<p class="notice-inline">${esc(found.error)}</p>` : '<p class="small">自動で見つけた場面です。違っていたら「直す」でコマを動かしてください。</p>'}
      <div class="phase-grid">
        ${PHASES.map((p) => `
          <div class="phase-card">
            <div><b>${p.label}</b> <span class="small">${frames[chosen[p.key]].t.toFixed(2)}秒${chosen[p.key] !== auto[p.key] ? '（手直し）' : ''}</span></div>
            <canvas data-phase-canvas="${p.key}"></canvas>
            ${frames[chosen[p.key]].lm ? '' : '<div class="small">このコマでは体を見つけられませんでした</div>'}
            <button type="button" class="chip" data-edit="${p.key}">直す</button>
          </div>`).join('')}
      </div>
      <div id="sw-editor"></div>
      <p class="status error" id="sw-error"></p>
      <button type="button" class="big-button" id="sw-save">保存する</button>
      <button type="button" class="big-button secondary" id="sw-discard">保存せずにやめる</button>`;
    for (const p of PHASES) await paint(root.querySelector(`[data-phase-canvas="${p.key}"]`), chosen[p.key], 240);
    if (editing) await drawEditor();
  }

  // frames[i] のコマを、骨格の線つきで canvas に描く
  async function paint(canvas, i, width) {
    const s = scaledSize(video, width);
    [canvas.width, canvas.height] = [s.w, s.h];
    await drawFrame(video, frames[i].t, canvas);
    drawWithSkeleton(canvas, canvas, frames[i].lm);
  }

  async function drawEditor() {
    const p = PHASES.find((x) => x.key === editing);
    const box = root.querySelector('#sw-editor');
    box.innerHTML = `
      <div class="drill-card">
        <b>${p.label}を直す</b> <span class="small" id="ed-time"></span>
        <canvas id="ed-canvas" class="swing-still"></canvas>
        <div class="choices cols-4">
          <button type="button" class="choice" data-step="-10">◀◀ 10コマ</button><button type="button" class="choice" data-step="-1">◀ 1コマ</button>
          <button type="button" class="choice" data-step="1">1コマ ▶</button><button type="button" class="choice" data-step="10">10コマ ▶▶</button>
        </div>
        <button type="button" class="big-button" id="ed-ok">この場面に決める</button>
      </div>`;
    box.scrollIntoView({ block: 'start' });
    await refreshEditor();
  }
  async function refreshEditor() {
    await paint(root.querySelector('#ed-canvas'), chosen[editing], 480);
    root.querySelector('#ed-time').textContent = `${frames[chosen[editing]].t.toFixed(2)}秒（${chosen[editing] + 1}／${frames.length}コマ）`;
  }

  root.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.edit) { editing = b.dataset.edit; return drawEditor(); }
    if (b.dataset.step) {
      chosen[editing] = Math.min(last, Math.max(0, chosen[editing] + Number(b.dataset.step)));
      return refreshEditor();
    }
    if (b.id === 'ed-ok') { editing = null; return draw(); }
    if (b.id === 'sw-discard') { closeVideo(video); return onDone(null); }
    if (b.id === 'sw-save') {
      const err = root.querySelector('#sw-error');
      if (!(chosen.address < chosen.top && chosen.top < chosen.impact && chosen.impact < chosen.finish)) {
        err.textContent = '場面の順番が「アドレス→トップ→インパクト→フィニッシュ」になるように直してください。';
        return;
      }
      if (PHASES.some((p) => !frames[chosen[p.key]].lm)) {
        err.textContent = '体を見つけられなかったコマがあります。前後のコマに直してください。';
        return;
      }
      b.disabled = true;
      b.textContent = '保存しています…';
      const id = await save();
      closeVideo(video);
      onDone(id);
    }
  };

  // 4つの場面の静止画（JPEG）と骨格の点・数値を保存する
  async function save() {
    const settings = await getSettings();
    const s = scaledSize(video, STILL_SIZE);
    const canvas = document.createElement('canvas');
    [canvas.width, canvas.height] = [s.w, s.h];
    const phases = {};
    for (const p of PHASES) {
      const f = frames[chosen[p.key]];
      await drawFrame(video, f.t, canvas);
      const image = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.8));
      phases[p.key] = { t: f.t, image, landmarks: f.lm };
    }
    const at = Object.fromEntries(PHASES.map((p) => [p.key, { t: phases[p.key].t, lm: phases[p.key].landmarks }]));
    const metrics = computeMetrics(at, { view: form.view, handedness: settings.swingHandedness, heightCm: settings.heightCm, size });
    const t = toLocalIso(new Date());
    const id = crypto.randomUUID();
    await saveSwing({
      id, createdAt: t, updatedAt: t, date: form.date, view: form.view, clubId: form.clubId || null,
      handedness: settings.swingHandedness, heightCm: settings.heightCm ?? null, duration: video.duration,
      sampleFps: 30, slow: result.slow, autoPhases: Object.fromEntries(PHASES.map((p) => [p.key, frames[auto[p.key]].t])),
      phases, metrics, note: '',
    });
    return id;
  }

  await draw();
}
