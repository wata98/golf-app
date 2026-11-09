// 静止画に骨格の線を重ねて描く

import { BONES } from './swing-math.js';

const MIN_V = 0.5; // 信頼度がこれ未満の点・線は描かない（違う所に描くと誤解のもと）

// canvas に画像 img を描き、その上に骨格 lm（33点、割合）を重ねる
export function drawWithSkeleton(canvas, img, lm) {
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  if (!lm) return;
  const W = canvas.width;
  const H = canvas.height;
  const lw = Math.max(2, W / 120);
  ctx.lineCap = 'round';
  // 黒いふちの上に黄色の線（屋外でも見やすいように）
  for (const [color, width] of [['#000', lw + 3], ['#ffd400', lw]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (const [a, b] of BONES) {
      if ((lm[a].visibility ?? 1) < MIN_V || (lm[b].visibility ?? 1) < MIN_V) continue;
      ctx.beginPath();
      ctx.moveTo(lm[a].x * W, lm[a].y * H);
      ctx.lineTo(lm[b].x * W, lm[b].y * H);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#e00';
  for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
    if ((lm[i].visibility ?? 1) < MIN_V) continue;
    ctx.beginPath();
    ctx.arc(lm[i].x * W, lm[i].y * H, lw * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Blob（保存した静止画）を画像として読み込む
export function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(img.src); resolve(img); };
    img.onerror = () => reject(new Error('静止画を読み込めませんでした。'));
    img.src = URL.createObjectURL(blob);
  });
}

// 保存した静止画＋骨格を描いた canvas を作る
export async function skeletonCanvas(blob, lm, width = 360) {
  const img = await blobToImage(blob);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round((img.height / img.width) * width);
  drawWithSkeleton(canvas, img, lm);
  canvas.className = 'swing-still';
  return canvas;
}
