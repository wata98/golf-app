# 同梱しているライブラリ

ネットから読まずにアプリと一緒に配るため、ここに置いている（圏外でも動くように）。
中身は書き換えない。版を上げるときは同じ取得元から取り直し、`docs/decisions.md` に書く。

| ファイル | 中身 | 版 | 取得元 | ライセンス |
|---|---|---|---|---|
| `chart.umd.min.js` | Chart.js（グラフ） | 4.6.1 | https://cdn.jsdelivr.net/npm/chart.js@4.6.1/dist/chart.umd.min.js | MIT |
| `leaflet.js` / `leaflet.css` | Leaflet（地図。グリーンの位置の登録で使う） | 1.9.4 | https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/ | BSD-2-Clause |

- Leaflet の画像（マーカーの絵）は同梱していない。アプリでは画像を使わない丸い印（`L.circleMarker`）を使う
- 地図の写真は国土地理院の「地理院タイル」をその場で読み込む（同梱しない・まとめて保存しない）。利用条件は `docs/decisions.md`
