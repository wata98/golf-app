// スマホの中の保存場所（IndexedDB）を扱う。
// 計算は migrations.js / backup-format.js にあり、ここは読み書きだけをする。

import { SCHEMA_VERSION, DATA_STORES, SYSTEM_STORES, SINGLE_ID, emptyData } from './schema.js';
import { migrateData } from './migrations.js';
import { buildBackup } from './backup-format.js';
import { toLocalIso } from '../core/dates.js';
import { defaultClubs } from '../features/clubs/club-model.js';
import { defaultDrillRecords } from '../features/practice/drill-model.js';

const DB_NAME = 'golf-app';
// IndexedDB自体の版。棚（ストア）を増やすときだけ上げる。
// データの形の版（SCHEMA_VERSION）とは別もの。
// 1: 最初の棚 / 2: ドリル集（drills）の棚を追加（機能4）
const DB_VERSION = 2;
// 自動バックアップ（backups の棚）を何件残すか
const KEEP_BACKUPS = 3;

let dbPromise = null;

// データベースを開く。初めてのときは棚を全部作る
export function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of [...SYSTEM_STORES, ...DATA_STORES]) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// IndexedDBの「お願い」を Promise（終わるのを待てる形）にする
function wait(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// meta（データの版・最後のバックアップ日など）を読む
export async function getMeta() {
  const db = await openDatabase();
  return wait(db.transaction('meta').objectStore('meta').get(SINGLE_ID));
}

// meta の一部を書き換える
export async function updateMeta(changes) {
  const db = await openDatabase();
  const tx = db.transaction('meta', 'readwrite');
  const store = tx.objectStore('meta');
  const current = (await wait(store.get(SINGLE_ID))) || { id: SINGLE_ID };
  store.put({ ...current, ...changes });
  await done(tx);
}

// 1つの棚の全部の記録を読む
export async function getAll(storeName) {
  const db = await openDatabase();
  return wait(db.transaction(storeName).objectStore(storeName).getAll());
}

// 1件読む（なければ undefined）
export async function getOne(storeName, id) {
  const db = await openDatabase();
  return wait(db.transaction(storeName).objectStore(storeName).get(id));
}

// 1件保存する（同じ id があれば上書き）。更新日時を入れる
export async function putOne(storeName, row) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put({ ...row, updatedAt: toLocalIso(new Date()) });
  await done(tx);
}

// 1件消す
export async function deleteOne(storeName, id) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).delete(id);
  await done(tx);
}

// 全部の棚のデータを読む
export async function readAllData() {
  const db = await openDatabase();
  const tx = db.transaction(DATA_STORES);
  const data = emptyData();
  for (const name of DATA_STORES) data[name] = await wait(tx.objectStore(name).getAll());
  return data;
}

// 全部の棚を data で置き換える（1回の処理で行い、途中で失敗したら何も変わらない）。
// バックアップには動画本体が入っていないので、同じ id の動画が今あれば残す。
export async function replaceAllData(data) {
  const db = await openDatabase();
  const tx = db.transaction(DATA_STORES, 'readwrite');
  const videoStore = tx.objectStore('swingVideos');
  const oldVideos = new Map((await wait(videoStore.getAll())).map((r) => [r.id, r.video]));
  for (const name of DATA_STORES) {
    const store = tx.objectStore(name);
    store.clear();
    for (const row of data[name] || []) {
      if (name === 'swingVideos' && !row.video && oldVideos.has(row.id)) {
        store.put({ ...row, video: oldVideos.get(row.id) });
      } else {
        store.put(row);
      }
    }
  }
  await done(tx);
}

// 今の全データを backups の棚に控える（移行・復元の前）。新しい順に3件だけ残す
export async function saveSnapshot(reason) {
  const now = new Date();
  const json = buildBackup(await readAllData(), now);
  const db = await openDatabase();
  const tx = db.transaction('backups', 'readwrite');
  const store = tx.objectStore('backups');
  store.put({ id: toLocalIso(now) + '-' + reason, createdAt: toLocalIso(now), reason, json });
  const all = await wait(store.getAll());
  all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const old of all.slice(KEEP_BACKUPS)) store.delete(old.id);
  await done(tx);
}

// 起動したときに呼ぶ。初めてなら meta を作り、データが古い版なら移行する
export async function prepareDatabase() {
  const meta = await getMeta();
  if (!meta) {
    // 初めて開いたとき: よくある14本のクラブを入れておく（設定タブで自分のバッグに直す）
    for (const club of defaultClubs(new Date())) await putOne('clubs', club);
    // 最初のドリル集（js/features/practice/drill-data.js）も入れておく
    for (const drill of defaultDrillRecords(new Date())) await putOne('drills', drill);
    await updateMeta({ schemaVersion: SCHEMA_VERSION, createdAt: toLocalIso(new Date()), lastExportedAt: null });
    return;
  }
  if (meta.schemaVersion < SCHEMA_VERSION) {
    await saveSnapshot('migration');
    const migrated = migrateData(await readAllData(), meta.schemaVersion);
    await replaceAllData(migrated);
    await updateMeta({ schemaVersion: SCHEMA_VERSION });
  }
}
