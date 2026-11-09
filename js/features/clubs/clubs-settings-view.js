// 設定タブの「マイクラブ」（クラブの登録・名前の変更・並べ替え・バッグから外す）

import { esc } from '../../ui/html.js';
import { CLUB_TYPES, bagClubs, moveClub, newClub, nextOrder } from './club-model.js';
import { listClubs, saveClub } from './club-store.js';

export async function renderClubsSettings(root) {
  const clubs = await listClubs();
  const bag = bagClubs(clubs);
  const removed = clubs.filter((c) => c.archived);
  const typeLabel = (t) => CLUB_TYPES.find((x) => x.value === t)?.label ?? '';

  root.innerHTML = `
    <h2>マイクラブ（${bag.length}本）</h2>
    <p class="small">名前は押すと直せます。▲▼で並べ替え。外したクラブの飛距離の記録は残ります。</p>
    <ul class="club-list">
      ${bag.map((c, i) => `
        <li class="club-row">
          <button type="button" class="step-button small-step" data-up="${esc(c.id)}" ${i === 0 ? 'disabled' : ''} aria-label="上へ">▲</button>
          <button type="button" class="step-button small-step" data-down="${esc(c.id)}" ${i === bag.length - 1 ? 'disabled' : ''} aria-label="下へ">▼</button>
          <input type="text" class="club-name" data-name="${esc(c.id)}" value="${esc(c.name)}" aria-label="${esc(typeLabel(c.type))}の名前">
          <button type="button" class="chip" data-remove="${esc(c.id)}">外す</button>
        </li>`).join('')}
    </ul>
    <div class="club-add">
      <input type="text" id="club-new-name" placeholder="例: 52度" aria-label="追加するクラブの名前">
      <select id="club-new-type" aria-label="種類">
        ${CLUB_TYPES.map((t) => `<option value="${t.value}" ${t.value === 'wedge' ? 'selected' : ''}>${t.label}</option>`).join('')}
      </select>
      <button type="button" class="big-button secondary" id="club-add">＋ クラブを追加</button>
    </div>
    ${removed.length ? `
      <details>
        <summary>外したクラブ（${removed.length}本）</summary>
        <ul class="club-list">
          ${removed.map((c) => `<li class="club-row"><span class="club-name">${esc(c.name)}</span><button type="button" class="chip" data-restore="${esc(c.id)}">バッグに戻す</button></li>`).join('')}
        </ul>
      </details>` : ''}`;

  const byId = (id) => clubs.find((c) => c.id === id);
  const rerender = () => renderClubsSettings(root);

  root.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    // 名前を直した直後にボタンを押したとき、直した名前が古い名前で上書きされないよう、先に画面の名前を写す
    for (const input of root.querySelectorAll('[data-name]')) {
      const name = input.value.trim();
      if (name) byId(input.dataset.name).name = name;
    }
    if (b.dataset.up || b.dataset.down) {
      const changed = moveClub(clubs, b.dataset.up || b.dataset.down, b.dataset.up ? -1 : 1);
      for (const c of changed) await saveClub(c);
    }
    if (b.dataset.remove) await saveClub({ ...byId(b.dataset.remove), archived: true });
    if (b.dataset.restore) await saveClub({ ...byId(b.dataset.restore), archived: false, order: nextOrder(clubs) });
    if (b.id === 'club-add') {
      const name = root.querySelector('#club-new-name').value.trim();
      if (!name) return;
      await saveClub(newClub(name, root.querySelector('#club-new-type').value, nextOrder(clubs), new Date()));
    }
    rerender();
  };

  // 名前は入力欄から離れたときに保存する（空なら元に戻す）
  root.onchange = async (e) => {
    const id = e.target.dataset.name;
    if (!id) return;
    const name = e.target.value.trim();
    if (!name) { e.target.value = byId(id).name; return; }
    await saveClub({ ...byId(id), name });
  };
}
