# 同梱しているライブラリ

ネットから読まずにアプリと一緒に配るため、ここに置いている（圏外でも動くように）。
中身は書き換えない。版を上げるときは同じ取得元から取り直し、`docs/decisions.md` に書く。

| ファイル | 中身 | 版 | 取得元 | ライセンス |
|---|---|---|---|---|
| `chart.umd.min.js` | Chart.js（グラフ） | 4.6.1 | https://cdn.jsdelivr.net/npm/chart.js@4.6.1/dist/chart.umd.min.js | MIT |
| `leaflet.js` / `leaflet.css` | Leaflet（地図。グリーンの位置の登録で使う） | 1.9.4 | https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/ | BSD-2-Clause |

| `mediapipe/vision_bundle_esm.js` | MediaPipe Tasks Vision（骨格推定の本体） | 1.2.2 | https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/vision_bundle.mjs | Apache-2.0（`mediapipe/LICENSE`） |
| `mediapipe/wasm/vision_wasm_internal.js` / `.wasm` | MediaPipe の計算部品 | 1.2.2 | https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm/ | Apache-2.0 |
| `mediapipe/pose_landmarker_full.task` | 姿勢推定のモデル（BlazePose GHUM、full） | latest（2026-11-09取得、9,398,198バイト） | https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task | Apache-2.0（モデルカード） |

- `vision_bundle_esm.js` は元の名前 `vision_bundle.mjs` から改名した（`.mjs` をJavaScriptとして送らないサーバーがあり、パソコンでの確認で読み込めなかったため。中身は同じ）
- MediaPipe（合計約25MB）は、アプリの更新のたびに読み直さないよう、`sw.js` の `MEDIAPIPE_CACHE` に使ったときだけ保存する。版を上げたら `MEDIAPIPE_CACHE` の名前も変える
- Leaflet の画像（マーカーの絵）は同梱していない。アプリでは画像を使わない丸い印（`L.circleMarker`）を使う
- 地図の写真は国土地理院の「地理院タイル」をその場で読み込む（同梱しない・まとめて保存しない）。利用条件は `docs/decisions.md`
