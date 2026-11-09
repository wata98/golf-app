// データの移行のテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateData } from '../js/db/migrations.js';
import { SCHEMA_VERSION, DATA_STORES } from '../js/db/schema.js';

test('今の版のデータはそのまま。足りない棚は空で補う', () => {
  const data = { clubs: [{ id: 'a', name: '7I' }] };
  const out = migrateData(data, SCHEMA_VERSION);
  assert.deepEqual(out.clubs, [{ id: 'a', name: '7I' }]);
  for (const name of DATA_STORES) assert.ok(Array.isArray(out[name]), name);
});

test('移行処理を1つずつ順に通す（v1→v2→v3）', () => {
  const migrations = {
    2: (d) => ({ ...d, clubs: d.clubs.map((c) => ({ ...c, loft: null })) }),
    3: (d) => ({ ...d, clubs: d.clubs.map((c) => ({ ...c, archived: false })) }),
  };
  const out = migrateData({ clubs: [{ id: 'a' }, { id: 'b' }] }, 1, migrations, 3);
  assert.deepEqual(out.clubs, [
    { id: 'a', loft: null, archived: false },
    { id: 'b', loft: null, archived: false },
  ]);
});

test('移行しても元のデータは書き換えない', () => {
  const data = { clubs: [{ id: 'a' }] };
  migrateData(data, 1, { 2: (d) => { d.clubs[0].x = 1; return d; } }, 2);
  assert.deepEqual(data, { clubs: [{ id: 'a' }] });
});

test('アプリより新しい版のデータはエラー', () => {
  assert.throws(() => migrateData({}, SCHEMA_VERSION + 1), /新しい版のアプリ/);
});

test('移行処理が抜けていたらエラー', () => {
  assert.throws(() => migrateData({}, 1, {}, 2), /移行処理がありません/);
});

test('おかしな版番号はエラー', () => {
  assert.throws(() => migrateData({}, undefined), /バージョン番号が正しくありません/);
  assert.throws(() => migrateData({}, 0), /バージョン番号が正しくありません/);
});
