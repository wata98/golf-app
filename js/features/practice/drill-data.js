// =====================================================================
// 最初のドリル集（課題ごとに5個ずつ、合計40個）
//
// アプリを最初に開いたとき（とデータの移行のとき）に、スマホの中のドリル集に写す。
// 画面での追加・編集・削除はスマホの中のドリル集に保存され、このファイルは変わらない。
// 「最初のドリル集に戻す」を押すと、このファイルの内容に戻る。
//
// 中身は、ゴルフスクールやレッスン書でよく紹介される一般的な練習法だけにしている。
//
// 1つのドリルの項目:
//   id       ... 変えない名前（練習の記録がこの名前でドリルを指す）
//   topic    ... 課題（practice-rules.js の TOPICS の key）
//   name     ... ドリルの名前
//   how      ... やり方
//   points   ... 意識するポイント
//   balls    ... 球数の目安（素振りは回数）
//   minutes  ... 時間の目安（分）
//   places   ... できる場所（range=打ちっぱなし / green=パター練習場 / home=自宅）
// =====================================================================

export const DEFAULT_DRILLS = [
  // ---- ドライバーの曲がり ----
  { id: 'drv-1', topic: 'driver', name: 'ティー2本のゲート', balls: 20, minutes: 10, places: ['range'],
    how: 'ボールの30cmほど先に、ボール2個分の間を空けてティーを2本立て、その間を通すように打つ。',
    points: '打ち出しの方向をそろえる。曲げないことより、まっすぐ出すことを先に。' },
  { id: 'drv-2', topic: 'driver', name: '7割の力でフェアウェイ幅', balls: 20, minutes: 10, places: ['range'],
    how: '練習場の目標を2つ選び、その間をフェアウェイと決める。7割くらいの力で振って、幅の中に何球入るか数える。',
    points: '力を抜いたときの曲がり幅を知る。入った数を記録して比べる。' },
  { id: 'drv-3', topic: 'driver', name: 'フィニッシュで3秒止まる', balls: 15, minutes: 10, places: ['range', 'home'],
    how: '打ったあと（自宅では素振りのあと）、フィニッシュの形で3秒止まる。止まれなければ次は力を落とす。',
    points: 'ふらつかずに立てる速さで振る。体の回転と腕の振りをそろえる。' },
  { id: 'drv-4', topic: 'driver', name: '外側の障害物（スライス対策）', balls: 15, minutes: 10, places: ['range'],
    how: 'ボールの外側（体から遠い側）の少し先に、ヘッドカバーを置く。当てないように打つ。',
    points: '外から下りてくる軌道を直す。ヘッドを体の内側から下ろす。' },
  { id: 'drv-5', topic: 'driver', name: '打点チェック', balls: 15, minutes: 10, places: ['range'],
    how: 'フェースに打点シール（なければ粉のスプレー）を付けて打ち、当たった場所を毎球見る。',
    points: '芯から外れる向き（先・根元・上・下）と曲がり方の関係を知る。' },

  // ---- アイアンのミート率 ----
  { id: 'irn-1', topic: 'iron', name: 'ボールの先のティー', balls: 20, minutes: 10, places: ['range'],
    how: 'ボールの10cmほど先（目標側）にティーを刺す。ボールを打ったあと、そのティーも打つ。',
    points: 'ボールが先、地面があと。最も低い点をボールの先にする。' },
  { id: 'irn-2', topic: 'iron', name: 'ハーフスイング（9時〜3時）', balls: 20, minutes: 10, places: ['range'],
    how: '7番アイアンで、腕が9時から3時までの振り幅で打つ。芯に当たる音と手応えを確かめる。',
    points: '小さい振り幅で芯に当ててから、少しずつ大きくする。' },
  { id: 'irn-3', topic: 'iron', name: '足をそろえて打つ', balls: 15, minutes: 10, places: ['range'],
    how: '両足をくっつけて立ち、ハーフスイングで打つ。',
    points: '体が左右に揺れると当たらない。軸をその場で回す。' },
  { id: 'irn-4', topic: 'iron', name: 'アイアンの打点チェック', balls: 15, minutes: 10, places: ['range'],
    how: 'フェースに打点シール（なければ粉のスプレー）を付けて打ち、当たった場所を毎球見る。',
    points: '芯からのずれの向きを知り、構えやボールの位置を直す。' },
  { id: 'irn-5', topic: 'iron', name: '同じ番手で10球の距離のばらつき', balls: 20, minutes: 10, places: ['range'],
    how: '目標を1つ決め、同じ番手で10球打つ。落ちた場所の前後のばらつきを見る。',
    points: 'ばらつきが小さいほど芯に当たっている。飛距離の記録にも入れる。' },

  // ---- アプローチの距離感 ----
  { id: 'apr-1', topic: 'approach', name: 'ラダードリル（10・20・30ヤード）', balls: 20, minutes: 15, places: ['range'],
    how: '10・20・30ヤードの目標に、近い順に打っていく。前の球より遠く、次の目標の手前に止める。',
    points: '振り幅で距離を打ち分ける。1球ごとに違う距離を打つ。' },
  { id: 'apr-2', topic: 'approach', name: '振り幅と距離の表づくり', balls: 20, minutes: 15, places: ['range', 'home'],
    how: '腕の振り幅を時計の針で決め（7時〜5時、8時〜4時、9時〜3時）、それぞれ何ヤード飛ぶか測る。自宅では振り幅をそろえる素振り。',
    points: '振り上げと振り抜きを同じ大きさにする。力ではなく振り幅で調整する。' },
  { id: 'apr-3', topic: 'approach', name: '落とし場所を決める', balls: 20, minutes: 10, places: ['range'],
    how: 'タオルなどを落とし場所に置き、そこに落とすことだけを考えて打つ。',
    points: '転がりを計算に入れ、ピンではなく落とし場所を狙う。' },
  { id: 'apr-4', topic: 'approach', name: '3本のクラブで打ち比べ', balls: 15, minutes: 10, places: ['range'],
    how: '同じ距離を、SW・PW・9番アイアンで打ち比べ、それぞれのキャリーと転がりを知る。',
    points: '状況に合うクラブを選べるようにする。同じ振り方で打つ。' },
  { id: 'apr-5', topic: 'approach', name: '右手1本で寄せる', balls: 15, minutes: 10, places: ['range'],
    how: '右手（利き手）だけでクラブを持ち、短いアプローチを打つ。',
    points: '手首をこねずに、体の回転で運ぶ。' },

  // ---- バンカー ----
  { id: 'bnk-1', topic: 'bunker', name: '線を引いて砂を取る', balls: 15, minutes: 10, places: ['range'],
    how: '練習バンカーで、砂に線を引く。ボールを置かずに、線の少し手前から砂を取る。慣れたら線の前にボールを置く。',
    points: '毎回同じ場所に入れる。ボールではなく砂を打つ。' },
  { id: 'bnk-2', topic: 'bunker', name: 'お札ドリル', balls: 15, minutes: 10, places: ['range'],
    how: 'ボールの周りに、お札くらいの長方形を思い描く（砂に線で描く）。その長方形の砂ごとボールを出す。',
    points: '砂を薄く長く取る。深く掘らない。' },
  { id: 'bnk-3', topic: 'bunker', name: '連続の素振りで砂を取る', balls: 20, minutes: 10, places: ['range'],
    how: 'ボールを置かずに、少しずつ前に進みながら連続で砂を取る。',
    points: '同じ深さ・同じ長さで砂が取れるようにする。' },
  { id: 'bnk-4', topic: 'bunker', name: '振り抜いてフィニッシュ', balls: 15, minutes: 10, places: ['range'],
    how: '打ったあと、フィニッシュまで止めずに振り抜く。',
    points: 'インパクトで減速しない。砂の抵抗に負けずに振り切る。' },
  { id: 'bnk-5', topic: 'bunker', name: '振り幅で距離を変える', balls: 15, minutes: 10, places: ['range'],
    how: '5・10・15ヤードの目標に、振り幅を変えて打ち分ける。',
    points: '砂の取り方は同じにして、振り幅で距離を変える。' },

  // ---- ロングパットの距離感 ----
  { id: 'lpt-1', topic: 'longPutt', name: 'ラダードリル（5・10・15m）', balls: 15, minutes: 10, places: ['green'],
    how: '5・10・15mの順に打ち、前の球より遠く、次の距離より手前に止める。',
    points: '振り幅で距離を合わせる。カップに入れるより距離をそろえる。' },
  { id: 'lpt-2', topic: 'longPutt', name: 'カラーの手前で止める', balls: 15, minutes: 10, places: ['green'],
    how: 'グリーンの反対側の端（カラー）に向けて打ち、カラーの手前ぎりぎりに止める。',
    points: 'カップがないので、距離感だけに集中できる。' },
  { id: 'lpt-3', topic: 'longPutt', name: '目をつぶって距離を当てる', balls: 15, minutes: 10, places: ['green', 'home'],
    how: '構えて目標を見たら目をつぶって打つ。止まる前に「ショート」「ぴったり」「オーバー」を言ってから目を開ける。',
    points: '手に残る感覚と、実際の距離を結びつける。' },
  { id: 'lpt-4', topic: 'longPutt', name: 'カップの周り1mの円', balls: 15, minutes: 10, places: ['green'],
    how: 'カップの周りに半径1mほどの円を思い描き（ティーで印を付ける）、その中に止める。',
    points: '入れるより、次を確実に入れられる距離に止めることを目標にする。' },
  { id: 'lpt-5', topic: 'longPutt', name: '振り幅と転がりの表づくり', balls: 15, minutes: 10, places: ['green', 'home'],
    how: '振り幅を足の幅などで決め（右足の前まで、右足の外まで、など）、それぞれ何m転がるか測る。',
    points: '振り上げと振り抜きを同じ大きさにする。その日の芝の速さで表を合わせる。' },

  // ---- ショートパット ----
  { id: 'spt-1', topic: 'shortPutt', name: 'ティー2本のゲート', balls: 20, minutes: 10, places: ['green', 'home'],
    how: 'ボールの20cmほど先に、ボールより少し広い間を空けてティーを2本立て、その間を通して1mを打つ。',
    points: 'フェースの向きをまっすぐにして、打ち出しをそろえる。' },
  { id: 'spt-2', topic: 'shortPutt', name: 'クロックドリル（周り8か所から1m）', balls: 16, minutes: 10, places: ['green'],
    how: 'カップの周り8か所（時計の文字盤のように）に1mでボールを置き、順に入れる。',
    points: '上り・下り・横からの曲がりに慣れる。' },
  { id: 'spt-3', topic: 'shortPutt', name: '右手1本でストローク', balls: 15, minutes: 10, places: ['green', 'home'],
    how: '右手（利き手）だけでパターを持ち、1mを打つ。',
    points: '手首を使わず、肩の動きでパターを動かす。' },
  { id: 'spt-4', topic: 'shortPutt', name: '線の上を転がす', balls: 20, minutes: 10, places: ['green', 'home'],
    how: '床や芝の上に糸やテープでまっすぐな線を作り、その線の上を転がす。',
    points: 'ボールが線から外れないように、まっすぐ引いてまっすぐ出す。' },
  { id: 'spt-5', topic: 'shortPutt', name: '連続カップイン（1・1.5・2m）', balls: 15, minutes: 10, places: ['green', 'home'],
    how: '1m・1.5m・2mの順に入れる。外したら1mからやり直す。',
    points: '外してはいけない気持ちの中で、いつもと同じリズムで打つ。' },

  // ---- ウォームアップ ----
  { id: 'wup-1', topic: 'warmup', name: 'ストレッチとゆっくり素振り', balls: 10, minutes: 5, places: ['range', 'home'],
    how: '肩・腰・手首を伸ばしてから、ゆっくり大きく素振りをする（回数で数える）。',
    points: 'けがを防ぐ。速く振らずに、体を大きく回す。' },
  { id: 'wup-2', topic: 'warmup', name: 'ハーフスイング（腰から腰）', balls: 10, minutes: 5, places: ['range'],
    how: 'ウェッジで、腰の高さから腰の高さまでの振り幅で軽く打つ。',
    points: '芯に当てる感覚を取り戻す。力を入れない。' },
  { id: 'wup-3', topic: 'warmup', name: '片手打ち', balls: 10, minutes: 5, places: ['range'],
    how: 'ウェッジを右手だけ・左手だけで持ち、短い振り幅で打つ。',
    points: 'それぞれの手の役割を確かめる。' },
  { id: 'wup-4', topic: 'warmup', name: '短いパットで手を慣らす', balls: 10, minutes: 5, places: ['green', 'home'],
    how: '50cm〜1mのパットを続けて入れる。',
    points: '入る音を聞いて、気持ちよく始める。' },
  { id: 'wup-5', topic: 'warmup', name: '端から端へ転がす', balls: 10, minutes: 5, places: ['green'],
    how: 'グリーンの端から端へ、カップを狙わずに転がす。',
    points: 'その日の芝の速さを確かめる。' },

  // ---- 仕上げ ----
  { id: 'fin-1', topic: 'finish', name: '本番想定（1球ごとに番手と目標を変える）', balls: 10, minutes: 10, places: ['range'],
    how: '1球ごとにクラブと目標を変え、毎回プレショットルーティンをしてから打つ。',
    points: 'コースと同じく、1球を1回だけ打つ。打ち直さない。' },
  { id: 'fin-2', topic: 'finish', name: '最初のホールを想定', balls: 10, minutes: 10, places: ['range'],
    how: 'よく行くコースの1番ホールを思い浮かべ、ティーショットから2打目、3打目と順に打つ。',
    points: 'コースで使う番手の流れに慣れる。' },
  { id: 'fin-3', topic: 'finish', name: '1mを10回連続で入れて終わる', balls: 10, minutes: 5, places: ['green', 'home'],
    how: '1mを10回続けて入れたら終わり。外したら数え直す。',
    points: '入れて終わることで、良い感覚を残す。' },
  { id: 'fin-4', topic: 'finish', name: '9ホールのパットゲーム', balls: 18, minutes: 10, places: ['green'],
    how: '違う距離・違う場所から9か所選び、それぞれ2パット以内で上がる。合計の打数を記録する。',
    points: 'ラウンドと同じく、1回ごとにラインと距離を読む。' },
  { id: 'fin-5', topic: 'finish', name: 'ルーティンの素振り', balls: 10, minutes: 5, places: ['home', 'range'],
    how: '後ろから目標を見る・構える・素振り・打つ、の手順を本番と同じ順番と時間で繰り返す。',
    points: '毎回同じ手順にすることで、本番でも落ち着いて打てる。' },
];
