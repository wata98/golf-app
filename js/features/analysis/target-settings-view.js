// 設定タブの「目標スコア」（弱点分析で、目標との差と目安に使う）

import { getSettings, saveSettings } from '../settings/settings-store.js';

const MIN = 60;
const MAX = 150;

export async function renderTargetSettings(root) {
  const s = await getSettings();
  root.innerHTML = `
    <h2>目標スコア</h2>
    <label class="field">パー72のコースで目指すスコア（弱点分析に使います）
      <input type="number" inputmode="numeric" min="${MIN}" max="${MAX}" id="target-score" value="${s.targetScore}">
    </label>
    <p class="status small" id="target-status" role="status"></p>`;
  root.querySelector('#target-score').onchange = async (e) => {
    const v = Math.round(Number(e.target.value));
    const status = root.querySelector('#target-status');
    if (!Number.isFinite(v) || v < MIN || v > MAX) {
      status.textContent = `${MIN}〜${MAX}の数を入れてください。`;
      return;
    }
    await saveSettings({ targetScore: v });
    status.textContent = `目標スコアを ${v} にしました。`;
  };
}
