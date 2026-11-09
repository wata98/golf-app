// スイング解析の計算の道具（骨格の点からの距離・角度）。判定のルールそのものは swing-rules.js にある。
//
// 骨格の点（MediaPipe の Pose Landmarker の33点）は、画像の幅・高さに対する割合（0〜1）で来る。
// 長さや角度を正しく出すため、画像の大きさ（ピクセル）を掛けてから計算する。
// y は画像の下に向かって大きくなる（上に動くと y が小さくなる）。

// MediaPipe の点の番号（左右は「その人から見た」左右）
export const P = {
  nose: 0, leftEar: 7, rightEar: 8,
  leftShoulder: 11, rightShoulder: 12, leftElbow: 13, rightElbow: 14, leftWrist: 15, rightWrist: 16,
  leftHip: 23, rightHip: 24, leftKnee: 25, rightKnee: 26, leftAnkle: 27, rightAnkle: 28,
};

// 骨格の線（表示用）: つなぐ点の組
export const BONES = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28], [7, 8],
];

// 点をピクセルに直す。size: { w, h }
export const px = (lm, i, size) => ({ x: lm[i].x * size.w, y: lm[i].y * size.h, v: lm[i].visibility ?? 1 });

export const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: Math.min(a.v, b.v) });
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// 3点 a-b-c の、b での角度（度）。まっすぐなら180
export function angleAt(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const cos = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

// 線 from→to が、真上（垂直）から何度傾いているか（0 = まっすぐ立っている）
export function tiltFromVertical(from, to) {
  return (Math.atan2(Math.abs(to.x - from.x), Math.abs(from.y - to.y)) * 180) / Math.PI;
}

// よく使う体の位置（ピクセル）。頭は両耳の中点（見えなければ鼻）
export function bodyPoints(lm, size) {
  const g = (i) => px(lm, i, size);
  const ears = mid(g(P.leftEar), g(P.rightEar));
  return {
    head: ears.v >= 0.5 ? ears : g(P.nose),
    shoulderMid: mid(g(P.leftShoulder), g(P.rightShoulder)),
    hipMid: mid(g(P.leftHip), g(P.rightHip)),
    hands: mid(g(P.leftWrist), g(P.rightWrist)),
    leftShoulder: g(P.leftShoulder), rightShoulder: g(P.rightShoulder),
    leftElbow: g(P.leftElbow), rightElbow: g(P.rightElbow),
    leftWrist: g(P.leftWrist), rightWrist: g(P.rightWrist),
  };
}
