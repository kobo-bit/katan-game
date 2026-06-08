"use client";

// 各種ダイアログ: 捨て札 / 盗賊の対象選択 / 発見・独占カードの資源選択 / 銀行交易

import { useMemo, useState } from "react";
import { bestTradeRate } from "@/lib/game/engine";
import { getPlayer, hasResources, resourceTotal } from "@/lib/game/selectors";
import {
  RESOURCES,
  RESOURCE_LABEL,
  type GameState,
  type PlayerId,
  type Resource,
  type ResourceCount,
} from "@/lib/game/types";

function DialogShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="mb-3 text-lg font-bold text-slate-800">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// === 捨て札ダイアログ ===

export function DiscardDialog({
  state,
  playerId,
  onSubmit,
}: {
  state: GameState;
  playerId: PlayerId;
  onSubmit: (discard: Partial<ResourceCount>) => void;
}) {
  const player = getPlayer(state, playerId);
  const required = Math.floor(resourceTotal(player) / 2);
  const [selected, setSelected] = useState<Partial<ResourceCount>>({});

  const total = useMemo(() => RESOURCES.reduce((sum, r) => sum + (selected[r] ?? 0), 0), [selected]);

  function adjust(resource: Resource, delta: number) {
    setSelected((prev) => {
      const current = prev[resource] ?? 0;
      const next = Math.max(0, Math.min(player.resources[resource], current + delta));
      return { ...prev, [resource]: next };
    });
  }

  return (
    <DialogShell title={`${player.name} さん: カードを ${required} 枚捨ててください`}>
      <p className="mb-3 text-sm text-slate-600">手札が8枚以上のため、半分(端数切り捨て)を選んで捨てる必要があります。</p>
      <div className="grid grid-cols-5 gap-2">
        {RESOURCES.map((resource) => (
          <div key={resource} className="flex flex-col items-center gap-1 rounded border border-slate-200 p-2">
            <span className="text-xs text-slate-500">{RESOURCE_LABEL[resource]}</span>
            <span className="text-xs text-slate-400">所持: {player.resources[resource]}</span>
            <div className="flex items-center gap-1">
              <button
                className="h-6 w-6 rounded bg-slate-200 text-sm hover:bg-slate-300"
                onClick={() => adjust(resource, -1)}
              >
                -
              </button>
              <span className="w-5 text-center text-sm font-semibold">{selected[resource] ?? 0}</span>
              <button
                className="h-6 w-6 rounded bg-slate-200 text-sm hover:bg-slate-300"
                onClick={() => adjust(resource, 1)}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className={`text-sm ${total === required ? "text-emerald-600" : "text-red-500"}`}>
          選択中: {total} / {required} 枚
        </span>
        <button
          className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          disabled={total !== required}
          onClick={() => onSubmit(selected)}
        >
          捨てる
        </button>
      </div>
    </DialogShell>
  );
}

// === 盗賊の対象選択ダイアログ ===

export function RobberTargetDialog({
  state,
  candidateIds,
  onChoose,
}: {
  state: GameState;
  candidateIds: PlayerId[];
  onChoose: (targetPlayerId: PlayerId | null) => void;
}) {
  return (
    <DialogShell title="誰から資源を奪いますか?">
      <div className="flex flex-col gap-2">
        {candidateIds.map((id) => {
          const p = getPlayer(state, id);
          return (
            <button
              key={id}
              className="flex items-center justify-between rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
              onClick={() => onChoose(id)}
            >
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </span>
              <span className="text-slate-500">手札 {resourceTotal(p)} 枚</span>
            </button>
          );
        })}
        <button className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-100" onClick={() => onChoose(null)}>
          誰からも奪わない
        </button>
      </div>
    </DialogShell>
  );
}

// === 発見カード: 資源2つを選択 ===

export function YearOfPlentyDialog({
  onSubmit,
  onCancel,
}: {
  onSubmit: (resources: [Resource, Resource]) => void;
  onCancel: () => void;
}) {
  const [picks, setPicks] = useState<Resource[]>([]);

  function toggle(resource: Resource) {
    setPicks((prev) => {
      if (prev.length >= 2) return [resource];
      return [...prev, resource];
    });
  }

  return (
    <DialogShell title="発見カード: 銀行から好きな資源を2枚獲得できます">
      <div className="grid grid-cols-5 gap-2">
        {RESOURCES.map((resource) => (
          <button
            key={resource}
            className={`rounded border px-2 py-3 text-sm ${
              picks.includes(resource) ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:bg-slate-100"
            }`}
            onClick={() => toggle(resource)}
          >
            {RESOURCE_LABEL[resource]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        選択中: {picks.map((r) => RESOURCE_LABEL[r]).join(", ") || "(なし)"}
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button className="rounded border border-slate-300 px-4 py-2 text-sm" onClick={onCancel}>
          やめる
        </button>
        <button
          className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          disabled={picks.length !== 2}
          onClick={() => onSubmit([picks[0], picks[1]])}
        >
          獲得する
        </button>
      </div>
    </DialogShell>
  );
}

// === 独占カード: 資源を1つ選択 ===

export function MonopolyDialog({
  onSubmit,
  onCancel,
}: {
  onSubmit: (resource: Resource) => void;
  onCancel: () => void;
}) {
  return (
    <DialogShell title="独占カード: 1種類の資源を指定し、全員から回収します">
      <div className="grid grid-cols-5 gap-2">
        {RESOURCES.map((resource) => (
          <button
            key={resource}
            className="rounded border border-slate-300 px-2 py-3 text-sm hover:bg-slate-100"
            onClick={() => onSubmit(resource)}
          >
            {RESOURCE_LABEL[resource]}
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button className="rounded border border-slate-300 px-4 py-2 text-sm" onClick={onCancel}>
          やめる
        </button>
      </div>
    </DialogShell>
  );
}

// === 銀行交易ダイアログ ===

export function BankTradeDialog({
  state,
  playerId,
  onSubmit,
  onCancel,
}: {
  state: GameState;
  playerId: PlayerId;
  onSubmit: (give: Partial<ResourceCount>, want: Partial<ResourceCount>) => void;
  onCancel: () => void;
}) {
  const player = getPlayer(state, playerId);
  const [giveResource, setGiveResource] = useState<Resource | null>(null);
  const [wantResource, setWantResource] = useState<Resource | null>(null);

  const rate = giveResource ? bestTradeRate(state, playerId, giveResource) : null;
  const giveCost: Partial<ResourceCount> = giveResource && rate ? { [giveResource]: rate } : {};
  const wantGain: Partial<ResourceCount> = wantResource ? { [wantResource]: 1 } : {};

  const canTrade =
    !!giveResource &&
    !!wantResource &&
    giveResource !== wantResource &&
    !!rate &&
    hasResources(player, giveCost) &&
    state.bankResources[wantResource] > 0;

  return (
    <DialogShell title="銀行・港との交易">
      <p className="mb-2 text-sm text-slate-600">渡す資源を選ぶと、所持する港に応じたレート(2:1, 3:1, 4:1)が適用されます。</p>

      <div className="mb-3">
        <p className="mb-1 text-xs font-semibold text-slate-500">渡す資源 (レート: {rate ? `${rate}:1` : "-"})</p>
        <div className="grid grid-cols-5 gap-2">
          {RESOURCES.map((resource) => (
            <button
              key={resource}
              className={`rounded border px-2 py-2 text-xs ${
                giveResource === resource ? "border-rose-500 bg-rose-50" : "border-slate-300 hover:bg-slate-100"
              }`}
              onClick={() => setGiveResource(resource)}
            >
              {RESOURCE_LABEL[resource]} ({player.resources[resource]})
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <p className="mb-1 text-xs font-semibold text-slate-500">欲しい資源</p>
        <div className="grid grid-cols-5 gap-2">
          {RESOURCES.map((resource) => (
            <button
              key={resource}
              className={`rounded border px-2 py-2 text-xs ${
                wantResource === resource ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:bg-slate-100"
              }`}
              onClick={() => setWantResource(resource)}
            >
              {RESOURCE_LABEL[resource]} (銀行 {state.bankResources[resource]})
            </button>
          ))}
        </div>
      </div>

      {giveResource && wantResource && (
        <p className="mb-2 text-sm text-slate-700">
          {RESOURCE_LABEL[giveResource]} {rate} 枚 → {RESOURCE_LABEL[wantResource]} 1 枚
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button className="rounded border border-slate-300 px-4 py-2 text-sm" onClick={onCancel}>
          やめる
        </button>
        <button
          className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          disabled={!canTrade}
          onClick={() => giveResource && wantResource && onSubmit(giveCost, wantGain)}
        >
          交易する
        </button>
      </div>
    </DialogShell>
  );
}
