"use client";

// 各プレイヤーの資源・カード・勝利点を表示するパネル

import { publicVictoryPoints, resourceTotal, totalVictoryPoints } from "@/lib/game/selectors";
import { RESOURCES, RESOURCE_LABEL, type GameState, type PlayerId } from "@/lib/game/types";

interface PlayerPanelProps {
  state: GameState;
  viewerId: PlayerId | null; // 手札を見ることができるプレイヤー (人間のホットシート用)
}

export default function PlayerPanel({ state, viewerId }: PlayerPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      {state.players.map((player, index) => {
        const isCurrent = state.currentPlayerIndex === index && state.phase !== "gameOver";
        const isViewer = player.id === viewerId;
        const showHand = isViewer || player.kind === "cpu";
        const vp = isViewer ? totalVictoryPoints(state, player.id) : publicVictoryPoints(state, player.id);

        return (
          <div
            key={player.id}
            className={`rounded-lg border p-3 text-sm ${
              isCurrent ? "border-yellow-400 ring-2 ring-yellow-300 bg-white/90" : "border-slate-300 bg-white/70"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: player.color }} />
                <span className="font-semibold">{player.name}</span>
                <span className="text-xs text-slate-500">{player.kind === "human" ? "人間" : "CPU"}</span>
              </div>
              <div className="font-bold text-slate-700">{vp} 点</div>
            </div>

            <div className="mt-2 grid grid-cols-5 gap-1 text-xs">
              {RESOURCES.map((resource) => (
                <div key={resource} className="flex flex-col items-center rounded bg-slate-100 py-1">
                  <span className="text-[10px] text-slate-500">{RESOURCE_LABEL[resource]}</span>
                  <span className="font-semibold">{showHand ? player.resources[resource] : "?"}</span>
                </div>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
              <span>手札合計: {showHand ? resourceTotal(player) : "?"}</span>
              <span>発展カード: {showHand ? player.devCards.length : player.devCards.length}</span>
              <span>騎士使用: {player.knightsPlayed}</span>
              <span>残り 開拓地{player.settlementsLeft}/街{player.citiesLeft}/街道{player.roadsLeft}</span>
            </div>

            <div className="mt-1 flex gap-2 text-xs">
              {state.longestRoadOwner === player.id && (
                <span className="rounded bg-amber-200 px-2 py-0.5">最長交易路 +2</span>
              )}
              {state.largestArmyOwner === player.id && (
                <span className="rounded bg-rose-200 px-2 py-0.5">最大騎士力 +2</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
