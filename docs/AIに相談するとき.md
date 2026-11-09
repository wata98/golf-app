# AI（無料版の Claude など）に相談するとき

## 使い方
1. 下の「このアプリの説明文」の枠の中を**全部コピーして、最初に貼る**
2. 続けて、困っていること（何をしたら、何が起きたか。エラーの文章はそのまま）を書く
3. 「どのファイルを貼ればよいか」の表を見て、関係するファイルの中身を貼る（1回に2〜4ファイルまで）
4. 直してもらったら、`run-tests.bat` でテストを通し、README.md の手順で公開する

**貼ってはいけないもの**: 楽天のアプリID・アクセスキー、バックアップのファイル（個人の記録が入っている）。

---

## このアプリの説明文（ここから下の枠をコピー）

```
【前提】私はプログラマーではありません。説明は専門用語を避けた日本語でお願いします。
直し方は「どのファイルの、どこを、どう変えるか」を、そのまま貼り替えられる形で示してください。

【アプリ】自分専用のゴルフ上達アプリ。iPhone のホーム画面に追加して使う PWA。
公開: GitHub Pages（https://wata98.github.io/golf-app/、公開リポジトリ wata98/golf-app）。

【守っている制約（必ず守ってください）】
1. 月額・従量課金のサービスは使わない（無料枠を超えると課金されるものも不可）
2. AIのAPI（Claude/OpenAI など）をアプリから呼ばない。提案や分析はすべて条件と計算のルール
3. データはスマホの中（IndexedDB）だけ。外部のデータベースやログインは作らない
4. 全データをJSONで書き出し・読み込みできる（バックアップ）。楽天のキーはJSONに入れない
5. ライブラリは最小限で、ネットから読まず vendor/ に同梱（Chart.js 4.6.1、Leaflet 1.9.4、MediaPipe tasks-vision 1.2.2）
6. 画面はすべて日本語。屋外でも読める高コントラスト、手袋でも押せる大きいボタン
7. 空き確認とスイング解析の初回以外はオフラインで動く

【技術】素の HTML・CSS・JavaScript（フレームワークなし・ビルドなし）。JavaScript は標準のモジュール（import/export）。
保存は IndexedDB（データベース名 golf-app）。オフラインは自作の Service Worker（sw.js）。
テストは Node.js の標準のテスト機能（node --test、tests/*.test.js）。index.html に CSP（安全のための決まり）あり。

【フォルダ】
index.html（入口・4タブ）/ sw.js（オフライン・版の番号・保存するファイル一覧 APP_FILES）/ css/style.css
js/app.js（起動）/ js/version.js（版の番号。sw.js と同じにする）/ js/core/dates.js
js/db/: schema.js（データの版 SCHEMA_VERSION=6・棚の一覧）, migrations.js（古い形→新しい形）, database.js（読み書き）, backup-format.js, image-codec.js
js/ui/: tabs.js, notice.js, html.js（esc() で画面に出す文字を無害化・確認の画面）, chart-loader.js
js/features/（機能ごと）:
  round/（ラウンドの記録）, review/（振り返りタブ）, clubs/（マイクラブ）, distance/（飛距離・番手早見表）,
  analysis/（弱点分析。ルールは analysis-rules.js）, practice/（練習メニュー・ドリル集。ルールは practice-rules.js、最初のドリル集は drill-data.js）,
  course/（攻略プラン・地図・GPS。ルールは course-rules.js）, availability/（楽天GORA APIの空き確認・各サイトを開くURL）,
  swing/（スイング解析。MediaPipe。ルールは swing-rules.js）, settings/（設定・バックアップ。初期値は settings-store.js）
docs/: data-model.md（データの形）, decisions.md（決めたことと理由）, 保守ガイド.md, availability-troubleshooting.md

【データの形（IndexedDB の棚。どの記録も id・createdAt・updatedAt を持つ）】
meta（データの版・最後のバックアップ日）/ settings（設定1件。楽天のキー・目標スコア・練習の配分・利き手など）
clubs（クラブ）/ distanceRecords（飛距離。clubId・date・carry・total・place・isMiss）
courses（ゴルフ場。tees[{name, holes[{number,par,yards}]}]・greens[{holeNumber,lat,lng}]）
holeNotes（攻略メモ。id=ゴルフ場|ティー|ホール、hazards・plan）
rounds（ラウンド。holes[{number,par,yards,strokes,putts,teeShot,penalties,bunkers,aroundGreen,note}]、status=playing/finished）
practiceSessions（練習の記録）/ drills（ドリル集）/ swingVideos（スイング解析。動画は保存せず、4場面の静止画・骨格の点・数値）
shots・availabilitySearches（将来用。今は使っていない）

【直すときの決まり】
- 1ファイルは短く（目安200行）。重要な処理には日本語のコメント
- 保存する項目を変えるときは、migrations.js に移行処理を足し、SCHEMA_VERSION を1つ上げ、テストを書く
- ファイルを足したら sw.js の APP_FILES に足す。直したら js/version.js と sw.js の APP_VERSION を上げる
- 外部の住所に通信・画像を足すときは index.html の CSP にも足す
- 画面に出す文字（ゴルフ場名・メモなど）は必ず esc() を通す
- 判定のルール（〜-rules.js）を変えたら、同じ名前のテスト（tests/〜-rules.test.js）も直す
```

（ここまで）

---

## どのファイルを貼ればよいか

| 困っていること | 貼るファイル |
|---|---|
| ラウンド中の入力画面がおかしい | `js/features/round/hole-view.js`、必要なら `round-model.js` |
| スコアやパーオン率などの集計が合わない | `js/features/round/round-stats.js`、`tests/round-stats.test.js` |
| 弱点分析の判定を変えたい・おかしい | `js/features/analysis/analysis-rules.js`、`tests/analysis-rules.test.js` |
| 練習メニューの作り方を変えたい | `js/features/practice/practice-rules.js`、`tests/practice-rules.test.js` |
| ドリルの中身を変えたい | `js/features/practice/drill-data.js`（画面の「ドリル集」でも直せる） |
| 飛距離の集計・早見表 | `js/features/distance/distance-stats.js` または `club-finder.js`、`finder-dialog.js` |
| 攻略プランの提案を変えたい | `js/features/course/course-rules.js`、`tests/course-rules.test.js` |
| 地図・グリーンの登録 | `js/features/course/green-map-view.js` |
| GPSの距離 | `js/features/course/gps.js`、`round-plan.js` |
| 空き確認のエラー | `js/features/availability/gora-api.js`、`gora-errors.js`、`docs/availability-troubleshooting.md` |
| 各サイトを開くボタンの条件が効かない | `js/features/availability/site-links.js` |
| スイングの場面がずれる・数値を変えたい | `js/features/swing/swing-rules.js`、`tests/swing-rules.test.js` |
| スイングの解析が始まらない・止まる | `js/features/swing/swing-analyzer.js`、`pose-loader.js` |
| バックアップ・復元 | `js/features/settings/backup-actions.js`、`js/db/backup-format.js` |
| データが読めない・移行 | `js/db/migrations.js`、`js/db/schema.js`、`docs/data-model.md` |
| 圏外で開けない・版が古いまま | `sw.js`、`js/version.js` |
| 色・ボタンの大きさ | `css/style.css`（と、その画面のファイル） |
| 新しい機能を足したい | `docs/data-model.md`、`js/db/schema.js`、似た機能のフォルダのファイル1つ |
| テストが通らない | ✖ が出たテストのファイルと、そのテストが確かめているファイル |

**相談のコツ**
- エラーの文章・`run-tests.bat` の ✖ の行は、そのまま貼る
- 「いつ・どの画面で・何を押したら・何が起きたか（何を期待していたか）」を書く
- 直してもらったら、もう一度テストを通してから公開する。通らなければ、その結果をまた貼る
