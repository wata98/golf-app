// 設定タブの「練習メニューの配分」

import { getSettings, saveSettings } from '../settings/settings-store.js';
import { DEFAULT_SHARES, validShares } from './practice-rules.js';

const FIELDS = [['main', '一番の課題'], ['second', '2番目の課題'], ['warmupFinish', 'ウォームアップと仕上げ']];

export async function renderPracticeSettings(root) {
  const { practiceShares } = await getSettings();
  root.innerHTML = `
    <h2>練習メニューの配分（%）</h2>
    <p class="small">合計が100になるように入れてください。ウォームアップと仕上げは半分ずつにします。</p>
    <div class="share-inputs">
      ${FIELDS.map(([k, l]) => `<label class="field">${l}<input type="number" inputmode="numeric" data-share="${k}" value="${practiceShares[k]}"></label>`).join('')}
    </div>
    <button type="button" class="big-button secondary" id="share-save">配分を保存</button>
    <button type="button" class="chip" id="share-reset">初期値（60・20・20）に戻す</button>
    <p class="status" id="share-status" role="status"></p>`;

  const status = (t, err = false) => { const el = root.querySelector('#share-status'); el.textContent = t; el.classList.toggle('error', err); };
  root.querySelector('#share-save').onclick = async () => {
    const shares = Object.fromEntries(FIELDS.map(([k]) => [k, Number(root.querySelector(`[data-share="${k}"]`).value)]));
    if (!validShares(shares)) return status('0以上の数で、合計が100になるように入れてください。', true);
    await saveSettings({ practiceShares: shares });
    status('配分を保存しました。');
  };
  root.querySelector('#share-reset').onclick = async () => {
    await saveSettings({ practiceShares: { ...DEFAULT_SHARES } });
    await renderPracticeSettings(root);
    status('初期値に戻しました。');
  };
}
