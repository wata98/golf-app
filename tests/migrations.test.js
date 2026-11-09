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

test('v1→v2: ホールの fairway を teeShot に直し、gir を消し、aroundGreen と note を足す', () => {
  const v1 = {
    rounds: [{
      id: 'r1',
      date: '2026-10-01',
      holes: [
        { number: 1, par: 4, strokes: 5, putts: 2, fairway: 'hit', gir: false, penalties: 0, bunkers: 0 },
        { number: 2, par: 4, strokes: 4, putts: 2, fairway: 'left', gir: true, penalties: 0, bunkers: 1 },
        { number: 3, par: 3, strokes: 3, putts: 2, fairway: 'none', gir: true, penalties: 0, bunkers: 0 },
        { number: 4, par: 5, strokes: 6, putts: 2, fairway: 'right', penalties: 1, bunkers: 0 },
      ],
    }],
    clubs: [{ id: 'c1', name: '7I' }],
  };
  const out = migrateData(v1, 1);
  const holes = out.rounds[0].holes;
  assert.deepEqual(holes.map((h) => h.teeShot), ['fairway', 'leftRough', null, 'rightRough']);
  assert.ok(holes.every((h) => !('fairway' in h) && !('gir' in h)));
  assert.ok(holes.every((h) => h.aroundGreen === null && h.note === ''));
  // ほかの値・ほかの記録は減らない
  assert.equal(holes.length, 4);
  assert.equal(holes[1].bunkers, 1);
  assert.equal(out.rounds[0].date, '2026-10-01');
  assert.deepEqual(out.clubs, [{ id: 'c1', name: '7I' }]);
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
