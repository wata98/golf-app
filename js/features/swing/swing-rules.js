// =====================================================================
// スイング解析の判定ルール（場面の決め方と、数値の出し方。このファイルだけで決まる）
//
// 場面の決め方（手首の中点＝手元の高さで決める。クラブは検出できないため）:
//   スイング中、手元は2回高く上がる（①バックスイング〜トップ、②フォロー〜フィニッシュ）。
//   1. 動画の最初（アドレス）の手元の高さを基準にし、それより胴の長さ×HIGH_ABOVE_ADDRESS 以上高いコマの「かたまり」を探す
//   2. トップ      = 1つ目のかたまりで、手元が一番高いコマ
//   3. インパクト  = 1つ目と2つ目のかたまりの間で、手元が一番低いコマ
//   4. アドレス    = 1つ目のかたまりの前で、手元がほぼ止まっている一番あとのコマ
//   5. フィニッシュ = 2つ目のかたまりで手元が一番高くなったあと、ほぼ止まった最初のコマ
// 実際の動画で確かめたこと（2026-11-09）: トップやダウンスイングでは、手首が頭の後ろに隠れたりぶれたりして
// MediaPipe の信頼度がとても低くなる（0.1以下）。それでも位置はおおむね合っているので、手元の判定では信頼度で捨てない。
// 代わりに、1コマだけ飛んだ値を消すため、前後2コマを含めた5コマの中央値でならす。
//
// 数値は「2Dの動画から現実的に測れるもの」だけ。回転の角度（腰・肩）やクラブに関するものは出さない。
// 平面の映像では実際とずれやすいものは note: '目安' を付ける。
// 変えたら tests/swing-rules.test.js も直す。
// =====================================================================

import { bodyPoints, dist, angleAt, tiltFromVertical } from './swing-math.js';

export const PHASES = [
  { key: 'address', label: 'アドレス' },
  { key: 'top', label: 'トップ' },
  { key: 'impact', label: 'インパクト' },
  { key: 'finish', label: 'フィニッシュ' },
];

export const STILL_SPEED = 0.6;   // 手元の速さがこれ未満なら「ほぼ止まっている」（胴の長さ何個分／秒）
export const STILL_FRAMES = 3;    // 止まっているとみなすのに必要な連続コマ数
export const HIGH_ABOVE_ADDRESS = 0.5; // 手元が「高い」= アドレスの手元より胴の長さ×0.5以上高い
export const MIN_HIGH_FRAMES = 3;  // 「高い」かたまりとみなすのに必要なコマ数（短いものは推定のぶれとして無視）
export const MERGE_GAP = 2;        // 「高い」コマの間の、これ以下のすき間はつなげる（推定のぶれで途切れたものとして）
export const SMOOTH = 5;           // 手元の位置をならすコマ数（中央値）
export const MIN_VISIBILITY = 0.5;  // 点の信頼度がこれ未満なら、その数値は出さない
// 長さを cm の目安に直すときの、身長に対する体の長さの比（一般的な体型の目安）
export const SHOULDER_WIDTH_RATIO = 0.23; // 肩幅 ≒ 身長 × 0.23（正面の動画で使う）
export const TORSO_RATIO = 0.30;          // 肩の中心〜腰の中心 ≒ 身長 × 0.30（後方の動画で使う）

// ---- 場面を決める ----
// frames: [{ t: 秒, lm: 33点 or null }] / size: { w, h }（画像のピクセル）
// 戻り値: { address, top, impact, finish }（frames の番号）。見つからなければ { error: '理由' }
export function detectPhases(frames, size) {
  const pts = frames.map((f) => (f.lm ? bodyPoints(f.lm, size) : null));
  const idx = frames.map((_, i) => i).filter((i) => pts[i]); // 体が見つかったコマ（手首の信頼度では捨てない）
  if (idx.length < 10) return { error: '体を十分に見つけられませんでした。撮り方（全身が入っているか・明るさ）を確かめてください。' };

  // 手元の位置をならす（前後2コマを含めた5コマの中央値）。1コマだけ飛んだ値で判定がずれないように
  const half = Math.floor(SMOOTH / 2);
  const hand = new Map(idx.map((i, k) => {
    const near = idx.slice(Math.max(0, k - half), k + half + 1);
    return [i, { x: median(near.map((j) => pts[j].hands.x)), y: median(near.map((j) => pts[j].hands.y)) }];
  }));
  const scale = median(idx.map((i) => dist(pts[i].shoulderMid, pts[i].hipMid))) || 1;
  const speed = new Map(idx.map((i, k) => {
    if (k === 0) return [i, 0];
    const j = idx[k - 1];
    return [i, dist(hand.get(i), hand.get(j)) / scale / Math.max(frames[i].t - frames[j].t, 1e-3)];
  }));

  // アドレスの手元の高さ（動画の最初のほう＝最初の10コマか全体の1/5の中央値）
  const baseY = median(idx.slice(0, Math.max(3, Math.min(10, Math.floor(idx.length / 5)))).map((i) => hand.get(i).y));
  const isHigh = (i) => baseY - hand.get(i).y > HIGH_ABOVE_ADDRESS * scale; // y が小さいほど高い
  const groups = highGroups(idx, isHigh);
  if (groups.length < 2) {
    return { error: 'スイング（手元が2回高く上がる動き）を見つけられませんでした。アドレスの少し前からフィニッシュまで撮った動画か確かめて、手で直してください。', guess: fallbackGuess(idx) };
  }
  const [up, follow] = groups;
  const top = argBest(up, (i) => hand.get(i).y, false);
  const between = idx.filter((i) => i > up[up.length - 1] && i < follow[0]);
  const impact = between.length ? argBest(between, (i) => hand.get(i).y, true) : up[up.length - 1] + 1;
  const before = idx.filter((i) => i < up[0]).reverse(); // 1つ目のかたまりの前を、あとから前へ
  const address = findStill(before, speed) ?? before[before.length - 1] ?? idx[0];
  const highest = argBest(follow, (i) => hand.get(i).y, false);
  const finish = findStill(idx.filter((i) => i >= highest), speed) ?? highest;
  if (!(address < top && top < impact && impact < finish)) {
    return { error: '場面の順番がおかしくなりました。手で直してください。', guess: { address, top, impact, finish } };
  }
  return { address, top, impact, finish };
}

// 「手元が高い」コマのかたまり（コマ番号の配列）の一覧。短いすき間はつなげ、短すぎるかたまりは捨てる
function highGroups(idx, isHigh) {
  const groups = [];
  let cur = null;
  let gap = 0;
  for (const i of idx) {
    if (isHigh(i)) {
      if (cur && gap <= MERGE_GAP) cur.push(i);
      else { cur = [i]; groups.push(cur); }
      gap = 0;
    } else if (cur) {
      gap += 1;
    }
  }
  return groups.filter((g) => g.length >= MIN_HIGH_FRAMES);
}

// 見つからないときの手直し用の初期位置（全体を4つに分ける）
function fallbackGuess(idx) {
  const at = (k) => idx[Math.min(idx.length - 1, Math.floor(idx.length * k))];
  return { address: at(0.1), top: at(0.4), impact: at(0.55), finish: at(0.9) };
}

// list の順に見て、STILL_FRAMES コマ続けて遅い最初のコマ
function findStill(list, speed) {
  for (let k = 0; k + STILL_FRAMES <= list.length; k++) {
    if (list.slice(k, k + STILL_FRAMES).every((i) => speed.get(i) < STILL_SPEED)) return list[k];
  }
  return null;
}
function median(a) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }
function argBest(list, f, wantMax) {
  return list.reduce((best, i) => ((wantMax ? f(i) > f(best) : f(i) < f(best)) ? i : best), list[0]);
}

// ---- 数値を出す ----
// at: { address, top, impact, finish } それぞれ { t, lm } / view: 'front'（正面）or 'behind'（飛球線後方）
// handedness: 'right' / 'left' / heightCm: 身長（なければ null）
// 戻り値: [{ key, label, value, unit, note }]。value が null のものは「測れなかった（信頼度が低い）」
export function computeMetrics(at, { view, handedness, heightCm, size }) {
  const b = Object.fromEntries(PHASES.map((p) => [p.key, bodyPoints(at[p.key].lm, size)]));
  const ok = (...points) => points.every((p) => p.v >= MIN_VISIBILITY);
  const lead = handedness === 'left' ? 'right' : 'left'; // 右打ちなら左腕がリード
  const out = [];
  const add = (key, label, value, unit, note = '') => out.push({ key, label, value, unit, note });

  // テンポ: バックスイングの時間 ÷ ダウンスイングの時間（よく言われる目安は3前後）
  const back = at.top.t - at.address.t;
  const down = at.impact.t - at.top.t;
  add('tempo', 'テンポ（バックスイング÷ダウンスイング）', down > 0 ? back / down : null, '', '');
  add('backTime', 'バックスイングの時間', back, '秒');
  add('downTime', 'ダウンスイングの時間', down, '秒');

  // 長さの物差し: 正面は肩幅、後方は胴の長さ（アドレスで測る）。身長があれば cm の目安に、なければ物差しに対する%
  const a = b.address;
  const refPx = view === 'front' ? dist(a.leftShoulder, a.rightShoulder) : dist(a.shoulderMid, a.hipMid);
  const refCm = heightCm ? heightCm * (view === 'front' ? SHOULDER_WIDTH_RATIO : TORSO_RATIO) : null;
  const toLen = (pxv) => (refCm ? (pxv / refPx) * refCm : (pxv / refPx) * 100);
  const lenUnit = refCm ? 'cm' : view === 'front' ? '%（肩幅に対して）' : '%（胴の長さに対して）';
  const lenNote = refCm ? '目安' : '';

  // 頭の上下: ＋なら下がった
  for (const p of ['top', 'impact']) {
    const v = ok(a.head, b[p].head) ? toLen(b[p].head.y - a.head.y) : null;
    add(`headDown_${p}`, `頭の上下（アドレス→${p === 'top' ? 'トップ' : 'インパクト'}、＋は下がった）`, v, lenUnit, lenNote);
  }

  if (view === 'front') {
    // 正面: 右打ちの人がカメラを向くと、目標方向は画像の右（＋x）
    const toTarget = handedness === 'left' ? -1 : 1;
    for (const p of ['top', 'impact']) {
      const name = p === 'top' ? 'トップ' : 'インパクト';
      add(`headSide_${p}`, `頭の左右（アドレス→${name}、＋は目標方向）`, ok(a.head, b[p].head) ? toLen((b[p].head.x - a.head.x) * toTarget) : null, lenUnit, lenNote);
      add(`hipSide_${p}`, `腰の左右（アドレス→${name}、＋は目標方向）`, ok(a.hipMid, b[p].hipMid) ? toLen((b[p].hipMid.x - a.hipMid.x) * toTarget) : null, lenUnit, lenNote);
    }
  } else {
    // 後方: 前傾角度 = 腰の中心→肩の中心の線が、垂直から何度傾いているか
    const tilt = (p) => (ok(b[p].hipMid, b[p].shoulderMid) ? tiltFromVertical(b[p].hipMid, b[p].shoulderMid) : null);
    const t0 = tilt('address');
    add('spine_address', '前傾角度（アドレス）', t0, '度');
    for (const p of ['top', 'impact']) {
      const t = tilt(p);
      add(`spineChange_${p}`, `前傾角度の変化（アドレス→${p === 'top' ? 'トップ' : 'インパクト'}、−は起き上がった）`, t0 != null && t != null ? t - t0 : null, '度');
    }
    // 腰がボール側へ出たか: アドレスで手元がある側をボール側とする
    const toBall = Math.sign(a.hands.x - a.hipMid.x) || 1;
    add('hipToBall_impact', '腰のボール側への動き（アドレス→インパクト、＋はボール側）', ok(a.hipMid, b.impact.hipMid) ? toLen((b.impact.hipMid.x - a.hipMid.x) * toBall) : null, lenUnit, '目安');
  }

  // リードの腕（右打ちなら左腕）の曲がり（トップ）: 肩・肘・手首の角度。180度でまっすぐ
  const t = b.top;
  const arm = [t[`${lead}Shoulder`], t[`${lead}Elbow`], t[`${lead}Wrist`]];
  add('leadArm_top', `${lead === 'left' ? '左' : '右'}腕の角度（トップ、180度でまっすぐ）`, ok(...arm) ? angleAt(...arm) : null, '度', '目安');
  return out;
}

// 2つの解析の同じ数値どうしの差（今回 − 比べる回）
export function metricDiffs(now, before) {
  return now.map((m) => {
    const o = before.find((x) => x.key === m.key);
    return { ...m, before: o?.value ?? null, diff: m.value != null && o?.value != null && o.unit === m.unit ? m.value - o.value : null };
  });
}
