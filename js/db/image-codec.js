// バックアップのJSONに静止画を入れるための変換。
// スマホの中では静止画を Blob（画像のデータ）で持つが、JSONには文字しか入らないので、
// 書き出すときに「data:image/jpeg;base64,…」の文字に直し、読み込むときに Blob に戻す。
// 対象: スイングの解析（swingVideos）の4つの場面の静止画（phases.*.image）

// Blob → 「data:…;base64,…」の文字
export async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  const CHUNK = 0x8000; // 一度に大きな文字を作るとエラーになるので、少しずつ
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(bin)}`;
}

// 「data:…;base64,…」の文字 → Blob
export function dataUrlToBlob(text) {
  const m = /^data:([^;,]*);base64,(.*)$/s.exec(text);
  if (!m) throw new Error('バックアップの静止画の形が正しくありません。');
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: m[1] });
}

// 各スイングの各場面の image に f をかけた、新しいデータを返す（元のデータは変えない）
async function mapImages(data, f) {
  const swings = await Promise.all((data.swingVideos || []).map(async (s) => {
    if (!s.phases) return s;
    const phases = {};
    for (const [k, p] of Object.entries(s.phases)) phases[k] = p?.image != null ? { ...p, image: await f(p.image) } : p;
    return { ...s, phases };
  }));
  return { ...data, swingVideos: swings };
}

// 書き出す前: Blob を文字に
export const encodeImages = (data) => mapImages(data, (img) => (typeof img === 'string' ? img : blobToDataUrl(img)));
// 読み込んだあと: 文字を Blob に
export const decodeImages = (data) => mapImages(data, (img) => (typeof img === 'string' ? dataUrlToBlob(img) : img));
