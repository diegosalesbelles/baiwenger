import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export const revalidate = 3600; // cache for 1 hour — data only changes once a day

export async function GET() {
  const user = await requireAuth();
  console.log("Market route - user from session:", JSON.stringify({ id: user.id, name: user.name, hasToken: !!user.token, tokenPreview: user.token?.slice(0, 20) }));

  // Fetch market + player/team data in parallel, using the user's Biwenger token
  // Headers extracted from the n8n workflow — Biwenger requires all of these
  const biwengerHeaders = {
    Authorization: `Bearer ${user.token}`,
    "Content-Type": "application/json",
    "X-Lang": "es",
    "X-League": "514789",
    "X-User": String(user.id),
    "X-Version": "628",
  };

  const laLigaHeaders = {
    "X-Lang": "es",
  };

  const [marketRes, dataRes] = await Promise.all([
    fetch("https://biwenger.as.com/api/v2/market", { headers: biwengerHeaders }),
    fetch("https://cf.biwenger.com/api/v2/competitions/la-liga/data?lang=es&score=5", { headers: laLigaHeaders }),
  ]);

  if (!marketRes.ok || !dataRes.ok) {
    return NextResponse.json({ error: "Failed to fetch from Biwenger" }, { status: 502 });
  }

  const [marketJson, dataJson] = await Promise.all([marketRes.json(), dataRes.json()]);

  const market: BiwengerSale[] = marketJson?.data?.sales ?? [];
  const playersObj: Record<string, BiwengerPlayer> = dataJson?.data?.players ?? {};
  const teamsObj: Record<string, BiwengerTeam> = dataJson?.data?.teams ?? {};
  const positionMap: Record<number, string> = { 1: "POR", 2: "DEF", 3: "MC", 4: "DEL" };

  const players = market.map((sale) => {
    const playerId = String(sale.player.id);
    const p = playersObj[playerId] ?? ({} as BiwengerPlayer);
    const team = teamsObj[p.teamID ?? ""] ?? ({} as BiwengerTeam);

    let nextGame = null;
    if (team.nextGames?.length) {
      const game = team.nextGames[0];
      if (game.home.id === team.id) {
        nextGame = { rival: teamsObj[game.away.id]?.name ?? "?", local: true };
      } else {
        nextGame = { rival: teamsObj[game.home.id]?.name ?? "?", local: false };
      }
    }

    const fitness: (number | null)[] = p.fitness ?? [];
    const playedCount = fitness.filter((f) => typeof f === "number" && Number.isFinite(f)).length;
    const playedRecently = Math.round((playedCount / (fitness.length || 1)) * 100);
    const totalGames = (p.playedHome ?? 0) + (p.playedAway ?? 0);
    const consistency = totalGames > 0 ? Math.round((p.points ?? 0) / totalGames) : 0;
    const valuePerPoint = Math.round((p.price ?? 0) / (p.points || 0.1));

    return {
      id: sale.player.id,
      name: p.name ?? "Unknown",
      team: team.name ?? "?",
      position: positionMap[p.position ?? 0] ?? "?",
      price: p.price ?? 0,
      salePrice: sale.price ?? 0,
      status: p.status ?? "ok",
      priceIncrement: p.priceIncrement ?? 0,
      fitness,
      playedHome: p.playedHome ?? 0,
      playedAway: p.playedAway ?? 0,
      consistency,
      valuePerPoint,
      playedRecently,
      nextGame,
      points: p.points ?? 0,
      owner: sale.user ?? "Mercado",
    };
  });

  // Fetch the latest AI analysis from our DB (written by n8n)
  let aiAnalysis: Record<string, string> = {};
  try {
    const result = await db.query(
      "SELECT player_id, analysis FROM market_analysis ORDER BY created_at DESC LIMIT 100"
    );
    for (const row of result.rows) {
      aiAnalysis[row.player_id] = row.analysis;
    }
  } catch {
    // Table might not exist yet — gracefully degrade
    aiAnalysis = {};
  }

  return NextResponse.json({ players, aiAnalysis, updatedAt: new Date().toISOString() });
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface BiwengerSale {
  player: { id: number };
  price: number;
  user?: string;
}

interface BiwengerPlayer {
  name?: string;
  teamID?: string;
  position?: number;
  price?: number;
  points?: number;
  status?: string;
  priceIncrement?: number;
  fitness?: (number | null)[];
  playedHome?: number;
  playedAway?: number;
}

interface BiwengerTeam {
  id: string;
  name?: string;
  nextGames?: { home: { id: string }; away: { id: string } }[];
}