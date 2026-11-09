// ホールのパー・距離を直す小さな画面。
// 「保存」なら { par, yards }、「やめる」なら null を返す

const PARS = [3, 4, 5, 6];

export function holeEditDialog(hole) {
  return new Promise((resolve) => {
    let par = hole.par;
    const dialog = document.createElement('dialog');
    dialog.innerHTML = `
      <h2>${hole.number}番のパー・距離</h2>
      <div class="choices cols-4">
        ${PARS.map((p) => `<button type="button" class="choice" data-par="${p}" aria-pressed="${p === par}">パー${p}</button>`).join('')}
      </div>
      <label class="field">距離（ヤード）
        <input type="number" inputmode="numeric" min="0" max="999" data-yards value="${hole.yards ?? ''}">
      </label>
      <button type="button" class="big-button" data-ok>保存</button>
      <button type="button" class="big-button secondary" data-cancel>やめる</button>`;
    document.body.appendChild(dialog);

    const finish = (result) => {
      dialog.close();
      dialog.remove();
      resolve(result);
    };
    dialog.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.par) {
        par = Number(btn.dataset.par);
        for (const b of dialog.querySelectorAll('[data-par]')) b.setAttribute('aria-pressed', String(Number(b.dataset.par) === par));
      }
      if ('ok' in btn.dataset) {
        const y = dialog.querySelector('[data-yards]').value;
        finish({ par, yards: y === '' ? null : Math.round(Number(y)) });
      }
      if ('cancel' in btn.dataset) finish(null);
    });
    dialog.addEventListener('cancel', () => finish(null));
    dialog.showModal();
  });
}
