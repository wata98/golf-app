// =====================================================================
// 練習メニューの判定ルール（このファイルだけでメニューの作り方が決まる）
//
// 流れ:
//   1. 課題の候補を並べる（弱点分析の「目安との差」が大きい順、または自分で選んだ順）
//   2. その場所でできる課題を上から2つ選ぶ（一番の課題・2番目の課題）。できない課題は繰り下げる
//   3. 量（球数か分）を配分する: 一番60%・2番目20%・ウォームアップと仕上げ20%（設定で変えられる）
//   4. 課題ごとにドリルを選ぶ。手応えが低かったドリルほど選ばれやすい
//
// 変えたいときは:
//   - 弱点分析の項目と練習の課題の対応 → CATEGORY_TO_TOPICS
//   - 配分の初期値 → DEFAULT_SHARES
//   - 丸めの単位 → STEP
//   - 手応えと選ばれやすさ → drillWeight()
// 変えたら tests/practice-rules.test.js も合わせて直す。
// =====================================================================

// 練習の課題（ドリル集の分け方）
export const TOPICS = [
  { key: 'driver', label: 'ドライバーの曲がり' },
  { key: 'iron', label: 'アイアンのミート率' },
  { key: 'approach', label: 'アプローチの距離感' },
  { key: 'bunker', label: 'バンカー' },
  { key: 'longPutt', label: 'ロングパットの距離感' },
  { key: 'shortPutt', label: 'ショートパット' },
  { key: 'warmup', label: 'ウォームアップ' },
  { key: 'finish', label: '仕上げ' },
];
// 「課題」として選べるもの（ウォームアップと仕上げは除く）
export const ISSUE_TOPICS = TOPICS.slice(0, 6).map((t) => t.key);

export const PLACES = [
  { key: 'range', label: '打ちっぱなし' },
  { key: 'green', label: 'パター練習場' },
  { key: 'home', label: '自宅' },
];

export const topicLabel = (key) => TOPICS.find((t) => t.key === key)?.label ?? key;
export const placeLabel = (key) => PLACES.find((p) => p.key === key)?.label ?? key;

// 弱点分析の項目（analysis-rules.js の CATEGORIES の key）→ 練習の課題。
// 3パットは距離感（ロング）と入れ方（ショート）の両方が原因になるので、2つに半分ずつ分ける
export const CATEGORY_TO_TOPICS = {
  penalty: ['driver'],
  threePutt: ['longPutt', 'shortPutt'],
  approach: ['approach'],
  bunker: ['bunker'],
  shot: ['iron'],
};

// 配分の初期値（%）。一番の課題・2番目の課題・ウォームアップと仕上げ（半分ずつ）
export const DEFAULT_SHARES = { main: 60, second: 20, warmupFinish: 20 };

// 球数・分は5単位に丸める
export const STEP = 5;
export const roundStep = (v) => Math.round(v / STEP) * STEP;

// ---- 1. 課題の候補 ----

// 弱点分析の結果（diagnose() の rows）から、目安との差が大きい順に課題の候補を作る
export function issuesFromAnalysis(rows) {
  return [...rows]
    .sort((a, b) => b.diff - a.diff)
    .map((r) => ({ label: r.label, topics: CATEGORY_TO_TOPICS[r.key] ?? [], fromAnalysis: true, diff: r.diff }));
}

// 自分で選んだ課題（一番・2番目）。できない場所のときのために、残りの課題も後ろに並べる
export function issuesFromManual(mainKey, secondKey) {
  const order = [mainKey, secondKey, ...ISSUE_TOPICS.filter((k) => k !== mainKey && k !== secondKey)];
  return order.filter(Boolean).map((k) => ({ label: topicLabel(k), topics: [k], fromAnalysis: false }));
}

// ---- 2. その場所でできる課題を選ぶ ----

const drillsAt = (drills, topic, place) => drills.filter((d) => d.topic === topic && d.places.includes(place));

// 候補を上から見て、その場所でできる課題を2つ選ぶ。できずに飛ばした課題は notes に理由を書く（1行にまとめる）
export function pickIssues(candidates, drills, place) {
  const picked = [];
  const skipped = [];
  for (const issue of candidates) {
    if (picked.length === 2) break;
    const topics = issue.topics.filter((t) => drillsAt(drills, t, place).length > 0);
    if (topics.length === 0) {
      skipped.push(`「${issue.label}」`);
      continue;
    }
    picked.push({ ...issue, topics });
  }
  const notes = skipped.length ? [`${skipped.join('')}は${placeLabel(place)}でできるドリルがないので、次の課題を使いました。`] : [];
  return { main: picked[0] ?? null, second: picked[1] ?? null, notes };
}

// ---- 3. 量の配分 ----

// amount（球数か分）を配分する。ウォームアップと仕上げは半分ずつ。一番の課題は2つのドリルに分ける。
// 一番の課題は「全体 − ほか」にして、合計がちょうど amount になるようにする
export function allocate(amount, shares = DEFAULT_SHARES) {
  const warmup = roundStep((amount * shares.warmupFinish) / 100 / 2);
  const finish = warmup;
  const second = roundStep((amount * shares.second) / 100);
  const main = Math.max(0, amount - warmup - finish - second);
  // 一番の課題が10未満なら、ドリル1つにまとめる
  const main1 = main >= STEP * 2 ? roundStep(main / 2) : main;
  return { warmup, finish, second, main: main1 === main ? [main] : [main1, main - main1] };
}

// 配分の割合が正しいか（0以上・合計100）
export function validShares(s) {
  const vals = [s.main, s.second, s.warmupFinish];
  return vals.every((v) => Number.isFinite(v) && v >= 0) && vals.reduce((a, b) => a + b, 0) === 100;
}

// ---- 4. ドリルを選ぶ ----

// 手応え（1〜5）の平均から、選ばれやすさを決める。低いほど選ばれやすい。
// 平均1 → 5、平均3 → 3、平均5 → 1。やったことがないドリルは3（まん中）
export function drillWeight(avgRating) {
  return avgRating == null ? 3 : 6 - avgRating;
}

// 練習の記録から、ドリルごとの手応えの平均を出す（完了した練習で、手応えを入れたものだけ）
export function ratingsByDrill(sessions) {
  const sums = new Map();
  for (const s of sessions.filter((x) => x.status === 'done')) {
    for (const item of s.items) {
      if (!item.drillId || item.rating == null) continue;
      const cur = sums.get(item.drillId) ?? { total: 0, count: 0 };
      sums.set(item.drillId, { total: cur.total + item.rating, count: cur.count + 1 });
    }
  }
  return new Map([...sums].map(([id, v]) => [id, v.total / v.count]));
}

// topic のドリルから、選ばれやすさに比例して1つ選ぶ。exclude のドリルは選ばない（同じドリルの重複を防ぐ）。
// rand は 0以上1未満の数を返す関数（テストでは決まった数を渡す）
export function pickDrill(drills, topic, place, ratings, exclude, rand) {
  let pool = drillsAt(drills, topic, place).filter((d) => !exclude.has(d.id));
  if (pool.length === 0) pool = drillsAt(drills, topic, place); // 足りなければ重複を許す
  if (pool.length === 0) return null;
  const weights = pool.map((d) => drillWeight(ratings.get(d.id)));
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// ---- メニューを作る ----

// 戻り値: { items: [{ block, drill, topic, amount, reason }], main, second, notes }
// block: warmup（ウォームアップ）/ main（一番の課題）/ second（2番目）/ finish（仕上げ）
export function buildMenu({ drills, place, amount, candidates, shares = DEFAULT_SHARES, ratings = new Map(), rand = Math.random }) {
  const { main, second, notes } = pickIssues(candidates, drills, place);
  const alloc = allocate(amount, shares);
  // 2番目の課題がない（その場所でできる課題が1つだけ）ときは、その分を一番の課題に回す
  if (!second) alloc.main[alloc.main.length - 1] += alloc.second;
  const used = new Set();
  const items = [];

  const add = (block, topic, amt, reasonBase) => {
    if (!topic || amt <= 0) return;
    const drill = pickDrill(drills, topic, place, ratings, used, rand);
    if (!drill) return;
    used.add(drill.id);
    const avg = ratings.get(drill.id);
    const extra = avg != null && avg <= 2.5 ? `。これまでの手応えの平均が${Math.round(avg * 10) / 10}なので出やすくしています` : '';
    items.push({ block, drill, topic, amount: amt, reason: reasonBase + extra });
  };
  // 課題に練習の課題が2つあるとき（3パット）は、ドリルごとに交互に使う
  const topicOf = (issue, i) => issue.topics[i % issue.topics.length];

  add('warmup', 'warmup', alloc.warmup, 'ウォームアップ');
  if (main) {
    const why = main.fromAnalysis ? `一番の課題（弱点分析: ${main.label}）` : `一番の課題（${main.label}）`;
    alloc.main.forEach((amt, i) => add('main', topicOf(main, i), amt, why));
  }
  if (second) {
    const why = second.fromAnalysis ? `2番目の課題（弱点分析: ${second.label}）` : `2番目の課題（${second.label}）`;
    add('second', topicOf(second, Math.floor(rand() * second.topics.length)), alloc.second, why);
  }
  add('finish', 'finish', alloc.finish, '仕上げ');
  return { items, main, second, notes };
}
