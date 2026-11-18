"use client";

import React, { useEffect, useState } from "react";
import { RoomState, Player } from "@/lib/rooms";
import { DrawingSheet } from "@/data/drawings";
import { Sparkles, Download, RotateCcw, Users, Layers } from "@/components/ui/icons";
import confetti, { shootDualConfetti } from "@/lib/confetti";

interface GrandRevealProps {
  room: RoomState;
  sheet: DrawingSheet;
  currentPlayer: Player;
  onReact: (emoji: string) => void;
  onResetRoom: () => void;
}

export function GrandReveal({
  room,
  sheet,
  currentPlayer,
  onReact,
  onResetRoom,
}: GrandRevealProps) {
  const [floatingEmojis, setFloatingEmojis] = useState<
    Array<{ id: number; emoji: string; x: number }>
  >([]);
  const [localDraft, setLocalDraft] = useState<string>("");

  // Recover local canvas draft if network transmission dropped it
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const draft =
          sessionStorage.getItem(`coloring_draft_${sheet.id}`) ||
          sessionStorage.getItem(`coloring_last_canvas_${room.code}`);
        if (draft) setLocalDraft(draft);
      } catch {
        // Ignored
      }
    }
  }, [sheet.id, room.code]);

  // Trigger celebratory dual-side confetti blast on mount
  useEffect(() => {
    confetti();
  }, []);

  // Listen for room reactions, animate them, and shoot dual confetti on celebrations
  useEffect(() => {
    if (room.reactions && room.reactions.length > 0) {
      const latest = room.reactions[room.reactions.length - 1];
      const newFloating = {
        id: Date.now() + Math.random(),
        emoji: latest.emoji,
        x: 15 + Math.random() * 70,
      };
      setFloatingEmojis((prev) => [...prev.slice(-15), newFloating]);
    }
  }, [room.reactions]);

  const handleDownload = (dataUrl?: string, titleSuffix?: string) => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${sheet.title}-${titleSuffix || "artwork"}.png`;
    a.click();
  };

  const handleReactionClick = (emoji: string) => {
    onReact(emoji);
    shootDualConfetti({ particleCount: 60 });
  };

  const playersList = Object.values(room.players);
  const reactionEmojis = ["🎉", "💖", "✨", "🔥", "🎨", "👏", "😍"];

  // In Mode 1 (together): Everyone drew on the SAME canvas.
  // Find the most complete shared canvas export among players or local draft
  const sharedCollaborativeUrl =
    playersList.find((p) => p.canvasDataUrl && p.canvasDataUrl.length > 100)?.canvasDataUrl ||
    (currentPlayer.canvasDataUrl && currentPlayer.canvasDataUrl.length > 100
      ? currentPlayer.canvasDataUrl
      : "") ||
    localDraft ||
    sheet.imageUrl;

  return (
    <div
      className="min-h-[100dvh] bg-[#FAF8F5] py-10 px-4 relative overflow-hidden"
      style={{
        paddingBottom: "max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 2rem))",
      }}
    >
      {/* Floating Reactions Layer */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            className="absolute text-4xl animate-bounce"
            style={{
              left: `${item.x}%`,
              bottom: "12%",
              transition: "transform 2s ease-out, opacity 2s ease-out",
            }}
          >
            {item.emoji}
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Header Title & Mode Description */}
        <div className="text-center mb-8">
          {room.mode === "together" ? (
            <>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md shadow-orange-200 mb-3">
                <Users className="w-4 h-4" />
                <span>MODE 1 • COLLABORATIVE MASTERPIECE</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight">
                Drawn Together on the Same Canvas!
              </h1>
              <p className="text-stone-600 text-sm mt-2 max-w-lg mx-auto">
                Every stroke was synchronized live in real-time. Here is the shared artwork brought
                to life by all players together!
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md shadow-amber-200 mb-3">
                <Layers className="w-4 h-4" />
                <span>MODE 2 • THE GRAND REVEAL</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight">
                See How Everyone Colored Differently!
              </h1>
              <p className="text-stone-600 text-sm mt-2 max-w-lg mx-auto">
                The exact same line art—each player shaded secretly on their own separate canvas.
                Now revealed side-by-side!
              </p>
            </>
          )}

          {/* Confetti & Reaction Celebration Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 bg-white/95 backdrop-blur-md border border-stone-200 shadow-sm rounded-full px-4 py-2 w-fit mx-auto">
            <button
              onClick={() => shootDualConfetti({ particleCount: 100 })}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm hover:from-amber-600 hover:to-orange-600 transition active:scale-95 mr-1"
            >
              <span>🎉 Confetti!</span>
            </button>
            <span className="text-xs font-bold text-stone-400 mr-1 hidden sm:inline">Celebrate:</span>
            {reactionEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className="text-xl hover:scale-125 transition-transform active:scale-95 px-1"
                title="Send celebration"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* MODE 1 (TOGETHER): Single Grand Showcase of the Collaborative Artwork */}
        {room.mode === "together" ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-lg flex flex-col items-center text-center">
              {/* Artwork Box */}
              <div className="relative aspect-square w-full rounded-2xl bg-[#FAF8F5] border border-stone-200 overflow-hidden shadow-inner flex items-center justify-center p-3 mb-6">
                <img
                  src={sharedCollaborativeUrl}
                  alt={`${sheet.title} collaborative canvas`}
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>

              {/* Contributing Artists Badges */}
              <div className="w-full border-t border-stone-100 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                    Contributing Artists ({playersList.length})
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {playersList.map((player) => (
                      <span
                        key={player.id}
                        className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-800 text-xs font-bold px-3 py-1.5 rounded-full border border-stone-200/60"
                      >
                        <span>{player.avatar}</span>
                        <span>{player.name}</span>
                        {player.id === currentPlayer.id && (
                          <span className="text-[10px] text-amber-600 font-semibold">(You)</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Download Button */}
                <button
                  onClick={() => handleDownload(sharedCollaborativeUrl, "collaborative-masterpiece")}
                  className="flex items-center gap-2 bg-stone-900 hover:bg-black text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-sm transition active:scale-95 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Artwork</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* MODE 2 (DIFFERENTLY): Side-by-Side Gallery Grid of Separate Canvases */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {playersList.map((player) => {
              const artworkUrl =
                player.canvasDataUrl ||
                (player.id === currentPlayer.id ? localDraft : "") ||
                sheet.imageUrl;

              return (
                <div
                  key={player.id}
                  className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm transition hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    {/* Player Info Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{player.avatar}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-sm text-stone-900">{player.name}</h3>
                            {player.id === currentPlayer.id && (
                              <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-stone-400">
                            {sheet.title}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Artwork Showcase Display */}
                    <div className="relative aspect-square w-full rounded-2xl bg-[#FAF8F5] border border-stone-200 overflow-hidden shadow-inner flex items-center justify-center p-2 mb-4">
                      <img
                        src={artworkUrl}
                        alt={`${player.name}'s coloring`}
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Footer: Download PNG */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-xs text-stone-500 font-medium">
                      {player.id === currentPlayer.id ? "Your creation" : `${player.name}'s version`}
                    </span>
                    <button
                      onClick={() => handleDownload(artworkUrl, player.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition active:scale-95"
                      title="Download PNG"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Host Play Again Button */}
        {currentPlayer.isHost && (
          <div className="mt-12 text-center">
            <button
              onClick={onResetRoom}
              className="inline-flex items-center gap-2 bg-stone-900 hover:bg-black text-white font-bold text-sm px-6 py-3.5 rounded-2xl shadow-lg transition active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Another Round</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
