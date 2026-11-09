// 飛距離の記録の読み書き（スマホの中の保存場所）

import { getAll, putOne, deleteOne } from '../../db/database.js';
import { toLocalIso } from '../../core/dates.js';

export const listDistanceRecords = () => getAll('distanceRecords');
export const deleteDistanceRecord = (id) => deleteOne('distanceRecords', id);

// 1球分の記録を作って保存し、その記録を返す
export async function addDistanceRecord({ clubId, date, place, carry, total, isMiss }) {
  const t = toLocalIso(new Date());
  const record = { id: crypto.randomUUID(), createdAt: t, updatedAt: t, clubId, date, place, carry, total, isMiss, shotId: null, note: '' };
  await putOne('distanceRecords', record);
  return record;
}
