// データの移行（古い形のデータを新しい形に直す）処理。
// 画面や保存の仕組みから切り離した計算だけなので、テストしやすい。

import { SCHEMA_VERSION, DATA_STORES } from './schema.js';

// 移行処理の一覧。キーは「移行したあとのバージョン」。
// 例: 2: (data) => { ...v1の形をv2の形に直して返す... }
// 1つ形を変えるごとに1つ足す。古い処理は消さない（何年も前のバックアップも読めるように）。
export const MIGRATIONS = {
  // v1 → v2: ラウンドの各ホールの記録を機能1の形にする
  //  - fairway（hit/left/right/none）を teeShot（fairway/leftRough/rightRough/…）に置き換える
  //  - gir（パーオン）は保存せず毎回計算するので消す
  //  - aroundGreen（グリーン周りから何打）と note（一言メモ）を足す
  2: (data) => ({
    ...data,
    rounds: (data.rounds || []).map((round) => ({
      ...round,
      holes: (round.holes || []).map(migrateHoleV2),
    })),
  }),
};

const FAIRWAY_TO_TEE_SHOT = { hit: 'fairway', left: 'leftRough', right: 'rightRough' };

function migrateHoleV2(hole) {
  const { fairway, gir, ...rest } = hole;
  return {
    ...rest,
    teeShot: rest.teeShot ?? FAIRWAY_TO_TEE_SHOT[fairway] ?? null,
    aroundGreen: rest.aroundGreen ?? null,
    note: rest.note ?? '',
  };
}

// data を fromVersion から今のバージョンまで、1つずつ順に移行して返す。
// 元の data は書き換えない（失敗したときに元のデータが残るように）。
export function migrateData(data, fromVersion, migrations = MIGRATIONS, toVersion = SCHEMA_VERSION) {
  if (!Number.isInteger(fromVersion) || fromVersion < 1) {
    throw new Error('データのバージョン番号が正しくありません。');
  }
  if (fromVersion > toVersion) {
    throw new Error(
      `このデータは新しい版のアプリで作られています（データの版 ${fromVersion}、アプリの版 ${toVersion}）。アプリを最新にしてから読み込んでください。`
    );
  }
  // 深いコピーを作って、元のデータに触れないようにする
  let result = structuredClone(data);
  for (let v = fromVersion + 1; v <= toVersion; v++) {
    const step = migrations[v];
    if (!step) throw new Error(`バージョン${v}への移行処理がありません。`);
    result = step(result);
  }
  return fillMissingStores(result);
}

// 足りない棚があれば空の一覧で補う（新しい棚を足したときのため）
export function fillMissingStores(data) {
  const result = { ...data };
  for (const name of DATA_STORES) {
    if (!Array.isArray(result[name])) result[name] = [];
  }
  return result;
}
