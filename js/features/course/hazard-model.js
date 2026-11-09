// ハザードとホールの攻略メモ（holeNotes）の形。計算だけ（保存は course-store.js）

import { toLocalIso } from '../../core/dates.js';

export const HAZARD_KINDS = [
  { key: 'ob', label: 'OB' },
  { key: 'water', label: '池・ペナルティエリア' },
  { key: 'bunker', label: 'バンカー' },
  { key: 'narrow', label: 'フェアウェイが狭い' },
];
// 位置。cross = フェアウェイを横切る（池・クロスバンカー）/ green = グリーン周り（距離なしで登録できる）
export const HAZARD_SIDES = [
  { key: 'left', label: '左' },
  { key: 'right', label: '右' },
  { key: 'both', label: '両側' },
  { key: 'cross', label: '横切る' },
  { key: 'green', label: 'グリーン周り' },
];
export const AIMS = [
  { key: 'left', label: '左寄り' },
  { key: 'center', label: '中央' },
  { key: 'right', label: '右寄り' },
];

export const kindLabel = (k) => HAZARD_KINDS.find((x) => x.key === k)?.label ?? k;
export const sideLabel = (k) => HAZARD_SIDES.find((x) => x.key === k)?.label ?? k;
export const aimLabel = (k) => AIMS.find((x) => x.key === k)?.label ?? '中央';

// 攻略メモの id。ティーごとに分ける（ティーが違うとハザードまでの距離も違うため）
export const holeNoteId = (courseId, teeName, holeNumber) => `${courseId}|${teeName}|${holeNumber}`;

export function newHoleNote(courseId, teeName, holeNumber, now) {
  const t = toLocalIso(now);
  return { id: holeNoteId(courseId, teeName, holeNumber), courseId, teeName, holeNumber, hazards: [], plan: null, createdAt: t, updatedAt: t };
}

// ハザードを確かめる。問題があれば日本語の説明（なければ null）。
// グリーン周り以外は「ティーから何y〜何y」の両方が要る
export function validateHazard(h) {
  if (!HAZARD_KINDS.some((k) => k.key === h.kind)) return '種類を選んでください。';
  if (!HAZARD_SIDES.some((s) => s.key === h.side)) return '位置を選んでください。';
  if (h.side === 'green') return null;
  if (!Number.isFinite(h.from) || !Number.isFinite(h.to)) return 'ティーからの距離を「何y〜何y」で入れてください。';
  if (h.from < 0 || h.to > 700) return '距離は0〜700ヤードで入れてください。';
  if (h.from >= h.to) return '距離は「近いほう〜遠いほう」の順で入れてください。';
  return null;
}

// ハザードの説明（例: 「右 OB 200〜250y」）
export function describeHazard(h) {
  const where = h.side === 'green' ? 'グリーン周り' : sideLabel(h.side);
  const dist = h.side === 'green' ? '' : ` ${h.from}〜${h.to}y`;
  return `${where} ${kindLabel(h.kind)}${dist}`;
}
