"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { StrategyId } from "@/lib/ai/strategies";
import { STRATEGY_NAMES } from "@/lib/ai/strategies";

// ----------------------------------------------------------------
// 型定義 (API レスポンスに合わせる)
// ----------------------------------------------------------------

interface StrategyStats {
  strategy: StrategyId;
  games: number;
  wins: number;
  winRate: number;
  avgPlacement: number;
  avgVp: number;
  avgTurns: number;
  avgSettlements: number;
  avgCities: number;
  avgRoads: number;
  avgKnights: number;
}

interface PlacementDist {
  strategy: StrategyId;
  placement: number;
  count: number;
}

interface StatsResponse {
  totalGames: number;
  strategyStats: StrategyStats[];
  placementDist: PlacementDist[];
}

// ----------------------------------------------------------------
// 攻略ヒント生成
// ----------------------------------------------------------------

function generateTips(stats: StrategyStats[]): string[] {
  if (stats.length === 0) return [];
  const tips: string[] = [];
  const sorted = [...stats].sort((a, b) => b.winRate - a.winRate);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  tips.push(
    `最も勝率が高い戦略は「${STRATEGY_NAMES[best.strategy]}」(${(best.winRate * 100).toFixed(1)}%)。${strategyAdvice(best.strategy)}`
  );

  const cityRush = stats.find((s) => s.strategy === "cityRush");
  const balanced = stats.find((s) => s.strategy === "balanced");
  if (cityRush && balanced) {
    if (cityRush.avgCities > balanced.avgCities) {
      tips.push(`都市特化型は平均 ${cityRush.avgCities.toFixed(1)} 都市を建設。序盤に鉱石・小麦タイルを確保すると勝利に近づく。`);
    }
  }

  const longestRoad = stats.find((s) => s.strategy === "longestRoad");
  if (longestRoad) {
    tips.push(
      `最長交易路型の平均街道数は ${longestRoad.avgRoads.toFixed(1)} 本。最長交易路ボーナス(2VP)を獲得するには5本連続が必要。`
    );
  }

  const largestArmy = stats.find((s) => s.strategy === "largestArmy");
  if (largestArmy) {
    tips.push(
      `最大騎士力型の平均騎士使用数は ${largestArmy.avgKnights.toFixed(1)} 回。3回以上使用で最大騎士力ボーナス(2VP)を獲得。`
    );
  }

  if (worst.winRate < 0.1) {
    tips.push(
      `「${STRATEGY_NAMES[worst.strategy]}」は現在勝率 ${(worst.winRate * 100).toFixed(1)}%。港確保だけでなく、着実な建設も重要。`
    );
  }

  const avgTurns = stats.reduce((s, x) => s + x.avgTurns, 0) / stats.length;
  tips.push(`平均ゲーム長は約 ${Math.round(avgTurns)} ターン。序盤の配置で勝負が決まることが多い。`);

  return tips;
}

function strategyAdvice(id: StrategyId): string {
  const advice: Record<StrategyId, string> = {
    balanced: "序盤から多様な資源を確保し、状況に応じて柔軟に立ち回ろう。",
    cityRush: "鉱石3+小麦2を優先的に集めて、開拓地を都市へ素早くアップグレードしよう。",
    longestRoad: "木材・レンガを集めて街道を伸ばし、最長交易路ボーナスを狙おう。",
    largestArmy: "発展カードを購入し続けて騎士を3枚以上プレイ、最大騎士力ボーナスを確保しよう。",
    portTrader: "2:1港の隣に開拓地を建て、余剰資源を効率よく必要なものに変換しよう。",
  };
  return advice[id] ?? "";
}

// ----------------------------------------------------------------
// カラーパレット
// ----------------------------------------------------------------

const STRATEGY_COLORS: Record<StrategyId, string> = {
  balanced: "#3b82f6",
  cityRush: "#ef4444",
  longestRoad: "#22c55e",
  largestArmy: "#a855f7",
  portTrader: "#f59e0b",
};

// ----------------------------------------------------------------
// コンポーネント
// ----------------------------------------------------------------

function WinRateBar({ stats }: { stats: StrategyStats[] }) {
  const max = Math.max(...stats.map((s) => s.winRate), 0.01);
  return (
    <div className="space-y-2">
      {stats.map((s) => (
        <div key={s.strategy} className="flex items-center gap-3">
          <span className="w-28 text-sm text-right text-slate-700">{STRATEGY_NAMES[s.strategy]}</span>
          <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-500"
              style={{
                width: `${(s.winRate / max) * 100}%`,
                background: STRATEGY_COLORS[s.strategy],
              }}
            />
          </div>
          <span className="w-14 text-sm text-slate-600 tabular-nums">
            {(s.winRate * 100).toFixed(1)}%
          </span>
          <span className="w-16 text-xs text-slate-400 tabular-nums">({s.wins}/{s.games})</span>
        </div>
      ))}
    </div>
  );
}

function PlacementTable({ stats }: { stats: StrategyStats[] }) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-slate-100">
          {["戦略", "試合数", "勝率", "平均VP", "平均ターン", "平均都市", "平均街道", "平均騎士"].map((h) => (
            <th key={h} className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {stats.map((s, i) => (
          <tr key={s.strategy} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
            <td className="px-3 py-2 font-medium" style={{ color: STRATEGY_COLORS[s.strategy] }}>
              {STRATEGY_NAMES[s.strategy]}
            </td>
            <td className="px-3 py-2 tabular-nums">{s.games}</td>
            <td className="px-3 py-2 tabular-nums font-semibold">{(s.winRate * 100).toFixed(1)}%</td>
            <td className="px-3 py-2 tabular-nums">{s.avgVp.toFixed(1)}</td>
            <td className="px-3 py-2 tabular-nums">{s.avgTurns.toFixed(0)}</td>
            <td className="px-3 py-2 tabular-nums">{s.avgCities.toFixed(1)}</td>
            <td className="px-3 py-2 tabular-nums">{s.avgRoads.toFixed(1)}</td>
            <td className="px-3 py-2 tabular-nums">{s.avgKnights.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PlacementDistChart({ dist, total }: { dist: PlacementDist[]; total: number }) {
  const strategies = [...new Set(dist.map((d) => d.strategy))];
  const placements = [1, 2, 3, 4];

  const countMap: Record<string, number> = {};
  for (const d of dist) countMap[`${d.strategy}|${d.placement}`] = d.count;

  if (strategies.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-3 py-2 text-left text-slate-700">戦略</th>
            {placements.map((p) => (
              <th key={p} className="px-3 py-2 text-center text-slate-700">
                {p}位
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {strategies.map((s, i) => {
            const gamesForStrategy = dist.filter((d) => d.strategy === s).reduce((sum, d) => sum + d.count, 0);
            return (
              <tr key={s} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="px-3 py-2 font-medium" style={{ color: STRATEGY_COLORS[s] }}>
                  {STRATEGY_NAMES[s]}
                </td>
                {placements.map((p) => {
                  const count = countMap[`${s}|${p}`] ?? 0;
                  const pct = gamesForStrategy > 0 ? count / gamesForStrategy : 0;
                  return (
                    <td key={p} className="px-3 py-2 text-center">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-10 rounded"
                          style={{
                            height: `${Math.max(pct * 60, 2)}px`,
                            background: p === 1 ? STRATEGY_COLORS[s] : "#e2e8f0",
                          }}
                        />
                        <span className="text-xs text-slate-500 mt-0.5">{(pct * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-slate-400 mt-2">総試合数: {total}</p>
    </div>
  );
}

// ----------------------------------------------------------------
// ページ本体
// ----------------------------------------------------------------

export default function StatsPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d: StatsResponse) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError("統計データの取得に失敗しました");
        setLoading(false);
      });
  }, []);

  const tips = data ? generateTips(data.strategyStats) : [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-slate-500 hover:text-slate-800 text-sm">← ゲームに戻る</Link>
        <h1 className="font-bold text-slate-800 text-lg">CPU シミュレーション 攻略情報</h1>
        {data && (
          <span className="ml-auto text-xs text-slate-400">
            {data.totalGames.toLocaleString()} 試合のデータ
          </span>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {loading && (
          <div className="text-center py-16 text-slate-400">データ読み込み中...</div>
        )}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
            {error}
            <p className="mt-1 text-xs">先に <code>npm run simulate</code> でデータを生成してください。</p>
          </div>
        )}

        {data && data.totalGames === 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800 text-sm">
            データがありません。ターミナルで <code className="font-mono bg-amber-100 px-1 rounded">npm run simulate</code> を実行してください。
          </div>
        )}

        {data && data.totalGames > 0 && (
          <>
            {/* 攻略ヒント */}
            <section>
              <h2 className="font-semibold text-slate-700 mb-3 text-base">攻略ヒント</h2>
              <div className="space-y-2">
                {tips.map((tip, i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-lg bg-white border border-slate-200 px-4 py-3 text-sm text-slate-700 shadow-sm"
                  >
                    <span className="shrink-0 text-amber-500 font-bold">{i + 1}.</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 勝率バー */}
            <section>
              <h2 className="font-semibold text-slate-700 mb-3 text-base">戦略別 勝率</h2>
              <div className="rounded-lg bg-white border border-slate-200 px-4 py-4 shadow-sm">
                <WinRateBar stats={data.strategyStats} />
              </div>
            </section>

            {/* 詳細テーブル */}
            <section>
              <h2 className="font-semibold text-slate-700 mb-3 text-base">詳細統計</h2>
              <div className="rounded-lg bg-white border border-slate-200 shadow-sm overflow-hidden">
                <PlacementTable stats={data.strategyStats} />
              </div>
            </section>

            {/* 順位分布 */}
            <section>
              <h2 className="font-semibold text-slate-700 mb-3 text-base">順位分布</h2>
              <div className="rounded-lg bg-white border border-slate-200 px-4 py-4 shadow-sm">
                <PlacementDistChart dist={data.placementDist} total={data.totalGames} />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
