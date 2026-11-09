// 空き確認（機能6）のテスト: 楽天への問い合わせの作り方・返事の読み方・エラー・各サイトのURL・バックアップからキーを除く
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRequest, parseResponse, API_URL } from '../js/features/availability/gora-api.js';
import { errorFromResponse, readErrorBody } from '../js/features/availability/gora-errors.js';
import { goraSearchUrl, goraSoloUrl, gdoSoloUrl, budgetFor } from '../js/features/availability/site-links.js';
import { buildBackup, keepSecrets, SECRET_SETTINGS } from '../js/db/backup-format.js';

const COND = { startDate: '2026-11-15', days: 2, players: 3, prefs: ['chiba', 'ibaraki'], budget: 12000, times: [6, 8, 11], sort: 'price', twoSum: true };
const KEYS = { appId: 'APP', accessKey: 'pk_SECRET' };

test('問い合わせ: 接続先・条件・アクセスキーはヘッダーで（URLに入れない）', () => {
  const { url, headers } = buildRequest(COND, '2026-11-16', 2, KEYS);
  const u = new URL(url);
  assert.equal(`${u.origin}${u.pathname}`, API_URL);
  const p = Object.fromEntries(u.searchParams);
  assert.deepEqual(p, {
    applicationId: 'APP', format: 'json', formatVersion: '2', playDate: '2026-11-16', areaCode: '8,12',
    hits: '30', page: '2', sort: 'price', maxPrice: '12000', startTimeZone: '4,5,6,8,11,12,13,14,15', plan2sum: '1',
  });
  assert.equal(headers.accessKey, 'pk_SECRET');
  assert.equal(url.includes('pk_SECRET'), false);
});

test('問い合わせ: 予算は楽天の上限25,000円まで。指定なしなら送らない', () => {
  assert.equal(new URL(buildRequest({ ...COND, budget: 30000 }, '2026-11-16', 1, KEYS).url).searchParams.get('maxPrice'), '25000');
  const u = new URL(buildRequest({ ...COND, budget: 0, times: [], twoSum: false }, '2026-11-16', 1, KEYS).url);
  assert.equal(u.searchParams.has('maxPrice'), false);
  assert.equal(u.searchParams.has('startTimeZone'), false);
  assert.equal(u.searchParams.has('plan2sum'), false);
});

// 楽天の仕様（2017-06-23版）の出力の形をまねた見本
const SAMPLE = {
  count: 45, page: 1, pageCount: 2,
  Items: [{
    golfCourseId: 1, golfCourseName: 'テストCC', prefecture: '千葉県', reserveCalUrlMobile: 'https://example.com/cal',
    planInfo: [
      { planName: '2人以上', price: 9800, playerNumMin: 2, playerNumMax: 4, startTimeZone: '7時台', assu2sum: 1, lunch: 1,
        calInfo: { playDate: '2026-11-15', stockStatus: 1, stockCount: 3, reservePageUrlMobile: 'https://example.com/r1' } },
      { planName: '4人だけ', price: 7000, playerNumMin: 4, playerNumMax: 4, calInfo: { playDate: '2026-11-15', reservePageUrlPC: 'https://example.com/r2' } },
      { planName: '日付なし', price: 8000, playerNumMin: 1, playerNumMax: 4 },
    ],
  }],
};

test('返事の読み方: 人数の範囲に入るプランだけ。予約ページはスマホ用→PC用→カレンダーの順', () => {
  const r = parseResponse(SAMPLE, 3);
  assert.deepEqual(r.rows.map((x) => x.planName), ['2人以上', '日付なし']);
  assert.equal(r.rows[0].url, 'https://example.com/r1');
  assert.equal(r.rows[0].twoSum, true);
  assert.equal(r.rows[0].stockStatus, 1);
  assert.equal(r.rows[1].url, 'https://example.com/cal');
  assert.deepEqual([r.page, r.pageCount, r.count], [1, 2, 45]);
  assert.deepEqual(parseResponse(SAMPLE, 4).rows.map((x) => x.planName), ['2人以上', '4人だけ', '日付なし']);
});

test('返事の読み方: https:// で始まらないリンクは使わない（安全のため）', () => {
  const bad = { Items: [{ golfCourseName: 'A', reserveCalUrlMobile: 'https://ok.example/cal', planInfo: [{ planName: 'P', playerNumMin: 1, playerNumMax: 4, calInfo: { reservePageUrlMobile: 'javascript:alert(1)' } }] }] };
  assert.equal(parseResponse(bad, 2).rows[0].url, 'https://ok.example/cal');
  const none = { Items: [{ golfCourseName: 'A', planInfo: [{ planName: 'P', calInfo: { reservePageUrlMobile: 'http://plain.example' } }] }] };
  assert.throws(() => parseResponse(none, 2), /予約ページのURL/);
});

test('返事の読み方: 古い形（formatVersion=1 の Item / plan で包まれた形）も読める', () => {
  const v1 = { count: 1, page: 1, pageCount: 1, Items: [{ Item: { golfCourseName: 'A', planInfo: [{ plan: { planName: 'P', playerNumMin: 1, playerNumMax: 4, calInfo: [{ reservePageUrlMobile: 'https://x' }] } }] } }] };
  assert.equal(parseResponse(v1, 2).rows[0].url, 'https://x');
});

test('返事の読み方: 形が変わったら、何がないかを日本語で', () => {
  assert.throws(() => parseResponse({}, 2), (e) => e.kind === 'shape' && /Items/.test(e.message));
  assert.throws(() => parseResponse({ Items: [{ planInfo: [] }] }, 2), /golfCourseName（ゴルフ場名）/);
  assert.throws(() => parseResponse({ Items: [{ golfCourseName: 'A', planInfo: [{ planName: 'P' }] }] }, 2), /予約ページのURL/);
});

test('エラー: 2種類の形を読む', () => {
  assert.deepEqual(readErrorBody({ error: 'wrong_parameter', error_description: 'specify valid applicationId' }), { code: 'wrong_parameter', text: 'specify valid applicationId' });
  assert.deepEqual(readErrorBody({ errors: [{ errorCode: 'X', errorMessage: 'Y' }] }), { code: 'X', text: 'Y' });
  assert.deepEqual(readErrorBody(null), { code: '', text: '' });
});

test('エラー: 原因ごとの日本語', () => {
  assert.equal(errorFromResponse(403, { errors: [{ errorCode: 'REQUEST_CONTEXT_BODY_HTTP_REFERRER_MISSING' }] }).kind, 'referer');
  assert.equal(errorFromResponse(403, { errors: [{ errorCode: 'HTTP_REFERRER_NOT_ALLOWED' }] }).kind, 'referer');
  assert.equal(errorFromResponse(400, { error: 'wrong_parameter', error_description: 'specify valid applicationId' }).kind, 'keys');
  assert.equal(errorFromResponse(401, null).kind, 'keys');
  assert.match(errorFromResponse(403, null).message, /アクセスキー.*許可するWebサイト/); // 理由なしの403はどちらもありうる
  assert.equal(errorFromResponse(403, { errors: [{ errorCode: 'INVALID_ACCESS_KEY' }] }).kind, 'keys');
  assert.equal(errorFromResponse(429, { error: 'too_many_requests' }).kind, 'limit');
  assert.match(errorFromResponse(503, { error: 'service_unavailable' }).message, /メンテナンス/);
  assert.equal(errorFromResponse(500, {}).kind, 'server');
  const e = errorFromResponse(400, { error: 'wrong_parameter', error_description: 'page must be a number' });
  assert.equal(e.kind, 'other');
  assert.match(e.detail, /page must be a number/);
});

test('各サイトのURL: 楽天GORA（通常・1人予約）', () => {
  assert.equal(goraSearchUrl(COND), 'https://search.gora.golf.rakuten.co.jp/?menu=srch&act=disp&month=11&day=15&widthday=2&plan_day=-1&rates_min=0&rates_max=13000&area[]=8&area[]=12&zone_list[]=6&zone_list[]=8&zone_list[]=11');
  assert.equal(goraSoloUrl(COND), 'https://search.gora.golf.rakuten.co.jp/?menu=srch_solo&act=disp&month=11&day=15&widthday=2&plan_day=-1&rates_min=0&rates_max=13000&area[]=8&area[]=12&zone_list[]=6&zone_list[]=8&zone_list[]=11&is_except_full_flg=1');
});

test('各サイトのURL: GDO 1人予約（都県名・11時台は11と12・日数は選べる値に）', () => {
  const u = gdoSoloUrl(COND);
  assert.equal(u, 'https://oc.golfdigest.co.jp/search?s=1&dp=2026-11-15&during=3&region[]=%E8%8C%A8%E5%9F%8E%E7%9C%8C&region[]=%E5%8D%83%E8%91%89%E7%9C%8C&start_time[]=6&start_time[]=8&start_time[]=11&start_time[]=12&price_upper=12000&unfull=1');
  assert.match(gdoSoloUrl({ ...COND, days: 1 }), /during=1&/);
});

test('予算は各サイトで選べる金額のうち、指定以上で一番近いもの。どれより高いと指定なし', () => {
  const opts = [5000, 8000, 10000];
  assert.equal(budgetFor(0, opts), 0);
  assert.equal(budgetFor(8000, opts), 8000);
  assert.equal(budgetFor(8500, opts), 10000);
  assert.equal(budgetFor(25000, opts), 0);
});

test('バックアップ: 楽天のアプリID・アクセスキーは入れない（ほかの設定は入れる）', () => {
  const json = buildBackup({ settings: [{ id: 'main', rakutenAppId: 'APP', rakutenAccessKey: 'pk_SECRET', targetScore: 90 }] }, new Date(2026, 10, 9));
  assert.deepEqual(json.data.settings, [{ id: 'main', targetScore: 90 }]);
  assert.equal(JSON.stringify(json).includes('pk_SECRET'), false);
  assert.deepEqual(SECRET_SETTINGS, ['rakutenAppId', 'rakutenAccessKey']);
});

test('復元: 今スマホに入っているキーを残す。設定がないバックアップでも残す', () => {
  const current = [{ id: 'main', rakutenAppId: 'APP', rakutenAccessKey: 'pk_SECRET', targetScore: 100 }];
  const restored = keepSecrets({ settings: [{ id: 'main', targetScore: 90 }], clubs: [] }, current);
  assert.deepEqual(restored.settings, [{ id: 'main', targetScore: 90, rakutenAppId: 'APP', rakutenAccessKey: 'pk_SECRET' }]);
  assert.deepEqual(keepSecrets({ settings: [] }, current).settings, [{ id: 'main', rakutenAppId: 'APP', rakutenAccessKey: 'pk_SECRET' }]);
  assert.deepEqual(keepSecrets({ settings: [{ id: 'main' }] }, []).settings, [{ id: 'main' }]);
});
