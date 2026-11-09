// GPS（スマホの位置）。ラウンド中にグリーン中央までの距離を出すのに使う。
// GPSは電波（ネット）がなくても動く。
// - 使えない端末・位置情報を許可しなかったとき → failed（表示を隠す）
// - 一時的にわからないとき（林の中・時間切れなど）→ 見張りを続け、わかったら表示する

let watchId = null;
let last = null;            // 最後にわかった位置 { lat, lng, accuracy }
let failed = !('geolocation' in navigator);
const listeners = new Set();
const PERMISSION_DENIED = 1; // 位置情報を許可しなかったときのエラーの番号

const notify = () => listeners.forEach((f) => f(last, failed));

// 位置の見張りを始める（すでに始めていれば何もしない）。onChange(position, failed) を呼ぶ
export function watchGps(onChange) {
  listeners.clear(); // 画面を作り直すたびに呼ばれるので、最新の画面にだけ知らせる
  listeners.add(onChange);
  if (failed) return notify();
  if (watchId === null) {
    watchId = navigator.geolocation.watchPosition(
      (pos) => { last = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }; notify(); },
      (err) => {
        if (err.code === PERMISSION_DENIED) { failed = true; stopGps(); }
        notify();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    );
  }
  notify();
}

// 見張りを止める（「ラウンド中」タブを離れたとき。電池を減らさないため）
export function stopGps() {
  if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}
