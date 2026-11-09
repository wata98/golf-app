// 練習メニューの判定ルールのテスト（practice-rules.js を変えたら、ここも合わせて直す）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allocate, roundStep, validShares, issuesFromAnalysis, issuesFromManual, pickIssues,
  drillWeight, ratingsByDrill, pickDrill, buildMenu, DEFAULT_SHARES, ISSUE_TOPICS,
} from '../js/features/practice/practice-rules.js';
import { DEFAULT_DRILLS } from '../js/features/practice/drill-data.js';

const sum = (a) => a.warmup + a.finish + a.second + a.main.reduce((x, y) => x + y, 0);

test('配分: 100球なら ウォームアップ10・一番30×2・2番目20・仕上げ10', () => {
  assert.deepEqual(allocate(100), { warmup: 10, finish: 10, second: 20, main: [30, 30] });
});

test('配分: どの量でも合計はちょうど指定の量。5単位', () => {
  for (const amount of [30, 50, 60, 90, 100, 150, 200]) {
    const a = allocate(amount);
    assert.equal(sum(a), amount, `amount=${amount}`);
    for (const v of [a.warmup, a.finish, a.second, ...a.main]) assert.equal(v % 5, 0, `amount=${amount} v=${v}`);
  }
});

test('配分の割合を変えられる', () => {
  const a = allocate(100, { main: 80, second: 10, warmupFinish: 10 });
  assert.equal(a.second, 10);
  assert.equal(a.warmup, 5);
  assert.equal(sum(a), 100);
});

test('配分の割合の確かめ: 合計100・0以上', () => {
  assert.equal(validShares(DEFAULT_SHARES), true);
  assert.equal(validShares({ main: 50, second: 30, warmupFinish: 30 }), false);
  assert.equal(validShares({ main: 110, second: -10, warmupFinish: 0 }), false);
  assert.equal(roundStep(12), 10);
  assert.equal(roundStep(13), 15);
});

test('弱点分析の項目を、目安との差が大きい順に練習の課題にする（3パットは2つ）', () => {
  const rows = [
    { key: 'penalty', label: 'OB・ペナルティ', diff: 1 },
    { key: 'threePutt', label: '3パット以上', diff: 3 },
    { key: 'shot', label: 'ショット', diff: -2 },
  ];
  const issues = issuesFromAnalysis(rows);
  assert.deepEqual(issues.map((i) => i.topics), [['longPutt', 'shortPutt'], ['driver'], ['iron']]);
});

test('その場所でできない課題は繰り下げ、理由を残す', () => {
  const candidates = issuesFromManual('driver', 'iron'); // パター練習場ではどちらもできない
  const { main, second, notes } = pickIssues(candidates, DEFAULT_DRILLS, 'green');
  assert.deepEqual(main.topics, ['longPutt']);
  assert.deepEqual(second.topics, ['shortPutt']);
  assert.equal(notes.length, 1); // 飛ばした課題は1行にまとめる
  assert.equal(notes[0], '「ドライバーの曲がり」「アイアンのミート率」「アプローチの距離感」「バンカー」はパター練習場でできるドリルがないので、次の課題を使いました。');
});

test('自分で選んだ課題は、その順で使う', () => {
  const { main, second } = pickIssues(issuesFromManual('bunker', 'approach'), DEFAULT_DRILLS, 'range');
  assert.deepEqual([main.topics, second.topics], [['bunker'], ['approach']]);
  assert.equal(ISSUE_TOPICS.length, 6);
});

test('手応えと選ばれやすさ: 低いほど大きい。未経験は3', () => {
  assert.equal(drillWeight(1), 5);
  assert.equal(drillWeight(5), 1);
  assert.equal(drillWeight(undefined), 3);
});

test('手応えの平均は、完了した練習で入れたものだけ', () => {
  const sessions = [
    { status: 'done', items: [{ drillId: 'a', rating: 2 }, { drillId: 'a', rating: 4 }, { drillId: 'b', rating: null }] },
    { status: 'planned', items: [{ drillId: 'a', rating: 5 }] },
  ];
  const r = ratingsByDrill(sessions);
  assert.equal(r.get('a'), 3);
  assert.equal(r.has('b'), false);
});

test('ドリルの選び方: 手応えが低いドリルほど選ばれやすい（選ばれやすさに比例）', () => {
  const drills = [
    { id: 'x', topic: 'iron', places: ['range'] },
    { id: 'y', topic: 'iron', places: ['range'] },
  ];
  const ratings = new Map([['x', 1], ['y', 5]]); // 選ばれやすさ x=5, y=1 → 合計6
  assert.equal(pickDrill(drills, 'iron', 'range', ratings, new Set(), () => 0.8).id, 'x');  // 0.8×6=4.8 < 5
  assert.equal(pickDrill(drills, 'iron', 'range', ratings, new Set(), () => 0.84).id, 'y'); // 5.04 ≥ 5
  // 1000回選ぶと、だいたい5:1になる
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let x = 0;
  for (let i = 0; i < 1000; i++) if (pickDrill(drills, 'iron', 'range', ratings, new Set(), rand).id === 'x') x++;
  assert.ok(x > 760 && x < 900, `x=${x}`);
});

test('同じドリルは1つのメニューで重ねない', () => {
  const drills = [{ id: 'x', topic: 'iron', places: ['range'] }, { id: 'y', topic: 'iron', places: ['range'] }];
  assert.equal(pickDrill(drills, 'iron', 'range', new Map(), new Set(['x']), () => 0).id, 'y');
});

test('メニュー: 100球・打ちっぱなし・一番アプローチ/2番目ドライバー', () => {
  const menu = buildMenu({ drills: DEFAULT_DRILLS, place: 'range', amount: 100, candidates: issuesFromManual('approach', 'driver'), rand: () => 0.3 });
  assert.deepEqual(menu.items.map((i) => [i.block, i.topic, i.amount]), [
    ['warmup', 'warmup', 10], ['main', 'approach', 30], ['main', 'approach', 30], ['second', 'driver', 20], ['finish', 'finish', 10],
  ]);
  assert.notEqual(menu.items[1].drill.id, menu.items[2].drill.id);
  assert.match(menu.items[1].reason, /一番の課題（アプローチの距離感）/);
  assert.ok(menu.items.every((i) => i.drill.places.includes('range')));
});

test('メニュー: 3パットが一番なら、ロングとショートを1つずつ。手応えが低いと理由に出る', () => {
  const candidates = issuesFromAnalysis([{ key: 'threePutt', label: '3パット以上', diff: 4 }, { key: 'approach', label: 'アプローチが寄らない', diff: 1 }]);
  const ratings = new Map(DEFAULT_DRILLS.filter((d) => d.topic === 'longPutt').map((d) => [d.id, 2]));
  const menu = buildMenu({ drills: DEFAULT_DRILLS, place: 'green', amount: 60, unit: 'minutes', candidates, ratings, rand: () => 0.1 });
  const mains = menu.items.filter((i) => i.block === 'main');
  assert.deepEqual(mains.map((i) => i.topic), ['longPutt', 'shortPutt']);
  assert.match(mains[0].reason, /弱点分析: 3パット以上.*手応えの平均が2なので出やすくしています/);
  // アプローチはパター練習場でできないので、2番目はなし → その分は一番の課題へ
  assert.equal(menu.second, null);
  assert.equal(menu.items.reduce((a, i) => a + i.amount, 0), 60);
});

test('最初のドリル集: 8つの課題に5個ずつ、必要な項目がそろっている', () => {
  assert.equal(DEFAULT_DRILLS.length, 40);
  const topics = new Map();
  for (const d of DEFAULT_DRILLS) topics.set(d.topic, (topics.get(d.topic) ?? 0) + 1);
  assert.deepEqual([...topics.values()], [5, 5, 5, 5, 5, 5, 5, 5]);
  assert.equal(new Set(DEFAULT_DRILLS.map((d) => d.id)).size, 40);
  for (const d of DEFAULT_DRILLS) {
    for (const k of ['name', 'how', 'points']) assert.ok(d[k].length > 0, `${d.id} ${k}`);
    assert.ok(d.balls > 0 && d.minutes > 0 && d.places.length > 0, d.id);
  }
});

test('どの場所にもウォームアップと仕上げのドリルがある', () => {
  for (const place of ['range', 'green', 'home']) {
    for (const topic of ['warmup', 'finish']) {
      assert.ok(DEFAULT_DRILLS.some((d) => d.topic === topic && d.places.includes(place)), `${place} ${topic}`);
    }
  }
});
