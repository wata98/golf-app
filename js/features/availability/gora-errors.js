// 楽天GORAプラン検索APIのエラーを、何が起きて何をすればよいかの日本語にする。
// 楽天のエラーの形は2種類あると報告されているので両方を読む:
//   形1: { "error": "wrong_parameter", "error_description": "specify valid applicationId" }
//   形2: { "errors": [{ "errorCode": "...", "errorMessage": "..." }] }（2026年の新しい形）
// 直し方の一覧は docs/availability-troubleshooting.md

export class GoraError extends Error {
  // kind: 'keys'（アプリID・キー）/ 'referer'（許可するWebサイト）/ 'limit'（回数）/ 'server'（楽天側）/
  //       'network'（つながらない）/ 'shape'（返事の形が変わった）/ 'other'
  constructor(kind, message, detail = '') {
    super(message);
    this.kind = kind;
    this.detail = detail; // 楽天から返ってきた原文（直すときの手がかり）
  }
}

// 楽天の返事（JSON）から、エラーの記号と説明を取り出す
export function readErrorBody(body) {
  if (!body || typeof body !== 'object') return { code: '', text: '' };
  if (body.error) return { code: String(body.error), text: String(body.error_description ?? '') };
  const e = Array.isArray(body.errors) ? body.errors[0] : null;
  if (e) return { code: String(e.errorCode ?? e.code ?? ''), text: String(e.errorMessage ?? e.message ?? '') };
  return { code: '', text: '' };
}

// HTTPの番号と返事から GoraError を作る（404「見つからない」は呼ぶ側で「0件」として扱う）
export function errorFromResponse(status, body) {
  const { code, text } = readErrorBody(body);
  const all = `${code} ${text}`;
  const detail = `HTTP ${status} ${all}`.trim();
  if (/REFERR?ER/i.test(all)) {
    return new GoraError('referer', '楽天の「許可するWebサイト（Allowed websites）」の登録が合っていません。楽天ウェブサービスのアプリ設定に wata98.github.io が入っているか確かめてください。', detail);
  }
  if (status === 403 && !code) {
    // 楽天は理由を書かずに 403 を返すことがある（2026-11-09 に確かめた）。キーと許可するWebサイトのどちらかが原因
    return new GoraError('keys', '楽天に断られました。アプリID・アクセスキーが正しいか、楽天ウェブサービスのアプリ設定の「許可するWebサイト（Allowed websites）」に wata98.github.io が入っているかを確かめてください。', detail);
  }
  if (/access.?key/i.test(all) || /applicationId|application.?id|app.?id/i.test(all) || status === 401) {
    return new GoraError('keys', 'アプリIDかアクセスキーが正しくありません。「設定」の「楽天GORAの空き確認」で、楽天ウェブサービスに表示されているものをそのまま貼り付け直してください。', detail);
  }
  if (status === 429 || /too_many/i.test(all)) {
    return new GoraError('limit', '楽天への問い合わせが多すぎます。1分ほど待ってからもう一度押してください。', detail);
  }
  if (status === 503) {
    // 2026-11-09 に確かめたところ、許可していないサイト（パソコンの localhost など）から呼んでも 503 が返った
    return new GoraError('server', '楽天のAPIがメンテナンス中か混み合っています。しばらくしてからもう一度試してください。ずっと続くときは、公開サイト（wata98.github.io）から開いているか確かめてください。', detail);
  }
  if (status >= 500) {
    return new GoraError('server', '楽天のAPIの中でエラーが起きました。しばらくしてからもう一度試してください。', detail);
  }
  if (status === 400) {
    return new GoraError('other', '楽天が検索の条件を受け付けませんでした。条件を変えて試してください。続くときは楽天のAPIの仕様が変わった可能性があります（docs/availability-troubleshooting.md）。', detail);
  }
  return new GoraError('other', `楽天から思わぬ返事がありました（${detail}）。`, detail);
}

// fetch 自体が失敗したとき（圏外・楽天につながらない・ブラウザが止めた）
export function networkError(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new GoraError('network', '圏外のため、空き確認は使えません。電波のある所で試してください。', String(err));
  }
  return new GoraError('network', '楽天につながりませんでした。電波を確かめてください。電波があっても続くときは、楽天のAPIの接続先が変わった可能性があります（docs/availability-troubleshooting.md）。', String(err));
}
