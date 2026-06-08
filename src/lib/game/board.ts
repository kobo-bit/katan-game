// 六角形ボードの生成ロジック (タイル・頂点・辺・港の生成)

import type {
  Board,
  Edge,
  HexTile,
  PortType,
  Terrain,
  Vertex,
} from "./types";
import { RESOURCES } from "./types";

const HEX_RADIUS = 2; // 半径2の六角形配置 = 19タイル
const HEX_SIZE = 60; // 描画サイズの基準値 (px)

// 基本セット(3〜4人用)の地形タイル枚数
const TERRAIN_COUNTS: Record<Terrain, number> = {
  forest: 4,
  pasture: 4,
  fields: 4,
  hills: 3,
  mountains: 3,
  desert: 1,
};

// 数字チップ(合計18枚, 7は含まない)
const NUMBER_CHIPS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

// 港の構成: 一般港(3:1) x4, 専門港(2:1) x5(資源ごとに1つ)
function buildPortDeck(): PortType[] {
  const ports: PortType[] = ["generic", "generic", "generic", "generic"];
  for (const resource of RESOURCES) {
    ports.push(resource);
  }
  return shuffle(ports);
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function axialToPixel(q: number, r: number): { x: number; y: number } {
  // フラットトップ六角形のレイアウト (Red Blob Games の式に基づく)
  const x = HEX_SIZE * (1.5 * q);
  const y = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return { x, y };
}

export function hexCorner(center: { x: number; y: number }, i: number): { x: number; y: number } {
  const angleDeg = 60 * i;
  const angleRad = (Math.PI / 180) * angleDeg;
  return {
    x: center.x + HEX_SIZE * Math.cos(angleRad),
    y: center.y + HEX_SIZE * Math.sin(angleRad),
  };
}

function roundKey(x: number, y: number): string {
  return `${Math.round(x * 100)}:${Math.round(y * 100)}`;
}

function generateAxialCoords(): { q: number; r: number }[] {
  const coords: { q: number; r: number }[] = [];
  for (let q = -HEX_RADIUS; q <= HEX_RADIUS; q++) {
    const rMin = Math.max(-HEX_RADIUS, -q - HEX_RADIUS);
    const rMax = Math.min(HEX_RADIUS, -q + HEX_RADIUS);
    for (let r = rMin; r <= rMax; r++) {
      coords.push({ q, r });
    }
  }
  return coords;
}

function buildTerrainDeck(): Terrain[] {
  const deck: Terrain[] = [];
  for (const terrain of Object.keys(TERRAIN_COUNTS) as Terrain[]) {
    for (let i = 0; i < TERRAIN_COUNTS[terrain]; i++) deck.push(terrain);
  }
  return shuffle(deck);
}

// 数字チップを配置する。"6"と"8"が隣接しないように調整する。
function assignNumberChips(hexes: HexTile[]): void {
  const nonDesert = hexes.filter((h) => h.terrain !== "desert");
  const adjacency = computeHexAdjacency(hexes);

  let attempt = 0;
  while (attempt < 200) {
    attempt++;
    const chips = shuffle(NUMBER_CHIPS);
    const assignment = new Map<string, number>();
    nonDesert.forEach((hex, i) => assignment.set(hex.id, chips[i]));

    let conflict = false;
    for (const hex of nonDesert) {
      const num = assignment.get(hex.id)!;
      if (num !== 6 && num !== 8) continue;
      for (const neighborId of adjacency[hex.id]) {
        const neighborNum = assignment.get(neighborId);
        if (neighborNum === 6 || neighborNum === 8) {
          conflict = true;
          break;
        }
      }
      if (conflict) break;
    }

    if (!conflict) {
      for (const hex of nonDesert) hex.number = assignment.get(hex.id)!;
      return;
    }
  }
  // 200回試行しても解決しない場合はそのまま割り当てる(理論上ほぼ起こらない)
  const chips = shuffle(NUMBER_CHIPS);
  nonDesert.forEach((hex, i) => (hex.number = chips[i]));
}

function computeHexAdjacency(hexes: HexTile[]): Record<string, string[]> {
  const byCoord = new Map<string, HexTile>();
  for (const hex of hexes) byCoord.set(`${hex.q}:${hex.r}`, hex);

  const directions = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ];

  const adjacency: Record<string, string[]> = {};
  for (const hex of hexes) {
    const neighbors: string[] = [];
    for (const [dq, dr] of directions) {
      const neighbor = byCoord.get(`${hex.q + dq}:${hex.r + dr}`);
      if (neighbor) neighbors.push(neighbor.id);
    }
    adjacency[hex.id] = neighbors;
  }
  return adjacency;
}

export function generateBoard(): Board {
  const coords = generateAxialCoords();
  const terrainDeck = buildTerrainDeck();

  const hexes: HexTile[] = coords.map((coord, i) => {
    const terrain = terrainDeck[i];
    return {
      id: `hex-${coord.q}-${coord.r}`,
      q: coord.q,
      r: coord.r,
      terrain,
      number: null,
      hasRobber: terrain === "desert",
    };
  });

  assignNumberChips(hexes);

  // 頂点と辺の生成 (隣接する六角形で座標を共有するため、丸めた座標でデデュープする)
  const vertexByKey = new Map<string, Vertex>();
  const edgeByKey = new Map<string, Edge>();

  function getOrCreateVertex(x: number, y: number): Vertex {
    const key = roundKey(x, y);
    let vertex = vertexByKey.get(key);
    if (!vertex) {
      vertex = {
        id: `v-${vertexByKey.size}`,
        x,
        y,
        hexIds: [],
        edgeIds: [],
        adjacentVertexIds: [],
        port: null,
        building: null,
      };
      vertexByKey.set(key, vertex);
    }
    return vertex;
  }

  function getOrCreateEdge(a: Vertex, b: Vertex): Edge {
    const key = [a.id, b.id].sort().join("|");
    let edge = edgeByKey.get(key);
    if (!edge) {
      edge = {
        id: `e-${edgeByKey.size}`,
        vertexIds: [a.id, b.id],
        hexIds: [],
        road: null,
      };
      edgeByKey.set(key, edge);
      a.edgeIds.push(edge.id);
      b.edgeIds.push(edge.id);
      if (!a.adjacentVertexIds.includes(b.id)) a.adjacentVertexIds.push(b.id);
      if (!b.adjacentVertexIds.includes(a.id)) b.adjacentVertexIds.push(a.id);
    }
    return edge;
  }

  for (const hex of hexes) {
    const center = axialToPixel(hex.q, hex.r);
    const corners = [0, 1, 2, 3, 4, 5].map((i) => hexCorner(center, i));
    const vertices = corners.map((c) => getOrCreateVertex(c.x, c.y));

    for (const v of vertices) {
      if (!v.hexIds.includes(hex.id)) v.hexIds.push(hex.id);
    }

    for (let i = 0; i < 6; i++) {
      const a = vertices[i];
      const b = vertices[(i + 1) % 6];
      const edge = getOrCreateEdge(a, b);
      if (!edge.hexIds.includes(hex.id)) edge.hexIds.push(hex.id);
    }
  }

  const vertices = [...vertexByKey.values()];
  const edges = [...edgeByKey.values()];

  assignPorts(vertices, edges);

  const hexById: Record<string, HexTile> = {};
  for (const h of hexes) hexById[h.id] = h;
  const vertexById: Record<string, Vertex> = {};
  for (const v of vertices) vertexById[v.id] = v;
  const edgeById: Record<string, Edge> = {};
  for (const e of edges) edgeById[e.id] = e;

  return { hexes, vertices, edges, hexById, vertexById, edgeById };
}

// 海岸線 (隣接する六角形が1つしかない辺) を周回順に並べ、9箇所に港を配置する
function assignPorts(vertices: Vertex[], edges: Edge[]): void {
  const coastalEdges = edges.filter((e) => e.hexIds.length === 1);
  if (coastalEdges.length === 0) return;

  const center = { x: 0, y: 0 };
  const angleOf = (e: Edge) => {
    const [a, b] = e.vertexIds.map((id) => vertices.find((v) => v.id === id)!);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    return Math.atan2(my - center.y, mx - center.x);
  };

  const ordered = [...coastalEdges].sort((e1, e2) => angleOf(e1) - angleOf(e2));
  const portDeck = buildPortDeck();
  const portCount = portDeck.length; // 9

  for (let i = 0; i < portCount; i++) {
    const edgeIndex = Math.floor((i * ordered.length) / portCount);
    const edge = ordered[edgeIndex];
    const portType = portDeck[i];
    for (const vId of edge.vertexIds) {
      const vertex = vertices.find((v) => v.id === vId)!;
      vertex.port = portType;
    }
  }
}

export const HEX_RENDER_SIZE = HEX_SIZE;
