// 設定タブの画面

import { getMeta } from '../../db/database.js';
import { formatJapaneseDate, daysSince } from '../../core/dates.js';
import { countRecords } from '../../db/backup-format.js';
import { exportBackup, readBackupFile, restoreBackup } from './backup-actions.js';
import { updateBackupNotice } from '../../ui/notice.js';
import { APP_VERSION } from '../../version.js';
import { renderClubsSettings } from '../clubs/clubs-settings-view.js';
import { renderFinderSettings } from '../distance/finder-settings-view.js';
import { renderTargetSettings } from '../analysis/target-settings-view.js';
import { renderPracticeSettings } from '../practice/practice-settings-view.js';

const HTML = `
  <div id="target-settings"></div>
  <div id="practice-settings"></div>
  <div id="clubs-settings"></div>
  <div id="finder-settings"></div>
  <h2>バックアップ</h2>
  <div class="info-box">
    <div>最後にバックアップした日</div>
    <div id="last-backup" style="font-size:22px"></div>
  </div>
  <button type="button" id="export-button" class="big-button">バックアップを保存</button>
  <button type="button" id="import-button" class="big-button secondary">バックアップから復元</button>
  <input type="file" id="import-file" accept="application/json,.json" hidden>
  <p id="backup-status" class="status" role="status"></p>
  <p class="small">「バックアップを保存」を押すと共有の画面が出ます。「"ファイル"に保存」を選び、iCloud Driveに保存すると、iPhoneをなくしてもデータが残ります。</p>

  <h2>アプリについて</h2>
  <p class="small">版: ${APP_VERSION}</p>

  <dialog id="restore-dialog">
    <p id="restore-message"></p>
    <button type="button" id="restore-ok" class="big-button danger">置き換える</button>
    <button type="button" id="restore-cancel" class="big-button secondary">やめる</button>
  </dialog>
`;

export function setupSettingsView(root) {
  root.innerHTML = HTML;
  const $ = (id) => root.querySelector('#' + id);
  const status = $('backup-status');
  const dialog = $('restore-dialog');
  let pending = null; // 確認待ちの復元データ

  function showStatus(text, isError = false) {
    status.textContent = text;
    status.classList.toggle('error', isError);
  }

  // 設定タブの中身（マイクラブ・補正・最後にバックアップした日）と上のお知らせを新しくする
  async function refresh() {
    await renderTargetSettings($('target-settings'));
    await renderPracticeSettings($('practice-settings'));
    await renderClubsSettings($('clubs-settings'));
    await renderFinderSettings($('finder-settings'));
    const meta = await getMeta();
    const last = meta && meta.lastExportedAt;
    const days = last ? daysSince(last, new Date()) : 0;
    $('last-backup').textContent = last
      ? `${formatJapaneseDate(last)}（${days === 0 ? '今日' : days + '日前'}）`
      : 'まだ一度もしていません';
    updateBackupNotice(meta);
  }

  $('export-button').addEventListener('click', async () => {
    showStatus('');
    try {
      if (await exportBackup()) showStatus('バックアップを保存しました。');
      await refresh();
    } catch (err) {
      showStatus('保存できませんでした: ' + err.message, true);
    }
  });

  $('import-button').addEventListener('click', () => {
    showStatus('');
    $('import-file').value = ''; // 同じファイルをもう一度選べるように
    $('import-file').click();
  });

  // ファイルを選んだら、中身を確かめてから確認を出す
  $('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { data, exportedAt } = await readBackupFile(file);
      pending = data;
      const when = exportedAt ? `${formatJapaneseDate(exportedAt)}に保存した` : '';
      $('restore-message').textContent =
        `${when}バックアップ（${countRecords(data)}件）で、今のデータをすべて置き換えます。今のデータは元に戻せません。よろしいですか？`;
      dialog.showModal();
    } catch (err) {
      showStatus(err.message, true);
    }
  });

  $('restore-cancel').addEventListener('click', () => {
    pending = null;
    dialog.close();
    showStatus('復元をやめました。');
  });

  $('restore-ok').addEventListener('click', async () => {
    dialog.close();
    try {
      await restoreBackup(pending);
      showStatus('復元しました。');
    } catch (err) {
      showStatus('復元できませんでした。今のデータはそのままです: ' + err.message, true);
    }
    pending = null;
    await refresh();
  });

  return { refresh };
}
