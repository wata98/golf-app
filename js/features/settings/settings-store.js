// アプリの設定（settings の棚の1件）の読み書き。
// まだ保存していない項目は、ここの初期値を使う

import { getOne, putOne } from '../../db/database.js';
import { SINGLE_ID } from '../../db/schema.js';
import { DEFAULT_ELEVATION_UP, DEFAULT_ELEVATION_DOWN } from '../distance/club-finder.js';

export const DEFAULT_SETTINGS = {
  rakutenAppId: '',
  homePrefecture: '',
  // 飛距離の集計の条件（振り返りと早見表で共通）
  distanceExcludeMiss: true,
  distanceRecentOnly: false,
  // 高低差の補正（1mにつき何ヤード）
  elevationUp: DEFAULT_ELEVATION_UP,
  elevationDown: DEFAULT_ELEVATION_DOWN,
  // 飛距離の記録で前回選んだ場所
  lastDistancePlace: 'range',
};

export async function getSettings() {
  const saved = (await getOne('settings', SINGLE_ID)) || {};
  return { ...DEFAULT_SETTINGS, ...saved, id: SINGLE_ID };
}

export async function saveSettings(changes) {
  const current = await getSettings();
  await putOne('settings', { ...current, ...changes });
}
