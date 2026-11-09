// 動画から1秒30コマを取り出して、コマごとに骨格を推定する。
// - 動画は写真アプリから選んだファイルを、この画面の間だけ使う（保存しない・外に送らない）
// - 画像を小さくしてから推定する（長い辺 640px）。最初の10コマが遅い端末では 400px に落とす
// - 進み具合を onProgress で知らせ、signal で途中でやめられる

import { getPoseLandmarker } from './pose-loader.js';

export const SAMPLE_FPS = 30;
export const MAX_SECONDS = 10;
const SIZE_NORMAL = 640;
const SIZE_SLOW = 400;
const SLOW_MS_PER_FRAME = 250; // 1コマにこれ以上かかる端末は「重い」とみなす

// MediaPipe の VIDEO モードは、渡す時刻が（2本目の動画でも）増え続けている必要があるので、アプリ全体で数え続ける
let timestamp = 0;

// 動画ファイルを読み込める状態にする
export async function openVideo(file) {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = URL.createObjectURL(file);
  await new Promise((resolve, reject) => {
    video.onloadedmetadata = resolve;
    video.onerror = () => reject(new Error('この動画を読み込めませんでした。別の動画で試してください。'));
  });
  if (!video.videoWidth) throw new Error('この動画の形式には対応していません。');
  return video;
}

export const closeVideo = (video) => { URL.revokeObjectURL(video.src); video.removeAttribute('src'); video.load(); };

// 動画の時刻 t のコマを canvas に描く。
// 1本の動画の再生位置を動かして描くので、ボタンを続けて押しても順番に1つずつ処理する
let queue = Promise.resolve();
export function drawFrame(video, t, canvas) {
  const job = queue.then(async () => {
    if (Math.abs(video.currentTime - t) > 1e-3) {
      await new Promise((resolve) => { video.onseeked = resolve; video.currentTime = t; });
    }
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  });
  queue = job.catch(() => {});
  return job;
}

// 長い辺を longSide にしたときの大きさ
export function scaledSize(video, longSide) {
  const k = Math.min(1, longSide / Math.max(video.videoWidth, video.videoHeight));
  return { w: Math.round(video.videoWidth * k), h: Math.round(video.videoHeight * k) };
}

// 解析する。戻り値: { frames: [{ t, lm }], size, slow }（lm は33点、見つからなかったコマは null）
export async function analyzeVideo(video, { onProgress, signal }) {
  if (video.duration > MAX_SECONDS + 0.5) {
    throw new Error(`動画が長すぎます（${Math.round(video.duration)}秒）。写真アプリの「編集」で、スイングの前後${MAX_SECONDS}秒以内に切ってから選んでください。`);
  }
  onProgress({ stage: 'load', done: 0, total: 1 });
  const landmarker = await getPoseLandmarker();
  const total = Math.max(1, Math.floor(video.duration * SAMPLE_FPS));
  let size = scaledSize(video, SIZE_NORMAL);
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = [size.w, size.h];
  const frames = [];
  let slow = false;
  const started = performance.now();

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new DOMException('やめました', 'AbortError');
    const t = i / SAMPLE_FPS;
    await drawFrame(video, t, canvas);
    timestamp += 1000 / SAMPLE_FPS; // VIDEO モードは時刻が増え続ける必要がある
    const result = landmarker.detectForVideo(canvas, timestamp);
    frames.push({ t, lm: result.landmarks?.[0]?.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility ?? 1 })) ?? null });

    // 最初の10コマが遅ければ、画像を小さくして続ける（推定の精度は少し落ちる）
    if (i === 9 && !slow && (performance.now() - started) / 10 > SLOW_MS_PER_FRAME) {
      slow = true;
      size = scaledSize(video, SIZE_SLOW);
      [canvas.width, canvas.height] = [size.w, size.h];
    }
    const elapsed = performance.now() - started;
    onProgress({ stage: 'detect', done: i + 1, total, remainingSec: Math.round((elapsed / (i + 1)) * (total - i - 1) / 1000), slow });
  }
  // 点は画像に対する割合なので、途中で大きさが変わっても位置は同じ。長さの計算には動画の縦横比の大きさを使う
  return { frames, size: scaledSize(video, SIZE_NORMAL), slow };
}
