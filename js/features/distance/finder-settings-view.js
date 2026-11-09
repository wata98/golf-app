// 設定タブの「番手早見表の高低差の補正」

import { getSettings, saveSettings } from '../settings/settings-store.js';
import { DEFAULT_ELEVATION_UP, DEFAULT_ELEVATION_DOWN } from './club-finder.js';

export async function renderFinderSettings(root) {
  const s = await getSettings();
  root.innerHTML = `
    <h2>番手早見表の高低差の補正</h2>
    <p class="small">高低差1メートルにつき何ヤード足す（打ち上げ）・引く（打ち下ろし）か。目安は${DEFAULT_ELEVATION_UP}ヤードです。</p>
    <label class="field">打ち上げ（1mにつき何ヤード長く）
      <input type="number" inputmode="decimal" step="0.1" min="0" max="5" data-key="elevationUp" value="${s.elevationUp}">
    </label>
    <label class="field">打ち下ろし（1mにつき何ヤード短く）
      <input type="number" inputmode="decimal" step="0.1" min="0" max="5" data-key="elevationDown" value="${s.elevationDown}">
    </label>
    <button type="button" class="chip" id="finder-reset">目安（${DEFAULT_ELEVATION_UP}ヤード）に戻す</button>
    <p class="status small" id="finder-status" role="status"></p>`;

  const status = root.querySelector('#finder-status');
  root.onchange = async (e) => {
    const key = e.target.dataset.key;
    if (!key) return;
    const v = Number(e.target.value);
    if (!Number.isFinite(v) || v < 0 || v > 5) {
      status.textContent = '0〜5の数を入れてください。';
      return;
    }
    await saveSettings({ [key]: v });
    status.textContent = '保存しました。';
  };
  root.querySelector('#finder-reset').onclick = async () => {
    await saveSettings({ elevationUp: DEFAULT_ELEVATION_UP, elevationDown: DEFAULT_ELEVATION_DOWN });
    await renderFinderSettings(root);
    root.querySelector('#finder-status').textContent = '目安に戻しました。';
  };
}
