// 攻略メモの読み書きと、提案に使う材料（クラブの飛び方・左右のブレ）の用意

import { getAll, getOne, putOne } from '../../db/database.js';
import { holeNoteId, newHoleNote } from './hazard-model.js';
import { clubProfiles, sideRates, suggestTeeShot } from './course-rules.js';
import { distanceClubs } from '../clubs/club-model.js';
import { filterRecords } from '../distance/distance-stats.js';
import { getSettings } from '../settings/settings-store.js';

// そのホールの攻略メモ（なければ新しく作る。まだ保存はしない）
export async function getHoleNote(courseId, teeName, holeNumber) {
  return (await getOne('holeNotes', holeNoteId(courseId, teeName, holeNumber))) ?? newHoleNote(courseId, teeName, holeNumber, new Date());
}

export const saveHoleNote = (note) => putOne('holeNotes', note);

// そのゴルフ場・ティーの攻略メモをホール番号ごとに
export async function holeNotesFor(courseId, teeName) {
  const notes = (await getAll('holeNotes')).filter((n) => n.courseId === courseId && n.teeName === teeName);
  return new Map(notes.map((n) => [n.holeNumber, n]));
}

// 提案に使う材料（クラブの飛び方・左右のブレ・クラブの一覧）
export async function loadPlanContext() {
  const s = await getSettings();
  const clubs = await getAll('clubs');
  const records = filterRecords(await getAll('distanceRecords'), { excludeMiss: s.distanceExcludeMiss, recentOnly: s.distanceRecentOnly }, new Date());
  const rounds = (await getAll('rounds')).filter((r) => r.status === 'finished');
  const profiles = clubProfiles(distanceClubs(clubs), records);
  return { profiles, sides: sideRates(rounds), clubs };
}

// 表示するプラン: 手直ししたプランがあればそれ、なければ自動の提案
// 戻り値: { manual: 手直しか, short: 1行, suggestion: 自動の提案, plan: 手直し（なければ null）}
export function planFor(hole, note, ctx) {
  const suggestion = suggestTeeShot(hole, note?.hazards ?? [], ctx.profiles, ctx.sides);
  const plan = note?.plan ?? null;
  if (!plan) return { manual: false, short: suggestion.short, suggestion, plan };
  const club = ctx.clubs.find((c) => c.id === plan.clubId);
  const prof = ctx.profiles.find((p) => p.club.id === plan.clubId);
  const aim = { left: '左寄り', center: '中央', right: '右寄り' }[plan.aim] ?? '中央';
  const rest = prof && hole.yards && hole.par !== 3 ? `・残り${Math.max(0, Math.round(hole.yards - prof.total))}y` : '';
  const short = `${club ? club.name : 'クラブ未選択'}・${aim}${rest}${plan.note ? `（${plan.note}）` : ''}`;
  return { manual: true, short, suggestion, plan };
}
