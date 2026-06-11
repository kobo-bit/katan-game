import { NextResponse } from "next/server";
import {
  queryStrategyStats,
  queryPlacementDistribution,
  queryTotalGames,
} from "@/lib/db/gameDb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const totalGames = queryTotalGames();
    const strategyStats = queryStrategyStats();
    const placementDist = queryPlacementDistribution();
    return NextResponse.json({ totalGames, strategyStats, placementDist });
  } catch (err) {
    console.error("stats API error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
