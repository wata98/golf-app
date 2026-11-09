// 設定タブの「楽天GORAの空き確認」: アプリIDとアクセスキーの入力・接続の確認・消す
// キーはスマホの中だけに保存し、バックアップのJSONには入れない（楽天の規約で他人に知られてはいけないため）

import { getSettings, saveSettings } from '../settings/settings-store.js';
import { searchPlans } from './gora-api.js';
import { addDays } from './availability-view.js';
import { toDateOnly } from '../../core/dates.js';

export async function renderAvailabilitySettings(root) {
  const s = await getSettings();
  const has = Boolean(s.rakutenAppId && s.rakutenAccessKey);
  root.innerHTML = `
    <h2>楽天GORAの空き確認</h2>
    <p class="small">楽天ウェブサービスで作ったアプリの「Application ID」と「Access Key」を貼り付けてください。他人に見せないでください。このスマホの中だけに保存し、バックアップのファイルには入りません（機種変更のときは入れ直してください）。</p>
    <p>${has ? '登録済みです。' : 'まだ登録していません。'}</p>
    <label class="field">Application ID（アプリID）<input type="password" id="rk-app" autocomplete="off" placeholder="${has ? '（登録済み。変えるときだけ入れる）' : ''}"></label>
    <label class="field">Access Key（アクセスキー）<input type="password" id="rk-key" autocomplete="off" placeholder="${has ? '（登録済み。変えるときだけ入れる）' : ''}"></label>
    <button type="button" class="big-button secondary" id="rk-save">保存する</button>
    <button type="button" class="big-button secondary" id="rk-test" ${has ? '' : 'disabled'}>接続を試す</button>
    ${has ? '<button type="button" class="chip" id="rk-clear">キーを消す</button>' : ''}
    <p class="status" id="rk-status" role="status"></p>`;

  const $ = (id) => root.querySelector('#' + id);
  const status = (t, err = false) => { $('rk-status').textContent = t; $('rk-status').classList.toggle('error', err); };

  $('rk-save').onclick = async () => {
    const appId = $('rk-app').value.trim();
    const key = $('rk-key').value.trim();
    if (!appId && !key) return status('アプリIDとアクセスキーを入れてください。', true);
    const changes = {};
    if (appId) changes.rakutenAppId = appId;
    if (key) changes.rakutenAccessKey = key;
    await saveSettings(changes);
    await renderAvailabilitySettings(root);
    root.querySelector('#rk-status').textContent = '保存しました。「接続を試す」で確かめてください。';
  };

  // 明日・千葉県で1件だけ問い合わせて、つながるか確かめる
  $('rk-test').onclick = async () => {
    const now = await getSettings();
    status('楽天に問い合わせています…');
    try {
      const cond = { prefs: ['chiba'], players: 1, budget: 0, times: [], sort: 'price', twoSum: false };
      const r = await searchPlans(cond, addDays(toDateOnly(new Date()), 1), 1, { appId: now.rakutenAppId, accessKey: now.rakutenAccessKey });
      status(`つながりました（明日の千葉県のプラン ${r.count}件）。「ラウンド前」の「空き確認」で使えます。`);
    } catch (err) {
      status(err.message + (err.detail ? `（${err.detail}）` : ''), true);
    }
  };

  if ($('rk-clear')) {
    $('rk-clear').onclick = async () => {
      await saveSettings({ rakutenAppId: '', rakutenAccessKey: '' });
      await renderAvailabilitySettings(root);
      root.querySelector('#rk-status').textContent = 'キーを消しました。';
    };
  }
}
