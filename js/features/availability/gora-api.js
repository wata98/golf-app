// 楽天GORAプラン検索API（楽天ウェブサービス）への問い合わせ。
// 仕様は docs/research-availability.md。接続先や版が変わったら API_URL を直す（docs/availability-troubleshooting.md）。
//
// - アプリIDとアクセスキーは「設定」で入れたものを使う。コードには書かない（楽天の規約で他人に知られてはいけない）
// - アクセスキーはURLではなくヘッダーで送る（URLが履歴などに残らないように）
// - 楽天の負担にならないよう、問い合わせは1秒以上あける

import { PREFS } from './site-links.js';
import { GoraError, errorFromResponse, networkError, readErrorBody } from './gora-errors.js';

export const API_URL = 'https://openapi.rakuten.co.jp/engine/api/Gora/GoraPlanSearch/20170623';
export const HITS = 30;          // 1回に取る件数（楽天の上限）
export const API_MAX_PRICE = 25000; // 楽天に指定できる予算の上限
const MIN_INTERVAL_MS = 1100;    // 問い合わせの間隔
const TIMEOUT_MS = 15000;

// 画面の時間帯（6=〜6時台 … 11=11時台〜）を楽天の startTimeZone（4〜15）に直す
function apiTimeZones(times) {
  return times.flatMap((t) => (t === 6 ? [4, 5, 6] : t === 11 ? [11, 12, 13, 14, 15] : [t]));
}

// 問い合わせのURLとヘッダーを作る（計算だけ。テストしやすいように分けてある）
// cond: 画面の条件 / date: その日（YYYY-MM-DD）/ page: 何ページ目 / keys: { appId, accessKey }
export function buildRequest(cond, date, page, keys) {
  const params = new URLSearchParams({
    applicationId: keys.appId,
    format: 'json',
    formatVersion: '2',
    playDate: date,
    areaCode: PREFS.filter((p) => cond.prefs.includes(p.key)).map((p) => p.gora).join(','),
    hits: String(HITS),
    page: String(page),
    sort: cond.sort === 'reservation' ? 'reservation' : 'price',
  });
  if (cond.budget) params.set('maxPrice', String(Math.min(cond.budget, API_MAX_PRICE)));
  if (cond.times.length) params.set('startTimeZone', apiTimeZones(cond.times).join(','));
  if (cond.twoSum) params.set('plan2sum', '1');
  return { url: `${API_URL}?${params}`, headers: { accessKey: keys.accessKey } };
}

// 在庫ステータスの意味（楽天の仕様の stockStatus）
export const STOCK_LABELS = {
  1: '空きあり', 2: '空きあり', 3: '空きあり（お得プラン）', 4: '空きあり（GORA限定）', 5: 'リクエスト予約のみ', 6: 'キャンセル待ち',
};

const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
// formatVersion=1 の形（{ Item: {...} } や { plan: {...} } で包まれている）でも読めるようにする
const unwrap = (v, key) => (v && typeof v === 'object' && v[key] && typeof v[key] === 'object' ? v[key] : v);

// 楽天の返事を、画面に出す1行ずつ（ゴルフ場×プラン×日）にする。
// players: 人数。プランの最小〜最大人数に入らないものは除く（楽天に人数は指定できないため）
// 必要な項目がないときは「形が変わった」エラーにする（何がないかを書く）
export function parseResponse(json, players) {
  if (!json || !Array.isArray(json.Items)) {
    throw new GoraError('shape', '楽天の返事の形が変わったようです（「Items」がありません）。docs/availability-troubleshooting.md を見てください。', JSON.stringify(json)?.slice(0, 300));
  }
  const rows = [];
  for (const wrapped of json.Items) {
    const course = unwrap(wrapped, 'Item');
    if (!course.golfCourseName) throw shapeError('golfCourseName（ゴルフ場名）');
    for (const p of asArray(course.planInfo)) {
      const plan = unwrap(p, 'plan');
      if (!plan.planName) throw shapeError('planName（プラン名）');
      const min = Number(plan.playerNumMin) || 1;
      const max = Number(plan.playerNumMax) || 4;
      if (players < min || players > max) continue;
      const cals = asArray(plan.calInfo ?? plan.callInfo).map((c) => unwrap(c, 'call') ?? c);
      for (const cal of cals.length ? cals : [{}]) {
        const url = cal.reservePageUrlMobile || cal.reservePageUrlPC || course.reserveCalUrlMobile || course.reserveCalUrlPC;
        if (!url) throw shapeError('reservePageUrlMobile（予約ページのURL）');
        rows.push({
          courseId: course.golfCourseId, courseName: course.golfCourseName, prefecture: course.prefecture ?? '',
          planName: plan.planName, price: Number(plan.price) || null, startTimeZone: plan.startTimeZone ?? '',
          playerMin: min, playerMax: max, twoSum: Number(plan.assu2sum) === 1, lunch: Number(plan.lunch) === 1,
          round: plan.round ?? '', playDate: cal.playDate ?? '', stockStatus: cal.stockStatus ?? null, stockCount: cal.stockCount ?? null,
          url,
        });
      }
    }
  }
  return { rows, page: Number(json.page) || 1, pageCount: Number(json.pageCount) || 1, count: Number(json.count) || 0 };
}

function shapeError(field) {
  return new GoraError('shape', `楽天の返事の形が変わったようです（${field} がありません）。docs/availability-troubleshooting.md を見てください。`);
}

// ---- 実際の問い合わせ ----
let lastRequestAt = 0;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 1回問い合わせて、parseResponse の結果を返す。404（条件に合うものがない）は0件として返す
export async function searchPlans(cond, date, page, keys) {
  const gap = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (gap > 0) await wait(gap);
  lastRequestAt = Date.now();

  const { url, headers } = buildRequest(cond, date, page, keys);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    // referrerPolicy: 楽天は「どのサイトから呼んだか（Referer）」で許可を確かめるので、サイトの住所を必ず送る
    res = await fetch(url, { headers, signal: ctrl.signal, referrerPolicy: 'strict-origin-when-cross-origin' });
  } catch (err) {
    throw networkError(err);
  } finally {
    clearTimeout(timer);
  }
  let body = null;
  try { body = await res.json(); } catch { /* 返事がJSONでないときは null のまま */ }
  if (res.status === 404) {
    // 楽天は「条件に合うものがない」ときも 404（not_found）を返す → 0件。
    // それ以外の 404 は、接続先（API_URL）が変わって見つからない可能性が高い
    if (/not.?found/i.test(readErrorBody(body).code)) return { rows: [], page: 1, pageCount: 0, count: 0 };
    throw new GoraError('shape', '楽天のAPIの接続先が見つかりません（404）。楽天のAPIの版や住所が変わった可能性があります。docs/availability-troubleshooting.md を見てください。', `HTTP 404 ${url.split('?')[0]}`);
  }
  if (!res.ok) throw errorFromResponse(res.status, body);
  return parseResponse(body, cond.players);
}
