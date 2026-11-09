// オフラインで開けるようにする仕組み（Service Worker）。
// アプリのファイルをスマホに保存しておき、圏外でもそこから開く。
//
// ★アプリを更新したら APP_VERSION を上げる（js/version.js と同じ番号）。
//   上げないと、スマホに古いファイルが残ったままになる。
// ★ファイルを足したら APP_FILES にも足す（テストで確かめている）。

const APP_VERSION = '0.6.0';
const CACHE_NAME = 'golf-app-' + APP_VERSION;

const APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'js/app.js',
  'js/version.js',
  'js/core/dates.js',
  'js/db/schema.js',
  'js/db/migrations.js',
  'js/db/backup-format.js',
  'js/db/database.js',
  'js/ui/tabs.js',
  'js/ui/notice.js',
  'js/ui/html.js',
  'js/features/round/round-stats.js',
  'js/features/round/round-model.js',
  'js/features/round/round-store.js',
  'js/features/round/round-tab.js',
  'js/features/round/start-view.js',
  'js/features/round/course-edit-view.js',
  'js/features/round/hole-view.js',
  'js/features/round/hole-edit-dialog.js',
  'js/features/round/summary-view.js',
  'js/features/round/swipe.js',
  'js/features/review/review-tab.js',
  'js/features/settings/settings-store.js',
  'js/features/clubs/club-model.js',
  'js/features/clubs/club-store.js',
  'js/features/clubs/clubs-settings-view.js',
  'js/features/distance/distance-stats.js',
  'js/features/distance/club-finder.js',
  'js/features/distance/distance-store.js',
  'js/features/distance/distance-entry-view.js',
  'js/features/distance/distance-review-view.js',
  'js/features/distance/distance-chart.js',
  'js/features/distance/finder-dialog.js',
  'js/features/distance/finder-settings-view.js',
  'vendor/chart.umd.min.js',
  'js/ui/chart-loader.js',
  'js/features/analysis/analysis-rules.js',
  'js/features/analysis/analysis-metrics.js',
  'js/features/analysis/analysis-view.js',
  'js/features/analysis/analysis-chart.js',
  'js/features/analysis/target-settings-view.js',
  'js/features/practice/drill-data.js',
  'js/features/practice/drill-model.js',
  'js/features/practice/practice-rules.js',
  'js/features/practice/practice-stats.js',
  'js/features/practice/practice-store.js',
  'js/features/practice/before-tab.js',
  'js/features/practice/practice-menu-view.js',
  'js/features/practice/practice-record-view.js',
  'js/features/practice/drill-card.js',
  'js/features/practice/drill-list-view.js',
  'js/features/practice/drill-edit-view.js',
  'js/features/practice/practice-review-view.js',
  'js/features/practice/practice-settings-view.js',
  'js/features/course/course-math.js',
  'js/features/course/course-rules.js',
  'js/features/course/hazard-model.js',
  'js/features/course/course-store.js',
  'js/features/course/plan-list-view.js',
  'js/features/course/hole-plan-view.js',
  'js/features/course/green-map-view.js',
  'js/features/course/gps.js',
  'js/features/course/round-plan.js',
  'vendor/leaflet.js',
  'vendor/leaflet.css',
  'js/features/settings/settings-view.js',
  'js/features/settings/backup-actions.js',
];

// 新しい版が来たら、ファイルをまとめて保存する
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// 古い版の保存ファイルを消す
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('golf-app-') && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ファイルを読むときは、まずスマホに保存したものを使う。なければネットから読む。
// 楽天GORAなど外部への通信（機能6）はここを通さない。
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) => hit || fetch(event.request))
  );
});
