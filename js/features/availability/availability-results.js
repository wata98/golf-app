// 空き確認の結果（1日分）の表示と「もっと見る」、エラーの表示

import { esc } from '../../ui/html.js';
import { STOCK_LABELS } from './gora-api.js';

// 楽天のデータを使うときの表示（楽天ウェブサービス利用規約 第13条のクレジット表示）
export const RAKUTEN_CREDIT = '<p class="small credit"><a href="https://developers.rakuten.com/" target="_blank" rel="noopener">Supported by Rakuten Developers</a></p>';

function rowCard(r) {
  const stock = r.stockStatus != null ? (STOCK_LABELS[r.stockStatus] ?? `状態${r.stockStatus}`) : '';
  return `
    <div class="drill-card plan-card">
      <div class="drill-head"><span class="small">${esc(r.prefecture)}・${esc(r.startTimeZone || '時間帯の記載なし')}</span><b class="drill-amount">${r.price ? r.price.toLocaleString() + '円' : '−'}</b></div>
      <div class="drill-name">${esc(r.courseName)}</div>
      <div>${esc(r.planName)}</div>
      <div class="small">${r.playerMin}〜${r.playerMax}人${r.twoSum ? '・2サム保証' : ''}${r.lunch ? '・昼食付' : ''}${stock ? `・${esc(stock)}` : ''}${r.stockCount ? `（残り${esc(r.stockCount)}）` : ''}</div>
      <a class="big-button secondary link-button" href="${esc(r.url)}" target="_blank" rel="noopener">予約ページを開く（楽天GORA）</a>
    </div>`;
}

// 1日分を box に出す。fetchPage(page) は楽天に問い合わせる関数。「もっと見る」で次のページを足す
export async function renderDayResults(box, { date, cond, fetchPage }) {
  let page = 1;
  const first = await fetchPage(page);
  const shown = [...first.rows];
  let pageCount = first.pageCount;
  const total = first.count;

  function draw() {
    box.innerHTML = `
      <h2>${esc(date)}（${cond.players}人で回れるプラン ${shown.length}件）</h2>
      ${shown.length ? shown.map(rowCard).join('') : '<p>この日は条件に合う空きが見つかりませんでした。</p>'}
      ${page < pageCount ? `<button type="button" class="big-button secondary" data-more>もっと見る（楽天の全${total}件のうち、次の30件）</button>` : ''}
      ${RAKUTEN_CREDIT}`;
    const more = box.querySelector('[data-more]');
    if (more) {
      more.onclick = async () => {
        more.disabled = true;
        more.textContent = '探しています…';
        try {
          const next = await fetchPage(page + 1);
          page += 1;
          shown.push(...next.rows);
          pageCount = next.pageCount;
          draw();
        } catch (error) {
          more.insertAdjacentHTML('afterend', errorBox(error));
          more.remove();
        }
      };
    }
  }
  draw();
}

// エラーの表示（楽天からの原文は「くわしく」の中に入れる。直すときの手がかり）
export function errorBox(error) {
  return `
    <div class="notice-inline">
      <b>${esc(error.message)}</b>
      ${error.detail ? `<details><summary>くわしく</summary><p class="small">${esc(error.detail)}</p></details>` : ''}
    </div>`;
}
