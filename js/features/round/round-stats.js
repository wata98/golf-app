// ラウンドの集計（スコア・パット・FWキープ率・パーオン率・OB数）の計算。
// 画面や保存から切り離した計算だけなので、テストしやすい。
// 集計の数字は保存せず、毎回ここで計算する（docs/data-model.md）。

// ホールが入力済みか（打数が入っていれば入力済み）
export function isEntered(hole) {
  return hole.strokes !== null && hole.strokes !== undefined;
}

// パーオンしたか。(打数 − パット数) が (パー − 2) 以下ならパーオン
export function isGir(hole) {
  if (!isEntered(hole) || hole.putts === null || hole.putts === undefined) return false;
  return hole.strokes - hole.putts <= hole.par - 2;
}

// パーとの差を「+3」「−2」「±0」の形にする
export function formatDiff(diff) {
  if (diff === 0) return '±0';
  return diff > 0 ? `+${diff}` : `−${Math.abs(diff)}`;
}

// 割合を「57%」の形にする（数えるホールがなければ「−」）
export function formatRate(rate) {
  return rate === null ? '−' : `${Math.round(rate * 100)}%`;
}

// ホールの一覧を集計する。入力済みのホールだけを数える。
// 戻り値の例: { holes: 9, score: 45, par: 36, diff: 9, putts: 18,
//              fwKept: 4, fwTotal: 7, fwRate: 0.57, gir: 2, girRate: 0.22, ob: 1 }
export function summarize(holes) {
  const entered = holes.filter(isEntered);
  const sum = (f) => entered.reduce((total, h) => total + (f(h) || 0), 0);

  // FWキープ率: パー4・パー5でティーショットを記録したホールのうち、フェアウェイの割合
  const fwHoles = entered.filter((h) => h.par >= 4 && h.teeShot);
  const fwKept = fwHoles.filter((h) => h.teeShot === 'fairway').length;
  const gir = entered.filter(isGir).length;

  const score = sum((h) => h.strokes);
  const par = sum((h) => h.par);
  return {
    holes: entered.length,
    score,
    par,
    diff: score - par,
    putts: sum((h) => h.putts),
    fwKept,
    fwTotal: fwHoles.length,
    fwRate: fwHoles.length ? fwKept / fwHoles.length : null,
    gir,
    girRate: entered.length ? gir / entered.length : null,
    // OB数: ティーショットで「OB」を選んだホールの数（2打目以降のOBは記録していないので入らない）
    ob: entered.filter((h) => h.teeShot === 'ob').length,
  };
}

// 前半（1〜9番）・後半（10〜18番）・全体の集計
export function summarizeRound(round) {
  return {
    front: summarize(round.holes.filter((h) => h.number <= 9)),
    back: summarize(round.holes.filter((h) => h.number >= 10)),
    total: summarize(round.holes),
  };
}
