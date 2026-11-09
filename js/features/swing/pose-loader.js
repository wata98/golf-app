// MediaPipe（Google の無料の姿勢推定。Apache-2.0）を読み込む。
// 本体・計算部品・モデルは vendor/mediapipe/ に同梱している（外部の配信サーバーが止まっても動くように）。
// 合計約25MBあるので、スイングの画面で初めて使うときだけ読み込む。sw.js が別の保存場所に置くので、2回目からは圏外でも動く。
// 動画はスマホの中だけで処理し、どこにも送らない。

const BASE = new URL('../../../vendor/mediapipe/', import.meta.url).href;
export const MODEL_URL = BASE + 'pose_landmarker_full.task';

let landmarkerPromise = null;

// 姿勢推定の道具（PoseLandmarker）を1つだけ作って使い回す
export function getPoseLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = create().catch((err) => {
      landmarkerPromise = null; // 失敗したら次にまた試せるように
      throw new Error('骨格推定の部品を読み込めませんでした。初めて使うときは電波のある所で開いてください。（' + err.message + '）');
    });
  }
  return landmarkerPromise;
}

async function create() {
  // 元の名前は vision_bundle.mjs。.mjs をJavaScriptとして送らないサーバー（パソコンの確認用サーバーなど）があるので .js に改名した
  const { FilesetResolver, PoseLandmarker } = await import(BASE + 'vision_bundle_esm.js');
  const fileset = await FilesetResolver.forVisionTasks(BASE + 'wasm');
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'VIDEO', // コマを順に渡す。前のコマの結果を手がかりにするので、ぶれが減る
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  // 画像処理の部品（GPU）が使えればそれで速く、使えない端末では CPU で動かす
  try {
    return await PoseLandmarker.createFromOptions(fileset, options('GPU'));
  } catch {
    return await PoseLandmarker.createFromOptions(fileset, options('CPU'));
  }
}
