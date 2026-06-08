"use client";

// 盤面を SVG で描画するコンポーネント

import { useMemo } from "react";
import { axialToPixel, hexCorner, HEX_RENDER_SIZE } from "@/lib/game/board";
import type { Board, GameState, PortType, Resource, Terrain } from "@/lib/game/types";
import { RESOURCE_LABEL, TERRAIN_LABEL } from "@/lib/game/types";

const TERRAIN_COLOR: Record<Terrain, string> = {
  forest: "#2f6f4f",
  pasture: "#9bd770",
  fields: "#f2cf5b",
  hills: "#d97a45",
  mountains: "#9aa0a6",
  desert: "#e8d6a0",
};

const TERRAIN_TEXT_COLOR: Record<Terrain, string> = {
  forest: "#eafff2",
  pasture: "#1f3d0f",
  fields: "#4a3a05",
  hills: "#3a1d08",
  mountains: "#202325",
  desert: "#5a4a25",
};

const PORT_LABEL: Record<PortType, string> = {
  generic: "3:1",
  wood: `${RESOURCE_LABEL.wood}2:1`,
  brick: `${RESOURCE_LABEL.brick}2:1`,
  wool: `${RESOURCE_LABEL.wool}2:1`,
  grain: `${RESOURCE_LABEL.grain}2:1`,
  ore: `${RESOURCE_LABEL.ore}2:1`,
};

interface BoardViewProps {
  state: GameState;
  selectableVertexIds?: Set<string>;
  selectableEdgeIds?: Set<string>;
  selectableHexIds?: Set<string>;
  onVertexClick?: (vertexId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onHexClick?: (hexId: string) => void;
}

const NUMBER_DOTS: Record<number, number> = {
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

export default function BoardView({
  state,
  selectableVertexIds,
  selectableEdgeIds,
  selectableHexIds,
  onVertexClick,
  onEdgeClick,
  onHexClick,
}: BoardViewProps) {
  const { board } = state;
  const bounds = useMemo(() => computeBounds(board), [board]);

  const playerColor = (id: string) => state.players.find((p) => p.id === id)?.color ?? "#888";

  return (
    <svg
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
      className="w-full h-auto select-none"
      role="img"
      aria-label="カタンの盤面"
    >
      {/* 海 */}
      <rect x={bounds.minX} y={bounds.minY} width={bounds.width} height={bounds.height} fill="#3f7ea6" />

      {/* タイル */}
      {board.hexes.map((hex) => {
        const center = axialToPixel(hex.q, hex.r);
        const corners = [0, 1, 2, 3, 4, 5].map((i) => hexCorner(center, i));
        const points = corners.map((c) => `${c.x},${c.y}`).join(" ");
        const clickable = selectableHexIds?.has(hex.id);
        const resource = terrainResource(hex.terrain);

        return (
          <g
            key={hex.id}
            onClick={clickable ? () => onHexClick?.(hex.id) : undefined}
            style={{ cursor: clickable ? "pointer" : "default" }}
          >
            <polygon
              points={points}
              fill={TERRAIN_COLOR[hex.terrain]}
              stroke={clickable ? "#fff45c" : "#1d2b36"}
              strokeWidth={clickable ? 4 : 1.5}
            />
            <text x={center.x} y={center.y - HEX_RENDER_SIZE * 0.42} textAnchor="middle" fontSize={11} fill={TERRAIN_TEXT_COLOR[hex.terrain]}>
              {TERRAIN_LABEL[hex.terrain]}
              {resource ? ` (${RESOURCE_LABEL[resource]})` : ""}
            </text>

            {hex.number !== null && (
              <g>
                <circle cx={center.x} cy={center.y} r={18} fill="#f5ecd6" stroke="#1d2b36" strokeWidth={1} />
                <text
                  x={center.x}
                  y={center.y + 6}
                  textAnchor="middle"
                  fontSize={18}
                  fontWeight="bold"
                  fill={hex.number === 6 || hex.number === 8 ? "#c0392b" : "#1d2b36"}
                >
                  {hex.number}
                </text>
                <text x={center.x} y={center.y + 16} textAnchor="middle" fontSize={8} letterSpacing={1} fill="#1d2b36">
                  {"●".repeat(NUMBER_DOTS[hex.number] ?? 0)}
                </text>
              </g>
            )}

            {hex.hasRobber && (
              <g>
                <ellipse cx={center.x} cy={center.y + HEX_RENDER_SIZE * 0.45} rx={14} ry={18} fill="#2b2b2b" stroke="#fff" strokeWidth={1.5} />
                <text x={center.x} y={center.y + HEX_RENDER_SIZE * 0.45 + 5} textAnchor="middle" fontSize={11} fill="#fff">
                  盗賊
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* 港 */}
      {board.vertices
        .filter((v) => v.port)
        .map((v) => (
          <g key={`port-${v.id}`}>
            <circle cx={v.x} cy={v.y} r={5} fill="#1d2b36" stroke="#fff" strokeWidth={1} />
          </g>
        ))}
      {uniquePortLabels(board).map(({ x, y, port, id }) => (
        <g key={`port-label-${id}`}>
          <rect x={x - 22} y={y - 10} width={44} height={16} rx={4} fill="#1d2b36" opacity={0.85} />
          <text x={x} y={y + 2} textAnchor="middle" fontSize={9} fill="#fff">
            {PORT_LABEL[port]}
          </text>
        </g>
      ))}

      {/* 道 */}
      {board.edges.map((edge) => {
        const [a, b] = edge.vertexIds.map((id) => board.vertexById[id]);
        const clickable = selectableEdgeIds?.has(edge.id);
        const color = edge.road ? playerColor(edge.road.owner) : clickable ? "#fff45c" : "transparent";
        const width = edge.road ? 6 : clickable ? 8 : 10;
        return (
          <line
            key={edge.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={color}
            strokeWidth={width}
            strokeLinecap="round"
            opacity={edge.road ? 1 : clickable ? 0.9 : 0}
            onClick={clickable ? () => onEdgeClick?.(edge.id) : undefined}
            style={{ cursor: clickable ? "pointer" : "default", pointerEvents: clickable || edge.road ? "auto" : "none" }}
          />
        );
      })}

      {/* 頂点 (開拓地・街) */}
      {board.vertices.map((vertex) => {
        const clickable = selectableVertexIds?.has(vertex.id);
        if (vertex.building) {
          const color = playerColor(vertex.building.owner);
          const isCity = vertex.building.type === "city";
          return (
            <g key={vertex.id}>
              {isCity ? (
                <rect x={vertex.x - 9} y={vertex.y - 9} width={18} height={18} fill={color} stroke="#1d2b36" strokeWidth={1.5} />
              ) : (
                <circle cx={vertex.x} cy={vertex.y} r={8} fill={color} stroke="#1d2b36" strokeWidth={1.5} />
              )}
            </g>
          );
        }
        if (clickable) {
          return (
            <circle
              key={vertex.id}
              cx={vertex.x}
              cy={vertex.y}
              r={9}
              fill="#fff45c"
              stroke="#1d2b36"
              strokeWidth={1.5}
              opacity={0.9}
              onClick={() => onVertexClick?.(vertex.id)}
              style={{ cursor: "pointer" }}
            />
          );
        }
        return null;
      })}
    </svg>
  );
}

function terrainResource(terrain: Terrain): Resource | null {
  const map: Record<Terrain, Resource | null> = {
    forest: "wood",
    pasture: "wool",
    fields: "grain",
    hills: "brick",
    mountains: "ore",
    desert: null,
  };
  return map[terrain];
}

function computeBounds(board: Board) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const hex of board.hexes) {
    const center = axialToPixel(hex.q, hex.r);
    for (let i = 0; i < 6; i++) {
      const c = hexCorner(center, i);
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x);
      maxY = Math.max(maxY, c.y);
    }
  }
  const margin = HEX_RENDER_SIZE * 0.7;
  minX -= margin;
  minY -= margin;
  maxX += margin;
  maxY += margin;
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

// 同じ港が2つの頂点に付与されるため、ラベルは中点に1つだけ表示する
function uniquePortLabels(board: Board): { id: string; x: number; y: number; port: PortType }[] {
  const seen = new Map<string, { id: string; x: number; y: number; port: PortType; count: number; sumX: number; sumY: number }>();
  for (const vertex of board.vertices) {
    if (!vertex.port) continue;
    // 同じ港を共有する頂点同士はその辺で繋がっているはずなので、edge 単位でグループ化する
    for (const edgeId of vertex.edgeIds) {
      const edge = board.edgeById[edgeId];
      const other = board.vertexById[edge.vertexIds[0] === vertex.id ? edge.vertexIds[1] : edge.vertexIds[0]];
      if (other.port !== vertex.port) continue;
      const key = [vertex.id, other.id].sort().join("|") + `|${vertex.port}`;
      if (seen.has(key)) continue;
      const cx = (vertex.x + other.x) / 2;
      const cy = (vertex.y + other.y) / 2;
      // 港は海側に少しオフセットして表示する
      const dirX = cx - 0;
      const dirY = cy - 0;
      const len = Math.hypot(dirX, dirY) || 1;
      const offset = 26;
      seen.set(key, {
        id: key,
        x: cx + (dirX / len) * offset,
        y: cy + (dirY / len) * offset,
        port: vertex.port,
        count: 1,
        sumX: cx,
        sumY: cy,
      });
    }
  }
  return [...seen.values()];
}
