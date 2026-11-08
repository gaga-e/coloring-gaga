import { StrokeEvent } from "@/components/canvas/TactileCanvas";
import { Redis } from "@upstash/redis";

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
  voters?: Record<string, string>; // voterPlayerId -> targetPlayerId
}

// Check for Redis environment variables (supports Upstash Redis & Vercel KV)
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const redis =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null;

// Global in-memory room store (preserved across API calls on localhost & single-container runtimes)
declare global {
  // eslint-disable-next-line no-var
  var __GAME_ROOMS__: Record<string, RoomState> | undefined;
}

if (!global.__GAME_ROOMS__) {
  global.__GAME_ROOMS__ = {};
}

export const rooms = global.__GAME_ROOMS__;

// Room TTL: 2 hours (in seconds)
const ROOM_TTL_SECONDS = 7200;

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Fetch room state from Redis (production) or memory (fallback)
 */
export async function getRoom(code: string): Promise<RoomState | null> {
  const cleanCode = code.toUpperCase().trim();

  // Try Redis first if configured
  if (redis) {
    try {
      const data = await redis.get<RoomState>(`room:${cleanCode}`);
      if (data) {
        // Keep in-memory cache synchronized
        rooms[cleanCode] = data;
        return data;
      }
    } catch (err) {
      console.warn("Redis getRoom error, falling back to RAM:", err);
    }
  }

  return rooms[cleanCode] || null;
}

/**
 * Persist room state to both Redis (with 2-hour TTL) and local memory
 */
export async function saveRoom(room: RoomState): Promise<void> {
  const cleanCode = room.code.toUpperCase().trim();
  rooms[cleanCode] = room;

  if (redis) {
    try {
      await redis.set(`room:${cleanCode}`, room, { ex: ROOM_TTL_SECONDS });
    } catch (err) {
      console.warn("Redis saveRoom error, falling back to RAM:", err);
    }
  }
}

/**
 * Create a new room with host player
 */
export async function createRoom(
  hostName: string,
  hostAvatar: string,
  sheetId: string,
  mode: GameMode,
  durationSeconds: number
): Promise<{ room: RoomState; hostId: string }> {
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
    voters: {},
  };

  await saveRoom(room);
  return { room, hostId };
}

/**
 * Join an existing room
 */
export async function joinRoom(
  code: string,
  playerName: string,
  playerAvatar: string
): Promise<{ room: RoomState; playerId: string } | null> {
  const room = await getRoom(code);
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

  await saveRoom(room);
  return { room, playerId };
}
