# 同梱しているライブラリ

ネットから読まずにアプリと一緒に配るため、ここに置いている（圏外でも動くように・配信元が止まっても困らないように）。
**中身は書き換えない。** 版を上げるときは、同じ取得元から取り直し、下の表と `docs/decisions.md` を直し、
`tests/vendor.test.js` の指紋（SHA-256）も新しい値にする。

| ファイル | 中身 | 版 | 取得元 | ライセンス |
|---|---|---|---|---|
| `chart.umd.min.js` | Chart.js（グラフ） | 4.6.1 | https://cdn.jsdelivr.net/npm/chart.js@4.6.1/dist/chart.umd.min.js | MIT |
| `leaflet.js` / `leaflet.css` | Leaflet（地図。グリーンの位置の登録で使う） | 1.9.4 | https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/ | BSD-2-Clause |
| `mediapipe/vision_bundle_esm.js` | MediaPipe Tasks Vision（骨格推定の本体） | 1.2.2 | https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/vision_bundle.mjs | Apache-2.0（`mediapipe/LICENSE`） |
| `mediapipe/wasm/vision_wasm_internal.js` / `.wasm` | MediaPipe の計算部品 | 1.2.2 | https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm/ | Apache-2.0 |
| `mediapipe/pose_landmarker_full.task` | 姿勢推定のモデル（BlazePose GHUM、full、float16） | 2026-11-09 時点の latest | https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task | Apache-2.0（モデルカード） |

## 指紋（SHA-256）
ファイルが1文字でも変わると値が変わる。`tests/vendor.test.js` がこの値と比べる（取り違え・壊れを見つけるため）。

| ファイル | 大きさ（バイト） | SHA-256 |
|---|---|---|
| `chart.umd.min.js` | 210082 | `87364cc2b2a76a6684929e7d6b80b18a897794db38400caff1fcf1791c6925d2` |
| `leaflet.css` | 14806 | `a7837102824184820dfa198d1ebcd109ff6d0ff9a2672a074b9a1b4d147d04c6` |
| `leaflet.js` | 147552 | `db49d009c841f5ca34a888c96511ae936fd9f5533e90d8b2c4d57596f4e5641a` |
| `mediapipe/LICENSE` | 11358 | `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30` |
| `mediapipe/pose_landmarker_full.task` | 9398198 | `4eaa5eb7a98365221087693fcc286334cf0858e2eb6e15b506aa4a7ecdcec4ad` |
| `mediapipe/vision_bundle_esm.js` | 156062 | `b65acb59b370cd6561afd9d04c29ed7a87e7ed6386922ac1b263af1f1ad06b7d` |
| `mediapipe/wasm/vision_wasm_internal.js` | 334128 | `f2b9c17131ea79716ec6bf07b117a087b2749a6f8a1e2f1f2e77a9382092db5b` |
| `mediapipe/wasm/vision_wasm_internal.wasm` | 14603354 | `f5bd25147ac89d506074293ce2675969b10e827180db95a0d9689c2ed80764ab` |

## 注意
- **モデル（`pose_landmarker_full.task`）は取得元の「latest」が将来別の中身に変わることがある**（2026-11-09 に確かめたところ、番号つきの版「1」とは中身が違った）。このリポジトリに入っているものが正。作り直すときも、ここにあるファイルを使う
- `vision_bundle_esm.js` は元の名前 `vision_bundle.mjs` から改名した（`.mjs` をJavaScriptとして送らないサーバーがあり、パソコンでの確認で読み込めなかったため。中身は同じ）
- MediaPipe（合計約25MB）は、アプリの更新のたびに読み直さないよう、`sw.js` の `MEDIAPIPE_CACHE` に使ったときだけ保存する。版を上げたら `MEDIAPIPE_CACHE` の名前も変える
- Leaflet の画像（マーカーの絵）は同梱していない。アプリでは画像を使わない丸い印（`L.circleMarker`）を使う
- 地図の写真は国土地理院の「地理院タイル」をその場で読み込む（同梱しない・まとめて保存しない）。利用条件は `docs/decisions.md`
- このフォルダのファイルは、改行の変換をしないよう `.gitattributes` で指定している（変換すると指紋が変わる）
