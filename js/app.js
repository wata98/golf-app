// アプリを起動したときの処理

import { prepareDatabase } from './db/database.js';
import { setupTabs } from './ui/tabs.js';
import { setupSettingsView } from './features/settings/settings-view.js';
import { setupRoundTab } from './features/round/round-tab.js';
import { setupReviewTab } from './features/review/review-tab.js';
import { getPlayingRound } from './features/round/round-store.js';
import { renderBeforeTab } from './features/practice/before-tab.js';
import { stopGps } from './features/course/gps.js';
import { clearRoundPlanCache } from './features/course/round-plan.js';

async function start() {
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
    const roundTab = setupRoundTab(document.getElementById('round-root'));
    const reviewTab = setupReviewTab(document.getElementById('review-root'));

    const beforeRoot = document.getElementById('before-root');

    // タブを開くたびに中身を新しくする
    const tabs = setupTabs((tab) => {
      // GPSは「ラウンド中」タブにいるときだけ使う（電池を減らさないため）
      if (tab !== 'playing') stopGps();
      if (tab === 'before') renderBeforeTab(beforeRoot);
      if (tab === 'playing') { clearRoundPlanCache(); roundTab.show(); }
      if (tab === 'review') reviewTab.show();
      if (tab === 'settings') settings.refresh();
    });
    await settings.refresh();

    // 記録中のラウンドがあれば「ラウンド中」タブから再開する。なければ「ラウンド前」
    if (await getPlayingRound()) tabs.show('playing');
    else tabs.show('before');
  } catch (err) {
    console.error(err);
    const notice = document.getElementById('notice');
    notice.textContent = 'データを開けませんでした。アプリを開き直してください: ' + err.message;
    notice.hidden = false;
  }
}

start();
