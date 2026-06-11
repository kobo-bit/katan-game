import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { StrategyId } from "@/lib/ai/strategies";

// DB ファイルはプロジェクトルートの data/ ディレクトリに保存
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "games.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  migrate(_db);
  return _db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      played_at   INTEGER NOT NULL,
      turn_count  INTEGER NOT NULL,
      player_count INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS game_players (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id     INTEGER NOT NULL REFERENCES games(id),
      player_slot INTEGER NOT NULL,
      strategy    TEXT    NOT NULL,
      placement   INTEGER NOT NULL,
      vp          INTEGER NOT NULL,
      settlements INTEGER NOT NULL,
      cities      INTEGER NOT NULL,
      roads       INTEGER NOT NULL,
      dev_cards   INTEGER NOT NULL,
      knights     INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
    CREATE INDEX IF NOT EXISTS idx_game_players_strategy ON game_players(strategy);
  `);
}

// ----------------------------------------------------------------
// 書き込み
// ----------------------------------------------------------------

export interface PlayerResult {
  strategy: StrategyId;
  placement: number;
  vp: number;
  settlements: number;
  cities: number;
  roads: number;
  devCards: number;
  knights: number;
}

export interface GameResult {
  turnCount: number;
  players: PlayerResult[];
}

export function saveGame(result: GameResult): number {
  const db = getDb();
  const insertGame = db.prepare(
    "INSERT INTO games (played_at, turn_count, player_count) VALUES (?, ?, ?)"
  );
  const insertPlayer = db.prepare(
    `INSERT INTO game_players
       (game_id, player_slot, strategy, placement, vp, settlements, cities, roads, dev_cards, knights)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    const { lastInsertRowid } = insertGame.run(Date.now(), result.turnCount, result.players.length);
    const gameId = Number(lastInsertRowid);
    result.players.forEach((p, slot) => {
      insertPlayer.run(gameId, slot, p.strategy, p.placement, p.vp, p.settlements, p.cities, p.roads, p.devCards, p.knights);
    });
    return gameId;
  });

  return tx() as number;
}

// ----------------------------------------------------------------
// 読み込み / 集計
// ----------------------------------------------------------------

export interface StrategyStats {
  strategy: StrategyId;
  games: number;
  wins: number;
  winRate: number;
  avgPlacement: number;
  avgVp: number;
  avgTurns: number;
  avgSettlements: number;
  avgCities: number;
  avgRoads: number;
  avgKnights: number;
}

export function queryStrategyStats(): StrategyStats[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT
         gp.strategy,
         COUNT(*)                          AS games,
         SUM(CASE WHEN gp.placement = 1 THEN 1 ELSE 0 END) AS wins,
         AVG(gp.placement)                AS avg_placement,
         AVG(gp.vp)                       AS avg_vp,
         AVG(g.turn_count)                AS avg_turns,
         AVG(gp.settlements)              AS avg_settlements,
         AVG(gp.cities)                   AS avg_cities,
         AVG(gp.roads)                    AS avg_roads,
         AVG(gp.knights)                  AS avg_knights
       FROM game_players gp
       JOIN games g ON g.id = gp.game_id
       GROUP BY gp.strategy
       ORDER BY wins DESC`
    )
    .all() as {
    strategy: string;
    games: number;
    wins: number;
    avg_placement: number;
    avg_vp: number;
    avg_turns: number;
    avg_settlements: number;
    avg_cities: number;
    avg_roads: number;
    avg_knights: number;
  }[];

  return rows.map((r) => ({
    strategy: r.strategy as StrategyId,
    games: r.games,
    wins: r.wins,
    winRate: r.games > 0 ? r.wins / r.games : 0,
    avgPlacement: r.avg_placement,
    avgVp: r.avg_vp,
    avgTurns: r.avg_turns,
    avgSettlements: r.avg_settlements,
    avgCities: r.avg_cities,
    avgRoads: r.avg_roads,
    avgKnights: r.avg_knights,
  }));
}

export interface PlacementDistribution {
  strategy: StrategyId;
  placement: number;
  count: number;
}

export function queryPlacementDistribution(): PlacementDistribution[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT strategy, placement, COUNT(*) AS count
       FROM game_players
       GROUP BY strategy, placement
       ORDER BY strategy, placement`
    )
    .all() as PlacementDistribution[];
}

export function queryTotalGames(): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) AS n FROM games").get() as { n: number };
  return row.n;
}
