/**
 * CPU vs CPU シミュレーター
 *
 * 使い方:
 *   npm run simulate               # デフォルト 100 試合
 *   npm run simulate -- --games 500
 */

import { applyAction } from "../src/lib/game/engine";
import { totalVictoryPoints } from "../src/lib/game/selectors";
import { createGame } from "../src/lib/game/setup";
import { STRATEGIES, STRATEGY_NAMES, type StrategyId } from "../src/lib/ai/strategies";
import { saveGame, queryStrategyStats, type PlayerResult } from "../src/lib/db/gameDb";

// ----------------------------------------------------------------
// 引数パース
// ----------------------------------------------------------------

const args = process.argv.slice(2);
const gamesArg = args.indexOf("--games");
const TOTAL_GAMES = gamesArg !== -1 ? parseInt(args[gamesArg + 1] ?? "100", 10) : 100;
const MAX_TURNS = 300;      // ゲームターン数上限 (END_TURN 回数)
const MAX_ITERS = 50_000;  // 無限ループ防止: フェイズ処理回数上限

const STRATEGY_IDS: StrategyId[] = ["balanced", "cityRush", "longestRoad", "largestArmy", "portTrader"];

// ----------------------------------------------------------------
// 1試合シミュレート
// ----------------------------------------------------------------

function simulateOne(): { turnCount: number; players: PlayerResult[] } | null {
  // 4人ゲーム: 各戦略からランダム4種を選択
  const shuffled = [...STRATEGY_IDS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 4) as StrategyId[];

  const configs = selected.map((s, i) => ({
    name: `${STRATEGY_NAMES[s]}${i + 1}`,
    kind: "cpu" as const,
  }));

  let state = createGame(configs);

  // gameTurns = END_TURN の回数 (4人 * gameTurns がゲーム全体の手数)
  let gameTurns = 0;
  let iters = 0;

  while (!state.winner && gameTurns < MAX_TURNS && iters < MAX_ITERS) {
    iters++;

    // 現在アクションを取るべきプレイヤーを特定
    let actingId: string | null = null;
    const phase = state.phase;
    if (
      phase === "setup-settlement-1" ||
      phase === "setup-road-1" ||
      phase === "setup-settlement-2" ||
      phase === "setup-road-2"
    ) {
      actingId = state.setupOrder[state.setupIndex] ?? null;
    } else if (phase === "discard") {
      actingId = state.playersToDiscard[0] ?? null;
    } else if (phase === "moveRobber") {
      actingId = state.robberMovedBy;
    } else if (phase !== "gameOver") {
      actingId = state.players[state.currentPlayerIndex].id;
    }

    if (!actingId) break;

    const playerIndex = state.players.findIndex((p) => p.id === actingId);
    if (playerIndex < 0) break;

    const strategyId = selected[playerIndex];
    const strategy = STRATEGIES[strategyId];
    const action = strategy.decide(state, actingId);

    if (!action) {
      const result = applyAction(state, { type: "END_TURN", playerId: actingId });
      state = result.state;
      gameTurns++;
    } else {
      const result = applyAction(state, action);
      if (!result.ok) {
        const endResult = applyAction(state, { type: "END_TURN", playerId: actingId });
        state = endResult.state;
        gameTurns++;
      } else {
        state = result.state;
      }
    }
  }

  if (!state.winner) return null; // タイムアウト

  // 最終 VP でソートして順位付け
  const vpList = selected.map((s, i) => ({
    strategy: s,
    idx: i,
    vp: totalVictoryPoints(state, state.players[i].id),
    player: state.players[i],
  }));
  vpList.sort((a, b) => b.vp - a.vp);

  const players: PlayerResult[] = vpList.map((item, rank) => {
    const p = item.player;
    const settlements = state.board.vertices.filter(
      (v) => v.building?.owner === p.id && v.building.type === "settlement"
    ).length;
    const cities = state.board.vertices.filter(
      (v) => v.building?.owner === p.id && v.building.type === "city"
    ).length;
    const roads = state.board.edges.filter((e) => e.road?.owner === p.id).length;

    return {
      strategy: item.strategy,
      placement: rank + 1,
      vp: item.vp,
      settlements,
      cities,
      roads,
      devCards: p.devCards.length,
      knights: p.knightsPlayed,
    };
  });

  return { turnCount: gameTurns, players };
}

// ----------------------------------------------------------------
// メインループ
// ----------------------------------------------------------------

console.log(`▶ シミュレーション開始: ${TOTAL_GAMES} 試合`);

let succeeded = 0;
let timeouts = 0;

for (let i = 0; i < TOTAL_GAMES; i++) {
  const result = simulateOne();
  if (result) {
    saveGame(result);
    succeeded++;
  } else {
    timeouts++;
  }

  if ((i + 1) % 10 === 0) {
    process.stdout.write(`\r  進捗: ${i + 1}/${TOTAL_GAMES} (タイムアウト: ${timeouts})`);
  }
}

console.log(`\n✔ 完了: ${succeeded} 試合保存, ${timeouts} タイムアウト`);

// ----------------------------------------------------------------
// 結果サマリー出力
// ----------------------------------------------------------------

const stats = queryStrategyStats();
console.log("\n=== 戦略別成績 ===");
console.log(
  ["戦略", "試合数", "勝利", "勝率", "平均VP", "平均ターン"]
    .map((h) => h.padEnd(14))
    .join("")
);
for (const s of stats) {
  console.log(
    [
      STRATEGY_NAMES[s.strategy] ?? s.strategy,
      String(s.games),
      String(s.wins),
      `${(s.winRate * 100).toFixed(1)}%`,
      s.avgVp.toFixed(1),
      s.avgTurns.toFixed(1),
    ]
      .map((v) => v.padEnd(14))
      .join("")
  );
}
