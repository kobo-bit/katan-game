// カタンのドメイン型定義

export const RESOURCES = ["wood", "brick", "wool", "grain", "ore"] as const;
export type Resource = (typeof RESOURCES)[number];

export type Terrain = "forest" | "hills" | "pasture" | "fields" | "mountains" | "desert";

// 地形 -> 産出される資源 (砂漠は資源なし)
export const TERRAIN_RESOURCE: Record<Terrain, Resource | null> = {
  forest: "wood",
  hills: "brick",
  pasture: "wool",
  fields: "grain",
  mountains: "ore",
  desert: null,
};

export const RESOURCE_LABEL: Record<Resource, string> = {
  wood: "木材",
  brick: "レンガ",
  wool: "羊毛",
  grain: "小麦",
  ore: "鉱石",
};

export const TERRAIN_LABEL: Record<Terrain, string> = {
  forest: "森林",
  hills: "丘陵",
  pasture: "牧草地",
  fields: "畑",
  mountains: "山",
  desert: "砂漠",
};

export type ResourceCount = Record<Resource, number>;

export function emptyResourceCount(): ResourceCount {
  return { wood: 0, brick: 0, wool: 0, grain: 0, ore: 0 };
}

export type BuildingType = "settlement" | "city";

export type DevCardType =
  | "knight"
  | "roadBuilding"
  | "yearOfPlenty"
  | "monopoly"
  | "victoryPoint";

export const DEV_CARD_LABEL: Record<DevCardType, string> = {
  knight: "騎士",
  roadBuilding: "街道建設",
  yearOfPlenty: "発見",
  monopoly: "独占",
  victoryPoint: "勝利点",
};

// 港の種類: "generic" は3:1、資源指定のものは2:1
export type PortType = "generic" | Resource;

export interface HexTile {
  id: string;
  q: number;
  r: number;
  terrain: Terrain;
  number: number | null; // 砂漠は null
  hasRobber: boolean;
}

export interface Vertex {
  id: string;
  x: number;
  y: number;
  hexIds: string[];
  edgeIds: string[];
  adjacentVertexIds: string[];
  port: PortType | null;
  building: { owner: PlayerId; type: BuildingType } | null;
}

export interface Edge {
  id: string;
  vertexIds: [string, string];
  hexIds: string[];
  road: { owner: PlayerId } | null;
}

export interface Board {
  hexes: HexTile[];
  vertices: Vertex[];
  edges: Edge[];
  hexById: Record<string, HexTile>;
  vertexById: Record<string, Vertex>;
  edgeById: Record<string, Edge>;
}

export type PlayerId = string;

export type PlayerKind = "human" | "cpu";

export interface Player {
  id: PlayerId;
  name: string;
  kind: PlayerKind;
  color: string;
  resources: ResourceCount;
  devCards: DevCardType[];
  newDevCards: DevCardType[]; // このターンに購入したカード(即プレイ不可)
  knightsPlayed: number;
  roadsLeft: number;
  settlementsLeft: number;
  citiesLeft: number;
}

export type GamePhase =
  | "setup-settlement-1"
  | "setup-road-1"
  | "setup-settlement-2"
  | "setup-road-2"
  | "roll"
  | "main"
  | "moveRobber"
  | "discard"
  | "gameOver";

export interface DiceRoll {
  die1: number;
  die2: number;
  total: number;
}

export interface GameState {
  board: Board;
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  turnNumber: number;
  lastDiceRoll: DiceRoll | null;
  bankResources: ResourceCount;
  bankDevCards: DevCardType[];
  longestRoadOwner: PlayerId | null;
  largestArmyOwner: PlayerId | null;
  playersToDiscard: PlayerId[];
  robberMovedBy: PlayerId | null; // 7を出したプレイヤー(盗賊移動と略奪を行う)
  pendingTrade: TradeOffer | null;
  log: string[];
  winner: PlayerId | null;
  setupOrder: PlayerId[]; // 初期配置の順番 (1->N->1 のスネーク順)
  setupIndex: number;
  setupPendingVertexId: string | null; // 初期配置で直前に置いた開拓地 (街道の接続先)
  devCardPlayedThisTurn: boolean;
  freeRoadsRemaining: number; // 街道建設カードでまだ無料で建てられる本数
}

export interface TradeOffer {
  from: PlayerId;
  give: Partial<ResourceCount>;
  want: Partial<ResourceCount>;
}

export const VICTORY_POINTS_TO_WIN = 10;

// 銀行が保有する各資源の枚数 (基本セットの標準ルール)
export const BANK_RESOURCE_COUNT = 19;

export const BUILDING_COST: Record<"road" | "settlement" | "city" | "devCard", Partial<ResourceCount>> = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, wool: 1, grain: 1 },
  city: { ore: 3, grain: 2 },
  devCard: { ore: 1, wool: 1, grain: 1 },
};
