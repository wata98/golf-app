// 画面を作るときの小さな道具

// 入力された文字（ゴルフ場名・メモなど）を画面に出すときは必ずこれを通す。
// 「<」などがそのまま画面の部品として動いてしまうのを防ぐ。
export function esc(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// 「本当に〜しますか？」の確認を出し、押されたほうを true / false で返す
export function confirmDialog(message, okLabel, { danger = false } = {}) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.innerHTML = `
      <p>${esc(message)}</p>
      <button type="button" class="big-button ${danger ? 'danger' : ''}" data-ok>${esc(okLabel)}</button>
      <button type="button" class="big-button secondary" data-cancel>やめる</button>`;
    document.body.appendChild(dialog);
    const finish = (result) => {
      dialog.close();
      dialog.remove();
      resolve(result);
    };
    dialog.querySelector('[data-ok]').addEventListener('click', () => finish(true));
    dialog.querySelector('[data-cancel]').addEventListener('click', () => finish(false));
    dialog.addEventListener('cancel', () => finish(false));
    dialog.showModal();
  });
}
