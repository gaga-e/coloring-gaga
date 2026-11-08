"use client";

import React, { useEffect, useState, useRef, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoomState, Player } from "@/lib/rooms";
import { DRAWING_SHEETS } from "@/data/drawings";
import { TactileCanvas, StrokeEvent } from "@/components/canvas/TactileCanvas";
import { PartyLobby } from "@/components/party/PartyLobby";
import { GrandReveal } from "@/components/party/GrandReveal";
import { Clock, CheckCircle2, AlertCircle, ArrowLeft, Send } from "@/components/ui/icons";

export default function PartyRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.code as string)?.toUpperCase();

  const [room, setRoom] = useState<RoomState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Join prompt modal for direct link visitors
  const [guestName, setGuestName] = useState<string>("");
  const [guestAvatar, setGuestAvatar] = useState<string>("🎨");
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // In-game timer
  const [timeLeft, setTimeLeft] = useState<number>(180);
  const canvasExportRef = useRef<string>("");

  // Avatars selection
  const AVATARS = ["🎨", "✨", "🐱", "🦊", "🌸", "⭐", "🚀", "🐸", "🌻", "☕"];

  // Load player ID from session storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedId = sessionStorage.getItem(`coloring_player_${roomCode}`);
      if (storedId) {
        setPlayerId(storedId);
      }
    }
  }, [roomCode]);

  // Polling sync loop for real-time room updates
  useEffect(() => {
    if (!roomCode) return;

    let isMounted = true;
    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomCode}`);
        if (!res.ok) {
          if (res.status === 404) setError("Party room not found.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (isMounted) {
          setRoom(data.room);
          if (playerId && data.room.players[playerId]) {
            setCurrentPlayer(data.room.players[playerId]);
          }
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
        return room.mode === "together" ? 900 : 2000;
      }
      return 2000;
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
  }, [roomCode, playerId, room?.status, room?.mode]);

  // Synchronized Countdown Timer
  useEffect(() => {
    if (!room || room.status !== "playing" || !room.startedAt) return;

    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - room.startedAt!) / 1000);
      const remaining = Math.max(0, room.durationSeconds - elapsed);
      setTimeLeft(remaining);

      // Time expired: auto-submit local canvas and transition to reveal
      if (remaining === 0 && currentPlayer && !currentPlayer.hasFinished) {
        handleFinishClick();
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [room?.status, room?.startedAt, currentPlayer]);

  // Guest join handler
  const handleGuestJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setIsJoining(true);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          code: roomCode,
          playerName: guestName.trim(),
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

  const handleFinishClick = () => {
    sendRoomAction("submitCanvas", { canvasDataUrl: canvasExportRef.current });
  };

  const currentSheet =
    DRAWING_SHEETS.find((s) => s.id === room?.sheetId) || DRAWING_SHEETS[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-stone-500 text-sm font-medium">Entering Party Room...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-stone-200 shadow-sm space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-stone-900">Room Not Found</h2>
          <p className="text-stone-500 text-sm">
            This party room may have ended or the code is incorrect.
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-2xl bg-stone-900 text-white font-bold text-sm hover:bg-black transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // If user hasn't joined this room yet, present Join Screen
  if (!currentPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-stone-200 shadow-lg space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Join Party
            </span>
            <h2 className="text-2xl font-black text-stone-900">Room {roomCode}</h2>
            <p className="text-xs text-stone-500">
              Pick your nickname and avatar to start coloring!
            </p>
          </div>

          <form onSubmit={handleGuestJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Your Nickname
              </label>
              <input
                type="text"
                required
                maxLength={18}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full px-4 py-2.5 rounded-2xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm font-semibold text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-2">
                Choose Avatar
              </label>
              <div className="flex flex-wrap gap-2 justify-center">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setGuestAvatar(av)}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition ${
                      guestAvatar === av
                        ? "bg-amber-100 ring-2 ring-amber-500 scale-105"
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
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-sm shadow-md shadow-amber-200 transition active:scale-95"
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
      <div className="min-h-screen bg-stone-50">
        <PartyLobby
          room={room}
          currentPlayer={currentPlayer}
          onReadyToggle={() => sendRoomAction("ready")}
          onStartGame={() => sendRoomAction("start")}
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
        onVote={(targetPlayerId) => sendRoomAction("vote", { targetPlayerId })}
        onReact={(emoji) => sendRoomAction("react", { emoji })}
        onResetRoom={() => sendRoomAction("reset")}
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
    <div className="h-screen flex flex-col bg-stone-50 overflow-hidden">
      {/* Top Game Bar */}
      <div className="bg-white border-b border-stone-200 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between shrink-0 shadow-sm z-20 gap-2">
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
              {room.mode === "differently" ? "Secret Shading Round" : "Coloring Together"}
            </span>
          </div>
        </div>

        {/* Center Countdown Clock */}
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 px-2.5 sm:px-3.5 py-1 rounded-full text-amber-900 shrink-0">
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 animate-pulse" />
          <span className="font-mono text-xs sm:text-sm font-black">{formatTime(timeLeft)}</span>
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
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 shadow-sm whitespace-nowrap ${
              currentPlayer.hasFinished
                ? "bg-emerald-100 text-emerald-800 cursor-default"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {currentPlayer.hasFinished ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Submitted</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>I&apos;m Finished!</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Shading Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <TactileCanvas
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
