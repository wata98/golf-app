// 画面の上に出すバックアップのお知らせ

import { needsBackupReminder, daysSince } from '../core/dates.js';

export function updateBackupNotice(meta) {
  const el = document.getElementById('notice');
  if (!meta || !needsBackupReminder(meta, new Date())) {
    el.hidden = true;
    return;
  }
  const days = daysSince(meta.lastExportedAt || meta.createdAt, new Date());
  el.textContent = meta.lastExportedAt
    ? `最後のバックアップから${days}日たっています。「設定」でバックアップを保存してください。`
    : 'まだ一度もバックアップしていません。「設定」でバックアップを保存してください。';
  el.hidden = false;
}
