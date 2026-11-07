import { NextRequest, NextResponse } from "next/server";
import { getRoom } from "@/lib/rooms";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const room = getRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Auto-transition to reveal if all players finished or time expired
  if (room.status === "playing" && room.startedAt) {
    const elapsed = (Date.now() - room.startedAt) / 1000;
    const allFinished = Object.values(room.players).every((p) => p.hasFinished);
    if (elapsed >= room.durationSeconds || allFinished) {
      room.status = "reveal";
    }
  }

  return NextResponse.json({ room });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const room = getRoom(code);
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
          // Keep stroke buffer reasonable
          if (room.sharedStrokes.length > 500) {
            room.sharedStrokes.shift();
          }
        }
        break;
      }
      case "vote": {
        const { targetPlayerId } = body;
        if (room.players[targetPlayerId]) {
          room.players[targetPlayerId].votes += 1;
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
          // Keep reaction list small
          if (room.reactions.length > 50) {
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

    return NextResponse.json({ room });
  } catch (error) {
    console.error("Action error:", error);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
