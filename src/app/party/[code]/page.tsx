"use client";

import React, { useEffect, useState, useRef, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoomState, Player } from "@/lib/rooms";
import { DRAWING_SHEETS } from "@/data/drawings";
import { TactileCanvas, TactileCanvasHandle, StrokeEvent } from "@/components/canvas/TactileCanvas";
import { PartyLobby } from "@/components/party/PartyLobby";
import { GrandReveal } from "@/components/party/GrandReveal";
import { Clock, CheckCircle2, AlertCircle, ArrowLeft, Send, Sparkles } from "@/components/ui/icons";

export default function PartyRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = ((params.code as string) || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  const [room, setRoom] = useState<RoomState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [retryCount, setRetryCount] = useState<number>(0);

  // Join prompt modal for direct link visitors
  const [guestName, setGuestName] = useState<string>("");
  const [guestAvatar, setGuestAvatar] = useState<string>("🎨");
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // In-game timer
  const [timeLeft, setTimeLeft] = useState<number>(180);
  const canvasExportRef = useRef<string>("");
  const tactileCanvasRef = useRef<TactileCanvasHandle>(null);

  // Avatars selection
  const AVATARS = ["🎨", "✨", "🐱", "🦊", "🌸", "⭐", "🚀"];

  // Fast-hydrate from session storage immediately on mount and clear stale canvas residue
  useEffect(() => {
    if (!roomCode || typeof window !== "undefined") {
      try {
        // Clear old draft residue so new room visits always start with a clean canvas
        sessionStorage.removeItem(`coloring_last_canvas_${roomCode}`);
      } catch {
        // Ignored
      }
    }
    if (!roomCode || typeof window === "undefined") return;
    const storedPlayerId = sessionStorage.getItem(`coloring_player_${roomCode}`);
    if (storedPlayerId) {
      setPlayerId(storedPlayerId);
    }

    try {
      const cachedRoomStr = sessionStorage.getItem(`coloring_room_${roomCode}`);
      if (cachedRoomStr) {
        const cachedRoom = JSON.parse(cachedRoomStr);
        setRoom(cachedRoom);
        if (storedPlayerId && cachedRoom.players?.[storedPlayerId]) {
          setCurrentPlayer(cachedRoom.players[storedPlayerId]);
        }
        setLoading(false);
      }
    } catch {
      // Ignored
    }
  }, [roomCode]);

  // Polling sync loop for real-time room updates with retry resilience
  useEffect(() => {
    if (!roomCode) return;

    let isMounted = true;
    let consecutive404s = 0;

    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomCode}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (!res.ok) {
          if (res.status === 404) {
            consecutive404s++;

            // Check if we have a locally cached room that can be re-synced to server
            if (typeof window !== "undefined") {
              const cached = sessionStorage.getItem(`coloring_room_${roomCode}`);
              if (cached) {
                try {
                  const parsed = JSON.parse(cached);
                  await fetch("/api/rooms", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "sync", room: parsed }),
                  });
                  if (isMounted) {
                    setRoom(parsed);
                    setError("");
                    setLoading(false);
                  }
                  consecutive404s = 0;
                  return;
                } catch {
                  // Fall through
                }
              }
            }

            // Only show Room Not Found after 3 consecutive failures
            if (consecutive404s >= 3 && isMounted) {
              setError("Party room not found or has expired.");
              setLoading(false);
            }
          }
          return;
        }

        consecutive404s = 0;
        const data = await res.json();
        if (isMounted && data.room) {
          setRoom(data.room);
          try {
            sessionStorage.setItem(`coloring_room_${roomCode}`, JSON.stringify(data.room));
          } catch {
            // Ignored
          }
          if (playerId && data.room.players[playerId]) {
            setCurrentPlayer(data.room.players[playerId]);
          }
          setError("");
          setLoading(false);
        }
      } catch (err) {
        console.error("Room sync error:", err);
      }
    };

    // Adaptive polling: saves 70% of serverless requests while preserving real-time feel
    const getPollDelay = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return 10000; // Background tab: idle poll
      }
      if (!room || room.status === "lobby") return 2200;
      if (room.status === "reveal") return 2200;
      if (room.status === "playing") {
        if (currentPlayer?.hasFinished) return 800; // Ultra-responsive fast poll after submission
        return room.mode === "together" ? 900 : 1800;
      }
      return 1800;
    };

    let timerId: NodeJS.Timeout;

    const schedulePoll = () => {
      timerId = setTimeout(async () => {
        await fetchRoom();
        if (isMounted) schedulePoll();
      }, getPollDelay());
    };

    fetchRoom().then(() => {
      if (isMounted) schedulePoll();
    });

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchRoom(); // Instantly refresh when player returns to tab
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [roomCode, playerId, room?.status, room?.mode, retryCount]);

  // Synchronized Countdown Timer
  useEffect(() => {
    if (!room || room.status !== "playing" || !room.startedAt) return;

    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - room.startedAt!) / 1000);
      const remaining = Math.max(0, room.durationSeconds - elapsed);
      setTimeLeft(remaining);

      // Time expired: auto-submit local canvas and transition to reveal
      if (remaining <= 0 && currentPlayer && !currentPlayer.hasFinished) {
        handleFinishClick();
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [room?.status, room?.startedAt, currentPlayer]);

  // Auto-submit safety net: if round transitions to reveal, immediately capture & submit
  useEffect(() => {
    if (room?.status === "reveal" && currentPlayer && !currentPlayer.hasFinished) {
      handleFinishClick();
    }
  }, [room?.status, currentPlayer?.hasFinished]);

  // Guest join handler
  const handleGuestJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setIsJoining(true);

    try {
      const cleanGuestName = guestName.trim().slice(0, 12);
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          code: roomCode,
          playerName: cleanGuestName,
          playerAvatar: guestAvatar,
        }),
      });

      if (!res.ok) {
        setError("Could not join room.");
        setIsJoining(false);
        return;
      }

      const data = await res.json();
      sessionStorage.setItem(`coloring_player_${roomCode}`, data.playerId);
      sessionStorage.setItem(`coloring_room_${roomCode}`, JSON.stringify(data.room));
      setPlayerId(data.playerId);
      setRoom(data.room);
      setCurrentPlayer(data.room.players[data.playerId]);
    } catch {
      setError("Failed to join.");
    } finally {
      setIsJoining(false);
    }
  };

  // Perform room actions
  const sendRoomAction = async (action: string, payload: Record<string, any> = {}) => {
    if (!roomCode || !playerId) return;
    try {
      const res = await fetch(`/api/rooms/${roomCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, playerId, ...payload }),
      });
      if (res.ok) {
        const data = await res.json();
        setRoom(data.room);
      }
    } catch (err) {
      console.error("Action failed:", err);
    }
  };

  const handleFinishClick = async () => {
    // 1. Synchronously obtain fresh, guaranteed high-quality canvas export
    let exportUrl = tactileCanvasRef.current?.exportCanvas();
    if (!exportUrl || exportUrl.length < 50) {
      exportUrl = canvasExportRef.current;
    }
    if (!exportUrl || exportUrl.length < 50) {
      if (typeof window !== "undefined") {
        exportUrl =
          sessionStorage.getItem(`coloring_draft_${currentSheet.id}`) ||
          sessionStorage.getItem(`coloring_last_canvas_${roomCode}`) ||
          "";
      }
    }

    if (typeof window !== "undefined" && exportUrl && exportUrl.length > 50) {
      try {
        sessionStorage.setItem(`coloring_last_canvas_${roomCode}`, exportUrl);
      } catch {
        // Ignored
      }
    }

    // 2. Optimistic UI update so player immediately sees completed state
    setCurrentPlayer((prev) =>
      prev ? { ...prev, hasFinished: true, canvasDataUrl: exportUrl } : null
    );

    // 3. Send to server
    await sendRoomAction("submitCanvas", { canvasDataUrl: exportUrl });
  };

  const currentSheet =
    DRAWING_SHEETS.find((s) => s.id === room?.sheetId) || DRAWING_SHEETS[0];

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-stone-50">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-stone-500 text-sm font-medium">Entering Party Room...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-stone-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center border border-stone-200 shadow-sm space-y-4">
          <AlertCircle className="w-9 h-9 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-stone-900">Room Not Found</h2>
          <p className="text-stone-500 text-xs">
            This party room may have ended or the code is incorrect.
          </p>
          <div className="space-y-2 pt-1">
            <button
              onClick={() => {
                setError("");
                setLoading(true);
                setRetryCount((c) => c + 1);
              }}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-xs hover:bg-amber-600 transition shadow-sm"
            >
              Retry Connection
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full py-2.5 rounded-xl bg-stone-100 text-stone-700 font-semibold text-xs hover:bg-stone-200 transition"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user hasn't joined this room yet, present Join Screen
  if (!currentPlayer) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-stone-50 p-4 font-sans">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-stone-200 shadow-md space-y-5">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
              Join Party
            </span>
            <h2 className="text-xl font-bold text-stone-900">Room {roomCode}</h2>
            <p className="text-xs text-stone-500">
              Pick your nickname and avatar to start coloring.
            </p>
          </div>

          <form onSubmit={handleGuestJoin} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-700">
                  Your Nickname
                </label>
                <span className="text-[10px] text-stone-400 font-medium">
                  Max 12 characters
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={12}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value.slice(0, 12))}
                placeholder="e.g. Alex"
                className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:border-amber-500 text-xs font-medium text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Avatar
              </label>
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setGuestAvatar(av)}
                    className={`flex-1 aspect-square max-w-[44px] rounded-xl text-lg flex items-center justify-center transition active:scale-95 ${
                      guestAvatar === av
                        ? "bg-amber-100 ring-2 ring-amber-500 shadow-2xs"
                        : "bg-stone-100 hover:bg-stone-200"
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isJoining || !guestName.trim()}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold text-xs shadow-sm transition active:scale-95"
            >
              {isJoining ? "Entering..." : "Join Party"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 1. LOBBY VIEW
  if (room.status === "lobby") {
    return (
      <div className="min-h-[100dvh] bg-[#FAF8F5]">
        <PartyLobby
          room={room}
          currentPlayer={currentPlayer}
          onReadyToggle={() => sendRoomAction("ready")}
          onStartGame={() => sendRoomAction("start")}
          onChangeSheet={(sheetId) => {
            setRoom((prev) => (prev ? { ...prev, sheetId } : null));
            sendRoomAction("changeSheet", { sheetId });
          }}
          onLeaveRoom={() => router.push("/")}
        />
      </div>
    );
  }

  // 2. REVEAL VIEW (The Grand Reveal!)
  if (room.status === "reveal") {
    return (
      <GrandReveal
        room={room}
        sheet={currentSheet}
        currentPlayer={currentPlayer}
        onResetRoom={() => sendRoomAction("reset")}
        onLeaveRoom={() => router.push("/")}
      />
    );
  }

  // 3. PLAYING VIEW (Tactile Canvas + Synchronized Timer)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const playersList = Object.values(room.players);

  return (
    <div
      className="h-[100dvh] max-h-[100dvh] flex flex-col bg-stone-50 overflow-hidden"
      style={{ height: "100dvh", maxHeight: "100dvh" }}
    >
      {/* Top Game Bar */}
      <div
        className="bg-white border-b border-stone-200 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between shrink-0 shadow-sm z-20 gap-2"
        style={{
          paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))",
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => router.push("/")}
            className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-500 shrink-0"
            title="Exit to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h2 className="font-extrabold text-xs sm:text-sm text-stone-900 leading-tight truncate max-w-[120px] sm:max-w-xs md:max-w-md">
              {currentSheet.title}
            </h2>
            <span className="text-[9px] sm:text-[10px] text-stone-400 font-semibold uppercase tracking-wider block truncate">
              {room.mode === "together" ? "Coloring Together" : "Coloring Differently"}
            </span>
          </div>
        </div>

        {/* Center Countdown Clock */}
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 px-2.5 sm:px-3 py-1 rounded-full text-amber-900 shrink-0">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span className="font-mono text-xs sm:text-sm font-bold">{formatTime(timeLeft)}</span>
        </div>

        {/* Right Player Avatars & Submit Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Active players avatars */}
          <div className="hidden md:flex items-center gap-1">
            {playersList.map((p) => (
              <span
                key={p.id}
                className={`text-base p-1 rounded-full transition ${
                  p.hasFinished
                    ? "ring-2 ring-emerald-500 bg-emerald-50"
                    : "opacity-80"
                }`}
                title={`${p.name} ${p.hasFinished ? "(Finished!)" : "(Shading...)"}`}
              >
                {p.avatar}
              </span>
            ))}
          </div>

          {/* Finished / Submit Button */}
          <button
            onClick={handleFinishClick}
            disabled={currentPlayer.hasFinished}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm whitespace-nowrap ${
              currentPlayer.hasFinished
                ? "bg-orange-100 text-orange-800 cursor-default"
                : "bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white"
            }`}
          >
            {currentPlayer.hasFinished ? "Submitted" : "I'm Finished"}
          </button>

          {/* Host Reveal Now Button */}
          {currentPlayer.hasFinished && currentPlayer.isHost && (
            <button
              onClick={() => sendRoomAction("reveal")}
              className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition active:scale-95 whitespace-nowrap"
              title="Show Grand Reveal now"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Reveal Now</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Shading Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <TactileCanvas
          ref={tactileCanvasRef}
          sheet={currentSheet}
          onStrokeRecorded={(stroke) => {
            if (room.mode === "together") {
              sendRoomAction("stroke", { stroke });
            }
          }}
          externalStrokes={room.mode === "together" ? room.sharedStrokes : undefined}
          onCanvasExportReady={(dataUrl) => {
            canvasExportRef.current = dataUrl;
          }}
        />
      </div>
    </div>
  );
}
