// 番手の早見表のテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adjustDistance, nearestClubs } from '../js/features/distance/club-finder.js';

const F = { up: 1.0, down: 1.0 };

test('高低差がなければ、残り距離のまま', () => {
  assert.equal(adjustDistance(150, null, F), 150);
  assert.equal(adjustDistance(150, 0, F), 150);
});

test('打ち上げは長く、打ち下ろしは短く見積もる（1mにつき1ヤード）', () => {
  assert.equal(adjustDistance(150, 5, F), 155);
  assert.equal(adjustDistance(150, -10, F), 140);
});

test('係数は打ち上げ・打ち下ろしで別々に使う', () => {
  const f = { up: 1.5, down: 0.5 };
  assert.equal(adjustDistance(150, 4, f), 156);
  assert.equal(adjustDistance(150, -4, f), 148);
});

const row = (name, mean) => ({ club: { name }, carry: { mean } });

test('キャリーの平均が近い順に2本まで。記録がないクラブは出さない', () => {
  const rows = [row('6I', 163), row('7I', 152), row('8I', 141), row('9I', null)];
  const out = nearestClubs(rows, 150);
  assert.deepEqual(out.map((o) => o.club.name), ['7I', '8I']);
  assert.equal(out[0].diff, 2);
  assert.equal(out[1].diff, -9);
});

test('記録が1本しかなければ1本だけ、なければ空', () => {
  assert.equal(nearestClubs([row('7I', 150)], 100).length, 1);
  assert.deepEqual(nearestClubs([row('7I', null)], 100), []);
});
