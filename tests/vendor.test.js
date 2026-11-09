// 同梱しているライブラリ（vendor/）が、記録した版のままかを確かめる。
// 版を上げたときは、vendor/README.md の「指紋（SHA-256）」の表を新しい値にすれば、このテストも通る
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const VENDOR = fileURLToPath(new URL('../vendor/', import.meta.url));
const readme = readFileSync(join(VENDOR, 'README.md'), 'utf8');
// 表の行「| `ファイル` | 大きさ | `指紋` |」を読む
const rows = [...readme.matchAll(/^\| `([^`]+)` \| (\d+) \| `([0-9a-f]{64})` \|$/gm)].map((m) => ({ file: m[1], size: Number(m[2]), sha: m[3] }));

test('vendor/README.md に指紋の表がある', () => {
  assert.ok(rows.length >= 8, `表の行が ${rows.length} 行しか読めませんでした`);
});

for (const r of rows) {
  test(`vendor/${r.file} は記録した版のまま`, () => {
    const path = join(VENDOR, r.file);
    assert.ok(existsSync(path), 'ファイルがありません');
    const buf = readFileSync(path);
    assert.equal(buf.length, r.size, '大きさが違います（改行の変換や取り違えのおそれ）');
    assert.equal(createHash('sha256').update(buf).digest('hex'), r.sha, '中身が違います');
  });
}
