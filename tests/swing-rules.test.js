// スイング解析の判定ルールのテスト（swing-rules.js を変えたら、ここも合わせて直す）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPhases, computeMetrics, metricDiffs } from '../js/features/swing/swing-rules.js';
import { angleAt, tiltFromVertical } from '../js/features/swing/swing-math.js';
import { encodeImages, decodeImages, blobToDataUrl, dataUrlToBlob } from '../js/db/image-codec.js';
import { migrateData } from '../js/db/migrations.js';

const SIZE = { w: 360, h: 640 };
const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

// 33点の骨格を作る。o で点を上書き（{ 番号: [x, y] }）。何も指定しない点は信頼度1で真ん中
function pose(o = {}) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
  const base = {
    7: [0.47, 0.3], 8: [0.53, 0.3], 0: [0.5, 0.31],         // 耳・鼻
    11: [0.42, 0.45], 12: [0.58, 0.45],                      // 肩
    13: [0.45, 0.58], 14: [0.55, 0.58],                      // 肘
    23: [0.45, 0.62], 24: [0.55, 0.62],                      // 腰
    15: [0.5, 0.75], 16: [0.5, 0.75],                        // 手首
  };
  for (const [i, [x, y]] of Object.entries({ ...base, ...o })) lm[i] = { x, y, visibility: 1 };
  return lm;
}
const hands = (x, y) => ({ 15: [x, y], 16: [x, y] });
const lerp = (a, b, k) => a + (b - a) * k;

// 作りもののスイング（1秒30コマ×4秒）: アドレスで止まる → ゆっくり上げる → 速く下ろす → フィニッシュで止まる
function syntheticSwing() {
  const frames = [];
  for (let i = 0; i < 120; i++) {
    let x = 0.5;
    let y = 0.75;
    if (i >= 30 && i < 60) { const k = (i - 30) / 30; x = lerp(0.5, 0.35, Math.sin((k * Math.PI) / 2)); y = lerp(0.75, 0.25, Math.sin((k * Math.PI) / 2)); }
    else if (i >= 60 && i < 63) { x = 0.35; y = 0.25; }
    else if (i >= 63 && i <= 70) { const k = (i - 62) / 8; x = lerp(0.35, 0.5, k); y = lerp(0.25, 0.75, k); }
    else if (i > 70 && i <= 80) { const k = (i - 70) / 10; x = lerp(0.5, 0.65, Math.sin((k * Math.PI) / 2)); y = lerp(0.75, 0.3, Math.sin((k * Math.PI) / 2)); }
    else if (i > 80) { x = 0.65; y = 0.3; }
    frames.push({ t: i / 30, lm: pose(hands(x, y)) });
  }
  return frames;
}

test('場面: アドレス・トップ・インパクト・フィニッシュを順に見つける', () => {
  const p = detectPhases(syntheticSwing(), SIZE);
  assert.equal(p.error, undefined);
  assert.ok(p.address >= 26 && p.address <= 31, `address=${p.address}`);
  assert.ok(p.top >= 58 && p.top <= 63, `top=${p.top}`);
  assert.ok(p.impact >= 69 && p.impact <= 71, `impact=${p.impact}`);
  assert.ok(p.finish >= 78 && p.finish <= 84, `finish=${p.finish}`);
});

test('場面: トップの手前で一瞬ゆっくりになっても、そこをアドレスにしない', () => {
  const frames = syntheticSwing();
  // トップ直前（55〜58）をほとんど止める
  for (let i = 55; i <= 58; i++) frames[i].lm = pose(hands(0.36, 0.26));
  const p = detectPhases(frames, SIZE);
  assert.ok(p.address <= 31, `address=${p.address}`);
});

test('場面: 体が見つからないコマばかりなら、理由を返す', () => {
  const frames = Array.from({ length: 60 }, (_, i) => ({ t: i / 30, lm: i < 5 ? pose() : null }));
  assert.match(detectPhases(frames, SIZE).error, /体を十分に見つけられませんでした/);
});

test('計算の道具: 角度', () => {
  near(angleAt({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }), 180);
  near(angleAt({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }), 90);
  near(tiltFromVertical({ x: 0, y: 10 }, { x: 0, y: 0 }), 0);
  near(tiltFromVertical({ x: 0, y: 10 }, { x: 10, y: 0 }), 45);
});

const at = (o) => ({
  address: { t: 1.0, lm: pose(o.address ?? {}) },
  top: { t: 1.9, lm: pose(o.top ?? {}) },
  impact: { t: 2.2, lm: pose(o.impact ?? {}) },
  finish: { t: 2.8, lm: pose(o.finish ?? {}) },
});
const val = (ms, key) => ms.find((m) => m.key === key)?.value;

test('数値（正面）: テンポ、頭・腰の左右（＋は目標方向）、頭の上下、cm の目安', () => {
  // トップで頭が目標と反対（画像の左）へ肩幅の10%、インパクトで腰が目標方向へ肩幅の20%
  const shoulder = 0.16; // 肩幅（割合）= 0.58 - 0.42
  const ms = computeMetrics(at({
    top: { 7: [0.47 - shoulder * 0.1, 0.3], 8: [0.53 - shoulder * 0.1, 0.3] },
    impact: { 23: [0.45 + shoulder * 0.2, 0.62], 24: [0.55 + shoulder * 0.2, 0.62], 7: [0.47, 0.32], 8: [0.53, 0.32] },
  }), { view: 'front', handedness: 'right', heightCm: null, size: SIZE });
  near(val(ms, 'tempo'), 3);
  near(val(ms, 'headSide_top'), -10, 0.1);
  near(val(ms, 'hipSide_impact'), 20, 0.1);
  assert.ok(val(ms, 'headDown_impact') > 0); // 下がった
  assert.equal(ms.find((m) => m.key === 'headSide_top').unit, '%（肩幅に対して）');
  // 左打ちなら向きが逆
  const left = computeMetrics(at({ impact: { 23: [0.45 + shoulder * 0.2, 0.62], 24: [0.55 + shoulder * 0.2, 0.62] } }), { view: 'front', handedness: 'left', heightCm: null, size: SIZE });
  near(val(left, 'hipSide_impact'), -20, 0.1);
  // 身長170cm → 肩幅 39.1cm の 20% ≒ 7.8cm（目安）
  const cm = computeMetrics(at({ impact: { 23: [0.45 + shoulder * 0.2, 0.62], 24: [0.55 + shoulder * 0.2, 0.62] } }), { view: 'front', handedness: 'right', heightCm: 170, size: SIZE });
  near(val(cm, 'hipSide_impact'), 170 * 0.23 * 0.2, 0.05);
  assert.equal(cm.find((m) => m.key === 'hipSide_impact').note, '目安');
});

test('数値（後方）: 前傾角度と変化、腰のボール側への動き。正面専用の数値は出さない', () => {
  // アドレス: 腰(0.5,0.62)→肩(0.6,0.45) の前傾。手元は右（ボール側）
  const addr = { 23: [0.49, 0.62], 24: [0.51, 0.62], 11: [0.59, 0.45], 12: [0.61, 0.45], 15: [0.65, 0.75], 16: [0.65, 0.75] };
  // インパクト: 上体が起き、腰がボール側へ
  const imp = { 23: [0.53, 0.62], 24: [0.55, 0.62], 11: [0.58, 0.44], 12: [0.6, 0.44] };
  const ms = computeMetrics(at({ address: addr, top: addr, impact: imp }), { view: 'behind', handedness: 'right', heightCm: null, size: SIZE });
  const tilt0 = (Math.atan2(0.1 * 360, 0.17 * 640) * 180) / Math.PI;
  near(val(ms, 'spine_address'), tilt0, 0.01);
  assert.ok(val(ms, 'spineChange_impact') < 0); // 起き上がった
  assert.ok(val(ms, 'hipToBall_impact') > 0);    // ボール側へ
  assert.equal(val(ms, 'headSide_top'), undefined);
});

test('数値: 信頼度が低い点を使う数値は出さない（null）', () => {
  const a = at({});
  a.top.lm[13].visibility = 0.2; // 左肘
  const ms = computeMetrics(a, { view: 'front', handedness: 'right', heightCm: null, size: SIZE });
  assert.equal(val(ms, 'leadArm_top'), null);
  assert.notEqual(val(ms, 'tempo'), null);
});

test('表示: 数値と差の桁・符号', async () => {
  const { fmt, fmtDiff } = await import('../js/features/swing/swing-format.js');
  const tempo = { key: 'tempo', unit: '' };
  assert.equal(fmt(tempo, 3.14), '3.1');
  assert.equal(fmtDiff(tempo, 0.6), '+0.6');
  assert.equal(fmtDiff({ key: 'backTime', unit: '秒' }, -0.123), '-0.12秒');
  assert.equal(fmt({ key: 'headSide_top', unit: '%（肩幅に対して）' }, 12.4), '+12%');
  assert.equal(fmt({ key: 'headSide_top', unit: 'cm' }, null), '測れず');
  assert.equal(fmtDiff({ key: 'x', unit: '' }, null), '−');
});

test('比較: 同じ数値どうしの差（今回 − 比べる回）', () => {
  const d = metricDiffs([{ key: 'tempo', value: 3.2, unit: '' }, { key: 'x', value: null, unit: '' }], [{ key: 'tempo', value: 2.8, unit: '' }]);
  near(d[0].diff, 0.4);
  assert.equal(d[1].diff, null);
});

test('バックアップ: 静止画を文字にして、戻すと同じデータになる', async () => {
  const blob = new Blob([new Uint8Array([255, 216, 1, 2, 3, 250])], { type: 'image/jpeg' });
  const text = await blobToDataUrl(blob);
  assert.match(text, /^data:image\/jpeg;base64,/);
  const back = dataUrlToBlob(text);
  assert.deepEqual([...new Uint8Array(await back.arrayBuffer())], [255, 216, 1, 2, 3, 250]);
  const data = { swingVideos: [{ id: 's', phases: { top: { t: 1, image: blob, landmarks: [] } } }], clubs: [{ id: 'c' }] };
  const enc = await encodeImages(data);
  assert.equal(typeof enc.swingVideos[0].phases.top.image, 'string');
  assert.ok(data.swingVideos[0].phases.top.image instanceof Blob); // 元のデータは変えない
  const dec = await decodeImages(JSON.parse(JSON.stringify(enc)));
  assert.equal(dec.swingVideos[0].phases.top.image.type, 'image/jpeg');
  assert.deepEqual(dec.clubs, [{ id: 'c' }]);
});

test('v5→v6: スイングの記録から動画を消し、場面・数値・利き手を足す', () => {
  const out = migrateData({ swingVideos: [{ id: 's', date: '2026-10-01', view: 'front', video: 'BIG', annotations: [1], autoMeasurements: {} }] }, 5);
  assert.deepEqual(out.swingVideos[0], { id: 's', date: '2026-10-01', view: 'front', handedness: 'right', phases: {}, metrics: [], note: '' });
});
