// バックアップ（JSONファイル）の中身を作る・確かめる処理。
// 保存の仕組み（IndexedDB）から切り離した計算だけなので、テストしやすい。

import { APP_ID, SCHEMA_VERSION, DATA_STORES } from './schema.js';
import { migrateData } from './migrations.js';
import { toLocalIso } from '../core/dates.js';

// 全データからバックアップのJSONの中身を作る。
// 動画本体（swingVideos の video）は大きいので入れない（docs/data-model.md）。
export function buildBackup(data, now) {
  const out = {};
  for (const name of DATA_STORES) {
    const rows = Array.isArray(data[name]) ? data[name] : [];
    out[name] = name === 'swingVideos' ? rows.map(withoutVideo) : rows;
  }
  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: toLocalIso(now),
    data: out,
  };
}

function withoutVideo(row) {
  const { video, ...rest } = row;
  return rest;
}

// バックアップのファイル名（例: golf-backup-2026-11-09.json）
export function backupFileName(now) {
  return `golf-backup-${toLocalIso(now).slice(0, 10)}.json`;
}

// 読み込んだファイルの文字を確かめ、今の形のデータにして返す。
// 問題があれば、画面にそのまま出せる日本語の説明つきでエラーにする。
export function parseBackup(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('ファイルを読めませんでした。このアプリで保存したバックアップのファイルを選んでください。');
  }
  if (!json || json.app !== APP_ID || typeof json.data !== 'object' || json.data === null) {
    throw new Error('このアプリのバックアップではありません。');
  }
  for (const name of DATA_STORES) {
    const rows = json.data[name];
    if (rows !== undefined && !Array.isArray(rows)) {
      throw new Error(`バックアップの中身が壊れています（${name}）。`);
    }
  }
  // 古い版のバックアップなら、今の形に直す（新しすぎる版はここでエラーになる）
  const data = migrateData(json.data, json.schemaVersion);
  return { data, exportedAt: json.exportedAt || null };
}

// データの件数を数える（復元の確認画面に出す）
export function countRecords(data) {
  let total = 0;
  for (const name of DATA_STORES) total += (data[name] || []).length;
  return total;
}
