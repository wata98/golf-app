# データの形

7つの機能すべてを見越して決めた形（2026-11-09 ユーザー承認）。
形を変えたら、このファイルの最後の「変更の履歴」に追記し、移行処理とそのテストを必ず入れる。

## 共通のきまり
- 保存先はIndexedDB。データベース名は `golf-app`
- どの記録にも次を持たせる
  - `id`: 記録の番号（`crypto.randomUUID()` で作る文字列）
  - `createdAt` / `updatedAt`: 作成・更新の日時（`2026-11-09T08:30:00+09:00` の形）
- 日付だけのものは `2026-11-09` の形。距離はヤード（整数）
- ほかの記録を指すときは名前ではなく `id` で結ぶ（例: `clubId`）。名前を変えても過去の記録が壊れない
- 消すと過去の記録が壊れるもの（クラブ・ゴルフ場）は消さず、`archived: true` にして一覧から隠す
- 分析の数字（平均スコア・パーオン率・平均飛距離など）は保存しない。毎回記録から計算する
- 選択肢は決まった英語の文字列で保存し、画面では日本語にして表示する（下の各表の「値」）
- まだ作っていない機能の項目は、その機能を作るときに足してよい（足すときは移行処理を入れる）

## 棚（IndexedDBのストア）

### `meta`（1件だけ）
| 項目 | 意味 |
|---|---|
| `id` | 常に `"main"` |
| `schemaVersion` | データの形のバージョン。最初は `1` |
| `lastExportedAt` | 最後にJSONを書き出した日時（30日たったらお知らせ） |

### `settings`（1件だけ）
| 項目 | 意味 |
|---|---|
| `id` | 常に `"main"` |
| `rakutenAppId` / `rakutenAccessKey` | 楽天ウェブサービスのアプリIDとアクセスキー（機能6。未入力なら空文字）。コードに書かない。**バックアップのJSONには入れない**（`backup-format.js` の `SECRET_SETTINGS`）。復元しても今のスマホのキーを残す |
| `lastAvailability` | 空き確認で前回使った条件 `{ startDate, days, players, prefs, budget, times, sort, twoSum }` |
| `homePrefecture` | よく行く地域（空き確認の初期値） |
| `distanceExcludeMiss` | 飛距離の集計でミスショットを除くか（初期値 `true`。振り返りと早見表で共通） |
| `distanceRecentOnly` | 飛距離の集計を直近90日だけにするか（初期値 `false`） |
| `elevationUp` / `elevationDown` | 早見表の高低差の補正。1mにつき何ヤード足す（打ち上げ）・引く（打ち下ろし）か（初期値 `1.0`） |
| `lastDistancePlace` | 飛距離の記録で前回選んだ場所 |
| `targetScore` | 弱点分析の目標スコア（パー72のコースでのスコア。初期値 `100`） |
| `practiceShares` | 練習メニューの配分（%）`{ main: 60, second: 20, warmupFinish: 20 }` |
| `lastPracticePlace` / `lastPracticeUnit` / `lastPracticeAmount` | 練習メニューで前回選んだ場所・単位・量 |

- まだ保存していない項目は `js/features/settings/settings-store.js` の初期値を使う（項目を足しても移行は要らない）

### `clubs`（クラブ）
| 項目 | 意味 |
|---|---|
| `name` | 表示名（例: `7I`、`1W`、`PW`） |
| `type` | 値: `driver` / `wood` / `hybrid` / `iron` / `wedge` / `putter` |
| `loft` | ロフト角（任意） |
| `order` | 並び順（番手早見表で使う） |
| `archived` | バッグから外したら `true` |

- 初めて開いたとき（とv3への移行でクラブが1本もないとき）は、よくある14本を入れる（`club-model.js` の `DEFAULT_CLUBS`）
- パター（`putter`）は飛距離の記録・早見表に出さない

### `distanceRecords`（飛距離）
| 項目 | 意味 |
|---|---|
| `clubId` | どのクラブか |
| `date` | 測った日 |
| `carry` | キャリー（任意） |
| `total` | ランを含めた距離（任意。`carry` か `total` のどちらかは必須） |
| `place` | 場所（v3〜）。値: `range`（練習場）/ `course`（コース） |
| `isMiss` | ミスショットなら `true`（v3〜） |
| `shotId` | ラウンド中の1打から作った記録なら、その1打の `id`（任意） |
| `note` | メモ |

### `courses`（ゴルフ場）
| 項目 | 意味 |
|---|---|
| `name` | ゴルフ場名 |
| `prefecture` | 県 |
| `tees` | ティーの一覧 `[{ name: "白", holes: [{ number: 1, par: 4, yards: 380, hdcp: 7 }, …18ホール] }]` |
| `goraCourseId` | 楽天GORAのゴルフ場番号（機能6。任意） |
| `bookingLinks` | 予約サイトのリンク `[{ site: "楽天GORA", url: "…" }]` |
| `favorite` | お気に入りなら `true` |
| `archived` | 一覧から隠すなら `true` |
| `greens` | グリーン中央の位置（v5〜）`[{ holeNumber, lat, lng }]`。地図で登録し、ラウンド中にGPSで距離を出すのに使う。ティーが違っても同じなのでゴルフ場に持つ |

### `holeNotes`（ホール攻略メモ。v5〜の形）
| 項目 | 意味 |
|---|---|
| `id` | `ゴルフ場のid|ティー名|ホール番号`（例: `c1|白|3`）。ティーごとに分ける（ハザードまでの距離がティーで違うため） |
| `courseId` / `teeName` / `holeNumber` | どのゴルフ場・ティー・ホールか |
| `hazards` | ハザードの一覧 `[{ kind, side, from, to }]`。`kind`: `ob` / `water`（池・ペナルティエリア）/ `bunker` / `narrow`（フェアウェイが狭い）。`side`: `left` / `right` / `both` / `cross`（横切る）/ `green`（グリーン周り）。`from`〜`to`: ティーからの距離（y）。グリーン周りは `null` |
| `plan` | 手直ししたプラン `{ clubId, aim, note }`（`aim`: `left`/`center`/`right`）。手直ししていなければ `null`（自動の提案を使う） |

- 自動の提案（クラブ・狙い・残り距離・理由）は保存せず、毎回 `course-rules.js` で計算する

### `rounds`（ラウンド）
| 項目 | 意味 |
|---|---|
| `date` | 日付 |
| `courseId` | ゴルフ場 |
| `teeName` | 使ったティー（例: `白`） |
| `weather` | 天気（任意） |
| `status` | 値: `playing`（記録中）/ `finished`（完了） |
| `holes` | ホールごとの記録（下の表） |
| `note` | メモ |

`holes` の1件:
| 項目 | 意味 |
|---|---|
| `number` / `par` / `yards` | ホール番号・パー・距離（ゴルフ場の情報を写しておく。後でゴルフ場を直しても過去のラウンドは変わらない） |
| `strokes` | 打数（**これが正**。未入力は `null`。`null` のホールは集計に入れない） |
| `putts` | パット数（未入力は `null`） |
| `teeShot` | ティーショット（v2〜）。パー4・5: `fairway` / `leftRough` / `rightRough` / `bunker` / `ob` / `penalty`。パー3: `green`（乗った）/ `missedGreen`（乗らなかった）。未選択は `null` |
| `penalties` | ペナルティの打数 |
| `bunkers` | バンカーに入った回数 |
| `aroundGreen` | グリーン周りから何打で上がったか（v2〜）。`1`〜`4`（4は「4以上」）。未選択・パーオンしたホールは `null` |
| `note` | 一言メモ（v2〜） |

- パーオンは保存しない。（打数 − パット数）が（パー − 2）以下ならパーオンとして毎回計算する
- ラウンドには `courseName`（ゴルフ場名を写したもの。一覧ですぐ出すため）と `currentHole`（記録中に開いていたホール。再開に使う）も持たせる

### `shots`（1打ごと。記録は任意）
| 項目 | 意味 |
|---|---|
| `roundId` / `holeNumber` / `seq` | どのラウンドの、何番ホールの、何打目か |
| `clubId` | 使ったクラブ |
| `lie` | 打った場所。値: `tee` / `fairway` / `rough` / `bunker` / `green` / `other` |
| `result` | 結果。値: `good` / `left` / `right` / `short` / `long` / `ob` / `water` / `other` |
| `distanceToPin` | 打つ前の残り距離（任意） |

- 1打ごとの記録があるホールは、その数と `strokes` が合わないときに画面で知らせる（自動で書き換えない）

### `practiceSessions`（練習の記録）
| 項目 | 意味 |
|---|---|
| `date` | 日付 |
| `place` | 場所。値: `range`（打ちっぱなし）/ `green`（パター練習場）/ `home`（自宅） |
| `unit` / `amount` | 量の単位（`balls`=球数 / `minutes`=分）と量 |
| `status` | 値: `planned`（練習中）/ `done`（記録した） |
| `mainLabel` / `secondLabel` | 一番・2番目の課題の名前（メニューを作ったときのもの） |
| `items` | ドリルごと `[{ drillId, drillName, topic, block, amount, reason, rating }]`（v4〜）。`drillName` はドリルの名前を写したもの（ドリルを消しても残る）。`block`: `warmup`/`main`/`second`/`finish`。`rating`: 手応え1〜5（未入力は `null`） |
| `note` | メモ |

### `drills`（ドリル集。v4〜）
| 項目 | 意味 |
|---|---|
| `id` | 最初のドリルは `drv-1` などの決まった名前、自分で足したドリルは `my-…` |
| `topic` | 課題。値: `driver` / `iron` / `approach` / `bunker` / `longPutt` / `shortPutt` / `warmup` / `finish` |
| `name` / `how` / `points` | 名前・やり方・意識するポイント |
| `balls` / `minutes` | 球数の目安・時間の目安（分） |
| `places` | できる場所の一覧（`range` / `green` / `home`） |
| `isDefault` | 最初のドリル集から入れたものなら `true` |

- 最初のドリル集は `js/features/practice/drill-data.js`。初めて開いたときと v4 への移行で入れる。「最初のドリル集に戻す」で入れ直す

### `swingVideos`（スイングの解析。v6〜。棚の名前は最初の設計のままだが、**動画は保存しない**）
| 項目 | 意味 |
|---|---|
| `date` | 撮った日 |
| `view` | 撮影方向。値: `front`（正面）/ `behind`（飛球線後方） |
| `clubId` | クラブ（任意） |
| `handedness` / `heightCm` | 解析したときの利き手（`right`/`left`）と身長（cm、なければ `null`） |
| `phases` | 4つの場面 `{ address, top, impact, finish }`。それぞれ `{ t: 秒, image: 静止画（JPEG の Blob）, landmarks: 骨格の33点 [{ x, y, visibility }]（画像に対する割合0〜1） }`。骨格の線は表示するときに重ねる |
| `autoPhases` | 自動で見つけた場面の時刻（手直しの前） |
| `metrics` | 数値 `[{ key, label, value, unit, note }]`。`value` が `null` は「測れず」、`note: '目安'` は平面の動画ではずれやすいもの |
| `duration` / `sampleFps` / `slow` | 動画の長さ・解析したコマの数（1秒あたり）・端末が遅くて画像を小さくしたか |
| `note` | メモ |

- バックアップのJSONでは、静止画を `data:image/jpeg;base64,…` の文字にして入れる（`js/db/image-codec.js`）。読み込むときに Blob に戻す。1回の解析で約0.2〜0.4MB

### `availabilitySearches`（空き確認でよく使う条件）
| 項目 | 意味 |
|---|---|
| `courseIds` | 調べるゴルフ場 |
| `weekdays` | 曜日（0=日〜6=土） |
| `timeRange` | 時間帯 `{ from: "07:00", to: "09:00" }` |
| `soloOnly` | 1人予約だけ（確認のしかたは機能6を作るときに相談） |

### `backups`（自動バックアップ）
| 項目 | 意味 |
|---|---|
| `reason` | 値: `migration`（移行の前）/ `import`（JSON読み込みの前） |
| `json` | その時点の全データ（JSON書き出しと同じ中身） |

- 新しい順に3件だけ残す。JSON書き出しには入れない
- 同じiPhoneの中なので、アイコン削除などで一緒に消える。本当のバックアップはJSON書き出し

## JSONの書き出し・読み込み
```json
{
  "app": "golf-app",
  "schemaVersion": 1,
  "exportedAt": "2026-11-09T20:00:00+09:00",
  "data": {
    "settings": [], "clubs": [], "distanceRecords": [], "courses": [], "holeNotes": [],
    "rounds": [], "shots": [], "practiceSessions": [], "swingVideos": [], "availabilitySearches": []
  }
}
```
- 全部の棚を入れる。スイングの静止画は文字（base64）にして入れる（v6〜。動画はもともと保存しない）
- 楽天のアプリID・アクセスキー（`settings` の `rakutenAppId` / `rakutenAccessKey`）は入れない（楽天の規約で他人に知られてはいけないため。機能6で決定）
- 読み込むときは `schemaVersion` を見て、古ければ移行処理を通してから保存する。新しすぎる（アプリより先の版の）ファイルは読み込まずに知らせる
- 読み込みは「今のデータを全部置き換える」。置き換える前に今のデータを `backups` に自動で保存する

## 移行のしかた
- `schemaVersion` を1つずつ上げる移行処理を並べる（v1→v2、v2→v3…）。飛ばして古いデータが来ても順に通す
- アプリを開いたときに、保存済みデータが古ければ移行する。移行の前に `backups` に自動で保存する
- 移行ごとにテストを書く（古い形のサンプル → 新しい形になる、件数が減らない）

## 変更の履歴
- v1（2026-11-09）: 最初の形
- v2（2026-11-09、機能1）: ラウンドの各ホールの記録を変更
  - `fairway`（`hit`/`left`/`right`/`none`）→ `teeShot`（`fairway`/`leftRough`/`rightRough`/`null`）に置き換え
  - `gir` を削除（毎回計算する）
  - `aroundGreen`（`null`）と `note`（空文字）を追加
  - ラウンドに `courseName` と `currentHole` を持たせる（v1のデータにはないことがあるので、ない前提でも動くようにする）
- v3（2026-11-09、機能2）: 飛距離の記録とクラブ
  - `distanceRecords` の `source`（`range`/`round`/`monitor`）→ `place`（`range`/`course`）。`monitor` は `range` に、`round` は `course` にする
  - `distanceRecords` に `isMiss`（`false`）を追加
  - クラブが1本もなければ、よくある14本を入れる
- v4（2026-11-09、機能4）: 練習メニュー
  - ドリル集の棚 `drills` を追加（IndexedDB自体の版 `DB_VERSION` も 1 → 2）。1件もなければ最初の40個を入れる
  - `practiceSessions` の `items` を `{ title, balls, done }` → `{ drillId, drillName, topic, block, amount, reason, rating }` に。`place`（`range`）・`unit`（`balls`）・`status`（`done`）・`note` を補う
- v5（2026-11-09、機能5）: コースマネジメント
  - `holeNotes` をティーごと（`id` = `ゴルフ場|ティー|ホール`）にし、`hazards` と `plan` を持たせる。最初の形の `note` / `teeClubId` / `aim` は `plan` に移す（ティーはそのゴルフ場の最初のティー）
  - `courses` に `greens`（`[]`）を追加
- v6（2026-11-09、機能7）: スイング解析
  - `swingVideos` から `video` / `annotations` / `autoMeasurements` を消し、`handedness`（`right`）・`phases`（`{}`）・`metrics`（`[]`）・`note` を足す
  - `settings` に `swingHandedness`（`right`）・`heightCm`（`null`）を足す（初期値があるので移行は不要）
