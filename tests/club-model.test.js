// クラブの記録のテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultClubs, bagClubs, distanceClubs, moveClub, nextOrder } from '../js/features/clubs/club-model.js';

const NOW = new Date(2026, 10, 9);

test('最初の14本: 並び順は1〜14、ドライバーから始まりパターで終わる', () => {
  const clubs = defaultClubs(NOW);
  assert.equal(clubs.length, 14);
  assert.deepEqual(clubs.map((c) => c.order), Array.from({ length: 14 }, (_, i) => i + 1));
  assert.equal(clubs[0].name, 'ドライバー');
  assert.equal(clubs[13].type, 'putter');
  assert.equal(new Set(clubs.map((c) => c.id)).size, 14);
});

test('外したクラブはバッグに出さない。パターは飛距離のクラブに出さない', () => {
  const clubs = defaultClubs(NOW);
  clubs[2].archived = true;
  assert.equal(bagClubs(clubs).length, 13);
  assert.equal(distanceClubs(clubs).length, 12);
});

test('並べ替え: 上へ・下へ。端ではそれ以上動かない', () => {
  const clubs = defaultClubs(NOW).slice(0, 3); // ドライバー, 3W, 5W
  const changed = moveClub(clubs, clubs[2].id, -1);
  assert.deepEqual(bagClubs(clubs).map((c) => c.name), ['ドライバー', '5W', '3W']);
  assert.equal(changed.length, 2);
  assert.deepEqual(moveClub(clubs, bagClubs(clubs)[0].id, -1), []);
});

test('外したクラブがあっても、並び順は詰めて振り直す', () => {
  const clubs = defaultClubs(NOW).slice(0, 4);
  clubs[1].archived = true; // 3W を外す
  moveClub(clubs, clubs[3].id, -1); // 4UT を上へ
  assert.deepEqual(bagClubs(clubs).map((c) => [c.name, c.order]), [['ドライバー', 1], ['4UT', 2], ['5W', 3]]);
});

test('足すクラブはいちばん後ろ', () => {
  assert.equal(nextOrder(defaultClubs(NOW)), 15);
  assert.equal(nextOrder([]), 1);
});
