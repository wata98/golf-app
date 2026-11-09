// =====================================================================
// 各予約サイトの検索ページを「条件入りで開く」URLの作り方（ここだけに集める）
//
// サイトの検索ページのURLの形が変わると、条件が効かなくなる（エラーにはならない）。
// そのときは docs/availability-troubleshooting.md の手順で、このファイルだけを直す。
// 2026-11-09 に各サイトで確かめた形:
//   楽天GORA 通常:   https://search.gora.golf.rakuten.co.jp/?menu=srch&act=disp&month=11&day=15&widthday=1&area[]=12&zone_list[]=7&rates_max=10000
//   楽天GORA 1人予約: 上の menu=srch を menu=srch_solo にしたもの
//   GDO 1人予約:     https://oc.golfdigest.co.jp/search?s=1&dp=2026-11-15&during=1&region[]=千葉県&start_time[]=7&price_upper=10000&unfull=1
// =====================================================================

// 関東の都県。gora = 楽天GORAのエリア番号（楽天GORAプラン検索APIの areaCode と同じ）
export const PREFS = [
  { key: 'ibaraki', label: '茨城', name: '茨城県', gora: 8 },
  { key: 'tochigi', label: '栃木', name: '栃木県', gora: 9 },
  { key: 'gunma', label: '群馬', name: '群馬県', gora: 10 },
  { key: 'saitama', label: '埼玉', name: '埼玉県', gora: 11 },
  { key: 'chiba', label: '千葉', name: '千葉県', gora: 12 },
  { key: 'tokyo', label: '東京', name: '東京都', gora: 13 },
  { key: 'kanagawa', label: '神奈川', name: '神奈川県', gora: 14 },
];

// スタート時間帯。6 = 〜6時台、11 = 11時台〜（楽天GORAの画面の区切りに合わせる）
export const TIME_ZONES = [
  { value: 6, label: '〜6時台' }, { value: 7, label: '7時台' }, { value: 8, label: '8時台' },
  { value: 9, label: '9時台' }, { value: 10, label: '10時台' }, { value: 11, label: '11時台〜' },
];

// 各サイトで選べる予算の上限（この中からしか選べない）
const GORA_RATES = [5000, 8000, 10000, 13000, 15000, 20000];
const GDO_PRICES = [5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000];
const GDO_DURING = [1, 3, 5, 10, 15, 20, 31];

// 予算に合わせる: 指定以上で一番近い金額。指定なし（0）や、どれより高いときは 0（指定しない）
export function budgetFor(budget, options) {
  if (!budget) return 0;
  return options.find((v) => v >= budget) ?? 0;
}

const prefsOf = (keys) => PREFS.filter((p) => keys.includes(p.key));

// cond: { startDate: '2026-11-15', days: 1〜3, prefs: ['chiba', …], budget: 0 or 円, times: [6〜11] }
function goraUrl(menu, cond) {
  const [, month, day] = cond.startDate.split('-').map(Number);
  const q = [
    `menu=${menu}`, 'act=disp', `month=${month}`, `day=${day}`, `widthday=${cond.days}`,
    'plan_day=-1', 'rates_min=0', `rates_max=${budgetFor(cond.budget, GORA_RATES)}`,
    ...prefsOf(cond.prefs).map((p) => `area[]=${p.gora}`),
    ...cond.times.map((t) => `zone_list[]=${t}`),
  ];
  if (menu === 'srch_solo') q.push('is_except_full_flg=1'); // 満員のプランは除く
  return `https://search.gora.golf.rakuten.co.jp/?${q.join('&')}`;
}

export const goraSearchUrl = (cond) => goraUrl('srch', cond);
export const goraSoloUrl = (cond) => goraUrl('srch_solo', cond);

export function gdoSoloUrl(cond) {
  const times = cond.times.flatMap((t) => (t === 11 ? [11, 12] : [t])); // GDOは「11時台」「12時台〜」に分かれている
  const q = [
    's=1', `dp=${cond.startDate}`, `during=${GDO_DURING.find((d) => d >= cond.days) ?? 31}`,
    ...prefsOf(cond.prefs).map((p) => `region[]=${encodeURIComponent(p.name)}`),
    ...times.map((t) => `start_time[]=${t}`),
    `price_upper=${budgetFor(cond.budget, GDO_PRICES)}`,
    'unfull=1', // 満員のプランは除く
  ];
  return `https://oc.golfdigest.co.jp/search?${q.join('&')}`;
}
