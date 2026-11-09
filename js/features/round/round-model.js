// ラウンドとゴルフ場の記録を作る・直す処理（計算だけ。保存は round-store.js）。
// テストしやすいよう、日時は引数で受け取る。

import { toLocalIso } from '../../core/dates.js';

export const HOLE_COUNT = 18;
export const DEFAULT_PAR = 4; // 登録していないホールはパー4で始める
export const DEFAULT_PUTTS = 2;

// ティーショットの選択肢（保存する値と画面の表示）
export const TEE_SHOTS_LONG = [
  { value: 'fairway', label: 'フェアウェイ', short: 'FW' },
  { value: 'leftRough', label: '左ラフ', short: '左' },
  { value: 'rightRough', label: '右ラフ', short: '右' },
  { value: 'bunker', label: 'バンカー', short: 'B' },
  { value: 'ob', label: 'OB', short: 'OB' },
  { value: 'penalty', label: 'ペナルティ', short: 'P' },
];
export const TEE_SHOTS_PAR3 = [
  { value: 'green', label: '乗った', short: '乗' },
  { value: 'missedGreen', label: '乗らなかった', short: '外' },
];
// グリーン周りから何打で上がったか（4は「4以上」）
export const AROUND_GREEN = [
  { value: 1, label: '1', note: 'チップイン' },
  { value: 2, label: '2', note: '寄せワン' },
  { value: 3, label: '3' },
  { value: 4, label: '4以上' },
];

export function teeShotOptions(par) {
  return par === 3 ? TEE_SHOTS_PAR3 : TEE_SHOTS_LONG;
}

export function teeShotShort(value) {
  const all = [...TEE_SHOTS_LONG, ...TEE_SHOTS_PAR3];
  return all.find((o) => o.value === value)?.short ?? '';
}

function stamp(now) {
  const t = toLocalIso(now);
  return { id: crypto.randomUUID(), createdAt: t, updatedAt: t };
}

// 18ホールの初期値（パー4・距離なし）
function defaultTeeHoles() {
  return Array.from({ length: HOLE_COUNT }, (_, i) => ({ number: i + 1, par: DEFAULT_PAR, yards: null }));
}

// 新しいゴルフ場
export function newCourse(name, now) {
  return {
    ...stamp(now),
    name: name.trim(),
    prefecture: '',
    tees: [],
    goraCourseId: null,
    bookingLinks: [],
    favorite: false,
    archived: false,
  };
}

// ゴルフ場にそのティーがなければ足して、そのティーを返す。
// 新しいティーのパーは、ほかのティーがあればそれを写す（距離は空）。
export function ensureTee(course, teeName) {
  const name = teeName.trim();
  let tee = course.tees.find((t) => t.name === name);
  if (!tee) {
    const base = course.tees[0];
    const holes = base ? base.holes.map((h) => ({ number: h.number, par: h.par, yards: null })) : defaultTeeHoles();
    tee = { name, holes };
    course.tees.push(tee);
  }
  return tee;
}

// 新しいラウンド。ゴルフ場のパー・距離をラウンドに写しておく
// （あとでゴルフ場を直しても、過去のラウンドは変わらないように）
export function newRound({ date, course, teeName }, now) {
  const tee = course.tees.find((t) => t.name === teeName.trim());
  return {
    ...stamp(now),
    date,
    courseId: course.id,
    courseName: course.name, // 一覧ですぐ出せるように名前も写しておく
    teeName: tee.name,
    weather: '',
    status: 'playing',
    currentHole: 1,
    note: '',
    holes: tee.holes.map((h) => ({
      number: h.number,
      par: h.par,
      yards: h.yards,
      strokes: null, // null = まだ入力していない
      putts: null,
      teeShot: null,
      penalties: 0,
      bunkers: 0,
      aroundGreen: null,
      note: '',
    })),
  };
}

// ホールを入力済みにする。未入力なら、画面に出している初期値（パー・2パット）を入れる
export function commitHole(hole) {
  if (hole.strokes === null) hole.strokes = hole.par;
  if (hole.putts === null) hole.putts = DEFAULT_PUTTS;
  return hole;
}

// 画面に出す打数・パット数（未入力なら初期値）
export function shownStrokes(hole) {
  return hole.strokes ?? hole.par;
}
export function shownPutts(hole) {
  return hole.putts ?? DEFAULT_PUTTS;
}

// 数を1つ増減する（下限あり）
export function step(value, delta, min) {
  return Math.max(min, value + delta);
}

// パーを変えたとき: パー3とそれ以外ではティーショットの選択肢が違うので、合わない記録は消す
export function changePar(hole, par) {
  hole.par = par;
  const allowed = teeShotOptions(par).map((o) => o.value);
  if (hole.teeShot && !allowed.includes(hole.teeShot)) hole.teeShot = null;
  return hole;
}
