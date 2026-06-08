"use client";

// ゲーム全体を統括するクライアントコンポーネント (セットアップ画面 + 対局画面)

import { useEffect, useState } from "react";
import BoardView from "./BoardView";
import PlayerPanel from "./PlayerPanel";
import GameLog from "./GameLog";
import {
  BankTradeDialog,
  DiscardDialog,
  MonopolyDialog,
  RobberTargetDialog,
  YearOfPlentyDialog,
} from "./ActionDialogs";
import { applyAction, type ActionResult, type GameAction } from "@/lib/game/engine";
import { decideCpuAction } from "@/lib/ai/simpleAi";
import { createGame, type PlayerConfig } from "@/lib/game/setup";
import {
  canPlaceRoad,
  canPlaceSettlement,
  canUpgradeToCity,
  getPlayer,
  hasResources,
  playersAdjacentToHex,
} from "@/lib/game/selectors";
import {
  BUILDING_COST,
  DEV_CARD_LABEL,
  type DevCardType,
  type GamePhase,
  type GameState,
  type PlayerId,
  type PlayerKind,
  type Resource,
  type ResourceCount,
} from "@/lib/game/types";

type BuildMode = "settlement" | "road" | "city" | null;

const DEFAULT_CONFIGS: PlayerConfig[] = [
  { name: "あなた", kind: "human" },
  { name: "CPU 1", kind: "cpu" },
  { name: "CPU 2", kind: "cpu" },
  { name: "CPU 3", kind: "cpu" },
];

function actingPlayerId(state: GameState): PlayerId | null {
  if (state.phase === "discard") return state.playersToDiscard[0] ?? null;
  if (state.phase === "moveRobber") return state.robberMovedBy;
  if (state.phase === "gameOver") return null;
  switch (state.phase) {
    case "setup-settlement-1":
    case "setup-road-1":
    case "setup-settlement-2":
    case "setup-road-2":
      return state.setupOrder[state.setupIndex] ?? null;
    default:
      return state.players[state.currentPlayerIndex].id;
  }
}

function phaseLabel(phase: GamePhase): string {
  switch (phase) {
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

export default function GameApp() {
  const [configs, setConfigs] = useState<PlayerConfig[]>(DEFAULT_CONFIGS);
  const [state, setState] = useState<GameState | null>(null);
  const [buildMode, setBuildMode] = useState<BuildMode>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [robberPicker, setRobberPicker] = useState<{ hexId: string; candidates: PlayerId[] } | null>(null);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [devCardDialog, setDevCardDialog] = useState<"yearOfPlenty" | "monopoly" | null>(null);

  function dispatch(action: GameAction): ActionResult | null {
    if (!state) return null;
    const result = applyAction(state, action);
    if (result.ok) {
      setState(result.state);
      setErrorMessage(null);
    } else {
      setErrorMessage(result.message ?? "その操作はできません。");
    }
    return result;
  }

  const actingId = state ? actingPlayerId(state) : null;
  const actingPlayer = state && actingId ? getPlayer(state, actingId) : null;
  const isHumanTurn = actingPlayer?.kind === "human";

  // CPU の自動進行: フェイズが変わるたびに次の1手を考えて実行する
  useEffect(() => {
    if (!state || state.phase === "gameOver") return;
    const id = actingPlayerId(state);
    if (!id) return;
    const player = getPlayer(state, id);
    if (player.kind !== "cpu") return;

    const timer = setTimeout(() => {
      const action = decideCpuAction(state, id);
      const result = dispatch(action ?? { type: "END_TURN", playerId: id });
      if (action && result && !result.ok) {
        dispatch({ type: "END_TURN", playerId: id });
      }
    }, 650);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // 盤面上で選択可能な要素の計算 (人間の手番のときのみ)
  const selectable = (() => {
    const vertices = new Set<string>();
    const edges = new Set<string>();
    const hexes = new Set<string>();
    if (!state || !actingId || !isHumanTurn) return { vertices, edges, hexes };

    switch (state.phase) {
      case "setup-settlement-1":
      case "setup-settlement-2":
        for (const v of state.board.vertices) {
          if (canPlaceSettlement(state, actingId, v.id, true)) vertices.add(v.id);
        }
        break;
      case "setup-road-1":
      case "setup-road-2":
        for (const e of state.board.edges) {
          if (canPlaceRoad(state, actingId, e.id, { isSetup: true, setupAnchorVertexId: state.setupPendingVertexId })) {
            edges.add(e.id);
          }
        }
        break;
      case "moveRobber":
        for (const h of state.board.hexes) {
          if (!h.hasRobber) hexes.add(h.id);
        }
        break;
      case "main":
        if (buildMode === "settlement") {
          for (const v of state.board.vertices) {
            if (canPlaceSettlement(state, actingId, v.id, false)) vertices.add(v.id);
          }
        } else if (buildMode === "road") {
          for (const e of state.board.edges) {
            if (canPlaceRoad(state, actingId, e.id)) edges.add(e.id);
          }
        } else if (buildMode === "city") {
          for (const v of state.board.vertices) {
            if (canUpgradeToCity(state, actingId, v.id)) vertices.add(v.id);
          }
        }
        break;
      default:
        break;
    }
    return { vertices, edges, hexes };
  })();

  function handleVertexClick(vertexId: string) {
    if (!state || !actingId) return;
    if (state.phase === "setup-settlement-1" || state.phase === "setup-settlement-2") {
      dispatch({ type: "BUILD_SETTLEMENT", playerId: actingId, vertexId });
    } else if (state.phase === "main" && buildMode === "settlement") {
      dispatch({ type: "BUILD_SETTLEMENT", playerId: actingId, vertexId });
      setBuildMode(null);
    } else if (state.phase === "main" && buildMode === "city") {
      dispatch({ type: "BUILD_CITY", playerId: actingId, vertexId });
      setBuildMode(null);
    }
  }

  function handleEdgeClick(edgeId: string) {
    if (!state || !actingId) return;
    if (state.phase === "setup-road-1" || state.phase === "setup-road-2") {
      dispatch({ type: "BUILD_ROAD", playerId: actingId, edgeId });
    } else if (state.phase === "main" && buildMode === "road") {
      dispatch({ type: "BUILD_ROAD", playerId: actingId, edgeId });
      setBuildMode(null);
    }
  }

  function handleHexClick(hexId: string) {
    if (!state || !actingId || state.phase !== "moveRobber") return;
    const candidates = playersAdjacentToHex(state, hexId, actingId);
    if (candidates.length <= 1) {
      dispatch({ type: "MOVE_ROBBER", playerId: actingId, hexId, targetPlayerId: candidates[0] ?? null });
    } else {
      setRobberPicker({ hexId, candidates });
    }
  }

  if (!state) {
    return (
      <SetupScreen
        configs={configs}
        setConfigs={setConfigs}
        onStart={() => setState(createGame(configs))}
      />
    );
  }

  const human = actingPlayer?.kind === "human" ? actingPlayer : null;
  const playableDevCards: DevCardType[] = human
    ? (["knight", "roadBuilding", "yearOfPlenty", "monopoly"] as DevCardType[]).filter((type) => {
        const total = human.devCards.filter((c) => c === type).length;
        const fresh = human.newDevCards.filter((c) => c === type).length;
        return total > fresh;
      })
    : [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 lg:flex-row">
      <div className="flex-1">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 p-3 text-sm">
          <div>
            <span className="font-semibold">ターン {state.turnNumber}</span>
            <span className="mx-2 text-slate-400">|</span>
            <span>
              現在の手番:{" "}
              <span className="font-semibold" style={{ color: actingPlayer?.color }}>
                {actingPlayer?.name ?? "-"}
              </span>
            </span>
            <span className="mx-2 text-slate-400">|</span>
            <span className="text-slate-600">{phaseLabel(state.phase)}</span>
            {state.lastDiceRoll && (
              <>
                <span className="mx-2 text-slate-400">|</span>
                <span>
                  サイコロ: {state.lastDiceRoll.die1} + {state.lastDiceRoll.die2} = <b>{state.lastDiceRoll.total}</b>
                </span>
              </>
            )}
          </div>
          <button className="rounded border border-slate-300 px-3 py-1 text-xs hover:bg-slate-100" onClick={() => setState(null)}>
            新しいゲーム
          </button>
        </div>

        {errorMessage && (
          <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
        )}

        {state.phase === "gameOver" && state.winner && (
          <div className="mb-3 rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-3 text-center text-lg font-bold text-emerald-700">
            🎉 {getPlayer(state, state.winner).name} さんの勝利です! 🎉
          </div>
        )}

        <div className="rounded-lg bg-sky-50 p-2">
          <BoardView
            state={state}
            selectableVertexIds={selectable.vertices}
            selectableEdgeIds={selectable.edges}
            selectableHexIds={selectable.hexes}
            onVertexClick={handleVertexClick}
            onEdgeClick={handleEdgeClick}
            onHexClick={handleHexClick}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
          <span>銀行の発展カード残り: {state.bankDevCards.length} 枚</span>
          <span>
            銀行の資源: 木材{state.bankResources.wood} / レンガ{state.bankResources.brick} / 羊毛{state.bankResources.wool} / 小麦
            {state.bankResources.grain} / 鉱石{state.bankResources.ore}
          </span>
        </div>

        <div className="mt-3">
          <GameLog entries={state.log} />
        </div>
      </div>

      <div className="w-full lg:w-80 flex flex-col gap-4">
        <PlayerPanel state={state} viewerId={human?.id ?? null} />

        {human && state.phase === "roll" && (
          <button
            className="rounded bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700"
            onClick={() => dispatch({ type: "ROLL_DICE", playerId: human.id })}
          >
            🎲 サイコロを振る
          </button>
        )}

        {human && state.phase === "main" && (
          <div className="flex flex-col gap-2 rounded-lg border border-slate-300 bg-white/80 p-3 text-sm">
            <p className="font-semibold text-slate-700">建設</p>
            <div className="grid grid-cols-1 gap-2">
              <BuildButton
                label={`街道を建てる (木材1, レンガ1)`}
                active={buildMode === "road"}
                disabled={!hasResources(human, BUILDING_COST.road) && state.freeRoadsRemaining === 0}
                onClick={() => setBuildMode((m) => (m === "road" ? null : "road"))}
              />
              <BuildButton
                label={`開拓地を建てる (木材1, レンガ1, 羊毛1, 小麦1)`}
                active={buildMode === "settlement"}
                disabled={!hasResources(human, BUILDING_COST.settlement)}
                onClick={() => setBuildMode((m) => (m === "settlement" ? null : "settlement"))}
              />
              <BuildButton
                label={`街(都市)にする (鉱石3, 小麦2)`}
                active={buildMode === "city"}
                disabled={!hasResources(human, BUILDING_COST.city)}
                onClick={() => setBuildMode((m) => (m === "city" ? null : "city"))}
              />
              <button
                className="rounded border border-slate-300 px-3 py-2 text-left text-sm hover:bg-slate-100 disabled:opacity-40"
                disabled={!hasResources(human, BUILDING_COST.devCard) || state.bankDevCards.length === 0}
                onClick={() => dispatch({ type: "BUY_DEV_CARD", playerId: human.id })}
              >
                発展カードを購入する (鉱石1, 羊毛1, 小麦1)
              </button>
            </div>

            {buildMode && (
              <p className="text-xs text-amber-600">盤面の黄色いマーカーをクリックして配置してください。(もう一度ボタンを押すとキャンセル)</p>
            )}
            {state.freeRoadsRemaining > 0 && (
              <p className="text-xs text-emerald-600">街道建設カードにより、無料で建てられる街道が残り {state.freeRoadsRemaining} 本あります。</p>
            )}

            <hr className="my-1 border-slate-200" />

            <p className="font-semibold text-slate-700">交易</p>
            <button className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100" onClick={() => setTradeOpen(true)}>
              銀行・港と交易する
            </button>

            {playableDevCards.length > 0 && (
              <>
                <hr className="my-1 border-slate-200" />
                <p className="font-semibold text-slate-700">発展カードをプレイ</p>
                <div className="flex flex-col gap-1">
                  {playableDevCards.map((type) => (
                    <button
                      key={type}
                      className="rounded border border-slate-300 px-3 py-2 text-left text-sm hover:bg-slate-100 disabled:opacity-40"
                      disabled={state.devCardPlayedThisTurn}
                      onClick={() => {
                        if (type === "knight") dispatch({ type: "PLAY_KNIGHT", playerId: human.id });
                        else if (type === "roadBuilding") dispatch({ type: "PLAY_ROAD_BUILDING", playerId: human.id });
                        else if (type === "yearOfPlenty") setDevCardDialog("yearOfPlenty");
                        else if (type === "monopoly") setDevCardDialog("monopoly");
                      }}
                    >
                      {DEV_CARD_LABEL[type]} を使う
                    </button>
                  ))}
                </div>
              </>
            )}

            <hr className="my-1 border-slate-200" />
            <button
              className="rounded bg-slate-800 py-2 text-sm font-semibold text-white hover:bg-slate-900"
              onClick={() => dispatch({ type: "END_TURN", playerId: human.id })}
            >
              ターンを終了する
            </button>
          </div>
        )}

        {!human && state.phase !== "gameOver" && (
          <div className="rounded-lg border border-slate-300 bg-white/70 p-3 text-sm text-slate-600">
            {actingPlayer?.name} さん ({actingPlayer?.kind === "cpu" ? "CPU" : "他プレイヤー"}) の手番です。お待ちください…
          </div>
        )}
      </div>

      {/* ダイアログ群 */}
      {state.phase === "discard" && human && state.playersToDiscard[0] === human.id && (
        <DiscardDialog
          state={state}
          playerId={human.id}
          onSubmit={(discardSelection) => dispatch({ type: "DISCARD", playerId: human.id, discard: discardSelection })}
        />
      )}

      {robberPicker && actingId && (
        <RobberTargetDialog
          state={state}
          candidateIds={robberPicker.candidates}
          onChoose={(targetPlayerId) => {
            dispatch({ type: "MOVE_ROBBER", playerId: actingId, hexId: robberPicker.hexId, targetPlayerId });
            setRobberPicker(null);
          }}
        />
      )}

      {devCardDialog === "yearOfPlenty" && human && (
        <YearOfPlentyDialog
          onCancel={() => setDevCardDialog(null)}
          onSubmit={(resources: [Resource, Resource]) => {
            dispatch({ type: "PLAY_YEAR_OF_PLENTY", playerId: human.id, resources });
            setDevCardDialog(null);
          }}
        />
      )}

      {devCardDialog === "monopoly" && human && (
        <MonopolyDialog
          onCancel={() => setDevCardDialog(null)}
          onSubmit={(resource: Resource) => {
            dispatch({ type: "PLAY_MONOPOLY", playerId: human.id, resource });
            setDevCardDialog(null);
          }}
        />
      )}

      {tradeOpen && human && (
        <BankTradeDialog
          state={state}
          playerId={human.id}
          onCancel={() => setTradeOpen(false)}
          onSubmit={(give: Partial<ResourceCount>, want: Partial<ResourceCount>) => {
            dispatch({ type: "BANK_TRADE", playerId: human.id, give, want });
            setTradeOpen(false);
          }}
        />
      )}
    </div>
  );
}

function BuildButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded border px-3 py-2 text-left text-sm transition ${
        active ? "border-amber-500 bg-amber-50" : "border-slate-300 hover:bg-slate-100"
      } disabled:opacity-40`}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// === セットアップ画面 ===

function SetupScreen({
  configs,
  setConfigs,
  onStart,
}: {
  configs: PlayerConfig[];
  setConfigs: (configs: PlayerConfig[]) => void;
  onStart: () => void;
}) {
  function update(index: number, patch: Partial<PlayerConfig>) {
    setConfigs(configs.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function add() {
    if (configs.length >= 4) return;
    setConfigs([...configs, { name: `CPU ${configs.length}`, kind: "cpu" }]);
  }

  function remove(index: number) {
    if (configs.length <= 2) return;
    setConfigs(configs.filter((_, i) => i !== index));
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <div className="rounded-xl bg-white/90 p-6 shadow">
        <h1 className="mb-1 text-2xl font-bold text-slate-800">カタン</h1>
        <p className="mb-4 text-sm text-slate-500">プレイヤーを設定してゲームを開始してください(2〜4人, 同じ画面で交代プレイ)。</p>

        <div className="flex flex-col gap-2">
          {configs.map((config, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 text-sm text-slate-400">{i + 1}</span>
              <input
                className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
                value={config.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
              <select
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                value={config.kind}
                onChange={(e) => update(i, { kind: e.target.value as PlayerKind })}
              >
                <option value="human">人間</option>
                <option value="cpu">CPU</option>
              </select>
              <button
                className="text-xs text-red-500 disabled:text-slate-300"
                disabled={configs.length <= 2}
                onClick={() => remove(i)}
              >
                削除
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex justify-between">
          <button className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40" disabled={configs.length >= 4} onClick={add}>
            + プレイヤーを追加
          </button>
          <span className="text-xs text-slate-400">{configs.length} / 4 人</span>
        </div>

        <button
          className="mt-5 w-full rounded bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700"
          onClick={onStart}
        >
          ゲーム開始
        </button>
      </div>

      <div className="rounded-xl bg-white/70 p-4 text-xs text-slate-500">
        <p>
          人間に設定したプレイヤーは、同じ画面で交代しながら操作します(ホットシート)。CPU
          は自動で手番を進めます。最初に勝利点10点に到達したプレイヤーの勝利です。
        </p>
      </div>
    </div>
  );
}
