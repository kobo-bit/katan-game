// 新規ゲームの初期化

import { generateBoard, shuffle } from "./board";
import {
  BANK_RESOURCE_COUNT,
  emptyResourceCount,
  RESOURCES,
  type DevCardType,
  type GameState,
  type Player,
  type PlayerKind,
  type ResourceCount,
} from "./types";

function initialBankResources(): ResourceCount {
  const bank = emptyResourceCount();
  for (const resource of RESOURCES) bank[resource] = BANK_RESOURCE_COUNT;
  return bank;
}

export interface PlayerConfig {
  name: string;
  kind: PlayerKind;
}

export const PLAYER_COLORS = ["#e3342f", "#3490dc", "#f6993f", "#38c172"];
export const PLAYER_COLOR_NAMES = ["赤", "青", "オレンジ", "緑"];

function buildDevCardDeck(): DevCardType[] {
  const deck: DevCardType[] = [];
  for (let i = 0; i < 14; i++) deck.push("knight");
  for (let i = 0; i < 2; i++) deck.push("roadBuilding");
  for (let i = 0; i < 2; i++) deck.push("yearOfPlenty");
  for (let i = 0; i < 2; i++) deck.push("monopoly");
  for (let i = 0; i < 5; i++) deck.push("victoryPoint");
  return deck;
}

export function createGame(configs: PlayerConfig[]): GameState {
  const board = generateBoard();

  const players: Player[] = configs.map((config, index) => ({
    id: `p${index + 1}`,
    name: config.name,
    kind: config.kind,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    resources: emptyResourceCount(),
    devCards: [],
    newDevCards: [],
    knightsPlayed: 0,
    roadsLeft: 15,
    settlementsLeft: 5,
    citiesLeft: 4,
  }));

  const forward = players.map((p) => p.id);
  const backward = [...forward].reverse();
  const setupOrder = [...forward, ...backward];

  return {
    board,
    players,
    currentPlayerIndex: 0,
    phase: "setup-settlement-1",
    turnNumber: 1,
    lastDiceRoll: null,
    bankResources: initialBankResources(),
    bankDevCards: shuffle(buildDevCardDeck()),
    longestRoadOwner: null,
    largestArmyOwner: null,
    playersToDiscard: [],
    robberMovedBy: null,
    pendingTrade: null,
    log: [
      `ゲームを開始しました。プレイヤーは ${players.map((p) => p.name).join(", ")} です。`,
      `${players[0].name} さんから初期配置を始めてください(開拓地を1つ選んでください)。`,
    ],
    winner: null,
    setupOrder,
    setupIndex: 0,
    setupPendingVertexId: null,
    devCardPlayedThisTurn: false,
    freeRoadsRemaining: 0,
  };
}
