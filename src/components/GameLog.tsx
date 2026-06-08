"use client";

import { useEffect, useRef } from "react";

export default function GameLog({ entries }: { entries: string[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries]);

  return (
    <div ref={ref} className="h-40 overflow-y-auto rounded-lg border border-slate-300 bg-white/80 p-2 text-xs leading-relaxed text-slate-700">
      {entries.map((entry, i) => (
        <div key={i} className="border-b border-slate-100 py-0.5 last:border-none">
          {entry}
        </div>
      ))}
    </div>
  );
}
