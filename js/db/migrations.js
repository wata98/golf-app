// データの移行（古い形のデータを新しい形に直す）処理。
// 画面や保存の仕組みから切り離した計算だけなので、テストしやすい。

import { SCHEMA_VERSION, DATA_STORES } from './schema.js';
import { defaultClubs } from '../features/clubs/club-model.js';
import { defaultDrillRecords } from '../features/practice/drill-model.js';

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

  // v2 → v3: 飛距離の記録を機能2の形にする
  //  - source（range/round/monitor）を place（range=練習場 / course=コース）に置き換える。計測器(monitor)は練習場にまとめる
  //  - isMiss（ミスショットか）を足す
  //  - クラブが1本もなければ、よくある14本を入れる
  3: (data) => ({
    ...data,
    distanceRecords: (data.distanceRecords || []).map(migrateDistanceV3),
    clubs: (data.clubs || []).length ? data.clubs : defaultClubs(new Date()),
  }),

  // v3 → v4: 練習メニュー（機能4）
  //  - ドリル集（drills）がなければ、最初のドリル集を入れる
  //  - 練習の記録の形を機能4に合わせる（最初の形の title / balls を drillName / amount にする）
  4: (data) => ({
    ...data,
    // アプリの中での移行では、棚は作られた直後で空（[]）なので「1件もなければ」で判定する
    drills: (data.drills || []).length ? data.drills : defaultDrillRecords(new Date()),
    practiceSessions: (data.practiceSessions || []).map(migratePracticeV4),
  }),

  // v4 → v5: コースマネジメント（機能5）
  //  - 攻略メモをティーごとにし、ハザードの一覧と手直ししたプランを持たせる。
  //    最初の形（note / teeClubId / aim）はプランに移す。ティーはそのゴルフ場の最初のティーとみなす
  //  - ゴルフ場にグリーンの位置の一覧（greens）を足す
  5: (data) => {
    const courses = (data.courses || []).map((c) => ({ ...c, greens: c.greens ?? [] }));
    const firstTee = (courseId) => courses.find((c) => c.id === courseId)?.tees?.[0]?.name ?? '';
    return {
      ...data,
      courses,
      holeNotes: (data.holeNotes || []).map((n) => {
        if (Array.isArray(n.hazards)) return n; // すでに新しい形
        const { note, teeClubId, aim, ...rest } = n;
        const teeName = rest.teeName ?? firstTee(rest.courseId);
        const hasPlan = note || teeClubId || aim;
        return {
          ...rest,
          id: `${rest.courseId}|${teeName}|${rest.holeNumber}`,
          teeName,
          hazards: [],
          plan: hasPlan ? { clubId: teeClubId ?? null, aim: aim ?? 'center', note: note ?? '' } : null,
        };
      }),
    };
  },
};

function migratePracticeV4(session) {
  return {
    ...session,
    place: session.place ?? 'range',
    unit: session.unit ?? 'balls',
    status: session.status ?? 'done',
    note: session.note ?? '',
    items: (session.items || []).map((item) => {
      const { title, balls, done, ...rest } = item;
      return {
        ...rest,
        drillId: rest.drillId ?? null,
        drillName: rest.drillName ?? title ?? '',
        topic: rest.topic ?? null,
        block: rest.block ?? 'main',
        amount: rest.amount ?? balls ?? 0,
        reason: rest.reason ?? '',
        rating: rest.rating ?? null,
      };
    }),
  };
}

const SOURCE_TO_PLACE = { range: 'range', monitor: 'range', round: 'course' };

function migrateDistanceV3(record) {
  const { source, ...rest } = record;
  return {
    ...rest,
    place: rest.place ?? SOURCE_TO_PLACE[source] ?? 'range',
    isMiss: rest.isMiss ?? false,
  };
}

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
