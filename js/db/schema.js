// データの形の基本情報。
// 形を変えるときは SCHEMA_VERSION を1つ上げ、migrations.js に移行処理を足す
// （くわしくは docs/data-model.md）。

// 今のデータの形のバージョン
export const SCHEMA_VERSION = 1;

// アプリの名前。バックアップのファイルに入れて、別のアプリのファイルと区別する
export const APP_ID = 'golf-app';

// データの棚（IndexedDBのストア）。docs/data-model.md と同じ並び
// バックアップのJSONに入れる棚
export const DATA_STORES = [
  'settings',
  'clubs',
  'distanceRecords',
  'courses',
  'holeNotes',
  'rounds',
  'shots',
  'practiceSessions',
  'swingVideos',
  'availabilitySearches',
];

// JSONに入れない棚（アプリの管理用）
export const SYSTEM_STORES = ['meta', 'backups'];

// meta と settings は1件だけ。その id
export const SINGLE_ID = 'main';

// 空のデータ（全部の棚が空の一覧）を作る
export function emptyData() {
  const data = {};
  for (const name of DATA_STORES) data[name] = [];
  return data;
}
