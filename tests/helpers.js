// テストで使う小道具（テストそのものではない）

// 完了したラウンドを作る。n ホールまで入力済み（パー4・5打・2パット）。f(i) でホールごとの値を上書きできる
export function makeRound(date, n = 18, f = () => ({})) {
  return {
    date, status: 'finished', createdAt: date,
    holes: Array.from({ length: 18 }, (_, i) => ({
      number: i + 1, par: 4, strokes: i < n ? 5 : null, putts: i < n ? 2 : null,
      teeShot: null, penalties: 0, bunkers: 0, aroundGreen: null, ...(i < n ? f(i) : {}),
    })),
  };
}
