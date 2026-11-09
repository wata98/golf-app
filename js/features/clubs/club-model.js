// クラブの記録を作る・並べ替える処理（計算だけ。保存は club-store.js）

import { toLocalIso } from '../../core/dates.js';

// 種類（保存する値と画面の表示）
export const CLUB_TYPES = [
  { value: 'driver', label: 'ドライバー' },
  { value: 'wood', label: 'ウッド' },
  { value: 'hybrid', label: 'ユーティリティ' },
  { value: 'iron', label: 'アイアン' },
  { value: 'wedge', label: 'ウェッジ' },
  { value: 'putter', label: 'パター' },
];

// 最初に入れておく、よくある14本
export const DEFAULT_CLUBS = [
  ['ドライバー', 'driver'], ['3W', 'wood'], ['5W', 'wood'], ['4UT', 'hybrid'],
  ['5I', 'iron'], ['6I', 'iron'], ['7I', 'iron'], ['8I', 'iron'], ['9I', 'iron'], ['PW', 'wedge'],
  ['50度', 'wedge'], ['56度', 'wedge'], ['58度', 'wedge'], ['パター', 'putter'],
];

export function newClub(name, type, order, now) {
  const t = toLocalIso(now);
  return { id: crypto.randomUUID(), createdAt: t, updatedAt: t, name: name.trim(), type, loft: null, order, archived: false };
}

// 最初の14本を作る
export function defaultClubs(now) {
  return DEFAULT_CLUBS.map(([name, type], i) => newClub(name, type, i + 1, now));
}

// バッグに入っているクラブを並び順に
export function bagClubs(clubs) {
  return clubs.filter((c) => !c.archived).sort((a, b) => a.order - b.order);
}

// 飛距離を測るクラブ（パターを除く）
export function distanceClubs(clubs) {
  return bagClubs(clubs).filter((c) => c.type !== 'putter');
}

// clubs の中で id のクラブを1つ上（delta=-1）または下（+1）に動かし、order を1から振り直す。
// 動かしたクラブの一覧（保存し直すもの）を返す
export function moveClub(clubs, id, delta) {
  const list = bagClubs(clubs);
  const i = list.findIndex((c) => c.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return [];
  [list[i], list[j]] = [list[j], list[i]];
  const changed = [];
  list.forEach((c, k) => {
    if (c.order !== k + 1) {
      c.order = k + 1;
      changed.push(c);
    }
  });
  return changed;
}

// 新しく足すクラブの並び順（いちばん後ろ）
export function nextOrder(clubs) {
  return clubs.reduce((max, c) => Math.max(max, c.order || 0), 0) + 1;
}
