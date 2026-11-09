// バックアップのJSONの中身のテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBackup, parseBackup, backupFileName, countRecords } from '../js/db/backup-format.js';
import { APP_ID, SCHEMA_VERSION, DATA_STORES, emptyData } from '../js/db/schema.js';

const NOW = new Date(2026, 10, 9, 20, 0, 0); // 2026年11月9日 20:00（月は0から数える）

test('書き出しに全部の棚・アプリ名・版番号・日時が入る', () => {
  const json = buildBackup({ clubs: [{ id: 'a', name: '7I' }] }, NOW);
  assert.equal(json.app, APP_ID);
  assert.equal(json.schemaVersion, SCHEMA_VERSION);
  assert.match(json.exportedAt, /^2026-11-09T20:00:00[+-]\d\d:\d\d$/);
  assert.deepEqual(Object.keys(json.data), DATA_STORES);
  assert.deepEqual(json.data.clubs, [{ id: 'a', name: '7I' }]);
});

test('動画本体は書き出さない。線やメモは残す', () => {
  const json = buildBackup({ swingVideos: [{ id: 'v', video: 'BIG', note: 'メモ', annotations: [1] }] }, NOW);
  assert.deepEqual(json.data.swingVideos, [{ id: 'v', note: 'メモ', annotations: [1] }]);
});

test('書き出したものを読み込むと同じデータに戻る', () => {
  const data = emptyData();
  data.clubs = [{ id: 'a', name: '7I' }];
  data.rounds = [{ id: 'r', date: '2026-11-01', holes: [{ number: 1, strokes: 5 }] }];
  const text = JSON.stringify(buildBackup(data, NOW));
  const { data: back, exportedAt } = parseBackup(text);
  assert.deepEqual(back, data);
  assert.match(exportedAt, /^2026-11-09/);
});

test('JSONでないファイルはエラー', () => {
  assert.throws(() => parseBackup('こんにちは'), /ファイルを読めませんでした/);
});

test('別のアプリのファイルはエラー', () => {
  assert.throws(() => parseBackup(JSON.stringify({ app: 'other', schemaVersion: 1, data: {} })), /このアプリのバックアップではありません/);
  assert.throws(() => parseBackup('null'), /このアプリのバックアップではありません/);
});

test('アプリより新しい版のバックアップはエラー', () => {
  const text = JSON.stringify({ app: APP_ID, schemaVersion: SCHEMA_VERSION + 1, data: {} });
  assert.throws(() => parseBackup(text), /新しい版のアプリ/);
});

test('棚が一覧になっていないファイルはエラー', () => {
  const text = JSON.stringify({ app: APP_ID, schemaVersion: 1, data: { clubs: 'x' } });
  assert.throws(() => parseBackup(text), /壊れています/);
});

test('ファイル名と件数', () => {
  assert.equal(backupFileName(NOW), 'golf-backup-2026-11-09.json');
  assert.equal(countRecords({ clubs: [{}, {}], rounds: [{}] }), 3);
});
