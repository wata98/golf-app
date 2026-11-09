// コースマネジメントの判定ルールのテスト（course-rules.js を変えたら、ここも合わせて直す）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clubProfiles, sideRates, hazardProbability, suggestTeeShot, decideAim, evaluateClub,
  DEFAULT_SIDE_RATE, TOTAL_FROM_CARRY, DEFAULT_SPREAD,
} from '../js/features/course/course-rules.js';
import { normalCdf, probBetween, distanceMeters, metersToYards, parseLatLng } from '../js/features/course/course-math.js';
import { validateHazard, describeHazard, holeNoteId } from '../js/features/course/hazard-model.js';
import { makeRound } from './helpers.js';

const near = (a, b, eps = 0.002) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const club = (id, name) => ({ id, name });
const prof = (name, total, sd) => ({ club: club(name, name), total, sd, carry: total / TOTAL_FROM_CARRY });
const SIDES = { left: DEFAULT_SIDE_RATE, right: DEFAULT_SIDE_RATE, bias: null, holes: 0, note: '記録が少ない' };
const PROFILES = [prof('ドライバー', 230, 15), prof('5W', 200, 12), prof('7I', 150, 8)];

test('計算の道具: 正規分布・範囲の確率・距離・座標', () => {
  near(normalCdf(0), 0.5, 1e-7);
  near(normalCdf(1.96), 0.975, 1e-4);
  near(normalCdf(-1), 0.1587, 1e-4);
  near(probBetween(200, 12, 200, 1000), 0.5);
  near(distanceMeters(35, 139, 36, 139), 111195, 50);
  near(metersToYards(91.44), 100, 1e-9);
  assert.deepEqual(parseLatLng('35.12345, 139.6789'), { lat: 35.12345, lng: 139.6789 });
  assert.equal(parseLatLng('こんにちは'), null);
});

test('クラブの飛び方: トータルの記録があればそれ、なければキャリー×1.08。ばらつきは真ん中の半分の幅から', () => {
  const clubs = [club('a', '1W'), club('b', '7I'), club('c', 'PW')];
  const records = [
    ...[220, 225, 230, 235, 240].map((t) => ({ clubId: 'a', carry: t - 20, total: t })),
    { clubId: 'b', carry: 150, total: null },
  ];
  const ps = clubProfiles(clubs, records);
  assert.deepEqual(ps.map((p) => p.club.name), ['1W', '7I']); // 記録がないPWは入らない・長い順
  near(ps[0].total, 230);
  near(ps[0].sd, 10 / 1.349); // 真ん中の半分 225〜235 → 幅10
  near(ps[1].total, 150 * TOTAL_FROM_CARRY);
  near(ps[1].sd, 150 * TOTAL_FROM_CARRY * DEFAULT_SPREAD); // 1球だけ → 平均の6%
});

test('左右のブレ: 10ホール未満は反映しない（左右とも15%）', () => {
  const r = makeRound('2026-11-01', 9, () => ({ teeShot: 'rightRough' }));
  const s = sideRates([r]);
  assert.deepEqual([s.left, s.right, s.bias, s.holes], [0.15, 0.15, null, 9]);
  assert.match(s.note, /記録が少ないので左右のブレは反映していません（今9ホール/);
});

test('左右のブレ: 10ホール以上で差が10ポイント以上なら反映。OBは左右の割合で分ける', () => {
  // 12ホール: 右ラフ6・左ラフ2・OB2・フェアウェイ2
  const kinds = ['rightRough', 'rightRough', 'rightRough', 'rightRough', 'rightRough', 'rightRough', 'leftRough', 'leftRough', 'ob', 'ob', 'fairway', 'fairway'];
  const s = sideRates([makeRound('2026-11-01', 12, (i) => ({ teeShot: kinds[i] }))]);
  near(s.right, (6 + 2 * 0.75) / 12);
  near(s.left, (2 + 2 * 0.25) / 12);
  assert.equal(s.bias, 'right');
  assert.match(s.note, /右に曲がりやすい/);
});

test('左右のブレ: 差が小さければ反映しない。パー3は数えない', () => {
  const kinds = ['rightRough', 'leftRough', 'fairway', 'fairway', 'fairway', 'fairway', 'fairway', 'fairway', 'fairway', 'fairway', 'fairway', 'fairway'];
  const s = sideRates([makeRound('2026-11-01', 12, (i) => ({ teeShot: kinds[i] }))]);
  assert.equal(s.bias, null);
  assert.match(s.note, /左右の差が小さい/);
  const p3 = sideRates([makeRound('2026-11-01', 18, () => ({ par: 3, teeShot: 'green' }))]);
  assert.equal(p3.holes, 0);
});

test('ハザードに入る確率: その距離に止まる確率 × その向きに曲がる確率', () => {
  const right = { kind: 'ob', side: 'right', from: 200, to: 250 };
  near(hazardProbability(right, PROFILES[0], SIDES), (normalCdf(20 / 15) - normalCdf(-2)) * 0.15);
  near(hazardProbability({ ...right, side: 'both' }, PROFILES[0], SIDES), (normalCdf(20 / 15) - normalCdf(-2)) * 0.3);
  assert.equal(hazardProbability({ kind: 'water', side: 'green' }, PROFILES[0], SIDES), 0);
  // 横切るハザードは曲がりに関係なく、キャリーで落ちる確率
  const cross = { kind: 'water', side: 'cross', from: 180, to: 200 };
  const carry = 230 / TOTAL_FROM_CARRY;
  const sd = 15 / TOTAL_FROM_CARRY;
  near(hazardProbability(cross, PROFILES[0], SIDES), normalCdf((200 - carry) / sd) - normalCdf((180 - carry) / sd));
});

test('提案: ドライバーだと右OBに届く確率が高いので5Wで刻む。理由に数字', () => {
  const s = suggestTeeShot({ par: 4, yards: 380 }, [{ kind: 'ob', side: 'right', from: 200, to: 250 }], PROFILES, SIDES);
  assert.equal(s.club.name, '5W');
  assert.equal(s.remaining, 180);
  assert.equal(s.aim, 'left');
  // 5W: 200〜250に止まる確率 0.49998 × 右に曲がる 0.15 = 7.4998% → 7%
  assert.equal(s.lines[0], 'ドライバーだと右 OB 200〜250yに入る確率が13%（基準10%より高い）。5Wなら7%で、残り180y。');
  assert.match(s.lines[1], /右側のハザードを避けて左寄りを狙う/);
  assert.equal(s.short, '5W・左寄り・残り180y');
});

test('提案: ハザードがなければ一番飛ぶクラブ。基準以内ならそのまま', () => {
  assert.equal(suggestTeeShot({ par: 4, yards: 400 }, [], PROFILES, SIDES).club.name, 'ドライバー');
  const s = suggestTeeShot({ par: 5, yards: 520 }, [{ kind: 'bunker', side: 'left', from: 260, to: 280 }], PROFILES, SIDES);
  assert.equal(s.club.name, 'ドライバー');
  assert.match(s.lines[0], /ドライバーでOB・池に入る確率は0%、バンカーは.*基準以内/);
});

test('提案: グリーンを越えるクラブは使わない', () => {
  assert.equal(suggestTeeShot({ par: 4, yards: 210 }, [], PROFILES, SIDES).club.name, '5W');
});

test('提案: どのクラブも基準を満たさなければ、一番危なくないクラブ', () => {
  const hazards = [{ kind: 'ob', side: 'both', from: 0, to: 400 }]; // どこに止まっても両側OB
  const s = suggestTeeShot({ par: 4, yards: 400 }, hazards, PROFILES, { ...SIDES, left: 0.2, right: 0.2 });
  assert.match(s.lines[0], /どのクラブも.*満たさないので、一番危なくない/);
});

test('提案: パー3はキャリーの平均が一番近いクラブ。グリーン周りの注意も出す', () => {
  const s = suggestTeeShot({ par: 3, yards: 140 }, [{ kind: 'water', side: 'green' }], PROFILES, SIDES);
  assert.equal(s.club.name, '7I');
  assert.match(s.lines[0], /グリーンまで140y。キャリー平均139y/);
  assert.match(s.lines[1], /グリーン周り: 池・ペナルティエリアに注意/);
});

test('提案: 飛距離の記録がない・距離が未登録なら提案しない', () => {
  assert.equal(suggestTeeShot({ par: 4, yards: 380 }, [], [], SIDES).status, 'noData');
  assert.equal(suggestTeeShot({ par: 4, yards: null }, [], PROFILES, SIDES).status, 'noYards');
});

test('狙い: 曲がりやすい向きとハザードの側', () => {
  const ev = (side) => evaluateClub(PROFILES[1], side ? [{ kind: 'ob', side, from: 180, to: 230 }] : [], SIDES);
  assert.equal(decideAim(ev(null), SIDES).aim, 'center');
  assert.equal(decideAim(ev(null), { ...SIDES, bias: 'right' }).aim, 'left');
  assert.equal(decideAim(ev('left'), { ...SIDES, bias: 'right' }).aim, 'center'); // 右に曲がりやすく左にOB
  assert.equal(decideAim(ev('right'), { ...SIDES, bias: 'right' }).aim, 'left');
});

test('ハザードの確かめと説明', () => {
  assert.equal(validateHazard({ kind: 'ob', side: 'right', from: 200, to: 250 }), null);
  assert.equal(validateHazard({ kind: 'water', side: 'green', from: null, to: null }), null);
  assert.match(validateHazard({ kind: 'ob', side: 'right', from: NaN, to: 250 }), /何y〜何y/);
  assert.match(validateHazard({ kind: 'ob', side: 'right', from: 250, to: 200 }), /近いほう〜遠いほう/);
  assert.equal(describeHazard({ kind: 'bunker', side: 'left', from: 210, to: 230 }), '左 バンカー 210〜230y');
  assert.equal(holeNoteId('c1', '白', 3), 'c1|白|3');
});
