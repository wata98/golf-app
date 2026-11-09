// ラウンドとゴルフ場の読み書き（スマホの中の保存場所）

import { getAll, getOne, putOne, deleteOne } from '../../db/database.js';

// 記録中のラウンド（1つだけの想定。なければ null）
export async function getPlayingRound() {
  const rounds = await getAll('rounds');
  return rounds.find((r) => r.status === 'playing') || null;
}

// 完了したラウンドを新しい順に（同じ日なら後で作ったものが上）
export async function listFinishedRounds() {
  const rounds = (await getAll('rounds')).filter((r) => r.status === 'finished');
  return rounds.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export const getRound = (id) => getOne('rounds', id);
export const saveRound = (round) => putOne('rounds', round);
export const deleteRound = (id) => deleteOne('rounds', id);

// ゴルフ場を名前の順に（一覧から隠したものは除く）
export async function listCourses() {
  const courses = (await getAll('courses')).filter((c) => !c.archived);
  return courses.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

export const getCourse = (id) => getOne('courses', id);
export const saveCourse = (course) => putOne('courses', course);
