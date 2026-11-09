// オフラインで開けるようにする仕組み（Service Worker）。
// アプリのファイルをスマホに保存しておき、圏外でもそこから開く。
//
// ★アプリを更新したら APP_VERSION を上げる（js/version.js と同じ番号）。
//   上げないと、スマホに古いファイルが残ったままになる。
// ★ファイルを足したら APP_FILES にも足す（テストで確かめている）。

const APP_VERSION = '0.1.0';
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
