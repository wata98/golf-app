// 左右のスワイプで前後のホールに移る

const MIN_DISTANCE = 60; // これより短い指の動きはスワイプとみなさない（ボタンの押し間違い防止）

// el の上で左にスワイプ → onNext、右にスワイプ → onPrev
export function onSwipe(el, { onNext, onPrev }) {
  let startX = null;
  let startY = null;
  el.addEventListener('touchstart', (e) => {
    // 文字の入力中（メモ欄など）はスワイプにしない
    if (e.target.closest('input, textarea, select')) { startX = null; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    startX = null;
    // 横の動きがはっきり大きいときだけ（縦のスクロールと区別する）
    if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) onNext();
    else onPrev();
  }, { passive: true });
}
