// ゲームのアクション処理 (ルールエンジン本体)
// applyAction(state, action) は新しい GameState を返す純粋関数として実装する

import {
  canPlaceRoad,
  canPlaceSettlement,
  canUpgradeToCity,
  currentPlayer,
  getEdge,
  getPlayer,
  getVertex,
  hasResources,
  playersAdjacentToHex,
  publicVictoryPoints,
  recomputeLargestArmy,
  recomputeLongestRoad,
  resourceTotal,
  totalVictoryPoints,
  verticesAdjacentToHex,
} from "./selectors";
import {
  BUILDING_COST,
  RESOURCES,
  TERRAIN_RESOURCE,
  type Board,
  type DevCardType,
  type Edge,
  type GameState,
  type HexTile,
  type Player,
  type PlayerId,
  type Resource,
  type ResourceCount,
  type Vertex,
} from "./types";

export type GameAction =
  | { type: "BUILD_SETTLEMENT"; playerId: PlayerId; vertexId: string }
  | { type: "BUILD_ROAD"; playerId: PlayerId; edgeId: string }
  | { type: "BUILD_CITY"; playerId: PlayerId; vertexId: string }
  | { type: "ROLL_DICE"; playerId: PlayerId }
  | { type: "MOVE_ROBBER"; playerId: PlayerId; hexId: string; targetPlayerId: PlayerId | null }
  | { type: "DISCARD"; playerId: PlayerId; discard: Partial<ResourceCount> }
  | { type: "BUY_DEV_CARD"; playerId: PlayerId }
  | { type: "PLAY_KNIGHT"; playerId: PlayerId }
  | { type: "PLAY_ROAD_BUILDING"; playerId: PlayerId }
  | { type: "PLAY_YEAR_OF_PLENTY"; playerId: PlayerId; resources: [Resource, Resource] }
  | { type: "PLAY_MONOPOLY"; playerId: PlayerId; resource: Resource }
  | { type: "BANK_TRADE"; playerId: PlayerId; give: Partial<ResourceCount>; want: Partial<ResourceCount> }
  | { type: "END_TURN"; playerId: PlayerId };

export interface ActionResult {
  state: GameState;
  ok: boolean;
  message?: string;
}

function fail(state: GameState, message: string): ActionResult {
  return { state, ok: false, message };
}

function ok(state: GameState, message?: string): ActionResult {
  return { state, ok: true, message };
}

function cloneState(state: GameState): GameState {
  const hexes: HexTile[] = state.board.hexes.map((h) => ({ ...h }));
  const vertices: Vertex[] = state.board.vertices.map((v) => ({
    ...v,
    hexIds: [...v.hexIds],
    edgeIds: [...v.edgeIds],
    adjacentVertexIds: [...v.adjacentVertexIds],
    building: v.building ? { ...v.building } : null,
  }));
  const edges: Edge[] = state.board.edges.map((e) => ({
    ...e,
    vertexIds: [...e.vertexIds] as [string, string],
    hexIds: [...e.hexIds],
    road: e.road ? { ...e.road } : null,
  }));

  const hexById: Record<string, HexTile> = {};
  for (const h of hexes) hexById[h.id] = h;
  const vertexById: Record<string, Vertex> = {};
  for (const v of vertices) vertexById[v.id] = v;
  const edgeById: Record<string, Edge> = {};
  for (const e of edges) edgeById[e.id] = e;

  const board: Board = { hexes, vertices, edges, hexById, vertexById, edgeById };

  const players: Player[] = state.players.map((p) => ({
    ...p,
    resources: { ...p.resources },
    devCards: [...p.devCards],
    newDevCards: [...p.newDevCards],
  }));

  return {
    ...state,
    board,
    players,
    bankResources: { ...state.bankResources },
    bankDevCards: [...state.bankDevCards],
    playersToDiscard: [...state.playersToDiscard],
    log: [...state.log],
  };
}

const MAX_LOG_LENGTH = 200;

function addLog(state: GameState, message: string): void {
  state.log.push(message);
  if (state.log.length > MAX_LOG_LENGTH) state.log.splice(0, state.log.length - MAX_LOG_LENGTH);
}

function giveResources(state: GameState, player: Player, resources: Partial<ResourceCount>): void {
  for (const resource of RESOURCES) {
    const amount = resources[resource] ?? 0;
    if (amount === 0) continue;
    player.resources[resource] += amount;
    state.bankResources[resource] -= amount;
  }
}

function returnResourcesToBank(state: GameState, player: Player, resources: Partial<ResourceCount>): void {
  for (const resource of RESOURCES) {
    const amount = resources[resource] ?? 0;
    if (amount === 0) continue;
    player.resources[resource] -= amount;
    state.bankResources[resource] += amount;
  }
}

function payCost(state: GameState, player: Player, cost: Partial<ResourceCount>): void {
  returnResourcesToBank(state, player, cost);
}

function playerName(state: GameState, playerId: PlayerId): string {
  return getPlayer(state, playerId).name;
}

function isPlayersTurn(state: GameState, playerId: PlayerId): boolean {
  return currentPlayer(state).id === playerId;
}

function checkAndApplyVictory(state: GameState, playerId: PlayerId): void {
  if (totalVictoryPoints(state, playerId) >= 10) {
    state.winner = playerId;
    state.phase = "gameOver";
    addLog(state, `${playerName(state, playerId)} さんが10点に到達し、勝利しました!`);
  }
}

// === セットアップフェイズ ===

function placeSetupSettlement(state: GameState, playerId: PlayerId, vertexId: string): ActionResult {
  if (state.phase !== "setup-settlement-1" && state.phase !== "setup-settlement-2") {
    return fail(state, "今は開拓地を初期配置するタイミングではありません。");
  }
  if (state.setupOrder[state.setupIndex] !== playerId) return fail(state, "あなたの番ではありません。");
  if (!canPlaceSettlement(state, playerId, vertexId, true)) {
    return fail(state, "そこには開拓地を置けません(隣接する頂点に建物があります)。");
  }

  const next = cloneState(state);
  const vertex = getVertex(next, vertexId);
  const player = getPlayer(next, playerId);
  vertex.building = { owner: playerId, type: "settlement" };
  player.settlementsLeft -= 1;
  next.setupPendingVertexId = vertexId;
  next.phase = state.phase === "setup-settlement-1" ? "setup-road-1" : "setup-road-2";
  addLog(next, `${player.name} さんが開拓地を配置しました。続けて街道を配置してください。`);
  return ok(next);
}

function placeSetupRoad(state: GameState, playerId: PlayerId, edgeId: string): ActionResult {
  if (state.phase !== "setup-road-1" && state.phase !== "setup-road-2") {
    return fail(state, "今は街道を初期配置するタイミングではありません。");
  }
  if (state.setupOrder[state.setupIndex] !== playerId) return fail(state, "あなたの番ではありません。");
  if (!canPlaceRoad(state, playerId, edgeId, { isSetup: true, setupAnchorVertexId: state.setupPendingVertexId })) {
    return fail(state, "その辺には街道を置けません(直前に置いた開拓地に隣接していません)。");
  }

  const next = cloneState(state);
  const edge = getEdge(next, edgeId);
  const player = getPlayer(next, playerId);
  edge.road = { owner: playerId };
  player.roadsLeft -= 1;

  const isSecondRound = state.phase === "setup-road-2";
  if (isSecondRound && state.setupPendingVertexId) {
    // 2回目の配置では、隣接タイルから初期資源を獲得する
    const vertex = getVertex(next, state.setupPendingVertexId);
    const granted: Partial<ResourceCount> = {};
    for (const hexId of vertex.hexIds) {
      const hex = next.board.hexById[hexId];
      const resource = TERRAIN_RESOURCE[hex.terrain];
      if (!resource) continue;
      granted[resource] = (granted[resource] ?? 0) + 1;
    }
    giveResources(next, player, granted);
    const grantedText = (Object.entries(granted) as [Resource, number][])
      .map(([resource, amount]) => `${resourceLabel(resource)}${amount}`)
      .join(", ");
    if (grantedText) addLog(next, `${player.name} さんは初期資源として ${grantedText} を獲得しました。`);
  }

  next.setupPendingVertexId = null;
  next.setupIndex += 1;

  if (next.setupIndex >= next.setupOrder.length) {
    // セットアップ終了 -> 通常ターンへ
    next.phase = "roll";
    next.currentPlayerIndex = 0;
    next.turnNumber = 1;
    addLog(next, "初期配置が完了しました。ゲームを開始します。最初のプレイヤーはサイコロを振ってください。");
  } else {
    const nextPlayerId = next.setupOrder[next.setupIndex];
    const startsSettlement = next.setupIndex < next.players.length;
    next.phase = startsSettlement ? "setup-settlement-1" : "setup-settlement-2";
    addLog(next, `${playerName(next, nextPlayerId)} さんの初期配置の番です。`);
  }

  return ok(next);
}

function resourceLabel(resource: Resource): string {
  const labels: Record<Resource, string> = {
    wood: "木材",
    brick: "レンガ",
    wool: "羊毛",
    grain: "小麦",
    ore: "鉱石",
  };
  return labels[resource];
}

// === サイコロ・資源生産 ===

function rollDice(state: GameState, playerId: PlayerId): ActionResult {
  if (state.phase !== "roll") return fail(state, "今はサイコロを振るタイミングではありません。");
  if (!isPlayersTurn(state, playerId)) return fail(state, "あなたの番ではありません。");

  const die1 = 1 + Math.floor(Math.random() * 6);
  const die2 = 1 + Math.floor(Math.random() * 6);
  const total = die1 + die2;

  const next = cloneState(state);
  next.lastDiceRoll = { die1, die2, total };
  addLog(next, `${playerName(next, playerId)} さんはサイコロを振り、${die1} と ${die2} (合計 ${total}) が出ました。`);

  if (total === 7) {
    handleSevenRolled(next);
    return ok(next);
  }

  produceResources(next, total);
  next.phase = "main";
  return ok(next);
}

function produceResources(state: GameState, total: number): void {
  // (player, resource) -> 獲得予定枚数 を集計
  const claims = new Map<PlayerId, Partial<ResourceCount>>();
  const demandByResource: Record<Resource, number> = { wood: 0, brick: 0, wool: 0, grain: 0, ore: 0 };

  for (const hex of state.board.hexes) {
    if (hex.number !== total || hex.hasRobber) continue;
    const resource = TERRAIN_RESOURCE[hex.terrain];
    if (!resource) continue;

    for (const vertex of verticesAdjacentToHex(state, hex.id)) {
      if (!vertex.building) continue;
      const amount = vertex.building.type === "city" ? 2 : 1;
      const owner = vertex.building.owner;
      const playerClaims = claims.get(owner) ?? {};
      playerClaims[resource] = (playerClaims[resource] ?? 0) + amount;
      claims.set(owner, playerClaims);
      demandByResource[resource] += amount;
    }
  }

  // 銀行に在庫が足りない資源は、その種類の生産を全て無効にする(公式ルール)
  const shortageResources = new Set<Resource>();
  for (const resource of RESOURCES) {
    if (demandByResource[resource] > state.bankResources[resource]) {
      shortageResources.add(resource);
    }
  }

  const summaries: string[] = [];
  for (const [playerId, granted] of claims) {
    const filtered: Partial<ResourceCount> = {};
    for (const resource of RESOURCES) {
      if (shortageResources.has(resource)) continue;
      const amount = granted[resource] ?? 0;
      if (amount > 0) filtered[resource] = amount;
    }
    if (Object.keys(filtered).length === 0) continue;
    const player = getPlayer(state, playerId);
    giveResources(state, player, filtered);
    const text = (Object.entries(filtered) as [Resource, number][])
      .map(([resource, amount]) => `${resourceLabel(resource)}${amount}`)
      .join(", ");
    summaries.push(`${player.name}: ${text}`);
  }

  if (shortageResources.size > 0) {
    const names = [...shortageResources].map(resourceLabel).join(", ");
    addLog(state, `銀行に ${names} の在庫が足りないため、その資源は誰にも配られませんでした。`);
  }

  if (summaries.length > 0) {
    addLog(state, `資源を生産しました -> ${summaries.join(" / ")}`);
  } else {
    addLog(state, "この目では資源は生産されませんでした。");
  }
}

function handleSevenRolled(state: GameState): void {
  const toDiscard: PlayerId[] = [];
  for (const player of state.players) {
    if (resourceTotal(player) > 7) toDiscard.push(player.id);
  }
  state.playersToDiscard = toDiscard;
  state.robberMovedBy = currentPlayer(state).id;

  if (toDiscard.length > 0) {
    state.phase = "discard";
    addLog(
      state,
      `7が出ました。手札が8枚以上のプレイヤー(${toDiscard.map((id) => playerName(state, id)).join(", ")})は半分捨ててください。`
    );
  } else {
    state.phase = "moveRobber";
    addLog(state, "7が出ました。盗賊を移動させるタイルを選んでください。");
  }
}

function discard(state: GameState, playerId: PlayerId, discarded: Partial<ResourceCount>): ActionResult {
  if (state.phase !== "discard") return fail(state, "今は捨て札のタイミングではありません。");
  if (!state.playersToDiscard.includes(playerId)) return fail(state, "あなたは捨て札の対象ではありません。");

  const player = getPlayer(state, playerId);
  const totalDiscard = Object.values(discarded).reduce((a, b) => a + (b ?? 0), 0);
  const required = Math.floor(resourceTotal(player) / 2);
  if (totalDiscard !== required) {
    return fail(state, `${required}枚捨てる必要があります。`);
  }
  if (!hasResources(player, discarded)) return fail(state, "持っていない資源は捨てられません。");

  const next = cloneState(state);
  const nextPlayer = getPlayer(next, playerId);
  returnResourcesToBank(next, nextPlayer, discarded);
  next.playersToDiscard = next.playersToDiscard.filter((id) => id !== playerId);
  addLog(next, `${nextPlayer.name} さんが ${required} 枚のカードを捨てました。`);

  if (next.playersToDiscard.length === 0) {
    next.phase = "moveRobber";
    addLog(next, "盗賊を移動させるタイルを選んでください。");
  }
  return ok(next);
}

function moveRobber(state: GameState, playerId: PlayerId, hexId: string, targetPlayerId: PlayerId | null): ActionResult {
  if (state.phase !== "moveRobber") return fail(state, "今は盗賊を移動させるタイミングではありません。");
  if (state.robberMovedBy !== playerId) return fail(state, "あなたが盗賊を移動させる番ではありません。");

  const hex = state.board.hexById[hexId];
  if (!hex) return fail(state, "そのタイルは存在しません。");
  if (hex.hasRobber) return fail(state, "盗賊は既にそのタイルにいます。すでに移動済みです。");

  const candidates = playersAdjacentToHex(state, hexId, playerId);
  if (targetPlayerId !== null && !candidates.includes(targetPlayerId)) {
    return fail(state, "そのプレイヤーから資源を奪うことはできません。");
  }

  const next = cloneState(state);
  for (const h of next.board.hexes) h.hasRobber = h.id === hexId;
  addLog(next, `${playerName(next, playerId)} さんが盗賊を移動させました。`);

  if (targetPlayerId) {
    const victim = getPlayer(next, targetPlayerId);
    const stealable = (RESOURCES as readonly Resource[]).filter((r) => victim.resources[r] > 0);
    if (stealable.length > 0) {
      const resource = stealable[Math.floor(Math.random() * stealable.length)];
      victim.resources[resource] -= 1;
      const robber = getPlayer(next, playerId);
      robber.resources[resource] += 1;
      addLog(next, `${robber.name} さんは ${victim.name} さんから資源を1枚奪いました。`);
    }
  }

  next.robberMovedBy = null;
  next.phase = "main";
  return ok(next);
}

// === 建設 ===

function buildSettlement(state: GameState, playerId: PlayerId, vertexId: string): ActionResult {
  if (state.phase !== "main") return fail(state, "今は建設できるタイミングではありません。");
  if (!isPlayersTurn(state, playerId)) return fail(state, "あなたの番ではありません。");

  const player = getPlayer(state, playerId);
  if (player.settlementsLeft <= 0) return fail(state, "開拓地のコマがもうありません。");
  if (!hasResources(player, BUILDING_COST.settlement)) {
    return fail(state, "資源が足りません(木材1, レンガ1, 羊毛1, 小麦1)。");
  }
  if (!canPlaceSettlement(state, playerId, vertexId, false)) {
    return fail(state, "そこには開拓地を置けません(距離ルール、または街道が繋がっていません)。");
  }

  const next = cloneState(state);
  const nextPlayer = getPlayer(next, playerId);
  payCost(next, nextPlayer, BUILDING_COST.settlement);
  getVertex(next, vertexId).building = { owner: playerId, type: "settlement" };
  nextPlayer.settlementsLeft -= 1;
  addLog(next, `${nextPlayer.name} さんが開拓地を建設しました。`);

  next.longestRoadOwner = recomputeLongestRoad(next);
  checkAndApplyVictory(next, playerId);
  return ok(next);
}

function buildCity(state: GameState, playerId: PlayerId, vertexId: string): ActionResult {
  if (state.phase !== "main") return fail(state, "今は建設できるタイミングではありません。");
  if (!isPlayersTurn(state, playerId)) return fail(state, "あなたの番ではありません。");

  const player = getPlayer(state, playerId);
  if (player.citiesLeft <= 0) return fail(state, "街(都市)のコマがもうありません。");
  if (!hasResources(player, BUILDING_COST.city)) return fail(state, "資源が足りません(鉱石3, 小麦2)。");
  if (!canUpgradeToCity(state, playerId, vertexId)) return fail(state, "そこは開拓地をアップグレードできません。");

  const next = cloneState(state);
  const nextPlayer = getPlayer(next, playerId);
  payCost(next, nextPlayer, BUILDING_COST.city);
  const vertex = getVertex(next, vertexId);
  vertex.building = { owner: playerId, type: "city" };
  nextPlayer.settlementsLeft += 1;
  nextPlayer.citiesLeft -= 1;
  addLog(next, `${nextPlayer.name} さんが街(都市)に発展させました。`);

  checkAndApplyVictory(next, playerId);
  return ok(next);
}

// === 発展カード ===

function buyDevCard(state: GameState, playerId: PlayerId): ActionResult {
  if (state.phase !== "main") return fail(state, "今は発展カードを購入できるタイミングではありません。");
  if (!isPlayersTurn(state, playerId)) return fail(state, "あなたの番ではありません。");

  const player = getPlayer(state, playerId);
  if (!hasResources(player, BUILDING_COST.devCard)) return fail(state, "資源が足りません(鉱石1, 羊毛1, 小麦1)。");
  if (state.bankDevCards.length === 0) return fail(state, "発展カードの山札が尽きています。");

  const next = cloneState(state);
  const nextPlayer = getPlayer(next, playerId);
  payCost(next, nextPlayer, BUILDING_COST.devCard);
  const card = next.bankDevCards.pop()!;
  nextPlayer.devCards.push(card);
  nextPlayer.newDevCards.push(card);
  addLog(next, `${nextPlayer.name} さんが発展カードを購入しました。`);

  checkAndApplyVictory(next, playerId);
  return ok(next);
}

function canPlayDevCard(state: GameState, playerId: PlayerId, type: DevCardType): { allowed: boolean; reason?: string } {
  if (state.phase !== "roll" && state.phase !== "main") {
    return { allowed: false, reason: "今は発展カードをプレイできるタイミングではありません。" };
  }
  if (!isPlayersTurn(state, playerId)) return { allowed: false, reason: "あなたの番ではありません。" };
  if (state.devCardPlayedThisTurn) return { allowed: false, reason: "このターンは既に発展カードをプレイ済みです。" };

  const player = getPlayer(state, playerId);
  const totalOfType = player.devCards.filter((c) => c === type).length;
  const newOfType = player.newDevCards.filter((c) => c === type).length;
  if (totalOfType <= newOfType) {
    return { allowed: false, reason: "そのカードは今ターン購入したばかりでプレイできません。" };
  }
  return { allowed: true };
}

function consumeDevCard(player: Player, type: DevCardType): void {
  const idx = player.devCards.indexOf(type);
  if (idx >= 0) player.devCards.splice(idx, 1);
}

function playKnight(state: GameState, playerId: PlayerId): ActionResult {
  const check = canPlayDevCard(state, playerId, "knight");
  if (!check.allowed) return fail(state, check.reason!);

  const next = cloneState(state);
  const nextPlayer = getPlayer(next, playerId);
  consumeDevCard(nextPlayer, "knight");
  nextPlayer.knightsPlayed += 1;
  next.devCardPlayedThisTurn = true;
  next.robberMovedBy = playerId;
  next.phase = "moveRobber";
  addLog(next, `${nextPlayer.name} さんが騎士カードをプレイしました。盗賊を移動させてください。`);

  next.largestArmyOwner = recomputeLargestArmy(next);
  checkAndApplyVictory(next, playerId);
  return ok(next);
}

function playRoadBuilding(state: GameState, playerId: PlayerId): ActionResult {
  const check = canPlayDevCard(state, playerId, "roadBuilding");
  if (!check.allowed) return fail(state, check.reason!);

  const player = getPlayer(state, playerId);
  if (player.roadsLeft <= 0) return fail(state, "街道のコマがもうありません。");

  // 無料の街道を2本(置ける場所がある分だけ)建設できるようにフラグを立てる代わりに、
  // ここでは「次に建てる街道2本までは無料」という形でクライアント側に処理を委ねるのは複雑になるため、
  // 可能な場所が無くてもカードは消費し、後続の BUILD_ROAD 呼び出しでコストを免除するモードに入る。
  const next = cloneState(state);
  const nextPlayer = getPlayer(next, playerId);
  consumeDevCard(nextPlayer, "roadBuilding");
  next.devCardPlayedThisTurn = true;
  next.freeRoadsRemaining = 2;
  addLog(next, `${nextPlayer.name} さんが街道建設カードをプレイしました。街道を2本まで無料で建設できます。`);
  return ok(next);
}

function playYearOfPlenty(state: GameState, playerId: PlayerId, resources: [Resource, Resource]): ActionResult {
  const check = canPlayDevCard(state, playerId, "yearOfPlenty");
  if (!check.allowed) return fail(state, check.reason!);

  for (const resource of resources) {
    if (state.bankResources[resource] <= 0) {
      return fail(state, `銀行に ${resourceLabel(resource)} の在庫がありません。`);
    }
  }
  // 同じ資源を2枚要求する場合、銀行に2枚以上必要
  if (resources[0] === resources[1] && state.bankResources[resources[0]] < 2) {
    return fail(state, `銀行に ${resourceLabel(resources[0])} の在庫が足りません。`);
  }

  const next = cloneState(state);
  const nextPlayer = getPlayer(next, playerId);
  consumeDevCard(nextPlayer, "yearOfPlenty");
  next.devCardPlayedThisTurn = true;
  const granted: Partial<ResourceCount> = {};
  for (const resource of resources) granted[resource] = (granted[resource] ?? 0) + 1;
  giveResources(next, nextPlayer, granted);
  addLog(
    next,
    `${nextPlayer.name} さんが発見カードをプレイし、${resourceLabel(resources[0])} と ${resourceLabel(resources[1])} を獲得しました。`
  );
  return ok(next);
}

function playMonopoly(state: GameState, playerId: PlayerId, resource: Resource): ActionResult {
  const check = canPlayDevCard(state, playerId, "monopoly");
  if (!check.allowed) return fail(state, check.reason!);

  const next = cloneState(state);
  const nextPlayer = getPlayer(next, playerId);
  consumeDevCard(nextPlayer, "monopoly");
  next.devCardPlayedThisTurn = true;

  let total = 0;
  for (const other of next.players) {
    if (other.id === playerId) continue;
    const amount = other.resources[resource];
    if (amount > 0) {
      other.resources[resource] = 0;
      total += amount;
    }
  }
  nextPlayer.resources[resource] += total;
  addLog(next, `${nextPlayer.name} さんが独占カードをプレイし、${resourceLabel(resource)} を ${total} 枚集めました。`);
  return ok(next);
}

// === 交易 ===

function bankTrade(state: GameState, playerId: PlayerId, give: Partial<ResourceCount>, want: Partial<ResourceCount>): ActionResult {
  if (state.phase !== "main") return fail(state, "今は交易できるタイミングではありません。");
  if (!isPlayersTurn(state, playerId)) return fail(state, "あなたの番ではありません。");

  const player = getPlayer(state, playerId);
  const giveTotal = Object.values(give).reduce((a, b) => a + (b ?? 0), 0);
  const wantTotal = Object.values(want).reduce((a, b) => a + (b ?? 0), 0);
  if (giveTotal === 0 || wantTotal === 0) return fail(state, "交易内容が不正です。");
  if (!hasResources(player, give)) return fail(state, "渡す資源が足りません。");

  // レートの検証: give は単一資源で、そのレートは港の有無で決まる
  const giveEntries = Object.entries(give).filter(([, v]) => (v ?? 0) > 0) as [Resource, number][];
  const wantEntries = Object.entries(want).filter(([, v]) => (v ?? 0) > 0) as [Resource, number][];
  if (giveEntries.length !== 1 || wantEntries.length !== 1) {
    return fail(state, "銀行との交易は1種類の資源同士で行ってください。");
  }
  const [giveResource, giveAmount] = giveEntries[0];
  const [wantResource, wantAmount] = wantEntries[0];
  if (giveResource === wantResource) return fail(state, "同じ資源同士は交換できません。");

  const rate = bestTradeRate(state, playerId, giveResource);
  if (giveAmount !== rate * wantAmount) {
    return fail(state, `この資源のレートは ${rate}:1 です。`);
  }
  if (state.bankResources[wantResource] < wantAmount) return fail(state, "銀行にその資源の在庫がありません。");

  const next = cloneState(state);
  const nextPlayer = getPlayer(next, playerId);
  returnResourcesToBank(next, nextPlayer, give);
  giveResources(next, nextPlayer, want);
  addLog(
    next,
    `${nextPlayer.name} さんが銀行と交易しました(${resourceLabel(giveResource)}${giveAmount} -> ${resourceLabel(wantResource)}${wantAmount})。`
  );
  return ok(next);
}

export function bestTradeRate(state: GameState, playerId: PlayerId, resource: Resource): number {
  let rate = 4;
  for (const vertex of state.board.vertices) {
    if (vertex.building?.owner !== playerId) continue;
    if (vertex.port === "generic") rate = Math.min(rate, 3);
    if (vertex.port === resource) rate = Math.min(rate, 2);
  }
  return rate;
}

// === ターン終了 ===

function endTurn(state: GameState, playerId: PlayerId): ActionResult {
  if (state.phase !== "main" && state.phase !== "roll") return fail(state, "今はターンを終了できません。");
  if (!isPlayersTurn(state, playerId)) return fail(state, "あなたの番ではありません。");
  if (state.phase === "roll") return fail(state, "サイコロを振ってください。");

  const next = cloneState(state);
  const player = getPlayer(next, playerId);
  player.newDevCards = [];
  next.devCardPlayedThisTurn = false;
  next.freeRoadsRemaining = 0;
  next.lastDiceRoll = null;

  next.currentPlayerIndex = (next.currentPlayerIndex + 1) % next.players.length;
  if (next.currentPlayerIndex === 0) next.turnNumber += 1;
  next.phase = "roll";
  addLog(next, `${playerName(next, currentPlayer(next).id)} さんの番です。サイコロを振ってください。`);
  return ok(next);
}

// === ディスパッチ ===

export function applyAction(state: GameState, action: GameAction): ActionResult {
  if (state.phase === "gameOver") return fail(state, "ゲームは既に終了しています。");

  switch (action.type) {
    case "BUILD_SETTLEMENT": {
      if (state.phase === "setup-settlement-1" || state.phase === "setup-settlement-2") {
        return placeSetupSettlement(state, action.playerId, action.vertexId);
      }
      return buildSettlement(state, action.playerId, action.vertexId);
    }
    case "BUILD_ROAD": {
      if (state.phase === "setup-road-1" || state.phase === "setup-road-2") {
        return placeSetupRoad(state, action.playerId, action.edgeId);
      }
      return buildFreeOrPaidRoad(state, action.playerId, action.edgeId);
    }
    case "BUILD_CITY":
      return buildCity(state, action.playerId, action.vertexId);
    case "ROLL_DICE":
      return rollDice(state, action.playerId);
    case "MOVE_ROBBER":
      return moveRobber(state, action.playerId, action.hexId, action.targetPlayerId);
    case "DISCARD":
      return discard(state, action.playerId, action.discard);
    case "BUY_DEV_CARD":
      return buyDevCard(state, action.playerId);
    case "PLAY_KNIGHT":
      return playKnight(state, action.playerId);
    case "PLAY_ROAD_BUILDING":
      return playRoadBuilding(state, action.playerId);
    case "PLAY_YEAR_OF_PLENTY":
      return playYearOfPlenty(state, action.playerId, action.resources);
    case "PLAY_MONOPOLY":
      return playMonopoly(state, action.playerId, action.resource);
    case "BANK_TRADE":
      return bankTrade(state, action.playerId, action.give, action.want);
    case "END_TURN":
      return endTurn(state, action.playerId);
    default:
      return fail(state, "不明なアクションです。");
  }
}

function buildFreeOrPaidRoad(state: GameState, playerId: PlayerId, edgeId: string): ActionResult {
  if (state.phase !== "main") return fail(state, "今は建設できるタイミングではありません。");
  if (!isPlayersTurn(state, playerId)) return fail(state, "あなたの番ではありません。");

  const player = getPlayer(state, playerId);
  const free = state.freeRoadsRemaining > 0;
  if (player.roadsLeft <= 0) return fail(state, "街道のコマがもうありません。");
  if (!free && !hasResources(player, BUILDING_COST.road)) return fail(state, "資源が足りません(木材1, レンガ1)。");
  if (!canPlaceRoad(state, playerId, edgeId)) return fail(state, "そこには街道を置けません。");

  const next = cloneState(state);
  const nextPlayer = getPlayer(next, playerId);
  if (free) {
    next.freeRoadsRemaining -= 1;
  } else {
    payCost(next, nextPlayer, BUILDING_COST.road);
  }
  getEdge(next, edgeId).road = { owner: playerId };
  nextPlayer.roadsLeft -= 1;
  addLog(next, free ? `${nextPlayer.name} さんが街道を無料で建設しました。` : `${nextPlayer.name} さんが街道を建設しました。`);

  next.longestRoadOwner = recomputeLongestRoad(next);
  checkAndApplyVictory(next, playerId);
  return ok(next);
}

export { cloneState, addLog, publicVictoryPoints };
