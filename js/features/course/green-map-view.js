// グリーンの位置を地図（国土地理院の航空写真）でタップして登録する画面。
// 地図は自宅などネットがある所で使う。保存するのは緯度・経度だけなので、ラウンド中は地図なしで距離が出せる。
//
// 地図の利用条件（docs/decisions.md）: 出典「国土地理院」と地理院タイル一覧へのリンクを必ず表示する。
// 写真の一部に GRUS 画像が含まれるため「© Axelspace」も表示する。地図をまとめて保存（先読み）しない。

import { esc } from '../../ui/html.js';
import { saveCourse } from '../round/round-store.js';
import { parseLatLng } from './course-math.js';

const TILE_URL = 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg';
const ATTRIBUTION = '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">出典: 国土地理院</a>（GRUS画像 © Axelspace）';
const DEFAULT_CENTER = [35.68, 139.76]; // 位置の手がかりがないとき（東京）

// Leaflet（地図の道具）を読み込む。vendor/ に同梱。地図を開いたときだけ読み込む
let loading = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'vendor/leaflet.css';
      document.head.appendChild(css);
      const s = document.createElement('script');
      s.src = 'vendor/leaflet.js';
      s.onload = () => resolve(window.L);
      s.onerror = () => { loading = null; reject(new Error('地図の部品を読み込めませんでした。')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

// args: { course, holeNumber, onDone() }
export async function renderGreenMap(root, { course, holeNumber, onDone }) {
  course.greens ??= [];
  const current = course.greens.find((g) => g.holeNumber === holeNumber);
  // 地図の最初の場所: このホールの登録 → 同じゴルフ場のほかのホール → 東京
  const near = current ?? course.greens[course.greens.length - 1];
  let picked = current ? { lat: current.lat, lng: current.lng } : null;

  root.onclick = null; // 前の画面のボタンの処理を外す（この画面はボタンごとに処理を付ける）
  root.innerHTML = `
    <h2>${esc(course.name)} ${holeNumber}番のグリーン中央</h2>
    <p class="small">地図を動かしてグリーンを探し、グリーンの真ん中をタップしてください。</p>
    <div id="green-map" class="green-map"></div>
    <p id="map-picked">${picked ? `選んだ位置: ${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}` : 'まだ選んでいません。'}</p>
    <p class="status error" id="map-error"></p>
    <button type="button" class="big-button" id="map-save" ${picked ? '' : 'disabled'}>この位置を保存</button>
    <button type="button" class="big-button secondary" id="map-here">現在地に移動</button>
    <details class="drill-group">
      <summary>座標を貼り付けて移動</summary>
      <p class="small">Googleマップなどで場所を長押しすると「35.12345, 139.12345」の形の座標をコピーできます。</p>
      <input type="text" id="map-latlng" class="memo-box" placeholder="35.12345, 139.12345">
      <button type="button" class="chip" id="map-go">移動</button>
    </details>
    ${current ? '<button type="button" class="big-button danger" id="map-remove">登録を消す</button>' : ''}
    <button type="button" class="big-button secondary" id="map-cancel">やめる</button>`;

  const $ = (id) => root.querySelector('#' + id);
  const showError = (t) => { $('map-error').textContent = t; };
  let L;
  try {
    L = await loadLeaflet();
  } catch (err) {
    showError(err.message);
    $('map-cancel').onclick = onDone;
    return;
  }

  const map = L.map($('green-map'), { maxZoom: 19 }).setView(near ? [near.lat, near.lng] : DEFAULT_CENTER, near ? 17 : 12);
  // 航空写真はズーム14〜18。それより引いたときは表示されないので、ズーム14未満では一般の地図を出す
  L.tileLayer(TILE_URL, { minZoom: 14, maxNativeZoom: 18, maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
  L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', { minZoom: 5, maxZoom: 13, attribution: ATTRIBUTION }).addTo(map);
  let marker = picked ? L.circleMarker([picked.lat, picked.lng], { radius: 10, color: '#ff0', weight: 4, fillColor: '#b00020', fillOpacity: 1 }).addTo(map) : null;

  map.on('click', (e) => {
    picked = { lat: e.latlng.lat, lng: e.latlng.lng };
    if (marker) marker.setLatLng(e.latlng);
    else marker = L.circleMarker(e.latlng, { radius: 10, color: '#ff0', weight: 4, fillColor: '#b00020', fillOpacity: 1 }).addTo(map);
    $('map-picked').textContent = `選んだ位置: ${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`;
    $('map-save').disabled = false;
  });

  $('map-save').onclick = async () => {
    course.greens = course.greens.filter((g) => g.holeNumber !== holeNumber).concat({ holeNumber, lat: picked.lat, lng: picked.lng });
    await saveCourse(course);
    map.remove();
    onDone();
  };
  $('map-here').onclick = () => {
    if (!navigator.geolocation) return showError('この端末では現在地を使えません。');
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 17),
      () => showError('現在地がわかりませんでした（位置情報の許可を確かめてください）。'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  $('map-go').onclick = () => {
    const p = parseLatLng($('map-latlng').value);
    if (!p) return showError('「35.12345, 139.12345」の形で入れてください。');
    showError('');
    map.setView([p.lat, p.lng], 17);
  };
  if ($('map-remove')) {
    $('map-remove').onclick = async () => {
      course.greens = course.greens.filter((g) => g.holeNumber !== holeNumber);
      await saveCourse(course);
      map.remove();
      onDone();
    };
  }
  $('map-cancel').onclick = () => { map.remove(); onDone(); };
}
