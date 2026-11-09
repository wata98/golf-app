// スイングの解析結果の読み書き（swingVideos の棚。名前は最初の設計のままだが、動画は保存しない）

import { getAll, getOne, putOne, deleteOne } from '../../db/database.js';

// 新しい順
export async function listSwings() {
  return (await getAll('swingVideos')).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}
export const getSwing = (id) => getOne('swingVideos', id);
export const saveSwing = (s) => putOne('swingVideos', s);
export const deleteSwing = (id) => deleteOne('swingVideos', id);
