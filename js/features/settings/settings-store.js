// アプリの設定（settings の棚の1件）の読み書き。
// まだ保存していない項目は、ここの初期値を使う

import { getOne, putOne } from '../../db/database.js';
import { SINGLE_ID } from '../../db/schema.js';
import { DEFAULT_ELEVATION_UP, DEFAULT_ELEVATION_DOWN } from '../distance/club-finder.js';
import { DEFAULT_SHARES } from '../practice/practice-rules.js';

export const DEFAULT_SETTINGS = {
  // 楽天ウェブサービスのアプリIDとアクセスキー（機能6）。他人に知られてはいけないので、
  // コードに書かず、バックアップのJSONにも入れない（js/db/backup-format.js の SECRET_SETTINGS）
  rakutenAppId: '',
  rakutenAccessKey: '',
  // 空き確認で前回使った条件（なければ availability-view.js の初期値）
  lastAvailability: null,
  homePrefecture: '',
  // 飛距離の集計の条件（振り返りと早見表で共通）
  distanceExcludeMiss: true,
  distanceRecentOnly: false,
  // 高低差の補正（1mにつき何ヤード）
  elevationUp: DEFAULT_ELEVATION_UP,
  elevationDown: DEFAULT_ELEVATION_DOWN,
  // 飛距離の記録で前回選んだ場所
  lastDistancePlace: 'range',
  // スイング解析（機能7）: 利き手（'right' 右打ち / 'left' 左打ち）と身長（cm。cm の目安を出すのに使う。なければ null）
  swingHandedness: 'right',
  heightCm: null,
  // 弱点分析の目標スコア（パー72のコースでのスコア）
  targetScore: 100,
  // 練習メニューの配分（%）: 一番の課題・2番目の課題・ウォームアップと仕上げ
  practiceShares: { ...DEFAULT_SHARES },
  // 練習メニューで前回選んだ場所・量
  lastPracticePlace: 'range',
  lastPracticeUnit: 'balls',
  lastPracticeAmount: 100,
};

export async function getSettings() {
  const saved = (await getOne('settings', SINGLE_ID)) || {};
  return { ...DEFAULT_SETTINGS, ...saved, id: SINGLE_ID };
}

export async function saveSettings(changes) {
  const current = await getSettings();
  await putOne('settings', { ...current, ...changes });
}
