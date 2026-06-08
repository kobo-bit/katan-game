// ルールベースの簡易CPUプレイヤー
// 現在のゲーム状態を見て、次に取るべき1アクションを返す。
// UI側はこれを繰り返し呼び出してターンを進行させる。

import type { GameAction } from "@/lib/game/engine";
import { bestTradeRate } from "@/lib/game/engine";
import {
  calculateLongestRoad,
  canPlaceRoad,
  canPlaceSettlement,
  canUpgradeToCity,
  getEdge,
  getPlayer,
  getVertex,
  hasResources,
  playersAdjacentToHex,
  resourceTotal,
  verticesAdjacentToHex,
} from "@/lib/game/selectors";
import {
  BUILDING_COST,
  RESOURCES,
  TERRAIN_RESOURCE,
  type DevCardType,
  type GameState,
  type Player,
  type PlayerId,
  type Resource,
  type ResourceCount,
  type Vertex,
} from "@/lib/game/types";

const PIP_WEIGHT: Record<number, number> = {
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  8: 5,
  9: 4,
  10: 3,
  11: 2,
  12: 1,
};

function pipScore(state: GameState, vertex: Vertex): number {
  let score = 0;
  const resources = new Set<Resource>();
  for (const hexId of vertex.hexIds) {
    const hex = state.board.hexById[hexId];
    if (hex.number === null) continue;
    score += PIP_WEIGHT[hex.number] ?? 0;
    const resource = TERRAIN_RESOURCE[hex.terrain];
    if (resource) resources.add(resource);
  }
  // 資源の多様性にボーナス
  score += resources.size * 1.5;
  if (vertex.port) score += 1.5;
  return score;
}

function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function topByScore<T>(items: T[], score: (item: T) => number, take: number): T[] {
  return [...items].sort((a, b) => score(b) - score(a)).slice(0, take);
}

// === 初期配置 ===

function chooseSetupSettlement(state: GameState, playerId: PlayerId): string {
  const candidates = state.board.vertices.filter((v) => canPlaceSettlement(state, playerId, v.id, true));
  const best = topByScore(candidates, (v) => pipScore(state, v), 3);
  return (pickRandom(best) ?? candidates[0]).id;
}

function chooseSetupRoad(state: GameState, playerId: PlayerId, anchorVertexId: string): string {
  const anchor = getVertex(state, anchorVertexId);
  const candidates = anchor.edgeIds.filter((edgeId) =>
    canPlaceRoad(state, playerId, edgeId, { isSetup: true, setupAnchorVertexId: anchorVertexId })
  );

  const score = (edgeId: string) => {
    const edge = getEdge(state, edgeId);
    const farVertexId = edge.vertexIds[0] === anchorVertexId ? edge.vertexIds[1] : edge.vertexIds[0];
    const farVertex = getVertex(state, farVertexId);
    return pipScore(state, farVertex);
  };

  const best = topByScore(candidates, score, 2);
  return pickRandom(best) ?? candidates[0];
}

// === 捨て札 ===

function chooseDiscard(player: Player): Partial<ResourceCount> {
  const total = resourceTotal(player);
  const required = Math.floor(total / 2);
  const discard: Partial<ResourceCount> = {};
  let remaining = required;

  // 枚数の多い資源から優先して捨てる(手札のバランスを保つ)
  const sorted = [...RESOURCES].sort((a, b) => player.resources[b] - player.resources[a]);
  let idx = 0;
  while (remaining > 0) {
    const resource = sorted[idx % sorted.length];
    const already = discard[resource] ?? 0;
    if (already < player.resources[resource]) {
      discard[resource] = already + 1;
      remaining -= 1;
    }
    idx += 1;
    if (idx > 1000) break;
  }
  return discard;
}

// === 盗賊 ===

function chooseRobberTarget(state: GameState, playerId: PlayerId): { hexId: string; targetPlayerId: PlayerId | null } {
  const me = getPlayer(state, playerId);
  const myVertexIds = new Set(
    state.board.vertices.filter((v) => v.building?.owner === playerId).map((v) => v.id)
  );

  const candidates = state.board.hexes.filter((h) => !h.hasRobber);
  const scored = candidates.map((hex) => {
    const adjacentVertices = verticesAdjacentToHex(state, hex.id);
    const touchesMine = adjacentVertices.some((v) => myVertexIds.has(v.id));
    const opponents = playersAdjacentToHex(state, hex.id, playerId);
    let score = (hex.number !== null ? PIP_WEIGHT[hex.number] ?? 0 : 0);
    if (touchesMine) score -= 8; // 自分のタイルは避ける
    score += opponents.length * 2;
    // 手札が多い相手を狙うと効果的
    let bestOpponentCards = 0;
    for (const oppId of opponents) {
      bestOpponentCards = Math.max(bestOpponentCards, resourceTotal(getPlayer(state, oppId)));
    }
    score += bestOpponentCards * 0.5;
    return { hex, score, opponents };
  });

  scored.sort((a, b) => b.score - a.score);
  const choice = scored[0] ?? scored[scored.length - 1];

  let targetPlayerId: PlayerId | null = null;
  if (choice.opponents.length > 0) {
    let best = choice.opponents[0];
    let bestCards = -1;
    for (const oppId of choice.opponents) {
      const cards = resourceTotal(getPlayer(state, oppId));
      if (cards > bestCards) {
        bestCards = cards;
        best = oppId;
      }
    }
    targetPlayerId = best;
  }

  void me;
  return { hexId: choice.hex.id, targetPlayerId };
}

// === メインフェイズの行動選択 ===

interface BuildPlan {
  action: GameAction;
  priority: number;
}

function findCityPlan(state: GameState, playerId: PlayerId): BuildPlan | null {
  const player = getPlayer(state, playerId);
  if (player.citiesLeft <= 0 || !hasResources(player, BUILDING_COST.city)) return null;
  const vertex = state.board.vertices.find((v) => canUpgradeToCity(state, playerId, v.id));
  if (!vertex) return null;
  return { action: { type: "BUILD_CITY", playerId, vertexId: vertex.id }, priority: 100 };
}

function findSettlementPlan(state: GameState, playerId: PlayerId): BuildPlan | null {
  const player = getPlayer(state, playerId);
  if (player.settlementsLeft <= 0 || !hasResources(player, BUILDING_COST.settlement)) return null;
  const candidates = state.board.vertices.filter((v) => canPlaceSettlement(state, playerId, v.id, false));
  if (candidates.length === 0) return null;
  const best = topByScore(candidates, (v) => pipScore(state, v), 1)[0];
  return { action: { type: "BUILD_SETTLEMENT", playerId, vertexId: best.id }, priority: 90 };
}

function findRoadPlan(state: GameState, playerId: PlayerId): BuildPlan | null {
  const player = getPlayer(state, playerId);
  if (player.roadsLeft <= 0) return null;
  if (state.freeRoadsRemaining <= 0 && !hasResources(player, BUILDING_COST.road)) return null;

  const candidates = state.board.edges.filter((e) => canPlaceRoad(state, playerId, e.id));
  if (candidates.length === 0) return null;

  // 開拓に繋がりそうな(まだ建物のない遠い頂点のスコアが高い)道を優先する
  const score = (edge: { vertexIds: [string, string] }) => {
    let best = 0;
    for (const vId of edge.vertexIds) {
      const v = getVertex(state, vId);
      if (v.building) continue;
      best = Math.max(best, pipScore(state, v));
    }
    return best;
  };

  const ranked = topByScore(candidates, score, 3);
  const choice = pickRandom(ranked) ?? candidates[0];
  const free = state.freeRoadsRemaining > 0;
  return { action: { type: "BUILD_ROAD", playerId, edgeId: choice.id }, priority: free ? 95 : 40 };
}

function findDevCardPlan(state: GameState, playerId: PlayerId): BuildPlan | null {
  const player = getPlayer(state, playerId);
  if (state.bankDevCards.length === 0 || !hasResources(player, BUILDING_COST.devCard)) return null;
  return { action: { type: "BUY_DEV_CARD", playerId }, priority: 30 };
}

function findBankTradePlan(state: GameState, playerId: PlayerId): GameAction | null {
  const player = getPlayer(state, playerId);

  // 目標: 開拓地 or 都市が建てられるように、不足している資源を交換で確保する
  const goals: Partial<ResourceCount>[] = [BUILDING_COST.settlement, BUILDING_COST.city, BUILDING_COST.road];
  for (const goal of goals) {
    const missing = (Object.entries(goal) as [Resource, number][]).filter(
      ([resource, amount]) => player.resources[resource] < amount
    );
    if (missing.length !== 1) continue; // 1種類だけ不足している場合のみ交易を検討
    const [wantResource, wantAmount] = missing[0];
    const need = wantAmount - player.resources[wantResource];
    if (need <= 0) continue;

    for (const giveResource of RESOURCES) {
      if (giveResource === wantResource) continue;
      const rate = bestTradeRate(state, playerId, giveResource);
      const surplus = player.resources[giveResource] - (goal[giveResource] ?? 0);
      if (surplus >= rate && state.bankResources[wantResource] > 0) {
        return {
          type: "BANK_TRADE",
          playerId,
          give: { [giveResource]: rate } as Partial<ResourceCount>,
          want: { [wantResource]: 1 } as Partial<ResourceCount>,
        };
      }
    }
  }
  return null;
}

// 騎士カードを使うべきか判定 (盗賊が自陣にある, あるいは最大騎士力を狙える場合)
function shouldPlayKnight(state: GameState, playerId: PlayerId): boolean {
  const player = getPlayer(state, playerId);
  const totalKnights = player.devCards.filter((c) => c === "knight").length;
  const newKnights = player.newDevCards.filter((c) => c === "knight").length;
  if (totalKnights <= newKnights) return false;

  const myVertexIds = new Set(state.board.vertices.filter((v) => v.building?.owner === playerId).map((v) => v.id));
  const robberHex = state.board.hexes.find((h) => h.hasRobber);
  const robberOnMine = robberHex ? verticesAdjacentToHex(state, robberHex.id).some((v) => myVertexIds.has(v.id)) : false;

  if (robberOnMine) return true;

  // 最大騎士力に手が届きそうなら積極的に使う
  if (player.knightsPlayed + 1 >= 3 && state.largestArmyOwner !== playerId) return true;

  return false;
}

function playableDevCardTypes(player: Player): DevCardType[] {
  const types: DevCardType[] = [];
  for (const type of ["knight", "roadBuilding", "yearOfPlenty", "monopoly"] as DevCardType[]) {
    const total = player.devCards.filter((c) => c === type).length;
    const fresh = player.newDevCards.filter((c) => c === type).length;
    if (total > fresh) types.push(type);
  }
  return types;
}

function findMonopolyTarget(state: GameState, playerId: PlayerId): Resource | null {
  const me = getPlayer(state, playerId);
  let bestResource: Resource | null = null;
  let bestTotal = 0;
  for (const resource of RESOURCES) {
    if (me.resources[resource] >= 3) continue; // 既に十分持っている資源は狙わない
    let total = 0;
    for (const p of state.players) {
      if (p.id === playerId) continue;
      total += p.resources[resource];
    }
    if (total > bestTotal) {
      bestTotal = total;
      bestResource = resource;
    }
  }
  return bestTotal >= 3 ? bestResource : null;
}

function findYearOfPlentyTarget(state: GameState, playerId: PlayerId): [Resource, Resource] | null {
  const player = getPlayer(state, playerId);
  const goals: Partial<ResourceCount>[] = [BUILDING_COST.city, BUILDING_COST.settlement];
  for (const goal of goals) {
    const missing: Resource[] = [];
    for (const [resource, amount] of Object.entries(goal) as [Resource, number][]) {
      const lack = amount - player.resources[resource];
      for (let i = 0; i < lack; i++) missing.push(resource);
    }
    if (missing.length === 0) continue;
    if (missing.length === 1) return [missing[0], missing[0]];
    if (missing.length >= 2) return [missing[0], missing[1]];
  }
  return null;
}

/**
 * 現在の状態に対して CPU が取るべき1アクションを返す。
 * null を返した場合はターン終了 (END_TURN) を意味する。
 */
export function decideCpuAction(state: GameState, playerId: PlayerId): GameAction | null {
  const phase = state.phase;

  if (phase === "setup-settlement-1" || phase === "setup-settlement-2") {
    return { type: "BUILD_SETTLEMENT", playerId, vertexId: chooseSetupSettlement(state, playerId) };
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
  if (phase === "roll") {
    return { type: "ROLL_DICE", playerId };
  }
  if (phase !== "main") return null;

  const player = getPlayer(state, playerId);

  // 騎士を使うべきタイミングなら使う
  if (!state.devCardPlayedThisTurn && shouldPlayKnight(state, playerId)) {
    return { type: "PLAY_KNIGHT", playerId };
  }

  // 進歩カードを有効活用できそうなら使う
  if (!state.devCardPlayedThisTurn) {
    const playable = playableDevCardTypes(player);
    if (playable.includes("yearOfPlenty")) {
      const target = findYearOfPlentyTarget(state, playerId);
      if (target) return { type: "PLAY_YEAR_OF_PLENTY", playerId, resources: target };
    }
    if (playable.includes("monopoly")) {
      const target = findMonopolyTarget(state, playerId);
      if (target) return { type: "PLAY_MONOPOLY", playerId, resource: target };
    }
    if (playable.includes("roadBuilding") && player.roadsLeft >= 2) {
      const hasSpot = state.board.edges.some((e) => canPlaceRoad(state, playerId, e.id));
      if (hasSpot) return { type: "PLAY_ROAD_BUILDING", playerId };
    }
  }

  // 無料の街道が残っていれば優先して使う
  if (state.freeRoadsRemaining > 0) {
    const roadPlan = findRoadPlan(state, playerId);
    if (roadPlan) return roadPlan.action;
  }

  const plans = [findCityPlan(state, playerId), findSettlementPlan(state, playerId), findRoadPlan(state, playerId), findDevCardPlan(state, playerId)].filter(
    (p): p is BuildPlan => p !== null
  );

  if (plans.length > 0) {
    plans.sort((a, b) => b.priority - a.priority);
    return plans[0].action;
  }

  // 建設できない場合は、目標達成のために銀行と交易してみる
  const trade = findBankTradePlan(state, playerId);
  if (trade) return trade;

  return null; // これ以上できることがなければターン終了
}

// 開発時の検証用 (現在の最長交易路長を概算したいときなどに利用)
export function debugLongestRoad(state: GameState, playerId: PlayerId): number {
  return calculateLongestRoad(state, playerId);
}
