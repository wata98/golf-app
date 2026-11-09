// バックアップの保存（ファイルに書き出す）と復元（ファイルから読み込む）

import { readAllData, replaceAllData, saveSnapshot, updateMeta, getAll } from '../../db/database.js';
import { buildBackup, backupFileName, parseBackup, keepSecrets } from '../../db/backup-format.js';
import { toLocalIso } from '../../core/dates.js';
import { encodeImages, decodeImages } from '../../db/image-codec.js';

// 全データをJSONファイルにして渡す。
// iPhoneでは共有画面を出す（「ファイルに保存」でiCloud Driveなどに保存できる）。
// 共有画面がない場合（PCなど）はダウンロードする。
// 保存できたら true、やめたら false を返す。
// スイングの静止画が多いとファイルを作るのに時間がかかり、iPhoneが「押した直後ではない」として共有画面を
// 出さないことがある。そのときは作ったファイルを1分間覚えておき、もう一度押すとすぐ共有画面を出す（'again' を返す）
let prepared = null; // { file, at }
const PREPARED_MS = 60 * 1000;

export async function exportBackup() {
  const now = new Date();
  let file = prepared && Date.now() - prepared.at < PREPARED_MS ? prepared.file : null;
  if (!file) {
    // 静止画（Blob）はJSONに入らないので、文字に直してから入れる
    const json = buildBackup(await encodeImages(await readAllData()), now);
    file = new File([JSON.stringify(json, null, 2)], backupFileName(now), { type: 'application/json' });
  }
  prepared = null;
  const name = file.name;

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
    } catch (err) {
      // 共有画面で「閉じる」を押したときは AbortError になる。保存していないので日付は変えない
      if (err.name === 'AbortError') return false;
      if (err.name === 'NotAllowedError') { prepared = { file, at: Date.now() }; return 'again'; }
      throw err;
    }
  } else {
    downloadFile(file);
  }
  await updateMeta({ lastExportedAt: toLocalIso(now) });
  return true;
}

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 選ばれたファイルを読んで確かめる（まだ保存はしない）。
// 問題があれば日本語の説明つきのエラーになる。
export async function readBackupFile(file) {
  const text = await file.text();
  return parseBackup(text);
}

// 確認がとれたあとに呼ぶ。今のデータを控えてから、全部置き換える。
// 楽天のアプリID・アクセスキーはバックアップに入っていないので、今スマホに入っているものを残す
export async function restoreBackup(data) {
  await saveSnapshot('import');
  // バックアップの静止画は文字になっているので、Blob に戻してから保存する
  await replaceAllData(keepSecrets(await decodeImages(data), await getAll('settings')));
}
