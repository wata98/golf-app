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
| `rakutenAppId` | 楽天のアプリID（機能6。未入力なら空文字。コードには書かない） |
| `homePrefecture` | よく行く地域（空き確認の初期値） |

### `clubs`（クラブ）
| 項目 | 意味 |
|---|---|
| `name` | 表示名（例: `7I`、`1W`、`PW`） |
| `type` | 値: `driver` / `wood` / `hybrid` / `iron` / `wedge` / `putter` |
| `loft` | ロフト角（任意） |
| `order` | 並び順（番手早見表で使う） |
| `archived` | バッグから外したら `true` |

### `distanceRecords`（飛距離）
| 項目 | 意味 |
|---|---|
| `clubId` | どのクラブか |
| `date` | 測った日 |
| `carry` | キャリー（任意） |
| `total` | ランを含めた距離（任意。`carry` か `total` のどちらかは必須） |
| `source` | 値: `range`（練習場）/ `round`（ラウンド）/ `monitor`（計測器） |
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

### `holeNotes`（ホール攻略メモ）
| 項目 | 意味 |
|---|---|
| `courseId` | どのゴルフ場か |
| `holeNumber` | ホール番号（1〜18） |
| `note` | メモ |
| `teeClubId` | ティーショットで使うクラブ（任意） |
| `aim` | 狙う方向。値: `left` / `center` / `right`（任意） |

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
| `strokes` | 打数（**これが正**。未入力は `null`） |
| `putts` | パット数 |
| `fairway` | ティーショット。値: `hit` / `left` / `right` / `none`（パー3など） |
| `gir` | パーオンしたら `true` |
| `penalties` | ペナルティの打数 |
| `bunkers` | バンカーに入った回数 |

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
| `items` | 項目 `[{ title: "50ydのアプローチ", balls: 30, done: true, reason: "…" }]`。`reason` は提案した理由（どの弱点から出したか） |
| `note` | メモ |

### `swingVideos`（スイング動画）
| 項目 | 意味 |
|---|---|
| `date` | 撮った日 |
| `clubId` | クラブ（任意） |
| `view` | 撮った向き。値: `front`（正面）/ `back`（後方） |
| `video` | 動画本体（IndexedDBにBlobで保存。**JSON書き出しには入れない**） |
| `annotations` | 描いた線・角度 `[{ type: "line" or "angle", time: 1.25, points: [{x,y}, …] }]`。座標は動画の幅・高さに対する割合（0〜1）で持ち、画面の大きさが変わってもずれないようにする |
| `autoMeasurements` | 自動計測の結果（機能7の後半で中身を決める。最初は空） |
| `note` | メモ |

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
- 全部の棚を入れる。ただし `swingVideos` の `video`（動画本体）は大きいので入れない。動画の元ファイルは写真アプリに残しておく
- `rakutenAppId` を入れるかは機能6を作るときにユーザーに確認する
- 読み込むときは `schemaVersion` を見て、古ければ移行処理を通してから保存する。新しすぎる（アプリより先の版の）ファイルは読み込まずに知らせる
- 読み込みは「今のデータを全部置き換える」。置き換える前に今のデータを `backups` に自動で保存する

## 移行のしかた
- `schemaVersion` を1つずつ上げる移行処理を並べる（v1→v2、v2→v3…）。飛ばして古いデータが来ても順に通す
- アプリを開いたときに、保存済みデータが古ければ移行する。移行の前に `backups` に自動で保存する
- 移行ごとにテストを書く（古い形のサンプル → 新しい形になる、件数が減らない）

## 変更の履歴
- v1（2026-11-09）: 最初の形
