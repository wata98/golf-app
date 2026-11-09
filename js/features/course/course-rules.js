// =====================================================================
// コースマネジメントの判定ルール（このファイルだけでティーショットの提案が決まる）
//
// 流れ:
//   1. クラブごとの飛び方（トータルの平均とばらつき）を飛距離の記録から出す
//   2. ラウンドの記録から、左右どちらに曲がりやすいかを出す（記録が少ないうちは左右同じとみなす）
//   3. クラブごとに、各ハザードに入る確率 =「その距離に止まる確率」×「その向きに曲がる確率」を計算する
//   4. 長いクラブから見て、OB・池が基準以下、バンカーが基準以下の一番長いクラブを選ぶ
//   5. 曲がりやすい向きとOB・池の側から、狙い（左寄り・中央・右寄り）を決める
//
// 変えたいときは: すぐ下の数字（基準・目安）を変える。変えたら tests/course-rules.test.js も直す。
// =====================================================================

import { probBetween } from './course-math.js';
import { describe } from '../distance/distance-stats.js';
import { describeHazard, aimLabel } from './hazard-model.js';

export const LIMIT_OB_WATER = 0.10;   // OB・池に入る確率の基準（これ以下なら使う）
export const LIMIT_BUNKER = 0.30;     // バンカーに入る確率の基準
export const TOTAL_FROM_CARRY = 1.08; // トータルの記録がないクラブは、キャリー×1.08 をトータルとみなす
export const DEFAULT_SPREAD = 0.06;   // ばらつきがわからない（4球未満）クラブは、平均の6%をばらつきとみなす
export const IQR_TO_SD = 1.349;       // 「真ん中の半分の幅」をばらつき（標準偏差）に直す数（正規分布の性質）
export const DEFAULT_SIDE_RATE = 0.15;  // 記録が少ないうちの、左・右それぞれに曲がる確率
export const BIAS_MIN_HOLES = 10;       // 左右のブレを反映するのに必要なティーショットの記録（ホール数）
export const BIAS_MIN_DIFF = 0.10;      // 左右の割合の差がこれ以上なら「曲がりやすい向き」とする
export const SHOW_NARROW = 0.30;        // 「狭い地点に止まる確率」がこれ以上なら理由に書く

// 確率を「13%」の形にする（四捨五入）
const pct = (p) => `${Math.round(p * 100)}%`;

// ---- 1. クラブごとの飛び方 ----
// clubs: 飛距離を測るクラブ（パターを除く）/ records: 集計に使う飛距離の記録（ミスを除く設定などを反映済み）
// 戻り値: [{ club, total, sd, carry }]（トータルの平均が長い順。記録がないクラブは入らない）
export function clubProfiles(clubs, records) {
  const out = [];
  for (const club of clubs) {
    const mine = records.filter((r) => r.clubId === club.id);
    const t = describe(mine.map((r) => r.total));
    const c = describe(mine.map((r) => r.carry));
    if (t.count === 0 && c.count === 0) continue;
    const useTotal = t.count > 0;
    const s = useTotal ? t : c;
    const k = useTotal ? 1 : TOTAL_FROM_CARRY;
    const total = s.mean * k;
    const sd = s.low !== null ? ((s.high - s.low) * k) / IQR_TO_SD : total * DEFAULT_SPREAD;
    const carry = c.count ? c.mean : total / TOTAL_FROM_CARRY;
    out.push({ club, total, sd: Math.max(sd, 1), carry });
  }
  return out.sort((a, b) => b.total - a.total);
}

// ---- 2. 左右のブレ ----
// ラウンドのパー4・パー5のティーショットの記録から、左・右に曲がる確率を出す。
// OB・ペナルティは左右がわからないので、左ラフと右ラフの割合で分ける
export function sideRates(rounds) {
  const shots = rounds.flatMap((r) => r.holes.filter((h) => h.strokes != null && h.par >= 4 && h.teeShot));
  const n = shots.length;
  const count = (v) => shots.filter((h) => h.teeShot === v).length;
  const left = count('leftRough');
  const right = count('rightRough');
  const lost = count('ob') + count('penalty');
  const leftShare = left + right > 0 ? left / (left + right) : 0.5;
  const rateLeft = n ? (left + lost * leftShare) / n : 0;
  const rateRight = n ? (right + lost * (1 - leftShare)) / n : 0;
  const applied = n >= BIAS_MIN_HOLES && Math.abs(rateLeft - rateRight) >= BIAS_MIN_DIFF;
  let note;
  if (n < BIAS_MIN_HOLES) note = `記録が少ないので左右のブレは反映していません（今${n}ホール・${BIAS_MIN_HOLES}ホールから反映）`;
  else if (!applied) note = `左右の差が小さいので、左右同じとして計算しています（左${pct(rateLeft)}・右${pct(rateRight)}）`;
  else note = `${rateRight > rateLeft ? '右' : '左'}に曲がりやすい（右${pct(rateRight)}・左${pct(rateLeft)}、記録${n}ホール）`;
  return {
    left: applied ? rateLeft : DEFAULT_SIDE_RATE,
    right: applied ? rateRight : DEFAULT_SIDE_RATE,
    bias: applied ? (rateRight > rateLeft ? 'right' : 'left') : null,
    holes: n,
    note,
  };
}

// ---- 3. ハザードに入る確率 ----
// 横切るハザードはキャリー（落ちる場所）、それ以外はトータル（止まる場所）で考える
export function hazardProbability(h, profile, sides) {
  if (h.side === 'green') return 0;
  if (h.side === 'cross') {
    const sd = profile.sd * (profile.carry / profile.total);
    return probBetween(profile.carry, sd, h.from, h.to);
  }
  const along = probBetween(profile.total, profile.sd, h.from, h.to);
  const lateral = h.side === 'left' ? sides.left : h.side === 'right' ? sides.right : sides.left + sides.right;
  return along * lateral;
}

// クラブ1本の危なさ: OB・池の確率の合計、バンカーの確率の合計、一番危ないハザード
export function evaluateClub(profile, hazards, sides) {
  const risks = hazards.map((h) => ({ hazard: h, p: hazardProbability(h, profile, sides) }));
  const sum = (kinds) => risks.filter((r) => kinds.includes(r.hazard.kind)).reduce((s, r) => s + r.p, 0);
  const obWater = sum(['ob', 'water']);
  const bunker = sum(['bunker']);
  const worst = [...risks].filter((r) => r.hazard.kind !== 'narrow').sort((a, b) => b.p - a.p)[0] ?? null;
  return { profile, risks, obWater, bunker, worst, ok: obWater <= LIMIT_OB_WATER && bunker <= LIMIT_BUNKER };
}

// ---- 5. 狙い ----
// OB・池・バンカーがある側（選んだクラブで入る確率が高い側）と、曲がりやすい向きの反対を狙う
export function decideAim(evaluation, sides) {
  const sideRisk = (side) => evaluation.risks
    .filter((r) => r.hazard.side === side && r.hazard.kind !== 'narrow')
    .reduce((s, r) => s + r.p * (r.hazard.kind === 'bunker' ? 0.5 : 1), 0);
  const l = sideRisk('left');
  const r = sideRisk('right');
  const hazardSide = Math.abs(l - r) > 0.01 ? (l > r ? 'left' : 'right') : null;
  const opposite = (s) => (s === 'left' ? 'right' : 'left');
  const words = { left: '左', right: '右' };
  if (hazardSide && sides.bias && hazardSide !== sides.bias) {
    return { aim: 'center', text: `${words[sides.bias]}に曲がりやすいが、${words[hazardSide]}側にハザードがあるので中央を狙う` };
  }
  if (hazardSide) return { aim: opposite(hazardSide), text: `${words[hazardSide]}側のハザードを避けて${words[opposite(hazardSide)]}寄りを狙う${sides.bias ? `（${words[sides.bias]}に曲がりやすいことも考えて）` : ''}` };
  if (sides.bias) return { aim: opposite(sides.bias), text: `${words[sides.bias]}に曲がりやすいので${words[opposite(sides.bias)]}寄りを狙う` };
  return { aim: 'center', text: '左右の危なさが同じくらいなので中央を狙う' };
}

// ---- 4. ティーショットの提案 ----
// hole: { par, yards } / hazards: そのホールのハザード / profiles: clubProfiles() / sides: sideRates()
// 戻り値: { status: 'ok'|'noData'|'noYards', club, aim, remaining, lines: 理由の文章（行ごと）, short: 1行の要約 }
export function suggestTeeShot(hole, hazards, profiles, sides) {
  if (profiles.length === 0) return { status: 'noData', lines: ['飛距離の記録がないので提案できません。「ラウンド前」の「飛距離を記録」で記録してください。'], short: '飛距離の記録がありません' };
  if (!hole.yards) return { status: 'noYards', lines: ['このホールの距離が登録されていないので提案できません。'], short: '距離が未登録' };
  const greenNotes = hazards.filter((h) => h.side === 'green').map((h) => `グリーン周り: ${describeHazard(h).replace('グリーン周り ', '')}に注意`);

  // パー3: グリーンまでの距離に、キャリーの平均が一番近いクラブ
  if (hole.par === 3) {
    const best = [...profiles].sort((a, b) => Math.abs(a.carry - hole.yards) - Math.abs(b.carry - hole.yards))[0];
    const diff = Math.round(best.carry - hole.yards);
    return {
      status: 'ok', club: best.club, aim: 'center', remaining: 0,
      lines: [`グリーンまで${hole.yards}y。キャリー平均${Math.round(best.carry)}y（${diff >= 0 ? '+' : '−'}${Math.abs(diff)}）の${best.club.name}が一番近い。`, ...greenNotes],
      short: `${best.club.name}でグリーンを狙う`,
    };
  }

  // パー4・パー5: グリーンを越えてしまうクラブは使わない
  const usable = profiles.filter((p) => p.total <= hole.yards);
  const list = (usable.length ? usable : profiles.slice(-1)).map((p) => evaluateClub(p, hazards, sides));
  let chosen = list.find((e) => e.ok);
  const fallback = !chosen;
  if (!chosen) chosen = [...list].sort((a, b) => (a.obWater * 2 + a.bunker * 0.5) - (b.obWater * 2 + b.bunker * 0.5))[0];
  const remaining = Math.max(0, Math.round(hole.yards - chosen.profile.total));
  const name = chosen.profile.club.name;
  const lines = [];

  const longest = list[0];
  if (hazards.filter((h) => h.side !== 'green').length === 0) {
    lines.push(`ハザードの登録がないので、一番飛ぶ${name}（トータル平均${Math.round(chosen.profile.total)}y）。残り${remaining}y。`);
  } else if (fallback) {
    lines.push(`どのクラブもOB・池${pct(LIMIT_OB_WATER)}以下・バンカー${pct(LIMIT_BUNKER)}以下を満たさないので、一番危なくない${name}（OB・池${pct(chosen.obWater)}・バンカー${pct(chosen.bunker)}）。残り${remaining}y。`);
  } else if (chosen === longest) {
    lines.push(`${name}でOB・池に入る確率は${pct(chosen.obWater)}、バンカーは${pct(chosen.bunker)}で基準以内。残り${remaining}y。`);
  } else {
    const w = longest.worst;
    const limit = ['ob', 'water'].includes(w.hazard.kind) ? LIMIT_OB_WATER : LIMIT_BUNKER;
    lines.push(`${longest.profile.club.name}だと${describeHazard(w.hazard)}に入る確率が${pct(w.p)}（基準${pct(limit)}より高い）。` +
      `${name}なら${pct(chosen.risks.find((r) => r.hazard === w.hazard).p)}で、残り${remaining}y。`);
  }
  for (const r of chosen.risks.filter((x) => x.hazard.kind === 'narrow' && x.p >= SHOW_NARROW)) {
    lines.push(`${describeHazard(r.hazard)}の地点に止まる確率${pct(r.p)}。曲がると外れやすい。`);
  }
  const aim = decideAim(chosen, sides);
  lines.push(aim.text + '。', sides.note + '。', ...greenNotes);
  return { status: 'ok', club: chosen.profile.club, aim: aim.aim, remaining, lines, short: `${name}・${aimLabel(aim.aim)}・残り${remaining}y` };
}
