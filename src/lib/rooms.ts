import { StrokeEvent } from "@/components/canvas/TactileCanvas";

export type GameMode = "together" | "differently";

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  hasFinished: boolean;
  canvasDataUrl?: string;
  votes: number;
  lastActive: number;
}

export interface RoomState {
  code: string;
  sheetId: string;
  mode: GameMode;
  status: "lobby" | "playing" | "reveal";
  durationSeconds: number; // e.g. 180 for 3 min
  startedAt?: number;
  players: Record<string, Player>;
  sharedStrokes: StrokeEvent[]; // Used for "together" mode
  reactions: Array<{ id: string; emoji: string; playerId: string; timestamp: number }>;
}

// Global in-memory room store (preserved across API calls on localhost & Edge)
declare global {
  // eslint-disable-next-line no-var
  var __GAME_ROOMS__: Record<string, RoomState> | undefined;
}

if (!global.__GAME_ROOMS__) {
  global.__GAME_ROOMS__ = {};
}

export const rooms = global.__GAME_ROOMS__;

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function createRoom(
  hostName: string,
  hostAvatar: string,
  sheetId: string,
  mode: GameMode,
  durationSeconds: number
): { room: RoomState; hostId: string } {
  const code = generateRoomCode();
  const hostId = "p_" + Math.random().toString(36).substring(2, 9);

  const room: RoomState = {
    code,
    sheetId,
    mode,
    status: "lobby",
    durationSeconds,
    players: {
      [hostId]: {
        id: hostId,
        name: hostName || "Host",
        avatar: hostAvatar || "🎨",
        isHost: true,
        isReady: true,
        hasFinished: false,
        votes: 0,
        lastActive: Date.now(),
      },
    },
    sharedStrokes: [],
    reactions: [],
  };

  rooms[code] = room;
  return { room, hostId };
}

export function getRoom(code: string): RoomState | null {
  return rooms[code.toUpperCase()] || null;
}

export function joinRoom(
  code: string,
  playerName: string,
  playerAvatar: string
): { room: RoomState; playerId: string } | null {
  const room = getRoom(code);
  if (!room) return null;

  const playerId = "p_" + Math.random().toString(36).substring(2, 9);
  room.players[playerId] = {
    id: playerId,
    name: playerName || `Player ${Object.keys(room.players).length + 1}`,
    avatar: playerAvatar || "✨",
    isHost: false,
    isReady: false,
    hasFinished: false,
    votes: 0,
    lastActive: Date.now(),
  };

  return { room, playerId };
}
