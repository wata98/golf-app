// 「振り返り」タブの「分析」（一番の課題・失点の内訳・パー別・指標の推移）

import { esc } from '../../ui/html.js';
import { formatDiff } from '../round/round-stats.js';
import { getAll } from '../../db/database.js';
import { getSettings } from '../settings/settings-store.js';
import { PERIODS, selectRounds, roundMetrics, averageMetrics, parStats } from './analysis-metrics.js';
import { diagnose, n1, MIN_ROUNDS } from './analysis-rules.js';
import { TREND_METRICS, drawTrendChart } from './analysis-chart.js';

// 画面の中だけで覚えておく選択
const view = { period: 'last5', metric: 'score' };

const signed = (v) => (v > 0 ? '+' : v < 0 ? '−' : '±') + n1(Math.abs(v));

export async function renderAnalysis(root) {
  const { targetScore } = await getSettings();
  const period = PERIODS.find((p) => p.value === view.period);
  const rounds = selectRounds(await getAll('rounds'), view.period);
  const tab = (attr, value, on, label) => `<button type="button" class="choice" data-${attr}="${value}" aria-pressed="${on}">${label}</button>`;
  const periodButtons = `<div class="choices cols-3">${PERIODS.map((p) => tab('period', p.value, p.value === view.period, p.label)).join('')}</div>`;

  if (rounds.length === 0) {
    root.innerHTML = `${periodButtons}<p>分析できるラウンドがありません。ラウンドを記録すると（9ホール以上）、ここに弱点が出ます。</p>`;
    bind(root);
    return;
  }

  const metrics = rounds.map(roundMetrics);
  const avg = averageMetrics(metrics);
  const d = diagnose(rounds, metrics, avg, targetScore, period.label);
  const pars = parStats(rounds);

  root.innerHTML = `
    ${periodButtons}
    ${d.fewData ? `<p class="notice-inline">データが少ないので参考値です（${rounds.length}ラウンド。${MIN_ROUNDS}ラウンド以上で判定が安定します）。</p>` : ''}
    <p class="small">分析したラウンド: ${rounds.length}回（${esc(rounds[0].date)}〜${esc(rounds[rounds.length - 1].date)}）・目標スコア ${targetScore}（「設定」で変更）</p>

    <div class="weakness">
      <div class="small">今の一番の課題</div>
      <div class="weakness-title">${d.top ? esc(d.top.label) : '目標の目安以内です'}</div>
      <p class="weakness-reason">${esc(d.reason).replaceAll('\n', '<br>')}</p>
    </div>

    <h2>失点の内訳（目標との差 ${signed(d.gap)}打）</h2>
    <table class="loss-table">
      <tr><th>項目</th><th>実際</th><th>目安</th><th>差</th></tr>
      ${d.rows.map((r) => `
        <tr class="${d.top && r.key === d.top.key ? 'is-top' : ''}">
          <td>${esc(r.label)}</td><td>${n1(r.actual)}</td><td>${n1(r.allowance)}</td><td><b>${signed(r.diff)}</b></td>
        </tr>`).join('')}
    </table>
    <p class="small">1ラウンド（18ホール）平均の打数。目安は目標${targetScore}の人の目安（js/features/analysis/analysis-rules.js）。平均スコア ${n1(avg.score)}（パー${n1(avg.par)}）。</p>

    <h2>パー別の成績（1ホール平均のパーとの差）</h2>
    <table class="loss-table">
      <tr><th>パー</th><th>平均</th><th>ホール数</th></tr>
      ${[3, 4, 5].map((p) => `<tr><td>パー${p}</td><td><b>${pars[p].avgOver === null ? '−' : signed(pars[p].avgOver)}</b></td><td>${pars[p].holes}</td></tr>`).join('')}
    </table>

    <h2>指標の推移</h2>
    <div class="choices cols-4 metric-grid">
      ${TREND_METRICS.map((m) => tab('metric', m.key, m.key === view.metric, m.label)).join('')}
    </div>
    <div class="chart-box"><canvas id="trend-chart" height="260"></canvas></div>
    <p class="small">スコア・パット数・OB数・ペナルティ数は18ホール分に換算（9ホールのラウンドは2倍）。</p>
    <p class="status error" id="trend-error"></p>`;

  bind(root);
  try {
    await drawTrendChart(root.querySelector('#trend-chart'), metrics, view.metric, targetScore);
  } catch (err) {
    root.querySelector('#trend-error').textContent = err.message;
  }
}

function bind(root) {
  root.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.period) view.period = b.dataset.period;
    else if (b.dataset.metric) view.metric = b.dataset.metric;
    else return;
    renderAnalysis(root);
  };
}
