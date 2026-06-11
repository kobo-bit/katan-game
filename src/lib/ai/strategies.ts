/**
 * 5種類のCPU戦略定義。
 * 各戦略は simpleAi のユーティリティを共有しつつ、
 * 初期配置スコア・建設優先度・交易目標を独自に調整する。
 */

import type { GameAction } from "@/lib/game/engine";
import { bestTradeRate } from "@/lib/game/engine";
import {
  calculateLongestRoad,
  canPlaceRoad,
  canPlaceSettlement,
  getPlayer,
  getVertex,
  hasResources,
} from "@/lib/game/selectors";
import {
  BUILDING_COST,
  RESOURCES,
  TERRAIN_RESOURCE,
  type GameState,
  type PlayerId,
  type Resource,
  type ResourceCount,
  type Vertex,
} from "@/lib/game/types";
import {
  BuildPlan,
  PIP_WEIGHT,
  chooseDiscard,
  chooseRobberTarget,
  chooseSetupRoad,
  chooseSetupSettlement,
  decideCpuAction,
  findBankTradePlan,
  findCityPlan,
  findDevCardPlan,
  findMonopolyTarget,
  findRoadPlan,
  findSettlementPlan,
  findYearOfPlentyTarget,
  pipScore,
  playableDevCardTypes,
  topByScore,
} from "@/lib/ai/simpleAi";

// ----------------------------------------------------------------
// 型定義
// ----------------------------------------------------------------

export type StrategyId = "balanced" | "cityRush" | "longestRoad" | "largestArmy" | "portTrader";

export const STRATEGY_NAMES: Record<StrategyId, string> = {
  balanced: "バランス型",
  cityRush: "都市特化型",
  longestRoad: "最長交易路型",
  largestArmy: "最大騎士力型",
  portTrader: "港交易型",
};

export interface StrategySpec {
  id: StrategyId;
  name: string;
  decide: (state: GameState, playerId: PlayerId) => GameAction | null;
}

// ----------------------------------------------------------------
// 共通ヘルパー: フェイズ共通処理 (setup / discard / robber / roll)
// ----------------------------------------------------------------

function commonPhaseAction(
  state: GameState,
  playerId: PlayerId,
  setupScore?: (state: GameState, v: Vertex) => number
): GameAction | null {
  const phase = state.phase;
  if (phase === "setup-settlement-1" || phase === "setup-settlement-2") {
    return { type: "BUILD_SETTLEMENT", playerId, vertexId: chooseSetupSettlement(state, playerId, setupScore) };
  }
  if (phase === "setup-road-1" || phase === "setup-road-2") {
    const anchor = state.setupPendingVertexId;
    if (!anchor) return null;
    return { type: "BUILD_ROAD", playerId, edgeId: chooseSetupRoad(state, playerId, anchor) };
  }
  if (phase === "discard") {
    return { type: "DISCARD", playerId, discard: chooseDiscard(getPlayer(state, playerId)) };
  }
  if (phase === "moveRobber") {
    const { hexId, targetPlayerId } = chooseRobberTarget(state, playerId);
    return { type: "MOVE_ROBBER", playerId, hexId, targetPlayerId };
  }
  if (phase === "roll") return { type: "ROLL_DICE", playerId };
  return null;
}

// ----------------------------------------------------------------
// 1. バランス型 (balanced) ── 既存の simpleAi をそのまま流用
// ----------------------------------------------------------------

const balanced: StrategySpec = {
  id: "balanced",
  name: STRATEGY_NAMES.balanced,
  decide: decideCpuAction,
};

// ----------------------------------------------------------------
// 2. 都市特化型 (cityRush)
//    - 初期配置: 鉱石・小麦タイルを最優先
//    - 建設: 都市 >> 発展カード >> 開拓地 >> 街道
//    - 交易: 常に鉱石・小麦を目指す
// ----------------------------------------------------------------

function cityRushScore(state: GameState, v: Vertex): number {
  let score = 0;
  for (const hexId of v.hexIds) {
    const hex = state.board.hexById[hexId];
    if (!hex.number) continue;
    const pip = PIP_WEIGHT[hex.number] ?? 0;
    const res = TERRAIN_RESOURCE[hex.terrain];
    // 鉱石・小麦に2倍ボーナス
    score += res === "ore" || res === "grain" ? pip * 2 : pip * 0.6;
  }
  return score;
}

const CITY_TRADE_GOALS: Partial<ResourceCount>[] = [
  { ore: 3, grain: 2 }, // 都市
  { ore: 1, wool: 1, grain: 1 }, // 発展カード
];

function cityRushDecide(state: GameState, playerId: PlayerId): GameAction | null {
  const common = commonPhaseAction(state, playerId, cityRushScore);
  if (common) return common;
  if (state.phase !== "main") return null;

  const player = getPlayer(state, playerId);

  // 騎士は引いたらすぐ使う (最大騎士力は狙わないが機動力として使う)
  if (!state.devCardPlayedThisTurn) {
    const playable = playableDevCardTypes(player);
    if (playable.includes("knight")) {
      const myVerts = new Set(state.board.vertices.filter((v) => v.building?.owner === playerId).map((v) => v.id));
      const robberOnMine = state.board.hexes
        .filter((h) => h.hasRobber)
        .some((h) => state.board.vertices.filter((v) => v.hexIds.includes(h.id)).some((v) => myVerts.has(v.id)));
      if (robberOnMine) return { type: "PLAY_KNIGHT", playerId };
    }
    if (playable.includes("yearOfPlenty")) {
      const t = findYearOfPlentyTarget(state, playerId);
      if (t) return { type: "PLAY_YEAR_OF_PLENTY", playerId, resources: t };
    }
  }

  if (state.freeRoadsRemaining > 0) {
    const rp = findRoadPlan(state, playerId);
    if (rp) return rp.action;
  }

  const plans: BuildPlan[] = [
    findCityPlan(state, playerId),
    findDevCardPlan(state, playerId) && { ...findDevCardPlan(state, playerId)!, priority: 85 },
    findSettlementPlan(state, playerId) && { ...findSettlementPlan(state, playerId)!, priority: 70 },
    findRoadPlan(state, playerId) && { ...findRoadPlan(state, playerId)!, priority: 20 },
  ].filter((p): p is BuildPlan => p !== null);

  plans.sort((a, b) => b.priority - a.priority);
  if (plans.length > 0) return plans[0].action;

  return findBankTradePlan(state, playerId, CITY_TRADE_GOALS);
}

const cityRush: StrategySpec = { id: "cityRush", name: STRATEGY_NAMES.cityRush, decide: cityRushDecide };

// ----------------------------------------------------------------
// 3. 最長交易路型 (longestRoad)
//    - 初期配置: 木材・レンガタイルを最優先、道が伸ばしやすい場所
//    - 建設: 街道 >> 開拓地 >> 都市 >> 発展カード
//    - 交易: 木材・レンガを優先調達
// ----------------------------------------------------------------

function longestRoadScore(state: GameState, v: Vertex): number {
  let score = 0;
  for (const hexId of v.hexIds) {
    const hex = state.board.hexById[hexId];
    if (!hex.number) continue;
    const pip = PIP_WEIGHT[hex.number] ?? 0;
    const res = TERRAIN_RESOURCE[hex.terrain];
    score += res === "wood" || res === "brick" ? pip * 2 : pip * 0.7;
  }
  // 隣接できる辺が多い頂点(交差点)を好む
  score += v.edgeIds.length * 0.5;
  return score;
}

const ROAD_TRADE_GOALS: Partial<ResourceCount>[] = [
  { wood: 1, brick: 1 }, // 街道
  { wood: 1, brick: 1, wool: 1, grain: 1 }, // 開拓地
];

function longestRoadDecide(state: GameState, playerId: PlayerId): GameAction | null {
  const common = commonPhaseAction(state, playerId, longestRoadScore);
  if (common) return common;
  if (state.phase !== "main") return null;

  const player = getPlayer(state, playerId);

  if (!state.devCardPlayedThisTurn) {
    const playable = playableDevCardTypes(player);
    if (playable.includes("roadBuilding") && player.roadsLeft >= 2) {
      const hasSpot = state.board.edges.some((e) => canPlaceRoad(state, playerId, e.id));
      if (hasSpot) return { type: "PLAY_ROAD_BUILDING", playerId };
    }
    if (playable.includes("yearOfPlenty")) {
      const t = findYearOfPlentyTarget(state, playerId);
      if (t) return { type: "PLAY_YEAR_OF_PLENTY", playerId, resources: t };
    }
  }

  if (state.freeRoadsRemaining > 0) {
    const rp = findRoadPlan(state, playerId);
    if (rp) return rp.action;
  }

  // 街道が最長交易路まで残り3本以内なら積極的に建設
  const myRoadLen = calculateLongestRoad(state, playerId);
  const longestInGame = Math.max(...state.players.map((p) => calculateLongestRoad(state, p.id)));
  const needRoadPush = myRoadLen < 5 || myRoadLen < longestInGame;

  const roadPlan = findRoadPlan(state, playerId);
  const cityPlan = findCityPlan(state, playerId);
  const settlementPlan = findSettlementPlan(state, playerId);

  const plans: BuildPlan[] = [
    roadPlan && { ...roadPlan, priority: needRoadPush ? 95 : 50 },
    settlementPlan && { ...settlementPlan, priority: 80 },
    cityPlan && { ...cityPlan, priority: 40 },
    findDevCardPlan(state, playerId) && { ...findDevCardPlan(state, playerId)!, priority: 20 },
  ].filter((p): p is BuildPlan => p !== null);

  plans.sort((a, b) => b.priority - a.priority);
  if (plans.length > 0) return plans[0].action;

  return findBankTradePlan(state, playerId, ROAD_TRADE_GOALS);
}

const longestRoad: StrategySpec = { id: "longestRoad", name: STRATEGY_NAMES.longestRoad, decide: longestRoadDecide };

// ----------------------------------------------------------------
// 4. 最大騎士力型 (largestArmy)
//    - 初期配置: 資源の多様性を重視 (発展カード購入に必要な鉱石・羊毛・小麦)
//    - 建設: 発展カード購入 >> 騎士プレイ >> 開拓地 >> 都市
//    - 交易: 発展カード素材 (鉱石・羊毛・小麦) を優先
// ----------------------------------------------------------------

function largestArmyScore(state: GameState, v: Vertex): number {
  let score = 0;
  const resources = new Set<Resource>();
  for (const hexId of v.hexIds) {
    const hex = state.board.hexById[hexId];
    if (!hex.number) continue;
    const pip = PIP_WEIGHT[hex.number] ?? 0;
    const res = TERRAIN_RESOURCE[hex.terrain];
    if (res) resources.add(res);
    score += res === "ore" || res === "wool" || res === "grain" ? pip * 1.8 : pip * 0.5;
  }
  score += resources.size * 2; // 多様性に大きなボーナス
  return score;
}

const ARMY_TRADE_GOALS: Partial<ResourceCount>[] = [
  { ore: 1, wool: 1, grain: 1 }, // 発展カード
  { wood: 1, brick: 1, wool: 1, grain: 1 }, // 開拓地
];

function largestArmyDecide(state: GameState, playerId: PlayerId): GameAction | null {
  const common = commonPhaseAction(state, playerId, largestArmyScore);
  if (common) return common;
  if (state.phase !== "main") return null;

  const player = getPlayer(state, playerId);

  // 騎士は積極的に使う (最大騎士力を狙う)
  if (!state.devCardPlayedThisTurn) {
    const playable = playableDevCardTypes(player);
    const canGetLargest = player.knightsPlayed + (playable.filter((c) => c === "knight").length) >= 3;
    if (playable.includes("knight") && (canGetLargest || state.largestArmyOwner !== playerId)) {
      return { type: "PLAY_KNIGHT", playerId };
    }
    if (playable.includes("yearOfPlenty")) {
      const t = findYearOfPlentyTarget(state, playerId);
      if (t) return { type: "PLAY_YEAR_OF_PLENTY", playerId, resources: t };
    }
    if (playable.includes("monopoly")) {
      const t = findMonopolyTarget(state, playerId);
      if (t) return { type: "PLAY_MONOPOLY", playerId, resource: t };
    }
  }

  if (state.freeRoadsRemaining > 0) {
    const rp = findRoadPlan(state, playerId);
    if (rp) return rp.action;
  }

  const plans: BuildPlan[] = [
    findDevCardPlan(state, playerId) && { ...findDevCardPlan(state, playerId)!, priority: 100 },
    findSettlementPlan(state, playerId) && { ...findSettlementPlan(state, playerId)!, priority: 75 },
    findCityPlan(state, playerId) && { ...findCityPlan(state, playerId)!, priority: 60 },
    findRoadPlan(state, playerId) && { ...findRoadPlan(state, playerId)!, priority: 30 },
  ].filter((p): p is BuildPlan => p !== null);

  plans.sort((a, b) => b.priority - a.priority);
  if (plans.length > 0) return plans[0].action;

  return findBankTradePlan(state, playerId, ARMY_TRADE_GOALS);
}

const largestArmy: StrategySpec = { id: "largestArmy", name: STRATEGY_NAMES.largestArmy, decide: largestArmyDecide };

// ----------------------------------------------------------------
// 5. 港交易型 (portTrader)
//    - 初期配置: 2:1港の隣接頂点を強く優先
//    - 建設: 開拓地 (港確保) >> 都市 >> 街道 >> 発展カード
//    - 交易: 余剰資源を積極的に交換して必要なものを確保
// ----------------------------------------------------------------

function portTraderScore(state: GameState, v: Vertex): number {
  let base = pipScore(state, v);
  if (v.port === "generic") base += 5;
  else if (v.port !== null) base += 10; // 2:1港は最優先
  return base;
}

function portTraderTrade(state: GameState, playerId: PlayerId): GameAction | null {
  const player = getPlayer(state, playerId);
  // 4枚以上の余剰資源があれば、最も多い資源を必要なものに交換
  const goals: Partial<ResourceCount>[] = [
    { wood: 1, brick: 1, wool: 1, grain: 1 },
    { ore: 3, grain: 2 },
    { ore: 1, wool: 1, grain: 1 },
  ];
  for (const goal of goals) {
    const missing = (Object.entries(goal) as [Resource, number][]).filter(
      ([r, amt]) => player.resources[r] < amt
    );
    if (missing.length === 0) continue;
    for (const [wantResource] of missing) {
      const sorted = [...RESOURCES]
        .filter((r) => r !== wantResource)
        .sort((a, b) => player.resources[b] - player.resources[a]);
      for (const giveResource of sorted) {
        const rate = bestTradeRate(state, playerId, giveResource);
        if (player.resources[giveResource] >= rate && state.bankResources[wantResource] > 0) {
          return {
            type: "BANK_TRADE",
            playerId,
            give: { [giveResource]: rate } as Partial<ResourceCount>,
            want: { [wantResource]: 1 } as Partial<ResourceCount>,
          };
        }
      }
    }
  }
  return null;
}

function portTraderDecide(state: GameState, playerId: PlayerId): GameAction | null {
  const common = commonPhaseAction(state, playerId, portTraderScore);
  if (common) return common;
  if (state.phase !== "main") return null;

  const player = getPlayer(state, playerId);

  if (!state.devCardPlayedThisTurn) {
    const playable = playableDevCardTypes(player);
    if (playable.includes("yearOfPlenty")) {
      const t = findYearOfPlentyTarget(state, playerId);
      if (t) return { type: "PLAY_YEAR_OF_PLENTY", playerId, resources: t };
    }
    if (playable.includes("monopoly")) {
      const t = findMonopolyTarget(state, playerId);
      if (t) return { type: "PLAY_MONOPOLY", playerId, resource: t };
    }
  }

  if (state.freeRoadsRemaining > 0) {
    const rp = findRoadPlan(state, playerId);
    if (rp) return rp.action;
  }

  // 港確保のために開拓地を優先
  const settlementNearPort = (() => {
    if (!hasResources(player, BUILDING_COST.settlement)) return null;
    const candidates = state.board.vertices.filter((v) => {
      if (!canPlaceSettlement(state, playerId, v.id, false)) return false;
      // 隣接する辺の先に港頂点があるか確認
      for (const edgeId of v.edgeIds) {
        const edge = state.board.edgeById[edgeId];
        const otherId = edge.vertexIds[0] === v.id ? edge.vertexIds[1] : edge.vertexIds[0];
        const other = getVertex(state, otherId);
        if (other.port) return true;
      }
      return v.port !== null;
    });
    if (candidates.length === 0) return null;
    const best = topByScore(candidates, (v) => portTraderScore(state, v), 1)[0];
    return best ? ({ action: { type: "BUILD_SETTLEMENT", playerId, vertexId: best.id }, priority: 95 } as BuildPlan) : null;
  })();

  const plans: BuildPlan[] = [
    settlementNearPort,
    findCityPlan(state, playerId) && { ...findCityPlan(state, playerId)!, priority: 85 },
    findSettlementPlan(state, playerId) && { ...findSettlementPlan(state, playerId)!, priority: 70 },
    findRoadPlan(state, playerId) && { ...findRoadPlan(state, playerId)!, priority: 40 },
    findDevCardPlan(state, playerId) && { ...findDevCardPlan(state, playerId)!, priority: 25 },
  ].filter((p): p is BuildPlan => p !== null);

  plans.sort((a, b) => b.priority - a.priority);
  if (plans.length > 0) return plans[0].action;

  return portTraderTrade(state, playerId) ?? findBankTradePlan(state, playerId);
}

const portTrader: StrategySpec = { id: "portTrader", name: STRATEGY_NAMES.portTrader, decide: portTraderDecide };

// ----------------------------------------------------------------
// レジストリ
// ----------------------------------------------------------------

export const STRATEGIES: Record<StrategyId, StrategySpec> = {
  balanced,
  cityRush,
  longestRoad,
  largestArmy,
  portTrader,
};

export function getStrategy(id: StrategyId): StrategySpec {
  return STRATEGIES[id];
}

