import { NextRequest, NextResponse } from "next/server";
import { getRoom, saveRoom } from "@/lib/rooms";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const room = await getRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  let stateChanged = false;

  // 1. Host migration guard: if host disconnected for > 25s in lobby, promote next active player
  if (room.status === "lobby") {
    const playersList = Object.values(room.players);
    const host = playersList.find((p) => p.isHost);
    const now = Date.now();

    if (host && now - host.lastActive > 25000 && playersList.length > 1) {
      // Find oldest active non-host
      const candidates = playersList.filter((p) => !p.isHost && now - p.lastActive <= 20000);
      if (candidates.length > 0) {
        host.isHost = false;
        candidates[0].isHost = true;
        candidates[0].isReady = true;
        stateChanged = true;
      }
    }
  }

  // 2. Auto-transition to reveal if all players finished or round time expired
  if (room.status === "playing" && room.startedAt) {
    const elapsed = (Date.now() - room.startedAt) / 1000;
    const allFinished = Object.values(room.players).every((p) => p.hasFinished);
    if (elapsed >= room.durationSeconds || allFinished) {
      room.status = "reveal";
      stateChanged = true;
    }
  }

  if (stateChanged) {
    await saveRoom(room);
  }

  return NextResponse.json({ room });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const room = await getRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { action, playerId } = body;
    const player = room.players[playerId];

    if (!player && action !== "stroke") {
      return NextResponse.json({ error: "Player not found" }, { status: 403 });
    }

    if (player) {
      player.lastActive = Date.now();
    }

    switch (action) {
      case "ready": {
        player.isReady = !player.isReady;
        break;
      }
      case "start": {
        if (!player.isHost) {
          return NextResponse.json({ error: "Only host can start" }, { status: 403 });
        }
        room.status = "playing";
        room.startedAt = Date.now();
        break;
      }
      case "submitCanvas": {
        const { canvasDataUrl } = body;
        player.canvasDataUrl = canvasDataUrl;
        player.hasFinished = true;

        // If everyone finished, advance to reveal
        const allDone = Object.values(room.players).every((p) => p.hasFinished);
        if (allDone) {
          room.status = "reveal";
        }
        break;
      }
      case "stroke": {
        // Mode 1: Coloring Together shared strokes
        const { stroke } = body;
        if (stroke) {
          room.sharedStrokes.push(stroke);
          // Keep stroke buffer capped at 400 strokes
          if (room.sharedStrokes.length > 400) {
            room.sharedStrokes.shift();
          }
        }
        break;
      }
      case "vote": {
        const { targetPlayerId } = body;
        // Self-voting prevention
        if (playerId === targetPlayerId) {
          return NextResponse.json({ error: "Cannot vote for your own artwork" }, { status: 400 });
        }

        if (!room.voters) room.voters = {};

        // One vote per player enforcement
        const previousTarget = room.voters[playerId];
        if (previousTarget && room.players[previousTarget]) {
          room.players[previousTarget].votes = Math.max(0, room.players[previousTarget].votes - 1);
        }

        room.voters[playerId] = targetPlayerId;
        if (room.players[targetPlayerId]) {
          room.players[targetPlayerId].votes = (room.players[targetPlayerId].votes || 0) + 1;
        }
        break;
      }
      case "react": {
        const { emoji } = body;
        if (emoji) {
          room.reactions.push({
            id: Math.random().toString(36).substring(2, 9),
            emoji,
            playerId,
            timestamp: Date.now(),
          });
          if (room.reactions.length > 40) {
            room.reactions.shift();
          }
        }
        break;
      }
      case "reset": {
        // Play again with same players
        if (!player.isHost) {
          return NextResponse.json({ error: "Only host can reset" }, { status: 403 });
        }
        room.status = "lobby";
        room.startedAt = undefined;
        room.sharedStrokes = [];
        room.reactions = [];
        room.voters = {};
        Object.values(room.players).forEach((p) => {
          p.hasFinished = false;
          p.canvasDataUrl = undefined;
          p.votes = 0;
          p.isReady = p.isHost;
        });
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    await saveRoom(room);
    return NextResponse.json({ room });
  } catch (error) {
    console.error("Action error:", error);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
