// 練習の振り返りの集計（練習回数・課題ごとの内訳）。画面や保存から切り離した計算だけ。

import { daysSinceDate } from '../../core/dates.js';
import { TOPICS } from './practice-rules.js';

export const RECENT_DAYS = 30;

// 完了した練習を新しい順に
export function doneSessions(sessions) {
  return sessions.filter((s) => s.status === 'done')
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

// 練習回数（全期間・直近30日）
export function practiceCounts(sessions, now) {
  const done = doneSessions(sessions);
  return { total: done.length, recent: done.filter((s) => daysSinceDate(s.date, now) < RECENT_DAYS).length };
}

// 課題ごとの内訳: ドリルの数・球数・分・手応えの平均（手応えを入れたものだけ）
export function topicBreakdown(sessions) {
  const rows = TOPICS.map((t) => ({ key: t.key, label: t.label, drills: 0, balls: 0, minutes: 0, ratingSum: 0, ratingCount: 0 }));
  for (const s of doneSessions(sessions)) {
    for (const it of s.items) {
      const row = rows.find((r) => r.key === it.topic);
      if (!row) continue;
      row.drills += 1;
      if (s.unit === 'minutes') row.minutes += it.amount; else row.balls += it.amount;
      if (it.rating != null) { row.ratingSum += it.rating; row.ratingCount += 1; }
    }
  }
  return rows.map(({ ratingSum, ratingCount, ...r }) => ({ ...r, avgRating: ratingCount ? ratingSum / ratingCount : null }));
}
