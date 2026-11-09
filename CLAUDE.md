# ゴルフ上達アプリ（自分専用）

## 目的
自分のゴルフの成績・飛距離・練習を記録し、弱点を見つけて上達につなげる。
iPhoneのホーム画面に追加して使うPWA（インストール不要のWebアプリ）。使うのは自分1人だけ。関東のゴルフ場が中心。

## 利用者について（説明のしかた）
- プログラマーではない。説明は専門用語を避けた日本語で。どうしても使う言葉は一言で意味を添える
- 端末はiPhone（Safari・ホーム画面アプリ）。Android対応は考えなくてよい
- 将来はClaudeの有料プランを解約し、無料版Claudeにコードを貼って自分で直す。
  だから「あとで読んで直せること」を最優先にする

## 絶対に守る制約（解約後も動き続けるため）
1. 月額・従量課金が一切かからないこと。無料枠を超えると課金されるサービスも使わない
2. アプリからAIのAPI（Claude API・OpenAIなど）を呼ばない。提案・分析はすべてルール（条件と計算）で行う
3. データはスマホの中（IndexedDB）にだけ保存する。外部のデータベース・ログイン機能は作らない
4. 全データをJSONファイルで書き出し・読み込みする機能を最初から入れる（機能を足したら、その機能のデータも必ず含める）
5. 公開はGitHub Pages（無料）。リポジトリは公開になるので、個人データ・コースメモ・IDなどをコードやファイルに入れない
6. 自分で直せる作りにする
   - ライブラリは最小限。使うなら有名で長く続いているものだけ。入れるときは理由を `docs/` に書く
   - 1ファイルは短く（目安200行まで）。機能ごとにフォルダを分ける
   - 重要な処理（計算・判定・保存・データ移行）には日本語でコメントを書く
   - 技術的に決めたことと理由は `docs/` に日本語で残す（`docs/decisions.md`）

## 全体像
3つのモードを切り替えて使う。
- ラウンド前: ゴルフ場の空き確認・練習メニュー・攻略プラン
- ラウンド中: スコア記録・番手早見表・ホール攻略メモ
- 振り返り: 弱点分析グラフ・飛距離の推移・スイング動画解析

## 機能（依頼ごとに1つずつ追加する）
1. ラウンド成績記録
2. クラブ別飛距離管理
3. 弱点分析
4. 練習メニュー提案
5. コースマネジメント補助
6. ゴルフ場の空き状況・1人予約枠の確認（予約はしない。アプリは見るだけ）
7. スイング動画解析

データは機能の間で共有する。
- ラウンド記録 → 弱点分析・練習メニュー提案
- 飛距離 → コースマネジメント補助・番手早見表
後から機能を足しても壊れないよう、データの形は最初に7機能すべてを見越して決める（`docs/data-model.md`）。

### 機能ごとの決定事項
- 機能6（空き確認）
  - 楽天GORAプラン検索APIをアプリから直接呼んでプランを表示し、各予約サイトは条件入りのリンクで開く（作成済み）
  - 楽天のアプリID・アクセスキーはコードに書かない。設定画面で入力し、スマホの中だけに保存する。**バックアップのJSONにも入れない**
  - キーが未入力のときは、予約サイトを開くリンクだけを表示する
  - **1人予約は自動取得しない**（公式APIがなく、各サイトの規約に反するおそれ。ユーザー承認済み）。条件入りで各サイトの1人予約検索ページを開くボタンにする
  - 調査結果は `docs/research-availability.md`、動かなくなったときの直し方は `docs/availability-troubleshooting.md`
- 機能7（スイング動画解析）（作成済み。ユーザーの依頼で「自動推定＋手動の手直し」にした）
  - 骨格推定は MediaPipe（同梱）。スマホの中だけで処理し、動画を外に送らない。判定と数値はルール（`swing-rules.js`）
  - 動画は保存しない。4つの場面の静止画・骨格の点・数値だけを保存する（バックアップのJSONにも静止画を入れる）
  - 2Dの動画で正確に測れないもの（回転の角度・クラブの動き）は出さない。ずれやすいものは「目安」と書く

## 画面のルール
- すべて日本語
- 屋外の日差しでも読める高コントラスト配色（白地に黒の太字など。薄い灰色の文字は使わない）
- ラウンド中は、手袋をした片手でも押せる大きいボタン（目安: 縦横60px以上、間隔を空ける）
- 1打の記録は数タップで終わること
- 空き確認以外はオフライン（圏外）でも動くこと。ゴルフ場は電波が弱い前提
- 入力ミスはすぐ直せるようにする（今は「−」ボタンや前のホールに戻って直す形。専用の「1つ戻す」ボタンは作っていない）

## 作業の進め方
1. 新しい機能を作る前に、計画を箇条書きで示して承認を待つ
   - 作る画面 / 変更するファイル / データの変更（あれば移行のしかた）
2. 作り終えたら自動テストを書いて通す（計算・判定・データ移行・JSON書き出しと読み込みは必ずテストする）
3. 最後に「スマホで何を確認すればよいか」を手順で伝える（どの画面で、何を押して、何が見えればOKか）
4. データの形を変えるときは、保存済みのデータが消えない移行処理を必ず入れる
   - データにはバージョン番号を持たせ、古い番号のデータは開いたとき・JSONを読み込んだときに新しい形へ直す
   - 移行のテストを書く（古い形のサンプル → 新しい形になること、データが減らないこと）
   - 変更内容は `docs/data-model.md` に追記する
5. 「コミットして」と言われたら、日本語のメッセージでgitコミットし、GitHubにpushする
6. 技術的に決めたことは `docs/decisions.md` に日付・決めたこと・理由を追記する

## 技術（2026-11-09 ユーザー承認。理由は `docs/decisions.md`）
- 素のHTML・CSS・JavaScript（フレームワークなし・ビルドなし）。JavaScriptは標準のモジュール（`import`/`export`）で機能ごとに分ける
- 保存はIndexedDB。オフラインはService Workerを自分で書く
- ライブラリは下のものだけ。どれもネットから読まずリポジトリに同梱する（オフラインで動かすため）
  - Chart.js 4.6.1（グラフ。`vendor/chart.umd.min.js`。機能2で入れた。取得元などは `vendor/README.md`）
  - Leaflet 1.9.4（地図。`vendor/leaflet.js`・`leaflet.css`。機能5でグリーンの位置の登録に使う）
  - MediaPipe Tasks Vision 1.2.2 と Pose Landmarker（full）モデル（骨格推定。`vendor/mediapipe/`、約25MB。機能7で入れた）
    - アプリのファイル一覧（`sw.js` の `APP_FILES`）には入れず、使ったときに `MEDIAPIPE_CACHE` に保存する（更新のたびに25MBを読み直さないため）
- 地図の写真は国土地理院の「地理院タイル」。出典「国土地理院」と一覧ページへのリンク、「© Axelspace」を必ず表示する（利用条件は `docs/decisions.md`）
  - 他のライブラリを足すときは、必ずユーザーに理由を説明して承認を得る
- テストはNode.jsに最初から付いているテスト機能（`node --test`）。テスト用ライブラリは入れない
  - 計算・判定はIndexedDBや画面から切り離した関数にして、テストしやすくする
- 公開はGitHub Pages（公開リポジトリ）。pushすると公開サイトが更新される
- データの形は `docs/data-model.md` に従う

## コマンド
- テスト: `run-tests.bat` をダブルクリック、または `node --test`（Node.jsは `C:\Program Files\nodejs\`。PATHが通らないときは `& "C:\Program Files\nodejs\node.exe" --test`）
- 同梱ライブラリが記録どおりかは `tests/vendor.test.js` が指紋（SHA-256）で確かめる（表は `vendor/README.md`）
- パソコンで開く: `start-local.bat` をダブルクリック → http://localhost:8000
  （中身は `%LOCALAPPDATA%\Programs\Python\Python312\python.exe -m http.server 8000 --bind 127.0.0.1`。
  index.html を直接ダブルクリックで開くと、モジュールとService Workerが動かない）
- アイコンを作り直す: `python tools\make_icons.py`（上と同じPython）
- 公開: GitHubの `main` ブランチにpushすると、GitHub Pagesが自動で更新する（設定は「Deploy from a branch」・`main`・`/(root)`）

## 更新するときの決まり
- アプリを更新したら、`js/version.js` と `sw.js` の `APP_VERSION` を同じ番号で上げる（上げないとスマホに古い版が残る）
- ファイルを足したら `sw.js` の `APP_FILES` に足す（どちらもテストで確かめている）
- 外部の住所への通信・画像を足すときは、`index.html` の CSP（Content-Security-Policy）にも足す
- `.bat` ファイルは CRLF の改行で保存する（`.gitattributes` で指定済み）
- 利用者向けの説明: `README.md`、保守の手引き: `docs/保守ガイド.md`、AIへの相談用の説明文: `docs/AIに相談するとき.md`。機能を変えたらこれらも直す
- 番号の上げ方: 機能を足したら真ん中（0.1.0→0.2.0）、直しだけなら最後（0.1.0→0.1.1）

## 構成
- `index.html` 入口。4つのタブ（ラウンド前・ラウンド中・振り返り・設定）
- `manifest.webmanifest` ホーム画面に追加するための情報 / `icons/` アイコン
- `sw.js` オフラインで開く仕組み（アプリのファイルをスマホに保存）
- `css/style.css` 見た目（高コントラスト・大きいボタン）
- `js/app.js` 起動時の処理 / `js/version.js` 版番号
- `js/core/dates.js` 日付の計算（バックアップのお知らせの30日）
- `js/db/schema.js` データの版・棚の一覧 / `js/db/migrations.js` 移行処理
- `js/db/backup-format.js` バックアップJSONの作成と確認 / `js/db/database.js` IndexedDBの読み書き
- `js/ui/` タブ切り替え・お知らせ・画面の小道具（`html.js`: 文字の無害化 `esc()`・確認の画面）
- `js/features/settings/` 設定タブ（バックアップの保存・復元）
- `js/features/round/` 機能1 ラウンド成績記録（「ラウンド中」タブ）
  - `round-stats.js` 集計の計算（パーオン判定・FWキープ率など） / `round-model.js` ラウンド・ゴルフ場の記録を作る・直す
  - `round-store.js` 保存 / `round-tab.js` 画面の切り替え / `start-view.js` 開始 / `hole-view.js` ホール入力
  - `hole-edit-dialog.js` パー・距離の修正 / `course-edit-view.js` ゴルフ場の一括編集 / `summary-view.js` 集計の表 / `swipe.js` スワイプ
- `js/features/review/` 「振り返り」タブ（「ラウンド」「飛距離」の切り替え。ラウンド一覧・詳細・修正・削除）
- `js/features/clubs/` 機能2 マイクラブ（`club-model.js` 最初の14本・並べ替え / `clubs-settings-view.js` 設定タブの画面）
- `js/features/distance/` 機能2 飛距離
  - `distance-stats.js` 集計（平均・中央値・ばらつき・90日） / `club-finder.js` 早見表の計算（高低差の補正・近いクラブ）
  - `distance-entry-view.js` 記録（「ラウンド前」タブ） / `distance-review-view.js` 集計表とグラフ（「振り返り」）
  - `distance-chart.js` 推移グラフ / `finder-dialog.js` 番手早見表 / `finder-settings-view.js` 補正の係数（設定）
- `js/features/analysis/` 機能3 弱点分析（「振り返り」タブの「分析」）
  - **`analysis-rules.js` 判定のルール（失点の数え方・目安の表・課題の決め方・理由の文章）。ユーザーが自分で読んで変える前提なので、ルールはここだけに置き、日本語のコメントを保つ**
  - `analysis-metrics.js` 指標の計算（期間の選び方・18ホール換算・パー別） / `analysis-view.js` 画面 / `analysis-chart.js` 推移グラフ
  - `target-settings-view.js` 目標スコア（設定タブ）
- `js/features/practice/` 機能4 練習メニュー（「ラウンド前」タブ）
  - **`practice-rules.js` メニューの作り方のルール（課題の対応・配分・ドリルの選び方）。ルールはここだけに置き、日本語のコメントを保つ**
  - **`drill-data.js` 最初のドリル集（40個）**。`drill-model.js` ドリルの作成・確かめ
  - `before-tab.js` タブの切り替え（練習メニュー/ドリル集/飛距離を記録） / `practice-menu-view.js` メニュー作成 / `practice-record-view.js` 練習の記録
  - `drill-list-view.js`・`drill-edit-view.js` ドリル集 / `drill-card.js` ドリルの表示 / `practice-store.js` 保存
  - `practice-stats.js`・`practice-review-view.js` 振り返りの「練習」 / `practice-settings-view.js` 配分（設定）
- `js/features/course/` 機能5 コースマネジメント（「ラウンド前」の「攻略プラン」と、ラウンド中の1行表示）
  - **`course-rules.js` ティーショットの提案のルール（基準の数字・確率・左右のブレ・狙い）。ルールはここだけに置き、日本語のコメントを保つ**
  - `course-math.js` 計算の道具（正規分布・距離・座標） / `hazard-model.js` ハザードと攻略メモの形 / `course-store.js` 保存と提案の材料
  - `plan-list-view.js` 18ホールの一覧 / `hole-plan-view.js` 1ホール（提案・手直し・ハザード） / `green-map-view.js` グリーンの位置の地図
  - `round-plan.js` ラウンド中の1行表示・詳細・グリーンまでの距離 / `gps.js` 位置の見張り
- `js/features/availability/` 機能6 空き確認（「ラウンド前」の「空き確認」と、設定の「楽天GORAの空き確認」）
  - `gora-api.js` 楽天GORAプラン検索APIへの問い合わせ（接続先 `API_URL`・条件の作り方・返事の読み方・1秒あける）
  - `gora-errors.js` エラーを日本語に / **`site-links.js` 各サイトを条件入りで開くURL（サイトの形が変わったらここだけ直す）**
  - `availability-view.js` 条件の入力 / `availability-results.js` 結果と「もっと見る」 / `availability-settings-view.js` キーの入力・接続を試す
- `js/features/swing/` 機能7 スイング解析（「振り返り」の「スイング」と、設定の「スイング解析」）
  - **`swing-rules.js` 場面の決め方と数値の出し方（判定のルール。基準の数字は先頭）**
  - `swing-math.js` 骨格の点・角度・距離 / `pose-loader.js` MediaPipe の読み込み / `swing-analyzer.js` 動画からコマを取り出して推定
  - `swing-analyze-view.js` 解析・場面の手直し・保存 / `swing-result-view.js` 結果と比較 / `swing-tab.js` 一覧 / `swing-guide.js` 撮り方
  - `swing-draw.js` 骨格の線 / `swing-format.js` 数値の表示 / `swing-store.js` 保存 / `swing-settings-view.js` 利き手・身長
- `js/db/image-codec.js` バックアップの静止画の変換（Blob ⇔ 文字）
- `js/ui/chart-loader.js` グラフの部品（Chart.js）の読み込み
- `js/features/settings/settings-store.js` 設定の読み書きと初期値
- `vendor/` 同梱しているライブラリ（書き換えない）
- `js/features/<機能名>/` これから足す機能はここに1フォルダずつ
- `tests/` 自動テスト（`*.test.js`。`helpers.js` はテスト用の小道具）
- `tools/` 開発用の道具（アプリには含まれない）
