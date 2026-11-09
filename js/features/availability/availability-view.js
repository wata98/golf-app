// 「ラウンド前」タブの「空き確認」: 条件を入れて、楽天GORAの空きを一覧で見る。1人予約は各サイトを条件入りで開く。
// 予約はしない（予約ページを開くだけ）。

import { esc } from '../../ui/html.js';
import { toDateOnly } from '../../core/dates.js';
import { getSettings, saveSettings } from '../settings/settings-store.js';
import { PREFS, TIME_ZONES, goraSearchUrl, goraSoloUrl, gdoSoloUrl } from './site-links.js';
import { searchPlans } from './gora-api.js';
import { renderDayResults, errorBox } from './availability-results.js';

const BUDGETS = [0, 8000, 10000, 13000, 15000, 20000, 25000];
const MAX_DAYS = 3; // 楽天への問い合わせは1日ずつなので、回数を抑えるため3日まで

// 日付に n 日足す（YYYY-MM-DD）
export function addDays(dateText, n) {
  const [y, m, d] = dateText.split('-').map(Number);
  return toDateOnly(new Date(y, m - 1, d + n));
}

function defaultCond() {
  return { startDate: addDays(toDateOnly(new Date()), 1), days: 1, players: 2, prefs: ['chiba'], budget: 0, times: [], sort: 'price', twoSum: false };
}

export async function renderAvailability(root) {
  const s = await getSettings();
  const cond = { ...defaultCond(), ...(s.lastAvailability ?? {}) };
  const today = toDateOnly(new Date());
  if (cond.startDate < today) cond.startDate = addDays(today, 1); // 前回の日付が過ぎていたら明日に
  const hasKeys = Boolean(s.rakutenAppId && s.rakutenAccessKey);
  const keys = { appId: s.rakutenAppId, accessKey: s.rakutenAccessKey };
  const toggle = (attr, v, on, label) => `<button type="button" class="choice" data-${attr}="${v}" aria-pressed="${on}">${label}</button>`;

  function draw() {
    root.innerHTML = `
      <h2>ゴルフ場の空き確認</h2>
      <p class="small">予約はしません。空きを見て、予約は各サイトのページで自分でします。</p>
      <label class="field">日付（ここから）<input type="date" id="av-date" min="${today}" value="${cond.startDate}"></label>
      <div class="choices cols-3">${[1, 2, 3].map((d) => toggle('days', d, cond.days === d, `${d}日間`)).join('')}</div>
      <h3>人数</h3>
      <div class="choices cols-4">${[1, 2, 3, 4].map((n) => toggle('players', n, cond.players === n, `${n}人`)).join('')}</div>
      <h3>エリア（いくつでも）</h3>
      <div class="choices cols-4">${PREFS.map((p) => toggle('pref', p.key, cond.prefs.includes(p.key), p.label)).join('')}</div>
      <label class="field">予算（総額の上限）
        <select id="av-budget">${BUDGETS.map((b) => `<option value="${b}" ${b === cond.budget ? 'selected' : ''}>${b ? b.toLocaleString() + '円まで' : '指定しない'}</option>`).join('')}</select>
      </label>
      <h3>スタート時間帯（選ばなければ全部）</h3>
      <div class="choices cols-3">${TIME_ZONES.map((t) => toggle('time', t.value, cond.times.includes(t.value), t.label)).join('')}</div>
      <h3>並び順・条件</h3>
      <div class="choices cols-3">
        ${toggle('sort', 'price', cond.sort === 'price', '料金が安い順')}${toggle('sort', 'reservation', cond.sort === 'reservation', '予約が多い順')}${toggle('twosum', 1, cond.twoSum, '2サム保証だけ')}
      </div>
      <p class="status error" id="av-error" role="alert"></p>
      ${hasKeys ? '<button type="button" class="big-button" id="av-search">空きを探す（楽天GORA）</button>'
        : '<p class="notice-inline">「設定」で楽天ウェブサービスのアプリIDとアクセスキーを入れると、ここに空きの一覧が出ます。今は各サイトを条件入りで開くボタンだけです。</p>'}
      <h3>各サイトを条件入りで開く</h3>
      <div class="link-buttons">
        <a class="big-button secondary link-button" id="link-gora-solo" target="_blank" rel="noopener">楽天GORAの1人予約で開く</a>
        <a class="big-button secondary link-button" id="link-gdo-solo" target="_blank" rel="noopener">GDOの1人予約で開く</a>
        <a class="big-button secondary link-button" id="link-gora" target="_blank" rel="noopener">楽天GORAの通常の検索で開く</a>
      </div>
      <p class="small">1人予約で今何人集まっているかは、開いた各サイトの画面で見られます。予算は各サイトで選べる金額に合わせています。</p>
      <div id="av-results"></div>`;
    updateLinks();
  }

  // 条件が変わるたびに、各サイトを開くURLを作り直す
  function updateLinks() {
    const ok = cond.prefs.length > 0;
    for (const [id, make] of [['link-gora-solo', goraSoloUrl], ['link-gdo-solo', gdoSoloUrl], ['link-gora', goraSearchUrl]]) {
      const a = root.querySelector('#' + id);
      if (ok) a.href = make(cond); else a.removeAttribute('href');
      a.classList.toggle('disabled', !ok);
    }
  }

  const save = () => saveSettings({ lastAvailability: { ...cond } });

  root.onclick = async (e) => {
    const b = e.target.closest('button, a');
    if (!b) return;
    if (b.tagName === 'A') { save(); return; } // リンクはそのまま開く（条件だけ覚えておく）
    const d = b.dataset;
    if (d.days) cond.days = Number(d.days);
    else if (d.players) cond.players = Number(d.players);
    else if (d.pref) cond.prefs = cond.prefs.includes(d.pref) ? cond.prefs.filter((k) => k !== d.pref) : [...cond.prefs, d.pref];
    else if (d.time) { const t = Number(d.time); cond.times = cond.times.includes(t) ? cond.times.filter((x) => x !== t) : [...cond.times, t].sort((a, c) => a - c); }
    else if (d.sort) cond.sort = d.sort;
    else if (d.twosum) cond.twoSum = !cond.twoSum;
    else if (b.id === 'av-search') return search();
    else return;
    save();
    draw();
  };
  root.onchange = (e) => {
    if (e.target.id === 'av-date') cond.startDate = e.target.value || cond.startDate;
    if (e.target.id === 'av-budget') cond.budget = Number(e.target.value);
    save();
    updateLinks();
  };

  // 日ごとに1回ずつ問い合わせる（間は1秒以上あける。gora-api.js が待つ）
  async function search() {
    const err = root.querySelector('#av-error');
    err.textContent = '';
    if (!cond.prefs.length) { err.textContent = 'エリアを1つ以上選んでください。'; return; }
    if (cond.startDate < today) { err.textContent = '今日以降の日付を選んでください。'; return; }
    save();
    const out = root.querySelector('#av-results');
    const btn = root.querySelector('#av-search');
    btn.disabled = true;
    out.innerHTML = '';
    for (let i = 0; i < Math.min(cond.days, MAX_DAYS); i++) {
      const date = addDays(cond.startDate, i);
      const box = document.createElement('div');
      out.appendChild(box);
      box.innerHTML = `<h2>${esc(date)}</h2><p>探しています…</p>`;
      try {
        await renderDayResults(box, { cond: { ...cond }, date, keys, fetchPage: (page) => searchPlans(cond, date, page, keys) });
      } catch (error) {
        box.innerHTML = `<h2>${esc(date)}</h2>${errorBox(error)}`;
        if (['keys', 'referer', 'network', 'shape'].includes(error.kind)) break; // ほかの日も同じ理由で失敗するので止める
      }
    }
    btn.disabled = false;
  }

  draw();
}
