// バックアップの保存（ファイルに書き出す）と復元（ファイルから読み込む）

import { readAllData, replaceAllData, saveSnapshot, updateMeta } from '../../db/database.js';
import { buildBackup, backupFileName, parseBackup } from '../../db/backup-format.js';
import { toLocalIso } from '../../core/dates.js';

// 全データをJSONファイルにして渡す。
// iPhoneでは共有画面を出す（「ファイルに保存」でiCloud Driveなどに保存できる）。
// 共有画面がない場合（PCなど）はダウンロードする。
// 保存できたら true、やめたら false を返す。
export async function exportBackup() {
  const now = new Date();
  const json = buildBackup(await readAllData(), now);
  const name = backupFileName(now);
  const file = new File([JSON.stringify(json, null, 2)], name, { type: 'application/json' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
    } catch (err) {
      // 共有画面で「閉じる」を押したときは AbortError になる。保存していないので日付は変えない
      if (err.name === 'AbortError') return false;
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

// 確認がとれたあとに呼ぶ。今のデータを控えてから、全部置き換える
export async function restoreBackup(data) {
  await saveSnapshot('import');
  await replaceAllData(data);
}
