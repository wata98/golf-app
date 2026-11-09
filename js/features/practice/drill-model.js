// ドリルの記録を作る・確かめる処理（計算だけ。保存は practice-store.js）

import { toLocalIso } from '../../core/dates.js';
import { DEFAULT_DRILLS } from './drill-data.js';
import { TOPICS, PLACES } from './practice-rules.js';

// 最初のドリル集を、保存する形（作成日時つき）にする
export function defaultDrillRecords(now) {
  const t = toLocalIso(now);
  return DEFAULT_DRILLS.map((d) => ({ ...d, places: [...d.places], createdAt: t, updatedAt: t, isDefault: true }));
}

// 新しいドリル（画面の「追加」）
export function newDrill(topic, now) {
  const t = toLocalIso(now);
  return { id: 'my-' + crypto.randomUUID(), topic, name: '', how: '', points: '', balls: 10, minutes: 10, places: ['range'], createdAt: t, updatedAt: t, isDefault: false };
}

// 入力を確かめる。問題があれば日本語の説明を返す（なければ null）
export function validateDrill(d) {
  if (!d.name.trim()) return '名前を入れてください。';
  if (!TOPICS.some((t) => t.key === d.topic)) return '課題を選んでください。';
  if (!d.places.length || !d.places.every((p) => PLACES.some((x) => x.key === p))) return '場所を1つ以上選んでください。';
  for (const [key, label] of [['balls', '球数の目安'], ['minutes', '時間の目安']]) {
    if (!Number.isInteger(d[key]) || d[key] < 0 || d[key] > 500) return `${label}は0〜500の数を入れてください。`;
  }
  return null;
}
