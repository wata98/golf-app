// 日付の計算。画面や保存の仕組みから切り離しているのでテストしやすい。

const DAY_MS = 24 * 60 * 60 * 1000;

// バックアップを促すまでの日数
export const BACKUP_REMINDER_DAYS = 30;

// 日時を「2026-11-09T08:30:00+09:00」の形（スマホの時間帯つき）にする
export function toLocalIso(date) {
  const pad = (n) => String(Math.abs(n)).padStart(2, '0');
  // getTimezoneOffset は日本なら -540（分）。符号が逆なので反転する
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.trunc(offsetMin / 60))}:${pad(offsetMin % 60)}`
  );
}

// 日付だけ「2026-11-09」（ファイル名などに使う）
export function toDateOnly(date) {
  return toLocalIso(date).slice(0, 10);
}

// 画面に出す日付「2026年11月9日」
export function formatJapaneseDate(isoText) {
  const d = new Date(isoText);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// from から now まで何日たったか（カレンダーの日付で数える。同じ日なら0）
export function daysSince(isoText, now) {
  const from = new Date(isoText);
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((nowDay - fromDay) / DAY_MS);
}

// バックアップのお知らせを出すかどうか。
// 最後にバックアップした日から30日以上。一度もしていなければ、使い始めた日から30日以上。
export function needsBackupReminder(meta, now) {
  const base = meta.lastExportedAt || meta.createdAt;
  if (!base) return false;
  return daysSince(base, now) >= BACKUP_REMINDER_DAYS;
}
