module.exports = [
"[project]/src/lib/game/types.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// カタンのドメイン型定義
__turbopack_context__.s([
    "BANK_RESOURCE_COUNT",
    ()=>BANK_RESOURCE_COUNT,
    "BUILDING_COST",
    ()=>BUILDING_COST,
    "DEV_CARD_LABEL",
    ()=>DEV_CARD_LABEL,
    "RESOURCES",
    ()=>RESOURCES,
    "RESOURCE_LABEL",
    ()=>RESOURCE_LABEL,
    "TERRAIN_LABEL",
    ()=>TERRAIN_LABEL,
    "TERRAIN_RESOURCE",
    ()=>TERRAIN_RESOURCE,
    "VICTORY_POINTS_TO_WIN",
    ()=>VICTORY_POINTS_TO_WIN,
    "emptyResourceCount",
    ()=>emptyResourceCount
]);
const RESOURCES = [
    "wood",
    "brick",
    "wool",
    "grain",
    "ore"
];
const TERRAIN_RESOURCE = {
    forest: "wood",
    hills: "brick",
    pasture: "wool",
    fields: "grain",
    mountains: "ore",
    desert: null
};
const RESOURCE_LABEL = {
    wood: "木材",
    brick: "レンガ",
    wool: "羊毛",
    grain: "小麦",
    ore: "鉱石"
};
const TERRAIN_LABEL = {
    forest: "森林",
    hills: "丘陵",
    pasture: "牧草地",
    fields: "畑",
    mountains: "山",
    desert: "砂漠"
};
function emptyResourceCount() {
    return {
        wood: 0,
        brick: 0,
        wool: 0,
        grain: 0,
        ore: 0
    };
}
const DEV_CARD_LABEL = {
    knight: "騎士",
    roadBuilding: "街道建設",
    yearOfPlenty: "発見",
    monopoly: "独占",
    victoryPoint: "勝利点"
};
const VICTORY_POINTS_TO_WIN = 10;
const BANK_RESOURCE_COUNT = 19;
const BUILDING_COST = {
    road: {
        wood: 1,
        brick: 1
    },
    settlement: {
        wood: 1,
        brick: 1,
        wool: 1,
        grain: 1
    },
    city: {
        ore: 3,
        grain: 2
    },
    devCard: {
        ore: 1,
        wool: 1,
        grain: 1
    }
};
}),
"[project]/src/lib/game/board.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// 六角形ボードの生成ロジック (タイル・頂点・辺・港の生成)
__turbopack_context__.s([
    "HEX_RENDER_SIZE",
    ()=>HEX_RENDER_SIZE,
    "axialToPixel",
    ()=>axialToPixel,
    "generateBoard",
    ()=>generateBoard,
    "hexCorner",
    ()=>hexCorner,
    "shuffle",
    ()=>shuffle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/game/types.ts [app-ssr] (ecmascript)");
;
const HEX_RADIUS = 2; // 半径2の六角形配置 = 19タイル
const HEX_SIZE = 60; // 描画サイズの基準値 (px)
// 基本セット(3〜4人用)の地形タイル枚数
const TERRAIN_COUNTS = {
    forest: 4,
    pasture: 4,
    fields: 4,
    hills: 3,
    mountains: 3,
    desert: 1
};
// 数字チップ(合計18枚, 7は含まない)
const NUMBER_CHIPS = [
    2,
    3,
    3,
    4,
    4,
    5,
    5,
    6,
    6,
    8,
    8,
    9,
    9,
    10,
    10,
    11,
    11,
    12
];
// 港の構成: 一般港(3:1) x4, 専門港(2:1) x5(資源ごとに1つ)
function buildPortDeck() {
    const ports = [
        "generic",
        "generic",
        "generic",
        "generic"
    ];
    for (const resource of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCES"]){
        ports.push(resource);
    }
    return shuffle(ports);
}
function shuffle(arr) {
    const copy = [
        ...arr
    ];
    for(let i = copy.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [
            copy[j],
            copy[i]
        ];
    }
    return copy;
}
function axialToPixel(q, r) {
    // フラットトップ六角形のレイアウト (Red Blob Games の式に基づく)
    const x = HEX_SIZE * (1.5 * q);
    const y = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
    return {
        x,
        y
    };
}
function hexCorner(center, i) {
    const angleDeg = 60 * i;
    const angleRad = Math.PI / 180 * angleDeg;
    return {
        x: center.x + HEX_SIZE * Math.cos(angleRad),
        y: center.y + HEX_SIZE * Math.sin(angleRad)
    };
}
function roundKey(x, y) {
    return `${Math.round(x * 100)}:${Math.round(y * 100)}`;
}
function generateAxialCoords() {
    const coords = [];
    for(let q = -HEX_RADIUS; q <= HEX_RADIUS; q++){
        const rMin = Math.max(-HEX_RADIUS, -q - HEX_RADIUS);
        const rMax = Math.min(HEX_RADIUS, -q + HEX_RADIUS);
        for(let r = rMin; r <= rMax; r++){
            coords.push({
                q,
                r
            });
        }
    }
    return coords;
}
function buildTerrainDeck() {
    const deck = [];
    for (const terrain of Object.keys(TERRAIN_COUNTS)){
        for(let i = 0; i < TERRAIN_COUNTS[terrain]; i++)deck.push(terrain);
    }
    return shuffle(deck);
}
// 数字チップを配置する。"6"と"8"が隣接しないように調整する。
function assignNumberChips(hexes) {
    const nonDesert = hexes.filter((h)=>h.terrain !== "desert");
    const adjacency = computeHexAdjacency(hexes);
    let attempt = 0;
    while(attempt < 200){
        attempt++;
        const chips = shuffle(NUMBER_CHIPS);
        const assignment = new Map();
        nonDesert.forEach((hex, i)=>assignment.set(hex.id, chips[i]));
        let conflict = false;
        for (const hex of nonDesert){
            const num = assignment.get(hex.id);
            if (num !== 6 && num !== 8) continue;
            for (const neighborId of adjacency[hex.id]){
                const neighborNum = assignment.get(neighborId);
                if (neighborNum === 6 || neighborNum === 8) {
                    conflict = true;
                    break;
                }
            }
            if (conflict) break;
        }
        if (!conflict) {
            for (const hex of nonDesert)hex.number = assignment.get(hex.id);
            return;
        }
    }
    // 200回試行しても解決しない場合はそのまま割り当てる(理論上ほぼ起こらない)
    const chips = shuffle(NUMBER_CHIPS);
    nonDesert.forEach((hex, i)=>hex.number = chips[i]);
}
function computeHexAdjacency(hexes) {
    const byCoord = new Map();
    for (const hex of hexes)byCoord.set(`${hex.q}:${hex.r}`, hex);
    const directions = [
        [
            1,
            0
        ],
        [
            1,
            -1
        ],
        [
            0,
            -1
        ],
        [
            -1,
            0
        ],
        [
            -1,
            1
        ],
        [
            0,
            1
        ]
    ];
    const adjacency = {};
    for (const hex of hexes){
        const neighbors = [];
        for (const [dq, dr] of directions){
            const neighbor = byCoord.get(`${hex.q + dq}:${hex.r + dr}`);
            if (neighbor) neighbors.push(neighbor.id);
        }
        adjacency[hex.id] = neighbors;
    }
    return adjacency;
}
function generateBoard() {
    const coords = generateAxialCoords();
    const terrainDeck = buildTerrainDeck();
    const hexes = coords.map((coord, i)=>{
        const terrain = terrainDeck[i];
        return {
            id: `hex-${coord.q}-${coord.r}`,
            q: coord.q,
            r: coord.r,
            terrain,
            number: null,
            hasRobber: terrain === "desert"
        };
    });
    assignNumberChips(hexes);
    // 頂点と辺の生成 (隣接する六角形で座標を共有するため、丸めた座標でデデュープする)
    const vertexByKey = new Map();
    const edgeByKey = new Map();
    function getOrCreateVertex(x, y) {
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
                building: null
            };
            vertexByKey.set(key, vertex);
        }
        return vertex;
    }
    function getOrCreateEdge(a, b) {
        const key = [
            a.id,
            b.id
        ].sort().join("|");
        let edge = edgeByKey.get(key);
        if (!edge) {
            edge = {
                id: `e-${edgeByKey.size}`,
                vertexIds: [
                    a.id,
                    b.id
                ],
                hexIds: [],
                road: null
            };
            edgeByKey.set(key, edge);
            a.edgeIds.push(edge.id);
            b.edgeIds.push(edge.id);
            if (!a.adjacentVertexIds.includes(b.id)) a.adjacentVertexIds.push(b.id);
            if (!b.adjacentVertexIds.includes(a.id)) b.adjacentVertexIds.push(a.id);
        }
        return edge;
    }
    for (const hex of hexes){
        const center = axialToPixel(hex.q, hex.r);
        const corners = [
            0,
            1,
            2,
            3,
            4,
            5
        ].map((i)=>hexCorner(center, i));
        const vertices = corners.map((c)=>getOrCreateVertex(c.x, c.y));
        for (const v of vertices){
            if (!v.hexIds.includes(hex.id)) v.hexIds.push(hex.id);
        }
        for(let i = 0; i < 6; i++){
            const a = vertices[i];
            const b = vertices[(i + 1) % 6];
            const edge = getOrCreateEdge(a, b);
            if (!edge.hexIds.includes(hex.id)) edge.hexIds.push(hex.id);
        }
    }
    const vertices = [
        ...vertexByKey.values()
    ];
    const edges = [
        ...edgeByKey.values()
    ];
    assignPorts(vertices, edges);
    const hexById = {};
    for (const h of hexes)hexById[h.id] = h;
    const vertexById = {};
    for (const v of vertices)vertexById[v.id] = v;
    const edgeById = {};
    for (const e of edges)edgeById[e.id] = e;
    return {
        hexes,
        vertices,
        edges,
        hexById,
        vertexById,
        edgeById
    };
}
// 海岸線 (隣接する六角形が1つしかない辺) を周回順に並べ、9箇所に港を配置する
function assignPorts(vertices, edges) {
    const coastalEdges = edges.filter((e)=>e.hexIds.length === 1);
    if (coastalEdges.length === 0) return;
    const center = {
        x: 0,
        y: 0
    };
    const angleOf = (e)=>{
        const [a, b] = e.vertexIds.map((id)=>vertices.find((v)=>v.id === id));
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        return Math.atan2(my - center.y, mx - center.x);
    };
    const ordered = [
        ...coastalEdges
    ].sort((e1, e2)=>angleOf(e1) - angleOf(e2));
    const portDeck = buildPortDeck();
    const portCount = portDeck.length; // 9
    for(let i = 0; i < portCount; i++){
        const edgeIndex = Math.floor(i * ordered.length / portCount);
        const edge = ordered[edgeIndex];
        const portType = portDeck[i];
        for (const vId of edge.vertexIds){
            const vertex = vertices.find((v)=>v.id === vId);
            vertex.port = portType;
        }
    }
}
const HEX_RENDER_SIZE = HEX_SIZE;
}),
"[project]/src/components/BoardView.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>BoardView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
// 盤面を SVG で描画するコンポーネント
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$board$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/game/board.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/game/types.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
const TERRAIN_COLOR = {
    forest: "#2f6f4f",
    pasture: "#9bd770",
    fields: "#f2cf5b",
    hills: "#d97a45",
    mountains: "#9aa0a6",
    desert: "#e8d6a0"
};
const TERRAIN_TEXT_COLOR = {
    forest: "#eafff2",
    pasture: "#1f3d0f",
    fields: "#4a3a05",
    hills: "#3a1d08",
    mountains: "#202325",
    desert: "#5a4a25"
};
const PORT_LABEL = {
    generic: "3:1",
    wood: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCE_LABEL"].wood}2:1`,
    brick: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCE_LABEL"].brick}2:1`,
    wool: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCE_LABEL"].wool}2:1`,
    grain: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCE_LABEL"].grain}2:1`,
    ore: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCE_LABEL"].ore}2:1`
};
const NUMBER_DOTS = {
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
    8: 5,
    9: 4,
    10: 3,
    11: 2,
    12: 1
};
function BoardView({ state, selectableVertexIds, selectableEdgeIds, selectableHexIds, onVertexClick, onEdgeClick, onHexClick }) {
    const { board } = state;
    const bounds = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>computeBounds(board), [
        board
    ]);
    const playerColor = (id)=>state.players.find((p)=>p.id === id)?.color ?? "#888";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        viewBox: `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`,
        className: "w-full h-auto select-none",
        role: "img",
        "aria-label": "カタンの盤面",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: bounds.minX,
                y: bounds.minY,
                width: bounds.width,
                height: bounds.height,
                fill: "#3f7ea6"
            }, void 0, false, {
                fileName: "[project]/src/components/BoardView.tsx",
                lineNumber: 82,
                columnNumber: 7
            }, this),
            board.hexes.map((hex)=>{
                const center = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$board$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["axialToPixel"])(hex.q, hex.r);
                const corners = [
                    0,
                    1,
                    2,
                    3,
                    4,
                    5
                ].map((i)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$board$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexCorner"])(center, i));
                const points = corners.map((c)=>`${c.x},${c.y}`).join(" ");
                const clickable = selectableHexIds?.has(hex.id);
                const resource = terrainResource(hex.terrain);
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                    onClick: clickable ? ()=>onHexClick?.(hex.id) : undefined,
                    style: {
                        cursor: clickable ? "pointer" : "default"
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("polygon", {
                            points: points,
                            fill: TERRAIN_COLOR[hex.terrain],
                            stroke: clickable ? "#fff45c" : "#1d2b36",
                            strokeWidth: clickable ? 4 : 1.5
                        }, void 0, false, {
                            fileName: "[project]/src/components/BoardView.tsx",
                            lineNumber: 98,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("text", {
                            x: center.x,
                            y: center.y - __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$board$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HEX_RENDER_SIZE"] * 0.42,
                            textAnchor: "middle",
                            fontSize: 11,
                            fill: TERRAIN_TEXT_COLOR[hex.terrain],
                            children: [
                                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TERRAIN_LABEL"][hex.terrain],
                                resource ? ` (${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCE_LABEL"][resource]})` : ""
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/BoardView.tsx",
                            lineNumber: 104,
                            columnNumber: 13
                        }, this),
                        hex.number !== null && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                    cx: center.x,
                                    cy: center.y,
                                    r: 18,
                                    fill: "#f5ecd6",
                                    stroke: "#1d2b36",
                                    strokeWidth: 1
                                }, void 0, false, {
                                    fileName: "[project]/src/components/BoardView.tsx",
                                    lineNumber: 111,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("text", {
                                    x: center.x,
                                    y: center.y + 6,
                                    textAnchor: "middle",
                                    fontSize: 18,
                                    fontWeight: "bold",
                                    fill: hex.number === 6 || hex.number === 8 ? "#c0392b" : "#1d2b36",
                                    children: hex.number
                                }, void 0, false, {
                                    fileName: "[project]/src/components/BoardView.tsx",
                                    lineNumber: 112,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("text", {
                                    x: center.x,
                                    y: center.y + 16,
                                    textAnchor: "middle",
                                    fontSize: 8,
                                    letterSpacing: 1,
                                    fill: "#1d2b36",
                                    children: "●".repeat(NUMBER_DOTS[hex.number] ?? 0)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/BoardView.tsx",
                                    lineNumber: 122,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/BoardView.tsx",
                            lineNumber: 110,
                            columnNumber: 15
                        }, this),
                        hex.hasRobber && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                                    cx: center.x,
                                    cy: center.y + __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$board$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HEX_RENDER_SIZE"] * 0.45,
                                    rx: 14,
                                    ry: 18,
                                    fill: "#2b2b2b",
                                    stroke: "#fff",
                                    strokeWidth: 1.5
                                }, void 0, false, {
                                    fileName: "[project]/src/components/BoardView.tsx",
                                    lineNumber: 130,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("text", {
                                    x: center.x,
                                    y: center.y + __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$board$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HEX_RENDER_SIZE"] * 0.45 + 5,
                                    textAnchor: "middle",
                                    fontSize: 11,
                                    fill: "#fff",
                                    children: "盗賊"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/BoardView.tsx",
                                    lineNumber: 131,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/BoardView.tsx",
                            lineNumber: 129,
                            columnNumber: 15
                        }, this)
                    ]
                }, hex.id, true, {
                    fileName: "[project]/src/components/BoardView.tsx",
                    lineNumber: 93,
                    columnNumber: 11
                }, this);
            }),
            board.vertices.filter((v)=>v.port).map((v)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: v.x,
                        cy: v.y,
                        r: 5,
                        fill: "#1d2b36",
                        stroke: "#fff",
                        strokeWidth: 1
                    }, void 0, false, {
                        fileName: "[project]/src/components/BoardView.tsx",
                        lineNumber: 145,
                        columnNumber: 13
                    }, this)
                }, `port-${v.id}`, false, {
                    fileName: "[project]/src/components/BoardView.tsx",
                    lineNumber: 144,
                    columnNumber: 11
                }, this)),
            uniquePortLabels(board).map(({ x, y, port, id })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: x - 22,
                            y: y - 10,
                            width: 44,
                            height: 16,
                            rx: 4,
                            fill: "#1d2b36",
                            opacity: 0.85
                        }, void 0, false, {
                            fileName: "[project]/src/components/BoardView.tsx",
                            lineNumber: 150,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("text", {
                            x: x,
                            y: y + 2,
                            textAnchor: "middle",
                            fontSize: 9,
                            fill: "#fff",
                            children: PORT_LABEL[port]
                        }, void 0, false, {
                            fileName: "[project]/src/components/BoardView.tsx",
                            lineNumber: 151,
                            columnNumber: 11
                        }, this)
                    ]
                }, `port-label-${id}`, true, {
                    fileName: "[project]/src/components/BoardView.tsx",
                    lineNumber: 149,
                    columnNumber: 9
                }, this)),
            board.edges.map((edge)=>{
                const [a, b] = edge.vertexIds.map((id)=>board.vertexById[id]);
                const clickable = selectableEdgeIds?.has(edge.id);
                const color = edge.road ? playerColor(edge.road.owner) : clickable ? "#fff45c" : "transparent";
                const width = edge.road ? 6 : clickable ? 8 : 10;
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                    x1: a.x,
                    y1: a.y,
                    x2: b.x,
                    y2: b.y,
                    stroke: color,
                    strokeWidth: width,
                    strokeLinecap: "round",
                    opacity: edge.road ? 1 : clickable ? 0.9 : 0,
                    onClick: clickable ? ()=>onEdgeClick?.(edge.id) : undefined,
                    style: {
                        cursor: clickable ? "pointer" : "default",
                        pointerEvents: clickable || edge.road ? "auto" : "none"
                    }
                }, edge.id, false, {
                    fileName: "[project]/src/components/BoardView.tsx",
                    lineNumber: 164,
                    columnNumber: 11
                }, this);
            }),
            board.vertices.map((vertex)=>{
                const clickable = selectableVertexIds?.has(vertex.id);
                if (vertex.building) {
                    const color = playerColor(vertex.building.owner);
                    const isCity = vertex.building.type === "city";
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                        children: isCity ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: vertex.x - 9,
                            y: vertex.y - 9,
                            width: 18,
                            height: 18,
                            fill: color,
                            stroke: "#1d2b36",
                            strokeWidth: 1.5
                        }, void 0, false, {
                            fileName: "[project]/src/components/BoardView.tsx",
                            lineNumber: 189,
                            columnNumber: 17
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                            cx: vertex.x,
                            cy: vertex.y,
                            r: 8,
                            fill: color,
                            stroke: "#1d2b36",
                            strokeWidth: 1.5
                        }, void 0, false, {
                            fileName: "[project]/src/components/BoardView.tsx",
                            lineNumber: 191,
                            columnNumber: 17
                        }, this)
                    }, vertex.id, false, {
                        fileName: "[project]/src/components/BoardView.tsx",
                        lineNumber: 187,
                        columnNumber: 13
                    }, this);
                }
                if (clickable) {
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: vertex.x,
                        cy: vertex.y,
                        r: 9,
                        fill: "#fff45c",
                        stroke: "#1d2b36",
                        strokeWidth: 1.5,
                        opacity: 0.9,
                        onClick: ()=>onVertexClick?.(vertex.id),
                        style: {
                            cursor: "pointer"
                        }
                    }, vertex.id, false, {
                        fileName: "[project]/src/components/BoardView.tsx",
                        lineNumber: 198,
                        columnNumber: 13
                    }, this);
                }
                return null;
            })
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/BoardView.tsx",
        lineNumber: 75,
        columnNumber: 5
    }, this);
}
function terrainResource(terrain) {
    const map = {
        forest: "wood",
        pasture: "wool",
        fields: "grain",
        hills: "brick",
        mountains: "ore",
        desert: null
    };
    return map[terrain];
}
function computeBounds(board) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const hex of board.hexes){
        const center = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$board$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["axialToPixel"])(hex.q, hex.r);
        for(let i = 0; i < 6; i++){
            const c = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$board$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexCorner"])(center, i);
            minX = Math.min(minX, c.x);
            minY = Math.min(minY, c.y);
            maxX = Math.max(maxX, c.x);
            maxY = Math.max(maxY, c.y);
        }
    }
    const margin = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$board$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HEX_RENDER_SIZE"] * 0.7;
    minX -= margin;
    minY -= margin;
    maxX += margin;
    maxY += margin;
    return {
        minX,
        minY,
        width: maxX - minX,
        height: maxY - minY
    };
}
// 同じ港が2つの頂点に付与されるため、ラベルは中点に1つだけ表示する
function uniquePortLabels(board) {
    const seen = new Map();
    for (const vertex of board.vertices){
        if (!vertex.port) continue;
        // 同じ港を共有する頂点同士はその辺で繋がっているはずなので、edge 単位でグループ化する
        for (const edgeId of vertex.edgeIds){
            const edge = board.edgeById[edgeId];
            const other = board.vertexById[edge.vertexIds[0] === vertex.id ? edge.vertexIds[1] : edge.vertexIds[0]];
            if (other.port !== vertex.port) continue;
            const key = [
                vertex.id,
                other.id
            ].sort().join("|") + `|${vertex.port}`;
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
                x: cx + dirX / len * offset,
                y: cy + dirY / len * offset,
                port: vertex.port,
                count: 1,
                sumX: cx,
                sumY: cy
            });
        }
    }
    return [
        ...seen.values()
    ];
}
}),
"[project]/src/lib/game/selectors.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ゲーム状態に対する派生情報の計算 (勝利点, 配置可否, 最長交易路 など)
__turbopack_context__.s([
    "calculateLongestRoad",
    ()=>calculateLongestRoad,
    "canPlaceRoad",
    ()=>canPlaceRoad,
    "canPlaceSettlement",
    ()=>canPlaceSettlement,
    "canUpgradeToCity",
    ()=>canUpgradeToCity,
    "checkWinner",
    ()=>checkWinner,
    "currentPlayer",
    ()=>currentPlayer,
    "getEdge",
    ()=>getEdge,
    "getPlayer",
    ()=>getPlayer,
    "getVertex",
    ()=>getVertex,
    "hasResources",
    ()=>hasResources,
    "playersAdjacentToHex",
    ()=>playersAdjacentToHex,
    "publicVictoryPoints",
    ()=>publicVictoryPoints,
    "recomputeLargestArmy",
    ()=>recomputeLargestArmy,
    "recomputeLongestRoad",
    ()=>recomputeLongestRoad,
    "resourceTotal",
    ()=>resourceTotal,
    "totalVictoryPoints",
    ()=>totalVictoryPoints,
    "verticesAdjacentToHex",
    ()=>verticesAdjacentToHex,
    "violatesDistanceRule",
    ()=>violatesDistanceRule
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/game/types.ts [app-ssr] (ecmascript)");
;
function getPlayer(state, playerId) {
    const player = state.players.find((p)=>p.id === playerId);
    if (!player) throw new Error(`player not found: ${playerId}`);
    return player;
}
function currentPlayer(state) {
    return state.players[state.currentPlayerIndex];
}
function resourceTotal(player) {
    return Object.values(player.resources).reduce((a, b)=>a + b, 0);
}
function hasResources(player, cost) {
    for (const [resource, amount] of Object.entries(cost)){
        if ((player.resources[resource] ?? 0) < amount) return false;
    }
    return true;
}
function publicVictoryPoints(state, playerId) {
    return computeVictoryPoints(state, playerId, false);
}
function totalVictoryPoints(state, playerId) {
    return computeVictoryPoints(state, playerId, true);
}
function computeVictoryPoints(state, playerId, includeHidden) {
    let points = 0;
    for (const vertex of state.board.vertices){
        if (vertex.building?.owner !== playerId) continue;
        points += vertex.building.type === "city" ? 2 : 1;
    }
    if (state.longestRoadOwner === playerId) points += 2;
    if (state.largestArmyOwner === playerId) points += 2;
    if (includeHidden) {
        const player = getPlayer(state, playerId);
        points += player.devCards.filter((c)=>c === "victoryPoint").length;
    }
    return points;
}
function checkWinner(state, playerId) {
    return totalVictoryPoints(state, playerId) >= __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VICTORY_POINTS_TO_WIN"];
}
function getVertex(state, vertexId) {
    const vertex = state.board.vertexById[vertexId];
    if (!vertex) throw new Error(`vertex not found: ${vertexId}`);
    return vertex;
}
function getEdge(state, edgeId) {
    const edge = state.board.edgeById[edgeId];
    if (!edge) throw new Error(`edge not found: ${edgeId}`);
    return edge;
}
function violatesDistanceRule(state, vertexId) {
    const vertex = getVertex(state, vertexId);
    if (vertex.building) return true;
    for (const adjId of vertex.adjacentVertexIds){
        if (getVertex(state, adjId).building) return true;
    }
    return false;
}
// 指定プレイヤーの街道網が、ある頂点に接続しているか
function vertexConnectedToPlayerNetwork(state, playerId, vertexId) {
    const vertex = getVertex(state, vertexId);
    if (vertex.building?.owner === playerId) return true;
    for (const edgeId of vertex.edgeIds){
        const edge = getEdge(state, edgeId);
        if (edge.road?.owner === playerId) return true;
    }
    return false;
}
function canPlaceSettlement(state, playerId, vertexId, isSetup) {
    if (violatesDistanceRule(state, vertexId)) return false;
    if (isSetup) return true;
    return vertexConnectedToPlayerNetwork(state, playerId, vertexId);
}
function canPlaceRoad(state, playerId, edgeId, options) {
    const edge = getEdge(state, edgeId);
    if (edge.road) return false;
    if (options?.isSetup) {
        const anchor = options.setupAnchorVertexId;
        return !!anchor && (edge.vertexIds[0] === anchor || edge.vertexIds[1] === anchor);
    }
    for (const vId of edge.vertexIds){
        const vertex = getVertex(state, vId);
        // 自分の建物がある頂点からは常に接続可能
        if (vertex.building?.owner === playerId) return true;
        // 敵の建物がある頂点は通過できないが、そこに自分の道がもう無い限り起点にはできる
        if (vertex.building && vertex.building.owner !== playerId) continue;
        for (const adjEdgeId of vertex.edgeIds){
            if (adjEdgeId === edgeId) continue;
            const adjEdge = getEdge(state, adjEdgeId);
            if (adjEdge.road?.owner === playerId) return true;
        }
    }
    return false;
}
function canUpgradeToCity(state, playerId, vertexId) {
    const vertex = getVertex(state, vertexId);
    return vertex.building?.owner === playerId && vertex.building.type === "settlement";
}
function calculateLongestRoad(state, playerId) {
    const ownedEdges = state.board.edges.filter((e)=>e.road?.owner === playerId);
    if (ownedEdges.length === 0) return 0;
    const ownedEdgeIds = new Set(ownedEdges.map((e)=>e.id));
    // 頂点 -> 自分の道で繋がっている隣接辺のリスト
    const vertexEdges = new Map();
    for (const edge of ownedEdges){
        for (const vId of edge.vertexIds){
            if (!vertexEdges.has(vId)) vertexEdges.set(vId, []);
            vertexEdges.get(vId).push(edge.id);
        }
    }
    let best = 0;
    function dfs(vertexId, visitedEdges) {
        best = Math.max(best, visitedEdges.size);
        const vertex = getVertex(state, vertexId);
        // 他プレイヤーの建物がある頂点はそこで経路が分断される
        if (vertex.building && vertex.building.owner !== playerId) return;
        for (const edgeId of vertexEdges.get(vertexId) ?? []){
            if (visitedEdges.has(edgeId)) continue;
            const edge = getEdge(state, edgeId);
            const nextVertexId = edge.vertexIds[0] === vertexId ? edge.vertexIds[1] : edge.vertexIds[0];
            visitedEdges.add(edgeId);
            dfs(nextVertexId, visitedEdges);
            visitedEdges.delete(edgeId);
        }
    }
    for (const vertexId of vertexEdges.keys()){
        dfs(vertexId, new Set());
    }
    return Math.min(best, ownedEdgeIds.size);
}
function recomputeLongestRoad(state) {
    const MIN_LENGTH = 5;
    let bestPlayer = state.longestRoadOwner;
    let bestLength = bestPlayer ? calculateLongestRoad(state, bestPlayer) : 0;
    if (bestLength < MIN_LENGTH) {
        bestPlayer = null;
        bestLength = 0;
    }
    for (const player of state.players){
        const length = calculateLongestRoad(state, player.id);
        if (length >= MIN_LENGTH && length > bestLength) {
            bestLength = length;
            bestPlayer = player.id;
        }
    }
    return bestPlayer;
}
function recomputeLargestArmy(state) {
    const MIN_KNIGHTS = 3;
    let bestPlayer = state.largestArmyOwner;
    let bestCount = bestPlayer ? getPlayer(state, bestPlayer).knightsPlayed : 0;
    if (bestCount < MIN_KNIGHTS) {
        bestPlayer = null;
        bestCount = 0;
    }
    for (const player of state.players){
        if (player.knightsPlayed >= MIN_KNIGHTS && player.knightsPlayed > bestCount) {
            bestCount = player.knightsPlayed;
            bestPlayer = player.id;
        }
    }
    return bestPlayer;
}
function verticesAdjacentToHex(state, hexId) {
    return state.board.vertices.filter((v)=>v.hexIds.includes(hexId));
}
function playersAdjacentToHex(state, hexId, excludePlayerId) {
    const owners = new Set();
    for (const vertex of verticesAdjacentToHex(state, hexId)){
        if (vertex.building && vertex.building.owner !== excludePlayerId) {
            owners.add(vertex.building.owner);
        }
    }
    return [
        ...owners
    ];
}
}),
"[project]/src/components/PlayerPanel.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PlayerPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
// 各プレイヤーの資源・カード・勝利点を表示するパネル
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/game/selectors.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/game/types.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
function PlayerPanel({ state, viewerId }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col gap-3",
        children: state.players.map((player, index)=>{
            const isCurrent = state.currentPlayerIndex === index && state.phase !== "gameOver";
            const isViewer = player.id === viewerId;
            const showHand = isViewer || player.kind === "cpu";
            const vp = isViewer ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["totalVictoryPoints"])(state, player.id) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["publicVictoryPoints"])(state, player.id);
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `rounded-lg border p-3 text-sm ${isCurrent ? "border-yellow-400 ring-2 ring-yellow-300 bg-white/90" : "border-slate-300 bg-white/70"}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "inline-block h-3 w-3 rounded-full",
                                        style: {
                                            backgroundColor: player.color
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/PlayerPanel.tsx",
                                        lineNumber: 31,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold",
                                        children: player.name
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/PlayerPanel.tsx",
                                        lineNumber: 32,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs text-slate-500",
                                        children: player.kind === "human" ? "人間" : "CPU"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/PlayerPanel.tsx",
                                        lineNumber: 33,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/PlayerPanel.tsx",
                                lineNumber: 30,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "font-bold text-slate-700",
                                children: [
                                    vp,
                                    " 点"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/PlayerPanel.tsx",
                                lineNumber: 35,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/PlayerPanel.tsx",
                        lineNumber: 29,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-2 grid grid-cols-5 gap-1 text-xs",
                        children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCES"].map((resource)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col items-center rounded bg-slate-100 py-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[10px] text-slate-500",
                                        children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCE_LABEL"][resource]
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/PlayerPanel.tsx",
                                        lineNumber: 41,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold",
                                        children: showHand ? player.resources[resource] : "?"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/PlayerPanel.tsx",
                                        lineNumber: 42,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, resource, true, {
                                fileName: "[project]/src/components/PlayerPanel.tsx",
                                lineNumber: 40,
                                columnNumber: 17
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/PlayerPanel.tsx",
                        lineNumber: 38,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    "手札合計: ",
                                    showHand ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resourceTotal"])(player) : "?"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/PlayerPanel.tsx",
                                lineNumber: 48,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    "発展カード: ",
                                    showHand ? player.devCards.length : player.devCards.length
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/PlayerPanel.tsx",
                                lineNumber: 49,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    "騎士使用: ",
                                    player.knightsPlayed
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/PlayerPanel.tsx",
                                lineNumber: 50,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    "残り 開拓地",
                                    player.settlementsLeft,
                                    "/街",
                                    player.citiesLeft,
                                    "/街道",
                                    player.roadsLeft
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/PlayerPanel.tsx",
                                lineNumber: 51,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/PlayerPanel.tsx",
                        lineNumber: 47,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-1 flex gap-2 text-xs",
                        children: [
                            state.longestRoadOwner === player.id && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "rounded bg-amber-200 px-2 py-0.5",
                                children: "最長交易路 +2"
                            }, void 0, false, {
                                fileName: "[project]/src/components/PlayerPanel.tsx",
                                lineNumber: 56,
                                columnNumber: 17
                            }, this),
                            state.largestArmyOwner === player.id && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "rounded bg-rose-200 px-2 py-0.5",
                                children: "最大騎士力 +2"
                            }, void 0, false, {
                                fileName: "[project]/src/components/PlayerPanel.tsx",
                                lineNumber: 59,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/PlayerPanel.tsx",
                        lineNumber: 54,
                        columnNumber: 13
                    }, this)
                ]
            }, player.id, true, {
                fileName: "[project]/src/components/PlayerPanel.tsx",
                lineNumber: 23,
                columnNumber: 11
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/src/components/PlayerPanel.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/GameLog.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>GameLog
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
function GameLog({ entries }) {
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
    }, [
        entries
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: "h-40 overflow-y-auto rounded-lg border border-slate-300 bg-white/80 p-2 text-xs leading-relaxed text-slate-700",
        children: entries.map((entry, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "border-b border-slate-100 py-0.5 last:border-none",
                children: entry
            }, i, false, {
                fileName: "[project]/src/components/GameLog.tsx",
                lineNumber: 15,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/src/components/GameLog.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/lib/game/engine.ts [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "addLog",
    ()=>addLog,
    "applyAction",
    ()=>applyAction,
    "bestTradeRate",
    ()=>bestTradeRate,
    "cloneState",
    ()=>cloneState
]);
// ゲームのアクション処理 (ルールエンジン本体)
// applyAction(state, action) は新しい GameState を返す純粋関数として実装する
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/game/selectors.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/game/types.ts [app-ssr] (ecmascript)");
;
;
function fail(state, message) {
    return {
        state,
        ok: false,
        message
    };
}
function ok(state, message) {
    return {
        state,
        ok: true,
        message
    };
}
function cloneState(state) {
    const hexes = state.board.hexes.map((h)=>({
            ...h
        }));
    const vertices = state.board.vertices.map((v)=>({
            ...v,
            hexIds: [
                ...v.hexIds
            ],
            edgeIds: [
                ...v.edgeIds
            ],
            adjacentVertexIds: [
                ...v.adjacentVertexIds
            ],
            building: v.building ? {
                ...v.building
            } : null
        }));
    const edges = state.board.edges.map((e)=>({
            ...e,
            vertexIds: [
                ...e.vertexIds
            ],
            hexIds: [
                ...e.hexIds
            ],
            road: e.road ? {
                ...e.road
            } : null
        }));
    const hexById = {};
    for (const h of hexes)hexById[h.id] = h;
    const vertexById = {};
    for (const v of vertices)vertexById[v.id] = v;
    const edgeById = {};
    for (const e of edges)edgeById[e.id] = e;
    const board = {
        hexes,
        vertices,
        edges,
        hexById,
        vertexById,
        edgeById
    };
    const players = state.players.map((p)=>({
            ...p,
            resources: {
                ...p.resources
            },
            devCards: [
                ...p.devCards
            ],
            newDevCards: [
                ...p.newDevCards
            ]
        }));
    return {
        ...state,
        board,
        players,
        bankResources: {
            ...state.bankResources
        },
        bankDevCards: [
            ...state.bankDevCards
        ],
        playersToDiscard: [
            ...state.playersToDiscard
        ],
        log: [
            ...state.log
        ]
    };
}
const MAX_LOG_LENGTH = 200;
function addLog(state, message) {
    state.log.push(message);
    if (state.log.length > MAX_LOG_LENGTH) state.log.splice(0, state.log.length - MAX_LOG_LENGTH);
}
function giveResources(state, player, resources) {
    for (const resource of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCES"]){
        const amount = resources[resource] ?? 0;
        if (amount === 0) continue;
        player.resources[resource] += amount;
        state.bankResources[resource] -= amount;
    }
}
function returnResourcesToBank(state, player, resources) {
    for (const resource of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCES"]){
        const amount = resources[resource] ?? 0;
        if (amount === 0) continue;
        player.resources[resource] -= amount;
        state.bankResources[resource] += amount;
    }
}
function payCost(state, player, cost) {
    returnResourcesToBank(state, player, cost);
}
function playerName(state, playerId) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId).name;
}
function isPlayersTurn(state, playerId) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["currentPlayer"])(state).id === playerId;
}
function checkAndApplyVictory(state, playerId) {
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["totalVictoryPoints"])(state, playerId) >= 10) {
        state.winner = playerId;
        state.phase = "gameOver";
        addLog(state, `${playerName(state, playerId)} さんが10点に到達し、勝利しました!`);
    }
}
// === セットアップフェイズ ===
function placeSetupSettlement(state, playerId, vertexId) {
    if (state.phase !== "setup-settlement-1" && state.phase !== "setup-settlement-2") {
        return fail(state, "今は開拓地を初期配置するタイミングではありません。");
    }
    if (state.setupOrder[state.setupIndex] !== playerId) return fail(state, "あなたの番ではありません。");
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canPlaceSettlement"])(state, playerId, vertexId, true)) {
        return fail(state, "そこには開拓地を置けません(隣接する頂点に建物があります)。");
    }
    const next = cloneState(state);
    const vertex = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getVertex"])(next, vertexId);
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(next, playerId);
    vertex.building = {
        owner: playerId,
        type: "settlement"
    };
    player.settlementsLeft -= 1;
    next.setupPendingVertexId = vertexId;
    next.phase = state.phase === "setup-settlement-1" ? "setup-road-1" : "setup-road-2";
    addLog(next, `${player.name} さんが開拓地を配置しました。続けて街道を配置してください。`);
    return ok(next);
}
function placeSetupRoad(state, playerId, edgeId) {
    if (state.phase !== "setup-road-1" && state.phase !== "setup-road-2") {
        return fail(state, "今は街道を初期配置するタイミングではありません。");
    }
    if (state.setupOrder[state.setupIndex] !== playerId) return fail(state, "あなたの番ではありません。");
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canPlaceRoad"])(state, playerId, edgeId, {
        isSetup: true,
        setupAnchorVertexId: state.setupPendingVertexId
    })) {
        return fail(state, "その辺には街道を置けません(直前に置いた開拓地に隣接していません)。");
    }
    const next = cloneState(state);
    const edge = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getEdge"])(next, edgeId);
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(next, playerId);
    edge.road = {
        owner: playerId
    };
    player.roadsLeft -= 1;
    const isSecondRound = state.phase === "setup-road-2";
    if (isSecondRound && state.setupPendingVertexId) {
        // 2回目の配置では、隣接タイルから初期資源を獲得する
        const vertex = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getVertex"])(next, state.setupPendingVertexId);
        const granted = {};
        for (const hexId of vertex.hexIds){
            const hex = next.board.hexById[hexId];
            const resource = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TERRAIN_RESOURCE"][hex.terrain];
            if (!resource) continue;
            granted[resource] = (granted[resource] ?? 0) + 1;
        }
        giveResources(next, player, granted);
        const grantedText = Object.entries(granted).map(([resource, amount])=>`${resourceLabel(resource)}${amount}`).join(", ");
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
function resourceLabel(resource) {
    const labels = {
        wood: "木材",
        brick: "レンガ",
        wool: "羊毛",
        grain: "小麦",
        ore: "鉱石"
    };
    return labels[resource];
}
// === サイコロ・資源生産 ===
function rollDice(state, playerId) {
    if (state.phase !== "roll") return fail(state, "今はサイコロを振るタイミングではありません。");
    if (!isPlayersTurn(state, playerId)) return fail(state, "あなたの番ではありません。");
    const die1 = 1 + Math.floor(Math.random() * 6);
    const die2 = 1 + Math.floor(Math.random() * 6);
    const total = die1 + die2;
    const next = cloneState(state);
    next.lastDiceRoll = {
        die1,
        die2,
        total
    };
    addLog(next, `${playerName(next, playerId)} さんはサイコロを振り、${die1} と ${die2} (合計 ${total}) が出ました。`);
    if (total === 7) {
        handleSevenRolled(next);
        return ok(next);
    }
    produceResources(next, total);
    next.phase = "main";
    return ok(next);
}
function produceResources(state, total) {
    // (player, resource) -> 獲得予定枚数 を集計
    const claims = new Map();
    const demandByResource = {
        wood: 0,
        brick: 0,
        wool: 0,
        grain: 0,
        ore: 0
    };
    for (const hex of state.board.hexes){
        if (hex.number !== total || hex.hasRobber) continue;
        const resource = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TERRAIN_RESOURCE"][hex.terrain];
        if (!resource) continue;
        for (const vertex of (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["verticesAdjacentToHex"])(state, hex.id)){
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
    const shortageResources = new Set();
    for (const resource of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCES"]){
        if (demandByResource[resource] > state.bankResources[resource]) {
            shortageResources.add(resource);
        }
    }
    const summaries = [];
    for (const [playerId, granted] of claims){
        const filtered = {};
        for (const resource of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCES"]){
            if (shortageResources.has(resource)) continue;
            const amount = granted[resource] ?? 0;
            if (amount > 0) filtered[resource] = amount;
        }
        if (Object.keys(filtered).length === 0) continue;
        const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
        giveResources(state, player, filtered);
        const text = Object.entries(filtered).map(([resource, amount])=>`${resourceLabel(resource)}${amount}`).join(", ");
        summaries.push(`${player.name}: ${text}`);
    }
    if (shortageResources.size > 0) {
        const names = [
            ...shortageResources
        ].map(resourceLabel).join(", ");
        addLog(state, `銀行に ${names} の在庫が足りないため、その資源は誰にも配られませんでした。`);
    }
    if (summaries.length > 0) {
        addLog(state, `資源を生産しました -> ${summaries.join(" / ")}`);
    } else {
        addLog(state, "この目では資源は生産されませんでした。");
    }
}
function handleSevenRolled(state) {
    const toDiscard = [];
    for (const player of state.players){
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resourceTotal"])(player) > 7) toDiscard.push(player.id);
    }
    state.playersToDiscard = toDiscard;
    state.robberMovedBy = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["currentPlayer"])(state).id;
    if (toDiscard.length > 0) {
        state.phase = "discard";
        addLog(state, `7が出ました。手札が8枚以上のプレイヤー(${toDiscard.map((id)=>playerName(state, id)).join(", ")})は半分捨ててください。`);
    } else {
        state.phase = "moveRobber";
        addLog(state, "7が出ました。盗賊を移動させるタイルを選んでください。");
    }
}
function discard(state, playerId, discarded) {
    if (state.phase !== "discard") return fail(state, "今は捨て札のタイミングではありません。");
    if (!state.playersToDiscard.includes(playerId)) return fail(state, "あなたは捨て札の対象ではありません。");
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    const totalDiscard = Object.values(discarded).reduce((a, b)=>a + (b ?? 0), 0);
    const required = Math.floor((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resourceTotal"])(player) / 2);
    if (totalDiscard !== required) {
        return fail(state, `${required}枚捨てる必要があります。`);
    }
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hasResources"])(player, discarded)) return fail(state, "持っていない資源は捨てられません。");
    const next = cloneState(state);
    const nextPlayer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(next, playerId);
    returnResourcesToBank(next, nextPlayer, discarded);
    next.playersToDiscard = next.playersToDiscard.filter((id)=>id !== playerId);
    addLog(next, `${nextPlayer.name} さんが ${required} 枚のカードを捨てました。`);
    if (next.playersToDiscard.length === 0) {
        next.phase = "moveRobber";
        addLog(next, "盗賊を移動させるタイルを選んでください。");
    }
    return ok(next);
}
function moveRobber(state, playerId, hexId, targetPlayerId) {
    if (state.phase !== "moveRobber") return fail(state, "今は盗賊を移動させるタイミングではありません。");
    if (state.robberMovedBy !== playerId) return fail(state, "あなたが盗賊を移動させる番ではありません。");
    const hex = state.board.hexById[hexId];
    if (!hex) return fail(state, "そのタイルは存在しません。");
    if (hex.hasRobber) return fail(state, "盗賊は既にそのタイルにいます。すでに移動済みです。");
    const candidates = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["playersAdjacentToHex"])(state, hexId, playerId);
    if (targetPlayerId !== null && !candidates.includes(targetPlayerId)) {
        return fail(state, "そのプレイヤーから資源を奪うことはできません。");
    }
    const next = cloneState(state);
    for (const h of next.board.hexes)h.hasRobber = h.id === hexId;
    addLog(next, `${playerName(next, playerId)} さんが盗賊を移動させました。`);
    if (targetPlayerId) {
        const victim = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(next, targetPlayerId);
        const stealable = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCES"].filter((r)=>victim.resources[r] > 0);
        if (stealable.length > 0) {
            const resource = stealable[Math.floor(Math.random() * stealable.length)];
            victim.resources[resource] -= 1;
            const robber = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(next, playerId);
            robber.resources[resource] += 1;
            addLog(next, `${robber.name} さんは ${victim.name} さんから資源を1枚奪いました。`);
        }
    }
    next.robberMovedBy = null;
    next.phase = "main";
    return ok(next);
}
// === 建設 ===
function buildSettlement(state, playerId, vertexId) {
    if (state.phase !== "main") return fail(state, "今は建設できるタイミングではありません。");
    if (!isPlayersTurn(state, playerId)) return fail(state, "あなたの番ではありません。");
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    if (player.settlementsLeft <= 0) return fail(state, "開拓地のコマがもうありません。");
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hasResources"])(player, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].settlement)) {
        return fail(state, "資源が足りません(木材1, レンガ1, 羊毛1, 小麦1)。");
    }
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canPlaceSettlement"])(state, playerId, vertexId, false)) {
        return fail(state, "そこには開拓地を置けません(距離ルール、または街道が繋がっていません)。");
    }
    const next = cloneState(state);
    const nextPlayer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(next, playerId);
    payCost(next, nextPlayer, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].settlement);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getVertex"])(next, vertexId).building = {
        owner: playerId,
        type: "settlement"
    };
    nextPlayer.settlementsLeft -= 1;
    addLog(next, `${nextPlayer.name} さんが開拓地を建設しました。`);
    next.longestRoadOwner = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["recomputeLongestRoad"])(next);
    checkAndApplyVictory(next, playerId);
    return ok(next);
}
function buildCity(state, playerId, vertexId) {
    if (state.phase !== "main") return fail(state, "今は建設できるタイミングではありません。");
    if (!isPlayersTurn(state, playerId)) return fail(state, "あなたの番ではありません。");
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    if (player.citiesLeft <= 0) return fail(state, "街(都市)のコマがもうありません。");
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hasResources"])(player, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].city)) return fail(state, "資源が足りません(鉱石3, 小麦2)。");
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canUpgradeToCity"])(state, playerId, vertexId)) return fail(state, "そこは開拓地をアップグレードできません。");
    const next = cloneState(state);
    const nextPlayer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(next, playerId);
    payCost(next, nextPlayer, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].city);
    const vertex = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getVertex"])(next, vertexId);
    vertex.building = {
        owner: playerId,
        type: "city"
    };
    nextPlayer.settlementsLeft += 1;
    nextPlayer.citiesLeft -= 1;
    addLog(next, `${nextPlayer.name} さんが街(都市)に発展させました。`);
    checkAndApplyVictory(next, playerId);
    return ok(next);
}
// === 発展カード ===
function buyDevCard(state, playerId) {
    if (state.phase !== "main") return fail(state, "今は発展カードを購入できるタイミングではありません。");
    if (!isPlayersTurn(state, playerId)) return fail(state, "あなたの番ではありません。");
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hasResources"])(player, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].devCard)) return fail(state, "資源が足りません(鉱石1, 羊毛1, 小麦1)。");
    if (state.bankDevCards.length === 0) return fail(state, "発展カードの山札が尽きています。");
    const next = cloneState(state);
    const nextPlayer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(next, playerId);
    payCost(next, nextPlayer, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].devCard);
    const card = next.bankDevCards.pop();
    nextPlayer.devCards.push(card);
    nextPlayer.newDevCards.push(card);
    addLog(next, `${nextPlayer.name} さんが発展カードを購入しました。`);
    checkAndApplyVictory(next, playerId);
    return ok(next);
}
function canPlayDevCard(state, playerId, type) {
    if (state.phase !== "roll" && state.phase !== "main") {
        return {
            allowed: false,
            reason: "今は発展カードをプレイできるタイミングではありません。"
        };
    }
    if (!isPlayersTurn(state, playerId)) return {
        allowed: false,
        reason: "あなたの番ではありません。"
    };
    if (state.devCardPlayedThisTurn) return {
        allowed: false,
        reason: "このターンは既に発展カードをプレイ済みです。"
    };
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    const totalOfType = player.devCards.filter((c)=>c === type).length;
    const newOfType = player.newDevCards.filter((c)=>c === type).length;
    if (totalOfType <= newOfType) {
        return {
            allowed: false,
            reason: "そのカードは今ターン購入したばかりでプレイできません。"
        };
    }
    return {
        allowed: true
    };
}
function consumeDevCard(player, type) {
    const idx = player.devCards.indexOf(type);
    if (idx >= 0) player.devCards.splice(idx, 1);
}
function playKnight(state, playerId) {
    const check = canPlayDevCard(state, playerId, "knight");
    if (!check.allowed) return fail(state, check.reason);
    const next = cloneState(state);
    const nextPlayer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(next, playerId);
    consumeDevCard(nextPlayer, "knight");
    nextPlayer.knightsPlayed += 1;
    next.devCardPlayedThisTurn = true;
    next.robberMovedBy = playerId;
    next.phase = "moveRobber";
    addLog(next, `${nextPlayer.name} さんが騎士カードをプレイしました。盗賊を移動させてください。`);
    next.largestArmyOwner = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["recomputeLargestArmy"])(next);
    checkAndApplyVictory(next, playerId);
    return ok(next);
}
function playRoadBuilding(state, playerId) {
    const check = canPlayDevCard(state, playerId, "roadBuilding");
    if (!check.allowed) return fail(state, check.reason);
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    if (player.roadsLeft <= 0) return fail(state, "街道のコマがもうありません。");
    // 無料の街道を2本(置ける場所がある分だけ)建設できるようにフラグを立てる代わりに、
    // ここでは「次に建てる街道2本までは無料」という形でクライアント側に処理を委ねるのは複雑になるため、
    // 可能な場所が無くてもカードは消費し、後続の BUILD_ROAD 呼び出しでコストを免除するモードに入る。
    const next = cloneState(state);
    const nextPlayer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(next, playerId);
    consumeDevCard(nextPlayer, "roadBuilding");
    next.devCardPlayedThisTurn = true;
    next.freeRoadsRemaining = 2;
    addLog(next, `${nextPlayer.name} さんが街道建設カードをプレイしました。街道を2本まで無料で建設できます。`);
    return ok(next);
}
function playYearOfPlenty(state, playerId, resources) {
    const check = canPlayDevCard(state, playerId, "yearOfPlenty");
    if (!check.allowed) return fail(state, check.reason);
    for (const resource of resources){
        if (state.bankResources[resource] <= 0) {
            return fail(state, `銀行に ${resourceLabel(resource)} の在庫がありません。`);
        }
    }
    // 同じ資源を2枚要求する場合、銀行に2枚以上必要
    if (resources[0] === resources[1] && state.bankResources[resources[0]] < 2) {
        return fail(state, `銀行に ${resourceLabel(resources[0])} の在庫が足りません。`);
    }
    const next = cloneState(state);
    const nextPlayer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(next, playerId);
    consumeDevCard(nextPlayer, "yearOfPlenty");
    next.devCardPlayedThisTurn = true;
    const granted = {};
    for (const resource of resources)granted[resource] = (granted[resource] ?? 0) + 1;
    giveResources(next, nextPlayer, granted);
    addLog(next, `${nextPlayer.name} さんが発見カードをプレイし、${resourceLabel(resources[0])} と ${resourceLabel(resources[1])} を獲得しました。`);
    return ok(next);
}
function playMonopoly(state, playerId, resource) {
    const check = canPlayDevCard(state, playerId, "monopoly");
    if (!check.allowed) return fail(state, check.reason);
    const next = cloneState(state);
    const nextPlayer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(next, playerId);
    consumeDevCard(nextPlayer, "monopoly");
    next.devCardPlayedThisTurn = true;
    let total = 0;
    for (const other of next.players){
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
function bankTrade(state, playerId, give, want) {
    if (state.phase !== "main") return fail(state, "今は交易できるタイミングではありません。");
    if (!isPlayersTurn(state, playerId)) return fail(state, "あなたの番ではありません。");
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    const giveTotal = Object.values(give).reduce((a, b)=>a + (b ?? 0), 0);
    const wantTotal = Object.values(want).reduce((a, b)=>a + (b ?? 0), 0);
    if (giveTotal === 0 || wantTotal === 0) return fail(state, "交易内容が不正です。");
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hasResources"])(player, give)) return fail(state, "渡す資源が足りません。");
    // レートの検証: give は単一資源で、そのレートは港の有無で決まる
    const giveEntries = Object.entries(give).filter(([, v])=>(v ?? 0) > 0);
    const wantEntries = Object.entries(want).filter(([, v])=>(v ?? 0) > 0);
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
    const nextPlayer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(next, playerId);
    returnResourcesToBank(next, nextPlayer, give);
    giveResources(next, nextPlayer, want);
    addLog(next, `${nextPlayer.name} さんが銀行と交易しました(${resourceLabel(giveResource)}${giveAmount} -> ${resourceLabel(wantResource)}${wantAmount})。`);
    return ok(next);
}
function bestTradeRate(state, playerId, resource) {
    let rate = 4;
    for (const vertex of state.board.vertices){
        if (vertex.building?.owner !== playerId) continue;
        if (vertex.port === "generic") rate = Math.min(rate, 3);
        if (vertex.port === resource) rate = Math.min(rate, 2);
    }
    return rate;
}
// === ターン終了 ===
function endTurn(state, playerId) {
    if (state.phase !== "main" && state.phase !== "roll") return fail(state, "今はターンを終了できません。");
    if (!isPlayersTurn(state, playerId)) return fail(state, "あなたの番ではありません。");
    if (state.phase === "roll") return fail(state, "サイコロを振ってください。");
    const next = cloneState(state);
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(next, playerId);
    player.newDevCards = [];
    next.devCardPlayedThisTurn = false;
    next.freeRoadsRemaining = 0;
    next.lastDiceRoll = null;
    next.currentPlayerIndex = (next.currentPlayerIndex + 1) % next.players.length;
    if (next.currentPlayerIndex === 0) next.turnNumber += 1;
    next.phase = "roll";
    addLog(next, `${playerName(next, (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["currentPlayer"])(next).id)} さんの番です。サイコロを振ってください。`);
    return ok(next);
}
function applyAction(state, action) {
    if (state.phase === "gameOver") return fail(state, "ゲームは既に終了しています。");
    switch(action.type){
        case "BUILD_SETTLEMENT":
            {
                if (state.phase === "setup-settlement-1" || state.phase === "setup-settlement-2") {
                    return placeSetupSettlement(state, action.playerId, action.vertexId);
                }
                return buildSettlement(state, action.playerId, action.vertexId);
            }
        case "BUILD_ROAD":
            {
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
function buildFreeOrPaidRoad(state, playerId, edgeId) {
    if (state.phase !== "main") return fail(state, "今は建設できるタイミングではありません。");
    if (!isPlayersTurn(state, playerId)) return fail(state, "あなたの番ではありません。");
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    const free = state.freeRoadsRemaining > 0;
    if (player.roadsLeft <= 0) return fail(state, "街道のコマがもうありません。");
    if (!free && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hasResources"])(player, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].road)) return fail(state, "資源が足りません(木材1, レンガ1)。");
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canPlaceRoad"])(state, playerId, edgeId)) return fail(state, "そこには街道を置けません。");
    const next = cloneState(state);
    const nextPlayer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(next, playerId);
    if (free) {
        next.freeRoadsRemaining -= 1;
    } else {
        payCost(next, nextPlayer, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].road);
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getEdge"])(next, edgeId).road = {
        owner: playerId
    };
    nextPlayer.roadsLeft -= 1;
    addLog(next, free ? `${nextPlayer.name} さんが街道を無料で建設しました。` : `${nextPlayer.name} さんが街道を建設しました。`);
    next.longestRoadOwner = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["recomputeLongestRoad"])(next);
    checkAndApplyVictory(next, playerId);
    return ok(next);
}
;
}),
"[project]/src/components/ActionDialogs.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BankTradeDialog",
    ()=>BankTradeDialog,
    "DiscardDialog",
    ()=>DiscardDialog,
    "MonopolyDialog",
    ()=>MonopolyDialog,
    "RobberTargetDialog",
    ()=>RobberTargetDialog,
    "YearOfPlentyDialog",
    ()=>YearOfPlentyDialog
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
// 各種ダイアログ: 捨て札 / 盗賊の対象選択 / 発見・独占カードの資源選択 / 銀行交易
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$engine$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/lib/game/engine.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/game/selectors.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/game/types.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
function DialogShell({ title, children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "w-full max-w-md rounded-xl bg-white p-5 shadow-xl",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    className: "mb-3 text-lg font-bold text-slate-800",
                    children: title
                }, void 0, false, {
                    fileName: "[project]/src/components/ActionDialogs.tsx",
                    lineNumber: 21,
                    columnNumber: 9
                }, this),
                children
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ActionDialogs.tsx",
            lineNumber: 20,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/ActionDialogs.tsx",
        lineNumber: 19,
        columnNumber: 5
    }, this);
}
function DiscardDialog({ state, playerId, onSubmit }) {
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    const required = Math.floor((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resourceTotal"])(player) / 2);
    const [selected, setSelected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const total = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCES"].reduce((sum, r)=>sum + (selected[r] ?? 0), 0), [
        selected
    ]);
    function adjust(resource, delta) {
        setSelected((prev)=>{
            const current = prev[resource] ?? 0;
            const next = Math.max(0, Math.min(player.resources[resource], current + delta));
            return {
                ...prev,
                [resource]: next
            };
        });
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(DialogShell, {
        title: `${player.name} さん: カードを ${required} 枚捨ててください`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mb-3 text-sm text-slate-600",
                children: "手札が8枚以上のため、半分(端数切り捨て)を選んで捨てる必要があります。"
            }, void 0, false, {
                fileName: "[project]/src/components/ActionDialogs.tsx",
                lineNumber: 55,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-5 gap-2",
                children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCES"].map((resource)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col items-center gap-1 rounded border border-slate-200 p-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs text-slate-500",
                                children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCE_LABEL"][resource]
                            }, void 0, false, {
                                fileName: "[project]/src/components/ActionDialogs.tsx",
                                lineNumber: 59,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs text-slate-400",
                                children: [
                                    "所持: ",
                                    player.resources[resource]
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ActionDialogs.tsx",
                                lineNumber: 60,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        className: "h-6 w-6 rounded bg-slate-200 text-sm hover:bg-slate-300",
                                        onClick: ()=>adjust(resource, -1),
                                        children: "-"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ActionDialogs.tsx",
                                        lineNumber: 62,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "w-5 text-center text-sm font-semibold",
                                        children: selected[resource] ?? 0
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ActionDialogs.tsx",
                                        lineNumber: 68,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        className: "h-6 w-6 rounded bg-slate-200 text-sm hover:bg-slate-300",
                                        onClick: ()=>adjust(resource, 1),
                                        children: "+"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ActionDialogs.tsx",
                                        lineNumber: 69,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ActionDialogs.tsx",
                                lineNumber: 61,
                                columnNumber: 13
                            }, this)
                        ]
                    }, resource, true, {
                        fileName: "[project]/src/components/ActionDialogs.tsx",
                        lineNumber: 58,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/ActionDialogs.tsx",
                lineNumber: 56,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-4 flex items-center justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: `text-sm ${total === required ? "text-emerald-600" : "text-red-500"}`,
                        children: [
                            "選択中: ",
                            total,
                            " / ",
                            required,
                            " 枚"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ActionDialogs.tsx",
                        lineNumber: 80,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40",
                        disabled: total !== required,
                        onClick: ()=>onSubmit(selected),
                        children: "捨てる"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ActionDialogs.tsx",
                        lineNumber: 83,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ActionDialogs.tsx",
                lineNumber: 79,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ActionDialogs.tsx",
        lineNumber: 54,
        columnNumber: 5
    }, this);
}
function RobberTargetDialog({ state, candidateIds, onChoose }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(DialogShell, {
        title: "誰から資源を奪いますか?",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex flex-col gap-2",
            children: [
                candidateIds.map((id)=>{
                    const p = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, id);
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "flex items-center justify-between rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100",
                        onClick: ()=>onChoose(id),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "inline-block h-3 w-3 rounded-full",
                                        style: {
                                            backgroundColor: p.color
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ActionDialogs.tsx",
                                        lineNumber: 118,
                                        columnNumber: 17
                                    }, this),
                                    p.name
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ActionDialogs.tsx",
                                lineNumber: 117,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-slate-500",
                                children: [
                                    "手札 ",
                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resourceTotal"])(p),
                                    " 枚"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ActionDialogs.tsx",
                                lineNumber: 121,
                                columnNumber: 15
                            }, this)
                        ]
                    }, id, true, {
                        fileName: "[project]/src/components/ActionDialogs.tsx",
                        lineNumber: 112,
                        columnNumber: 13
                    }, this);
                }),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    className: "mt-1 rounded border border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-100",
                    onClick: ()=>onChoose(null),
                    children: "誰からも奪わない"
                }, void 0, false, {
                    fileName: "[project]/src/components/ActionDialogs.tsx",
                    lineNumber: 125,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ActionDialogs.tsx",
            lineNumber: 108,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/ActionDialogs.tsx",
        lineNumber: 107,
        columnNumber: 5
    }, this);
}
function YearOfPlentyDialog({ onSubmit, onCancel }) {
    const [picks, setPicks] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    function toggle(resource) {
        setPicks((prev)=>{
            if (prev.length >= 2) return [
                resource
            ];
            return [
                ...prev,
                resource
            ];
        });
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(DialogShell, {
        title: "発見カード: 銀行から好きな資源を2枚獲得できます",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-5 gap-2",
                children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCES"].map((resource)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: `rounded border px-2 py-3 text-sm ${picks.includes(resource) ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:bg-slate-100"}`,
                        onClick: ()=>toggle(resource),
                        children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCE_LABEL"][resource]
                    }, resource, false, {
                        fileName: "[project]/src/components/ActionDialogs.tsx",
                        lineNumber: 155,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/ActionDialogs.tsx",
                lineNumber: 153,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 text-xs text-slate-500",
                children: [
                    "選択中: ",
                    picks.map((r)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCE_LABEL"][r]).join(", ") || "(なし)"
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ActionDialogs.tsx",
                lineNumber: 166,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-4 flex justify-end gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "rounded border border-slate-300 px-4 py-2 text-sm",
                        onClick: onCancel,
                        children: "やめる"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ActionDialogs.tsx",
                        lineNumber: 170,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40",
                        disabled: picks.length !== 2,
                        onClick: ()=>onSubmit([
                                picks[0],
                                picks[1]
                            ]),
                        children: "獲得する"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ActionDialogs.tsx",
                        lineNumber: 173,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ActionDialogs.tsx",
                lineNumber: 169,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ActionDialogs.tsx",
        lineNumber: 152,
        columnNumber: 5
    }, this);
}
function MonopolyDialog({ onSubmit, onCancel }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(DialogShell, {
        title: "独占カード: 1種類の資源を指定し、全員から回収します",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-5 gap-2",
                children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCES"].map((resource)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "rounded border border-slate-300 px-2 py-3 text-sm hover:bg-slate-100",
                        onClick: ()=>onSubmit(resource),
                        children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCE_LABEL"][resource]
                    }, resource, false, {
                        fileName: "[project]/src/components/ActionDialogs.tsx",
                        lineNumber: 198,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/ActionDialogs.tsx",
                lineNumber: 196,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-4 flex justify-end",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    className: "rounded border border-slate-300 px-4 py-2 text-sm",
                    onClick: onCancel,
                    children: "やめる"
                }, void 0, false, {
                    fileName: "[project]/src/components/ActionDialogs.tsx",
                    lineNumber: 208,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/ActionDialogs.tsx",
                lineNumber: 207,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ActionDialogs.tsx",
        lineNumber: 195,
        columnNumber: 5
    }, this);
}
function BankTradeDialog({ state, playerId, onSubmit, onCancel }) {
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    const [giveResource, setGiveResource] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [wantResource, setWantResource] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const rate = giveResource ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$engine$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["bestTradeRate"])(state, playerId, giveResource) : null;
    const giveCost = giveResource && rate ? {
        [giveResource]: rate
    } : {};
    const wantGain = wantResource ? {
        [wantResource]: 1
    } : {};
    const canTrade = !!giveResource && !!wantResource && giveResource !== wantResource && !!rate && (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hasResources"])(player, giveCost) && state.bankResources[wantResource] > 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(DialogShell, {
        title: "銀行・港との交易",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mb-2 text-sm text-slate-600",
                children: "渡す資源を選ぶと、所持する港に応じたレート(2:1, 3:1, 4:1)が適用されます。"
            }, void 0, false, {
                fileName: "[project]/src/components/ActionDialogs.tsx",
                lineNumber: 247,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mb-1 text-xs font-semibold text-slate-500",
                        children: [
                            "渡す資源 (レート: ",
                            rate ? `${rate}:1` : "-",
                            ")"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ActionDialogs.tsx",
                        lineNumber: 250,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-5 gap-2",
                        children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCES"].map((resource)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: `rounded border px-2 py-2 text-xs ${giveResource === resource ? "border-rose-500 bg-rose-50" : "border-slate-300 hover:bg-slate-100"}`,
                                onClick: ()=>setGiveResource(resource),
                                children: [
                                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCE_LABEL"][resource],
                                    " (",
                                    player.resources[resource],
                                    ")"
                                ]
                            }, resource, true, {
                                fileName: "[project]/src/components/ActionDialogs.tsx",
                                lineNumber: 253,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/ActionDialogs.tsx",
                        lineNumber: 251,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ActionDialogs.tsx",
                lineNumber: 249,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mb-1 text-xs font-semibold text-slate-500",
                        children: "欲しい資源"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ActionDialogs.tsx",
                        lineNumber: 267,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-5 gap-2",
                        children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCES"].map((resource)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: `rounded border px-2 py-2 text-xs ${wantResource === resource ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:bg-slate-100"}`,
                                onClick: ()=>setWantResource(resource),
                                children: [
                                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCE_LABEL"][resource],
                                    " (銀行 ",
                                    state.bankResources[resource],
                                    ")"
                                ]
                            }, resource, true, {
                                fileName: "[project]/src/components/ActionDialogs.tsx",
                                lineNumber: 270,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/ActionDialogs.tsx",
                        lineNumber: 268,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ActionDialogs.tsx",
                lineNumber: 266,
                columnNumber: 7
            }, this),
            giveResource && wantResource && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mb-2 text-sm text-slate-700",
                children: [
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCE_LABEL"][giveResource],
                    " ",
                    rate,
                    " 枚 → ",
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCE_LABEL"][wantResource],
                    " 1 枚"
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ActionDialogs.tsx",
                lineNumber: 284,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex justify-end gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "rounded border border-slate-300 px-4 py-2 text-sm",
                        onClick: onCancel,
                        children: "やめる"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ActionDialogs.tsx",
                        lineNumber: 290,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40",
                        disabled: !canTrade,
                        onClick: ()=>giveResource && wantResource && onSubmit(giveCost, wantGain),
                        children: "交易する"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ActionDialogs.tsx",
                        lineNumber: 293,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ActionDialogs.tsx",
                lineNumber: 289,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ActionDialogs.tsx",
        lineNumber: 246,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/lib/ai/simpleAi.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ルールベースの簡易CPUプレイヤー
// 現在のゲーム状態を見て、次に取るべき1アクションを返す。
// UI側はこれを繰り返し呼び出してターンを進行させる。
__turbopack_context__.s([
    "debugLongestRoad",
    ()=>debugLongestRoad,
    "decideCpuAction",
    ()=>decideCpuAction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$engine$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/lib/game/engine.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/game/selectors.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/game/types.ts [app-ssr] (ecmascript)");
;
;
;
const PIP_WEIGHT = {
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
    8: 5,
    9: 4,
    10: 3,
    11: 2,
    12: 1
};
function pipScore(state, vertex) {
    let score = 0;
    const resources = new Set();
    for (const hexId of vertex.hexIds){
        const hex = state.board.hexById[hexId];
        if (hex.number === null) continue;
        score += PIP_WEIGHT[hex.number] ?? 0;
        const resource = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TERRAIN_RESOURCE"][hex.terrain];
        if (resource) resources.add(resource);
    }
    // 資源の多様性にボーナス
    score += resources.size * 1.5;
    if (vertex.port) score += 1.5;
    return score;
}
function pickRandom(items) {
    if (items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)];
}
function topByScore(items, score, take) {
    return [
        ...items
    ].sort((a, b)=>score(b) - score(a)).slice(0, take);
}
// === 初期配置 ===
function chooseSetupSettlement(state, playerId) {
    const candidates = state.board.vertices.filter((v)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canPlaceSettlement"])(state, playerId, v.id, true));
    const best = topByScore(candidates, (v)=>pipScore(state, v), 3);
    return (pickRandom(best) ?? candidates[0]).id;
}
function chooseSetupRoad(state, playerId, anchorVertexId) {
    const anchor = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getVertex"])(state, anchorVertexId);
    const candidates = anchor.edgeIds.filter((edgeId)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canPlaceRoad"])(state, playerId, edgeId, {
            isSetup: true,
            setupAnchorVertexId: anchorVertexId
        }));
    const score = (edgeId)=>{
        const edge = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getEdge"])(state, edgeId);
        const farVertexId = edge.vertexIds[0] === anchorVertexId ? edge.vertexIds[1] : edge.vertexIds[0];
        const farVertex = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getVertex"])(state, farVertexId);
        return pipScore(state, farVertex);
    };
    const best = topByScore(candidates, score, 2);
    return pickRandom(best) ?? candidates[0];
}
// === 捨て札 ===
function chooseDiscard(player) {
    const total = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resourceTotal"])(player);
    const required = Math.floor(total / 2);
    const discard = {};
    let remaining = required;
    // 枚数の多い資源から優先して捨てる(手札のバランスを保つ)
    const sorted = [
        ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCES"]
    ].sort((a, b)=>player.resources[b] - player.resources[a]);
    let idx = 0;
    while(remaining > 0){
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
function chooseRobberTarget(state, playerId) {
    const me = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    const myVertexIds = new Set(state.board.vertices.filter((v)=>v.building?.owner === playerId).map((v)=>v.id));
    const candidates = state.board.hexes.filter((h)=>!h.hasRobber);
    const scored = candidates.map((hex)=>{
        const adjacentVertices = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["verticesAdjacentToHex"])(state, hex.id);
        const touchesMine = adjacentVertices.some((v)=>myVertexIds.has(v.id));
        const opponents = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["playersAdjacentToHex"])(state, hex.id, playerId);
        let score = hex.number !== null ? PIP_WEIGHT[hex.number] ?? 0 : 0;
        if (touchesMine) score -= 8; // 自分のタイルは避ける
        score += opponents.length * 2;
        // 手札が多い相手を狙うと効果的
        let bestOpponentCards = 0;
        for (const oppId of opponents){
            bestOpponentCards = Math.max(bestOpponentCards, (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resourceTotal"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, oppId)));
        }
        score += bestOpponentCards * 0.5;
        return {
            hex,
            score,
            opponents
        };
    });
    scored.sort((a, b)=>b.score - a.score);
    const choice = scored[0] ?? scored[scored.length - 1];
    let targetPlayerId = null;
    if (choice.opponents.length > 0) {
        let best = choice.opponents[0];
        let bestCards = -1;
        for (const oppId of choice.opponents){
            const cards = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resourceTotal"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, oppId));
            if (cards > bestCards) {
                bestCards = cards;
                best = oppId;
            }
        }
        targetPlayerId = best;
    }
    void me;
    return {
        hexId: choice.hex.id,
        targetPlayerId
    };
}
function findCityPlan(state, playerId) {
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    if (player.citiesLeft <= 0 || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hasResources"])(player, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].city)) return null;
    const vertex = state.board.vertices.find((v)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canUpgradeToCity"])(state, playerId, v.id));
    if (!vertex) return null;
    return {
        action: {
            type: "BUILD_CITY",
            playerId,
            vertexId: vertex.id
        },
        priority: 100
    };
}
function findSettlementPlan(state, playerId) {
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    if (player.settlementsLeft <= 0 || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hasResources"])(player, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].settlement)) return null;
    const candidates = state.board.vertices.filter((v)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canPlaceSettlement"])(state, playerId, v.id, false));
    if (candidates.length === 0) return null;
    const best = topByScore(candidates, (v)=>pipScore(state, v), 1)[0];
    return {
        action: {
            type: "BUILD_SETTLEMENT",
            playerId,
            vertexId: best.id
        },
        priority: 90
    };
}
function findRoadPlan(state, playerId) {
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    if (player.roadsLeft <= 0) return null;
    if (state.freeRoadsRemaining <= 0 && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hasResources"])(player, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].road)) return null;
    const candidates = state.board.edges.filter((e)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canPlaceRoad"])(state, playerId, e.id));
    if (candidates.length === 0) return null;
    // 開拓に繋がりそうな(まだ建物のない遠い頂点のスコアが高い)道を優先する
    const score = (edge)=>{
        let best = 0;
        for (const vId of edge.vertexIds){
            const v = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getVertex"])(state, vId);
            if (v.building) continue;
            best = Math.max(best, pipScore(state, v));
        }
        return best;
    };
    const ranked = topByScore(candidates, score, 3);
    const choice = pickRandom(ranked) ?? candidates[0];
    const free = state.freeRoadsRemaining > 0;
    return {
        action: {
            type: "BUILD_ROAD",
            playerId,
            edgeId: choice.id
        },
        priority: free ? 95 : 40
    };
}
function findDevCardPlan(state, playerId) {
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    if (state.bankDevCards.length === 0 || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hasResources"])(player, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].devCard)) return null;
    return {
        action: {
            type: "BUY_DEV_CARD",
            playerId
        },
        priority: 30
    };
}
function findBankTradePlan(state, playerId) {
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    // 目標: 開拓地 or 都市が建てられるように、不足している資源を交換で確保する
    const goals = [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].settlement,
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].city,
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].road
    ];
    for (const goal of goals){
        const missing = Object.entries(goal).filter(([resource, amount])=>player.resources[resource] < amount);
        if (missing.length !== 1) continue; // 1種類だけ不足している場合のみ交易を検討
        const [wantResource, wantAmount] = missing[0];
        const need = wantAmount - player.resources[wantResource];
        if (need <= 0) continue;
        for (const giveResource of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCES"]){
            if (giveResource === wantResource) continue;
            const rate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$engine$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["bestTradeRate"])(state, playerId, giveResource);
            const surplus = player.resources[giveResource] - (goal[giveResource] ?? 0);
            if (surplus >= rate && state.bankResources[wantResource] > 0) {
                return {
                    type: "BANK_TRADE",
                    playerId,
                    give: {
                        [giveResource]: rate
                    },
                    want: {
                        [wantResource]: 1
                    }
                };
            }
        }
    }
    return null;
}
// 騎士カードを使うべきか判定 (盗賊が自陣にある, あるいは最大騎士力を狙える場合)
function shouldPlayKnight(state, playerId) {
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    const totalKnights = player.devCards.filter((c)=>c === "knight").length;
    const newKnights = player.newDevCards.filter((c)=>c === "knight").length;
    if (totalKnights <= newKnights) return false;
    const myVertexIds = new Set(state.board.vertices.filter((v)=>v.building?.owner === playerId).map((v)=>v.id));
    const robberHex = state.board.hexes.find((h)=>h.hasRobber);
    const robberOnMine = robberHex ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["verticesAdjacentToHex"])(state, robberHex.id).some((v)=>myVertexIds.has(v.id)) : false;
    if (robberOnMine) return true;
    // 最大騎士力に手が届きそうなら積極的に使う
    if (player.knightsPlayed + 1 >= 3 && state.largestArmyOwner !== playerId) return true;
    return false;
}
function playableDevCardTypes(player) {
    const types = [];
    for (const type of [
        "knight",
        "roadBuilding",
        "yearOfPlenty",
        "monopoly"
    ]){
        const total = player.devCards.filter((c)=>c === type).length;
        const fresh = player.newDevCards.filter((c)=>c === type).length;
        if (total > fresh) types.push(type);
    }
    return types;
}
function findMonopolyTarget(state, playerId) {
    const me = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    let bestResource = null;
    let bestTotal = 0;
    for (const resource of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCES"]){
        if (me.resources[resource] >= 3) continue; // 既に十分持っている資源は狙わない
        let total = 0;
        for (const p of state.players){
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
function findYearOfPlentyTarget(state, playerId) {
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    const goals = [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].city,
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].settlement
    ];
    for (const goal of goals){
        const missing = [];
        for (const [resource, amount] of Object.entries(goal)){
            const lack = amount - player.resources[resource];
            for(let i = 0; i < lack; i++)missing.push(resource);
        }
        if (missing.length === 0) continue;
        if (missing.length === 1) return [
            missing[0],
            missing[0]
        ];
        if (missing.length >= 2) return [
            missing[0],
            missing[1]
        ];
    }
    return null;
}
function decideCpuAction(state, playerId) {
    const phase = state.phase;
    if (phase === "setup-settlement-1" || phase === "setup-settlement-2") {
        return {
            type: "BUILD_SETTLEMENT",
            playerId,
            vertexId: chooseSetupSettlement(state, playerId)
        };
    }
    if (phase === "setup-road-1" || phase === "setup-road-2") {
        const anchor = state.setupPendingVertexId;
        if (!anchor) return null;
        return {
            type: "BUILD_ROAD",
            playerId,
            edgeId: chooseSetupRoad(state, playerId, anchor)
        };
    }
    if (phase === "discard") {
        return {
            type: "DISCARD",
            playerId,
            discard: chooseDiscard((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId))
        };
    }
    if (phase === "moveRobber") {
        const { hexId, targetPlayerId } = chooseRobberTarget(state, playerId);
        return {
            type: "MOVE_ROBBER",
            playerId,
            hexId,
            targetPlayerId
        };
    }
    if (phase === "roll") {
        return {
            type: "ROLL_DICE",
            playerId
        };
    }
    if (phase !== "main") return null;
    const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, playerId);
    // 騎士を使うべきタイミングなら使う
    if (!state.devCardPlayedThisTurn && shouldPlayKnight(state, playerId)) {
        return {
            type: "PLAY_KNIGHT",
            playerId
        };
    }
    // 進歩カードを有効活用できそうなら使う
    if (!state.devCardPlayedThisTurn) {
        const playable = playableDevCardTypes(player);
        if (playable.includes("yearOfPlenty")) {
            const target = findYearOfPlentyTarget(state, playerId);
            if (target) return {
                type: "PLAY_YEAR_OF_PLENTY",
                playerId,
                resources: target
            };
        }
        if (playable.includes("monopoly")) {
            const target = findMonopolyTarget(state, playerId);
            if (target) return {
                type: "PLAY_MONOPOLY",
                playerId,
                resource: target
            };
        }
        if (playable.includes("roadBuilding") && player.roadsLeft >= 2) {
            const hasSpot = state.board.edges.some((e)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canPlaceRoad"])(state, playerId, e.id));
            if (hasSpot) return {
                type: "PLAY_ROAD_BUILDING",
                playerId
            };
        }
    }
    // 無料の街道が残っていれば優先して使う
    if (state.freeRoadsRemaining > 0) {
        const roadPlan = findRoadPlan(state, playerId);
        if (roadPlan) return roadPlan.action;
    }
    const plans = [
        findCityPlan(state, playerId),
        findSettlementPlan(state, playerId),
        findRoadPlan(state, playerId),
        findDevCardPlan(state, playerId)
    ].filter((p)=>p !== null);
    if (plans.length > 0) {
        plans.sort((a, b)=>b.priority - a.priority);
        return plans[0].action;
    }
    // 建設できない場合は、目標達成のために銀行と交易してみる
    const trade = findBankTradePlan(state, playerId);
    if (trade) return trade;
    return null; // これ以上できることがなければターン終了
}
function debugLongestRoad(state, playerId) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["calculateLongestRoad"])(state, playerId);
}
}),
"[project]/src/lib/game/setup.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PLAYER_COLORS",
    ()=>PLAYER_COLORS,
    "PLAYER_COLOR_NAMES",
    ()=>PLAYER_COLOR_NAMES,
    "createGame",
    ()=>createGame
]);
// 新規ゲームの初期化
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$board$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/game/board.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/game/types.ts [app-ssr] (ecmascript)");
;
;
function initialBankResources() {
    const bank = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["emptyResourceCount"])();
    for (const resource of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RESOURCES"])bank[resource] = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BANK_RESOURCE_COUNT"];
    return bank;
}
const PLAYER_COLORS = [
    "#e3342f",
    "#3490dc",
    "#f6993f",
    "#38c172"
];
const PLAYER_COLOR_NAMES = [
    "赤",
    "青",
    "オレンジ",
    "緑"
];
function buildDevCardDeck() {
    const deck = [];
    for(let i = 0; i < 14; i++)deck.push("knight");
    for(let i = 0; i < 2; i++)deck.push("roadBuilding");
    for(let i = 0; i < 2; i++)deck.push("yearOfPlenty");
    for(let i = 0; i < 2; i++)deck.push("monopoly");
    for(let i = 0; i < 5; i++)deck.push("victoryPoint");
    return deck;
}
function createGame(configs) {
    const board = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$board$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["generateBoard"])();
    const players = configs.map((config, index)=>({
            id: `p${index + 1}`,
            name: config.name,
            kind: config.kind,
            color: PLAYER_COLORS[index % PLAYER_COLORS.length],
            resources: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["emptyResourceCount"])(),
            devCards: [],
            newDevCards: [],
            knightsPlayed: 0,
            roadsLeft: 15,
            settlementsLeft: 5,
            citiesLeft: 4
        }));
    const forward = players.map((p)=>p.id);
    const backward = [
        ...forward
    ].reverse();
    const setupOrder = [
        ...forward,
        ...backward
    ];
    return {
        board,
        players,
        currentPlayerIndex: 0,
        phase: "setup-settlement-1",
        turnNumber: 1,
        lastDiceRoll: null,
        bankResources: initialBankResources(),
        bankDevCards: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$board$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shuffle"])(buildDevCardDeck()),
        longestRoadOwner: null,
        largestArmyOwner: null,
        playersToDiscard: [],
        robberMovedBy: null,
        pendingTrade: null,
        log: [
            `ゲームを開始しました。プレイヤーは ${players.map((p)=>p.name).join(", ")} です。`,
            `${players[0].name} さんから初期配置を始めてください(開拓地を1つ選んでください)。`
        ],
        winner: null,
        setupOrder,
        setupIndex: 0,
        setupPendingVertexId: null,
        devCardPlayedThisTurn: false,
        freeRoadsRemaining: 0
    };
}
}),
"[project]/src/components/GameApp.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>GameApp
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
// ゲーム全体を統括するクライアントコンポーネント (セットアップ画面 + 対局画面)
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$BoardView$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/BoardView.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$PlayerPanel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/PlayerPanel.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GameLog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/GameLog.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ActionDialogs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ActionDialogs.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$engine$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/lib/game/engine.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$ai$2f$simpleAi$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/ai/simpleAi.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$setup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/game/setup.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/game/selectors.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/game/types.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
;
;
;
const DEFAULT_CONFIGS = [
    {
        name: "あなた",
        kind: "human"
    },
    {
        name: "CPU 1",
        kind: "cpu"
    },
    {
        name: "CPU 2",
        kind: "cpu"
    },
    {
        name: "CPU 3",
        kind: "cpu"
    }
];
function actingPlayerId(state) {
    if (state.phase === "discard") return state.playersToDiscard[0] ?? null;
    if (state.phase === "moveRobber") return state.robberMovedBy;
    if (state.phase === "gameOver") return null;
    switch(state.phase){
        case "setup-settlement-1":
        case "setup-road-1":
        case "setup-settlement-2":
        case "setup-road-2":
            return state.setupOrder[state.setupIndex] ?? null;
        default:
            return state.players[state.currentPlayerIndex].id;
    }
}
function phaseLabel(phase) {
    switch(phase){
        case "setup-settlement-1":
        case "setup-settlement-2":
            return "盤面で開拓地を置く場所をクリックしてください";
        case "setup-road-1":
        case "setup-road-2":
            return "盤面で街道を置く場所をクリックしてください";
        case "roll":
            return "サイコロを振ってください";
        case "main":
            return "建設・交易・発展カードのプレイができます";
        case "moveRobber":
            return "盗賊を移動させるタイルをクリックしてください";
        case "discard":
            return "手札を半分捨ててください";
        case "gameOver":
            return "ゲーム終了";
    }
}
function GameApp() {
    const [configs, setConfigs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(DEFAULT_CONFIGS);
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [buildMode, setBuildMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [errorMessage, setErrorMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [robberPicker, setRobberPicker] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [tradeOpen, setTradeOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [devCardDialog, setDevCardDialog] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    function dispatch(action) {
        if (!state) return null;
        const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$engine$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["applyAction"])(state, action);
        if (result.ok) {
            setState(result.state);
            setErrorMessage(null);
        } else {
            setErrorMessage(result.message ?? "その操作はできません。");
        }
        return result;
    }
    const actingId = state ? actingPlayerId(state) : null;
    const actingPlayer = state && actingId ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, actingId) : null;
    const isHumanTurn = actingPlayer?.kind === "human";
    // CPU の自動進行: フェイズが変わるたびに次の1手を考えて実行する
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!state || state.phase === "gameOver") return;
        const id = actingPlayerId(state);
        if (!id) return;
        const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, id);
        if (player.kind !== "cpu") return;
        const timer = setTimeout(()=>{
            const action = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$ai$2f$simpleAi$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decideCpuAction"])(state, id);
            const result = dispatch(action ?? {
                type: "END_TURN",
                playerId: id
            });
            if (action && result && !result.ok) {
                dispatch({
                    type: "END_TURN",
                    playerId: id
                });
            }
        }, 650);
        return ()=>clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        state
    ]);
    // 盤面上で選択可能な要素の計算 (人間の手番のときのみ)
    const selectable = (()=>{
        const vertices = new Set();
        const edges = new Set();
        const hexes = new Set();
        if (!state || !actingId || !isHumanTurn) return {
            vertices,
            edges,
            hexes
        };
        switch(state.phase){
            case "setup-settlement-1":
            case "setup-settlement-2":
                for (const v of state.board.vertices){
                    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canPlaceSettlement"])(state, actingId, v.id, true)) vertices.add(v.id);
                }
                break;
            case "setup-road-1":
            case "setup-road-2":
                for (const e of state.board.edges){
                    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canPlaceRoad"])(state, actingId, e.id, {
                        isSetup: true,
                        setupAnchorVertexId: state.setupPendingVertexId
                    })) {
                        edges.add(e.id);
                    }
                }
                break;
            case "moveRobber":
                for (const h of state.board.hexes){
                    if (!h.hasRobber) hexes.add(h.id);
                }
                break;
            case "main":
                if (buildMode === "settlement") {
                    for (const v of state.board.vertices){
                        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canPlaceSettlement"])(state, actingId, v.id, false)) vertices.add(v.id);
                    }
                } else if (buildMode === "road") {
                    for (const e of state.board.edges){
                        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canPlaceRoad"])(state, actingId, e.id)) edges.add(e.id);
                    }
                } else if (buildMode === "city") {
                    for (const v of state.board.vertices){
                        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canUpgradeToCity"])(state, actingId, v.id)) vertices.add(v.id);
                    }
                }
                break;
            default:
                break;
        }
        return {
            vertices,
            edges,
            hexes
        };
    })();
    function handleVertexClick(vertexId) {
        if (!state || !actingId) return;
        if (state.phase === "setup-settlement-1" || state.phase === "setup-settlement-2") {
            dispatch({
                type: "BUILD_SETTLEMENT",
                playerId: actingId,
                vertexId
            });
        } else if (state.phase === "main" && buildMode === "settlement") {
            dispatch({
                type: "BUILD_SETTLEMENT",
                playerId: actingId,
                vertexId
            });
            setBuildMode(null);
        } else if (state.phase === "main" && buildMode === "city") {
            dispatch({
                type: "BUILD_CITY",
                playerId: actingId,
                vertexId
            });
            setBuildMode(null);
        }
    }
    function handleEdgeClick(edgeId) {
        if (!state || !actingId) return;
        if (state.phase === "setup-road-1" || state.phase === "setup-road-2") {
            dispatch({
                type: "BUILD_ROAD",
                playerId: actingId,
                edgeId
            });
        } else if (state.phase === "main" && buildMode === "road") {
            dispatch({
                type: "BUILD_ROAD",
                playerId: actingId,
                edgeId
            });
            setBuildMode(null);
        }
    }
    function handleHexClick(hexId) {
        if (!state || !actingId || state.phase !== "moveRobber") return;
        const candidates = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["playersAdjacentToHex"])(state, hexId, actingId);
        if (candidates.length <= 1) {
            dispatch({
                type: "MOVE_ROBBER",
                playerId: actingId,
                hexId,
                targetPlayerId: candidates[0] ?? null
            });
        } else {
            setRobberPicker({
                hexId,
                candidates
            });
        }
    }
    if (!state) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SetupScreen, {
            configs: configs,
            setConfigs: setConfigs,
            onStart: ()=>setState((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$setup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createGame"])(configs))
        }, void 0, false, {
            fileName: "[project]/src/components/GameApp.tsx",
            lineNumber: 212,
            columnNumber: 7
        }, this);
    }
    const human = actingPlayer?.kind === "human" ? actingPlayer : null;
    const playableDevCards = human ? [
        "knight",
        "roadBuilding",
        "yearOfPlenty",
        "monopoly"
    ].filter((type)=>{
        const total = human.devCards.filter((c)=>c === type).length;
        const fresh = human.newDevCards.filter((c)=>c === type).length;
        return total > fresh;
    }) : [];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mx-auto flex max-w-7xl flex-col gap-4 p-4 lg:flex-row",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 p-3 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold",
                                        children: [
                                            "ターン ",
                                            state.turnNumber
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/GameApp.tsx",
                                        lineNumber: 234,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "mx-2 text-slate-400",
                                        children: "|"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameApp.tsx",
                                        lineNumber: 235,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            "現在の手番:",
                                            " ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "font-semibold",
                                                style: {
                                                    color: actingPlayer?.color
                                                },
                                                children: actingPlayer?.name ?? "-"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/GameApp.tsx",
                                                lineNumber: 238,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/GameApp.tsx",
                                        lineNumber: 236,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "mx-2 text-slate-400",
                                        children: "|"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameApp.tsx",
                                        lineNumber: 242,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-slate-600",
                                        children: phaseLabel(state.phase)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameApp.tsx",
                                        lineNumber: 243,
                                        columnNumber: 13
                                    }, this),
                                    state.lastDiceRoll && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "mx-2 text-slate-400",
                                                children: "|"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/GameApp.tsx",
                                                lineNumber: 246,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: [
                                                    "サイコロ: ",
                                                    state.lastDiceRoll.die1,
                                                    " + ",
                                                    state.lastDiceRoll.die2,
                                                    " = ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                        children: state.lastDiceRoll.total
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/GameApp.tsx",
                                                        lineNumber: 248,
                                                        columnNumber: 81
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/GameApp.tsx",
                                                lineNumber: 247,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/GameApp.tsx",
                                lineNumber: 233,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "rounded border border-slate-300 px-3 py-1 text-xs hover:bg-slate-100",
                                onClick: ()=>setState(null),
                                children: "新しいゲーム"
                            }, void 0, false, {
                                fileName: "[project]/src/components/GameApp.tsx",
                                lineNumber: 253,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/GameApp.tsx",
                        lineNumber: 232,
                        columnNumber: 9
                    }, this),
                    errorMessage && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700",
                        children: errorMessage
                    }, void 0, false, {
                        fileName: "[project]/src/components/GameApp.tsx",
                        lineNumber: 259,
                        columnNumber: 11
                    }, this),
                    state.phase === "gameOver" && state.winner && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-3 rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-3 text-center text-lg font-bold text-emerald-700",
                        children: [
                            "🎉 ",
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPlayer"])(state, state.winner).name,
                            " さんの勝利です! 🎉"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/GameApp.tsx",
                        lineNumber: 263,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-lg bg-sky-50 p-2",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$BoardView$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            state: state,
                            selectableVertexIds: selectable.vertices,
                            selectableEdgeIds: selectable.edges,
                            selectableHexIds: selectable.hexes,
                            onVertexClick: handleVertexClick,
                            onEdgeClick: handleEdgeClick,
                            onHexClick: handleHexClick
                        }, void 0, false, {
                            fileName: "[project]/src/components/GameApp.tsx",
                            lineNumber: 269,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/GameApp.tsx",
                        lineNumber: 268,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-3 flex flex-wrap gap-3 text-xs text-slate-600",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    "銀行の発展カード残り: ",
                                    state.bankDevCards.length,
                                    " 枚"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/GameApp.tsx",
                                lineNumber: 281,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    "銀行の資源: 木材",
                                    state.bankResources.wood,
                                    " / レンガ",
                                    state.bankResources.brick,
                                    " / 羊毛",
                                    state.bankResources.wool,
                                    " / 小麦",
                                    state.bankResources.grain,
                                    " / 鉱石",
                                    state.bankResources.ore
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/GameApp.tsx",
                                lineNumber: 282,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/GameApp.tsx",
                        lineNumber: 280,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-3",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$GameLog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            entries: state.log
                        }, void 0, false, {
                            fileName: "[project]/src/components/GameApp.tsx",
                            lineNumber: 289,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/GameApp.tsx",
                        lineNumber: 288,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/GameApp.tsx",
                lineNumber: 231,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-full lg:w-80 flex flex-col gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$PlayerPanel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        state: state,
                        viewerId: human?.id ?? null
                    }, void 0, false, {
                        fileName: "[project]/src/components/GameApp.tsx",
                        lineNumber: 294,
                        columnNumber: 9
                    }, this),
                    human && state.phase === "roll" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "rounded bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700",
                        onClick: ()=>dispatch({
                                type: "ROLL_DICE",
                                playerId: human.id
                            }),
                        children: "🎲 サイコロを振る"
                    }, void 0, false, {
                        fileName: "[project]/src/components/GameApp.tsx",
                        lineNumber: 297,
                        columnNumber: 11
                    }, this),
                    human && state.phase === "main" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col gap-2 rounded-lg border border-slate-300 bg-white/80 p-3 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "font-semibold text-slate-700",
                                children: "建設"
                            }, void 0, false, {
                                fileName: "[project]/src/components/GameApp.tsx",
                                lineNumber: 307,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-1 gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(BuildButton, {
                                        label: `街道を建てる (木材1, レンガ1)`,
                                        active: buildMode === "road",
                                        disabled: !(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hasResources"])(human, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].road) && state.freeRoadsRemaining === 0,
                                        onClick: ()=>setBuildMode((m)=>m === "road" ? null : "road")
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameApp.tsx",
                                        lineNumber: 309,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(BuildButton, {
                                        label: `開拓地を建てる (木材1, レンガ1, 羊毛1, 小麦1)`,
                                        active: buildMode === "settlement",
                                        disabled: !(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hasResources"])(human, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].settlement),
                                        onClick: ()=>setBuildMode((m)=>m === "settlement" ? null : "settlement")
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameApp.tsx",
                                        lineNumber: 315,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(BuildButton, {
                                        label: `街(都市)にする (鉱石3, 小麦2)`,
                                        active: buildMode === "city",
                                        disabled: !(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hasResources"])(human, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].city),
                                        onClick: ()=>setBuildMode((m)=>m === "city" ? null : "city")
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameApp.tsx",
                                        lineNumber: 321,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        className: "rounded border border-slate-300 px-3 py-2 text-left text-sm hover:bg-slate-100 disabled:opacity-40",
                                        disabled: !(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$selectors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hasResources"])(human, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BUILDING_COST"].devCard) || state.bankDevCards.length === 0,
                                        onClick: ()=>dispatch({
                                                type: "BUY_DEV_CARD",
                                                playerId: human.id
                                            }),
                                        children: "発展カードを購入する (鉱石1, 羊毛1, 小麦1)"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameApp.tsx",
                                        lineNumber: 327,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/GameApp.tsx",
                                lineNumber: 308,
                                columnNumber: 13
                            }, this),
                            buildMode && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-amber-600",
                                children: "盤面の黄色いマーカーをクリックして配置してください。(もう一度ボタンを押すとキャンセル)"
                            }, void 0, false, {
                                fileName: "[project]/src/components/GameApp.tsx",
                                lineNumber: 337,
                                columnNumber: 15
                            }, this),
                            state.freeRoadsRemaining > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-emerald-600",
                                children: [
                                    "街道建設カードにより、無料で建てられる街道が残り ",
                                    state.freeRoadsRemaining,
                                    " 本あります。"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/GameApp.tsx",
                                lineNumber: 340,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("hr", {
                                className: "my-1 border-slate-200"
                            }, void 0, false, {
                                fileName: "[project]/src/components/GameApp.tsx",
                                lineNumber: 343,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "font-semibold text-slate-700",
                                children: "交易"
                            }, void 0, false, {
                                fileName: "[project]/src/components/GameApp.tsx",
                                lineNumber: 345,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100",
                                onClick: ()=>setTradeOpen(true),
                                children: "銀行・港と交易する"
                            }, void 0, false, {
                                fileName: "[project]/src/components/GameApp.tsx",
                                lineNumber: 346,
                                columnNumber: 13
                            }, this),
                            playableDevCards.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("hr", {
                                        className: "my-1 border-slate-200"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameApp.tsx",
                                        lineNumber: 352,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "font-semibold text-slate-700",
                                        children: "発展カードをプレイ"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameApp.tsx",
                                        lineNumber: 353,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-col gap-1",
                                        children: playableDevCards.map((type)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "rounded border border-slate-300 px-3 py-2 text-left text-sm hover:bg-slate-100 disabled:opacity-40",
                                                disabled: state.devCardPlayedThisTurn,
                                                onClick: ()=>{
                                                    if (type === "knight") dispatch({
                                                        type: "PLAY_KNIGHT",
                                                        playerId: human.id
                                                    });
                                                    else if (type === "roadBuilding") dispatch({
                                                        type: "PLAY_ROAD_BUILDING",
                                                        playerId: human.id
                                                    });
                                                    else if (type === "yearOfPlenty") setDevCardDialog("yearOfPlenty");
                                                    else if (type === "monopoly") setDevCardDialog("monopoly");
                                                },
                                                children: [
                                                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$game$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEV_CARD_LABEL"][type],
                                                    " を使う"
                                                ]
                                            }, type, true, {
                                                fileName: "[project]/src/components/GameApp.tsx",
                                                lineNumber: 356,
                                                columnNumber: 21
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameApp.tsx",
                                        lineNumber: 354,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("hr", {
                                className: "my-1 border-slate-200"
                            }, void 0, false, {
                                fileName: "[project]/src/components/GameApp.tsx",
                                lineNumber: 374,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "rounded bg-slate-800 py-2 text-sm font-semibold text-white hover:bg-slate-900",
                                onClick: ()=>dispatch({
                                        type: "END_TURN",
                                        playerId: human.id
                                    }),
                                children: "ターンを終了する"
                            }, void 0, false, {
                                fileName: "[project]/src/components/GameApp.tsx",
                                lineNumber: 375,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/GameApp.tsx",
                        lineNumber: 306,
                        columnNumber: 11
                    }, this),
                    !human && state.phase !== "gameOver" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-lg border border-slate-300 bg-white/70 p-3 text-sm text-slate-600",
                        children: [
                            actingPlayer?.name,
                            " さん (",
                            actingPlayer?.kind === "cpu" ? "CPU" : "他プレイヤー",
                            ") の手番です。お待ちください…"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/GameApp.tsx",
                        lineNumber: 385,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/GameApp.tsx",
                lineNumber: 293,
                columnNumber: 7
            }, this),
            state.phase === "discard" && human && state.playersToDiscard[0] === human.id && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ActionDialogs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DiscardDialog"], {
                state: state,
                playerId: human.id,
                onSubmit: (discardSelection)=>dispatch({
                        type: "DISCARD",
                        playerId: human.id,
                        discard: discardSelection
                    })
            }, void 0, false, {
                fileName: "[project]/src/components/GameApp.tsx",
                lineNumber: 393,
                columnNumber: 9
            }, this),
            robberPicker && actingId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ActionDialogs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RobberTargetDialog"], {
                state: state,
                candidateIds: robberPicker.candidates,
                onChoose: (targetPlayerId)=>{
                    dispatch({
                        type: "MOVE_ROBBER",
                        playerId: actingId,
                        hexId: robberPicker.hexId,
                        targetPlayerId
                    });
                    setRobberPicker(null);
                }
            }, void 0, false, {
                fileName: "[project]/src/components/GameApp.tsx",
                lineNumber: 401,
                columnNumber: 9
            }, this),
            devCardDialog === "yearOfPlenty" && human && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ActionDialogs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YearOfPlentyDialog"], {
                onCancel: ()=>setDevCardDialog(null),
                onSubmit: (resources)=>{
                    dispatch({
                        type: "PLAY_YEAR_OF_PLENTY",
                        playerId: human.id,
                        resources
                    });
                    setDevCardDialog(null);
                }
            }, void 0, false, {
                fileName: "[project]/src/components/GameApp.tsx",
                lineNumber: 412,
                columnNumber: 9
            }, this),
            devCardDialog === "monopoly" && human && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ActionDialogs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MonopolyDialog"], {
                onCancel: ()=>setDevCardDialog(null),
                onSubmit: (resource)=>{
                    dispatch({
                        type: "PLAY_MONOPOLY",
                        playerId: human.id,
                        resource
                    });
                    setDevCardDialog(null);
                }
            }, void 0, false, {
                fileName: "[project]/src/components/GameApp.tsx",
                lineNumber: 422,
                columnNumber: 9
            }, this),
            tradeOpen && human && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ActionDialogs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BankTradeDialog"], {
                state: state,
                playerId: human.id,
                onCancel: ()=>setTradeOpen(false),
                onSubmit: (give, want)=>{
                    dispatch({
                        type: "BANK_TRADE",
                        playerId: human.id,
                        give,
                        want
                    });
                    setTradeOpen(false);
                }
            }, void 0, false, {
                fileName: "[project]/src/components/GameApp.tsx",
                lineNumber: 432,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/GameApp.tsx",
        lineNumber: 230,
        columnNumber: 5
    }, this);
}
function BuildButton({ label, active, disabled, onClick }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        className: `rounded border px-3 py-2 text-left text-sm transition ${active ? "border-amber-500 bg-amber-50" : "border-slate-300 hover:bg-slate-100"} disabled:opacity-40`,
        disabled: disabled,
        onClick: onClick,
        children: label
    }, void 0, false, {
        fileName: "[project]/src/components/GameApp.tsx",
        lineNumber: 458,
        columnNumber: 5
    }, this);
}
// === セットアップ画面 ===
function SetupScreen({ configs, setConfigs, onStart }) {
    function update(index, patch) {
        setConfigs(configs.map((c, i)=>i === index ? {
                ...c,
                ...patch
            } : c));
    }
    function add() {
        if (configs.length >= 4) return;
        setConfigs([
            ...configs,
            {
                name: `CPU ${configs.length}`,
                kind: "cpu"
            }
        ]);
    }
    function remove(index) {
        if (configs.length <= 2) return;
        setConfigs(configs.filter((_, i)=>i !== index));
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mx-auto flex max-w-lg flex-col gap-4 p-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-xl bg-white/90 p-6 shadow",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "mb-1 text-2xl font-bold text-slate-800",
                        children: "カタン"
                    }, void 0, false, {
                        fileName: "[project]/src/components/GameApp.tsx",
                        lineNumber: 498,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mb-4 text-sm text-slate-500",
                        children: "プレイヤーを設定してゲームを開始してください(2〜4人, 同じ画面で交代プレイ)。"
                    }, void 0, false, {
                        fileName: "[project]/src/components/GameApp.tsx",
                        lineNumber: 499,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col gap-2",
                        children: configs.map((config, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "w-5 text-sm text-slate-400",
                                        children: i + 1
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameApp.tsx",
                                        lineNumber: 504,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        className: "flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm",
                                        value: config.name,
                                        onChange: (e)=>update(i, {
                                                name: e.target.value
                                            })
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameApp.tsx",
                                        lineNumber: 505,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        className: "rounded border border-slate-300 px-2 py-1.5 text-sm",
                                        value: config.kind,
                                        onChange: (e)=>update(i, {
                                                kind: e.target.value
                                            }),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "human",
                                                children: "人間"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/GameApp.tsx",
                                                lineNumber: 515,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "cpu",
                                                children: "CPU"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/GameApp.tsx",
                                                lineNumber: 516,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/GameApp.tsx",
                                        lineNumber: 510,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        className: "text-xs text-red-500 disabled:text-slate-300",
                                        disabled: configs.length <= 2,
                                        onClick: ()=>remove(i),
                                        children: "削除"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameApp.tsx",
                                        lineNumber: 518,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, i, true, {
                                fileName: "[project]/src/components/GameApp.tsx",
                                lineNumber: 503,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/GameApp.tsx",
                        lineNumber: 501,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-3 flex justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40",
                                disabled: configs.length >= 4,
                                onClick: add,
                                children: "+ プレイヤーを追加"
                            }, void 0, false, {
                                fileName: "[project]/src/components/GameApp.tsx",
                                lineNumber: 530,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs text-slate-400",
                                children: [
                                    configs.length,
                                    " / 4 人"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/GameApp.tsx",
                                lineNumber: 533,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/GameApp.tsx",
                        lineNumber: 529,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "mt-5 w-full rounded bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700",
                        onClick: onStart,
                        children: "ゲーム開始"
                    }, void 0, false, {
                        fileName: "[project]/src/components/GameApp.tsx",
                        lineNumber: 536,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/GameApp.tsx",
                lineNumber: 497,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-xl bg-white/70 p-4 text-xs text-slate-500",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: "人間に設定したプレイヤーは、同じ画面で交代しながら操作します(ホットシート)。CPU は自動で手番を進めます。最初に勝利点10点に到達したプレイヤーの勝利です。"
                }, void 0, false, {
                    fileName: "[project]/src/components/GameApp.tsx",
                    lineNumber: 545,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/GameApp.tsx",
                lineNumber: 544,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/GameApp.tsx",
        lineNumber: 496,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=src_04ws4bk._.js.map