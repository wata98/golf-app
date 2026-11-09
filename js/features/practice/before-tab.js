// 「ラウンド前」タブの切り替え（練習メニュー / ドリル集 / 飛距離を記録 / 攻略プラン）

import { renderPracticeMenu } from './practice-menu-view.js';
import { renderDrillList } from './drill-list-view.js';
import { renderDistanceEntry } from '../distance/distance-entry-view.js';
import { renderPlanList } from '../course/plan-list-view.js';

const MODES = [['menu', '練習メニュー'], ['drills', 'ドリル集'], ['distance', '飛距離を記録'], ['plan', '攻略プラン']];
let mode = 'menu';

export async function renderBeforeTab(root) {
  root.innerHTML = `
    <div class="choices cols-2 review-switch">
      ${MODES.map(([v, l]) => `<button type="button" class="choice" data-before-mode="${v}" aria-pressed="${mode === v}">${l}</button>`).join('')}
    </div>
    <div id="before-body"></div>`;
  root.querySelectorAll('[data-before-mode]').forEach((b) => b.addEventListener('click', () => {
    mode = b.dataset.beforeMode;
    renderBeforeTab(root);
  }));
  const body = root.querySelector('#before-body');
  if (mode === 'drills') await renderDrillList(body);
  else if (mode === 'distance') await renderDistanceEntry(body);
  else if (mode === 'plan') await renderPlanList(body);
  else await renderPracticeMenu(body);
}
