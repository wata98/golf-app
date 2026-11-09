// オフライン用の仕組み（sw.js）の書き忘れを見つけるテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION } from '../js/version.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');

// sw.js の APP_FILES の一覧を取り出す
function appFiles() {
  const block = sw.match(/const APP_FILES = \[([\s\S]*?)\];/)[1];
  return [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function listFiles(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    return statSync(join(ROOT, path)).isDirectory() ? listFiles(path) : [path.replaceAll('\\', '/')];
  });
}

test('sw.js の版番号が js/version.js と同じ', () => {
  const swVersion = sw.match(/const APP_VERSION = '([^']+)'/)[1];
  assert.equal(swVersion, APP_VERSION);
});

test('APP_FILES に書いたファイルが全部ある', () => {
  for (const f of appFiles()) {
    if (f === './') continue;
    assert.ok(existsSync(join(ROOT, f)), `${f} がありません`);
  }
});

test('js・css・icons・vendor のファイルが全部 APP_FILES に入っている（入れ忘れるとオフラインで開けない）', () => {
  const listed = new Set(appFiles());
  const vendorJs = listFiles('vendor').filter((f) => f.endsWith('.js'));
  for (const f of [...listFiles('js'), ...listFiles('css'), ...listFiles('icons'), ...vendorJs]) {
    assert.ok(listed.has(f), `${relative('.', f)} を sw.js の APP_FILES に足してください`);
  }
});
