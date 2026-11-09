// アプリを起動したときの処理

import { prepareDatabase } from './db/database.js';
import { setupTabs } from './ui/tabs.js';
import { setupSettingsView } from './features/settings/settings-view.js';

async function start() {
  setupTabs();

  // オフラインで開けるようにする仕組み（Service Worker）を登録する
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => console.error('Service Worker の登録に失敗', err));
  }

  // スマホの容量が少なくなってもデータを消さないよう、ブラウザに頼む
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }

  try {
    await prepareDatabase();
    const settings = setupSettingsView(document.getElementById('settings-root'));
    await settings.refresh();
  } catch (err) {
    console.error(err);
    const notice = document.getElementById('notice');
    notice.textContent = 'データを開けませんでした。アプリを開き直してください: ' + err.message;
    notice.hidden = false;
  }
}

start();
