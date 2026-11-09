// 設定タブの「スイング解析」: 利き手と身長

import { getSettings, saveSettings } from '../settings/settings-store.js';

export async function renderSwingSettings(root) {
  const s = await getSettings();
  root.innerHTML = `
    <h2>スイング解析</h2>
    <div class="choices cols-2">
      <button type="button" class="choice" data-hand="right" aria-pressed="${s.swingHandedness !== 'left'}">右打ち</button>
      <button type="button" class="choice" data-hand="left" aria-pressed="${s.swingHandedness === 'left'}">左打ち</button>
    </div>
    <label class="field">身長（cm・任意。動きを cm の目安で出すのに使います）
      <input type="number" inputmode="numeric" id="sw-height" min="120" max="220" value="${s.heightCm ?? ''}">
    </label>
    <p class="status small" id="sw-set-status" role="status"></p>`;
  const status = (t) => { root.querySelector('#sw-set-status').textContent = t; };
  root.onclick = async (e) => {
    const b = e.target.closest('[data-hand]');
    if (!b) return;
    await saveSettings({ swingHandedness: b.dataset.hand });
    await renderSwingSettings(root);
    root.querySelector('#sw-set-status').textContent = 'これからの解析に使います。';
  };
  root.querySelector('#sw-height').onchange = async (e) => {
    const v = e.target.value.trim();
    if (v === '') { await saveSettings({ heightCm: null }); return status('身長を消しました。'); }
    const n = Math.round(Number(v));
    if (!(n >= 120 && n <= 220)) return status('120〜220の数を入れてください。');
    await saveSettings({ heightCm: n });
    status('保存しました。これからの解析に使います。');
  };
}
