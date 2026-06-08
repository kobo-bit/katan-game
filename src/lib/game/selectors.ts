// ゲーム状態に対する派生情報の計算 (勝利点, 配置可否, 最長交易路 など)

import type {
  Edge,
  GameState,
  Player,
  PlayerId,
  ResourceCount,
  Vertex,
} from "./types";
import { VICTORY_POINTS_TO_WIN } from "./types";

export function getPlayer(state: GameState, playerId: PlayerId): Player {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`player not found: ${playerId}`);
  return player;
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

export function resourceTotal(player: Player): number {
  return Object.values(player.resources).reduce((a, b) => a + b, 0);
}

export function hasResources(player: Player, cost: Partial<ResourceCount>): boolean {
  for (const [resource, amount] of Object.entries(cost) as [keyof ResourceCount, number][]) {
    if ((player.resources[resource] ?? 0) < amount) return false;
  }
  return true;
}

// 公開されている勝利点 (騎士カードや特別称号など、隠れた勝利点カードを含まない)
export function publicVictoryPoints(state: GameState, playerId: PlayerId): number {
  return computeVictoryPoints(state, playerId, false);
}

// 隠し勝利点カードも含めた合計 (勝敗判定用)
export function totalVictoryPoints(state: GameState, playerId: PlayerId): number {
  return computeVictoryPoints(state, playerId, true);
}

function computeVictoryPoints(state: GameState, playerId: PlayerId, includeHidden: boolean): number {
  let points = 0;
  for (const vertex of state.board.vertices) {
    if (vertex.building?.owner !== playerId) continue;
    points += vertex.building.type === "city" ? 2 : 1;
  }
  if (state.longestRoadOwner === playerId) points += 2;
  if (state.largestArmyOwner === playerId) points += 2;
  if (includeHidden) {
    const player = getPlayer(state, playerId);
    points += player.devCards.filter((c) => c === "victoryPoint").length;
  }
  return points;
}

export function checkWinner(state: GameState, playerId: PlayerId): boolean {
  return totalVictoryPoints(state, playerId) >= VICTORY_POINTS_TO_WIN;
}

export function getVertex(state: GameState, vertexId: string): Vertex {
  const vertex = state.board.vertexById[vertexId];
  if (!vertex) throw new Error(`vertex not found: ${vertexId}`);
  return vertex;
}

export function getEdge(state: GameState, edgeId: string): Edge {
  const edge = state.board.edgeById[edgeId];
  if (!edge) throw new Error(`edge not found: ${edgeId}`);
  return edge;
}

// 開拓地の距離ルール: 隣接する頂点に建物があってはならない
export function violatesDistanceRule(state: GameState, vertexId: string): boolean {
  const vertex = getVertex(state, vertexId);
  if (vertex.building) return true;
  for (const adjId of vertex.adjacentVertexIds) {
    if (getVertex(state, adjId).building) return true;
  }
  return false;
}

// 指定プレイヤーの街道網が、ある頂点に接続しているか
function vertexConnectedToPlayerNetwork(state: GameState, playerId: PlayerId, vertexId: string): boolean {
  const vertex = getVertex(state, vertexId);
  if (vertex.building?.owner === playerId) return true;
  for (const edgeId of vertex.edgeIds) {
    const edge = getEdge(state, edgeId);
    if (edge.road?.owner === playerId) return true;
  }
  return false;
}

export function canPlaceSettlement(
  state: GameState,
  playerId: PlayerId,
  vertexId: string,
  isSetup: boolean
): boolean {
  if (violatesDistanceRule(state, vertexId)) return false;
  if (isSetup) return true;
  return vertexConnectedToPlayerNetwork(state, playerId, vertexId);
}

export function canPlaceRoad(
  state: GameState,
  playerId: PlayerId,
  edgeId: string,
  options?: { isSetup?: boolean; setupAnchorVertexId?: string | null }
): boolean {
  const edge = getEdge(state, edgeId);
  if (edge.road) return false;

  if (options?.isSetup) {
    const anchor = options.setupAnchorVertexId;
    return !!anchor && (edge.vertexIds[0] === anchor || edge.vertexIds[1] === anchor);
  }

  for (const vId of edge.vertexIds) {
    const vertex = getVertex(state, vId);
    // 自分の建物がある頂点からは常に接続可能
    if (vertex.building?.owner === playerId) return true;
    // 敵の建物がある頂点は通過できないが、そこに自分の道がもう無い限り起点にはできる
    if (vertex.building && vertex.building.owner !== playerId) continue;
    for (const adjEdgeId of vertex.edgeIds) {
      if (adjEdgeId === edgeId) continue;
      const adjEdge = getEdge(state, adjEdgeId);
      if (adjEdge.road?.owner === playerId) return true;
    }
  }
  return false;
}

export function canUpgradeToCity(state: GameState, playerId: PlayerId, vertexId: string): boolean {
  const vertex = getVertex(state, vertexId);
  return vertex.building?.owner === playerId && vertex.building.type === "settlement";
}

// プレイヤーの最長交易路 (連続した道の最大本数) を計算する
export function calculateLongestRoad(state: GameState, playerId: PlayerId): number {
  const ownedEdges = state.board.edges.filter((e) => e.road?.owner === playerId);
  if (ownedEdges.length === 0) return 0;

  const ownedEdgeIds = new Set(ownedEdges.map((e) => e.id));

  // 頂点 -> 自分の道で繋がっている隣接辺のリスト
  const vertexEdges = new Map<string, string[]>();
  for (const edge of ownedEdges) {
    for (const vId of edge.vertexIds) {
      if (!vertexEdges.has(vId)) vertexEdges.set(vId, []);
      vertexEdges.get(vId)!.push(edge.id);
    }
  }

  let best = 0;

  function dfs(vertexId: string, visitedEdges: Set<string>): void {
    best = Math.max(best, visitedEdges.size);
    const vertex = getVertex(state, vertexId);
    // 他プレイヤーの建物がある頂点はそこで経路が分断される
    if (vertex.building && vertex.building.owner !== playerId) return;

    for (const edgeId of vertexEdges.get(vertexId) ?? []) {
      if (visitedEdges.has(edgeId)) continue;
      const edge = getEdge(state, edgeId);
      const nextVertexId = edge.vertexIds[0] === vertexId ? edge.vertexIds[1] : edge.vertexIds[0];
      visitedEdges.add(edgeId);
      dfs(nextVertexId, visitedEdges);
      visitedEdges.delete(edgeId);
    }
  }

  for (const vertexId of vertexEdges.keys()) {
    dfs(vertexId, new Set());
  }

  return Math.min(best, ownedEdgeIds.size);
}

export function recomputeLongestRoad(state: GameState): PlayerId | null {
  const MIN_LENGTH = 5;
  let bestPlayer: PlayerId | null = state.longestRoadOwner;
  let bestLength = bestPlayer ? calculateLongestRoad(state, bestPlayer) : 0;
  if (bestLength < MIN_LENGTH) {
    bestPlayer = null;
    bestLength = 0;
  }

  for (const player of state.players) {
    const length = calculateLongestRoad(state, player.id);
    if (length >= MIN_LENGTH && length > bestLength) {
      bestLength = length;
      bestPlayer = player.id;
    }
  }
  return bestPlayer;
}

export function recomputeLargestArmy(state: GameState): PlayerId | null {
  const MIN_KNIGHTS = 3;
  let bestPlayer: PlayerId | null = state.largestArmyOwner;
  let bestCount = bestPlayer ? getPlayer(state, bestPlayer).knightsPlayed : 0;
  if (bestCount < MIN_KNIGHTS) {
    bestPlayer = null;
    bestCount = 0;
  }

  for (const player of state.players) {
    if (player.knightsPlayed >= MIN_KNIGHTS && player.knightsPlayed > bestCount) {
      bestCount = player.knightsPlayed;
      bestPlayer = player.id;
    }
  }
  return bestPlayer;
}

export function verticesAdjacentToHex(state: GameState, hexId: string): Vertex[] {
  return state.board.vertices.filter((v) => v.hexIds.includes(hexId));
}

export function playersAdjacentToHex(state: GameState, hexId: string, excludePlayerId?: PlayerId): PlayerId[] {
  const owners = new Set<PlayerId>();
  for (const vertex of verticesAdjacentToHex(state, hexId)) {
    if (vertex.building && vertex.building.owner !== excludePlayerId) {
      owners.add(vertex.building.owner);
    }
  }
  return [...owners];
}
