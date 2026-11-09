// 画面下のタブの切り替え
// onShow(tab): タブを開いたときに呼ばれる（中身を新しくするため）

export function setupTabs(onShow = () => {}) {
  const buttons = document.querySelectorAll('.tab-button');
  const panels = document.querySelectorAll('.tab-panel');

  function show(tab) {
    for (const p of panels) p.hidden = p.dataset.tab !== tab;
    for (const b of buttons) {
      if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    }
    window.scrollTo(0, 0);
    onShow(tab);
  }

  for (const b of buttons) b.addEventListener('click', () => show(b.dataset.tab));
  return { show };
}
