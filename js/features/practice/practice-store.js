// ドリル集と練習の記録の読み書き（スマホの中の保存場所）

import { getAll, getOne, putOne, deleteOne, openDatabase } from '../../db/database.js';
import { defaultDrillRecords } from './drill-model.js';
import { toLocalIso } from '../../core/dates.js';

export const listDrills = () => getAll('drills');
export const saveDrill = (d) => putOne('drills', d);
export const deleteDrill = (id) => deleteOne('drills', id);

// ドリル集を最初の40個に戻す（自分で足したドリルも消える）
export async function resetDrills() {
  const db = await openDatabase();
  const tx = db.transaction('drills', 'readwrite');
  const store = tx.objectStore('drills');
  store.clear();
  for (const d of defaultDrillRecords(new Date())) store.put(d);
  await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
}

export const listSessions = () => getAll('practiceSessions');
export const getSession = (id) => getOne('practiceSessions', id);
export const saveSession = (s) => putOne('practiceSessions', s);
export const deleteSession = (id) => deleteOne('practiceSessions', id);

// 記録中（練習の途中）の練習。なければ null
export async function getPlannedSession() {
  return (await listSessions()).find((s) => s.status === 'planned') ?? null;
}

// メニュー（practice-rules.js の buildMenu の結果）から練習の記録を作る
export function sessionFromMenu(menu, { date, place, unit, amount }) {
  const t = toLocalIso(new Date());
  return {
    id: crypto.randomUUID(), createdAt: t, updatedAt: t,
    date, place, unit, amount, status: 'planned', note: '',
    mainLabel: menu.main?.label ?? '', secondLabel: menu.second?.label ?? '',
    items: menu.items.map((it) => ({
      drillId: it.drill.id, drillName: it.drill.name, topic: it.topic, block: it.block,
      amount: it.amount, reason: it.reason, rating: null,
    })),
  };
}
