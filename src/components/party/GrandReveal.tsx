"use client";

import React, { useEffect, useState } from "react";
import { RoomState, Player } from "@/lib/rooms";
import { DrawingSheet } from "@/data/drawings";
import { Sparkles, Trophy, Download, Heart, Flame, Smile, RotateCcw } from "@/components/ui/icons";
import confetti from "@/lib/confetti";

interface GrandRevealProps {
  room: RoomState;
  sheet: DrawingSheet;
  currentPlayer: Player;
  onVote: (targetPlayerId: string) => void;
  onReact: (emoji: string) => void;
  onResetRoom: () => void;
}

export function GrandReveal({
  room,
  sheet,
  currentPlayer,
  onVote,
  onReact,
  onResetRoom,
}: GrandRevealProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<
    Array<{ id: number; emoji: string; x: number }>
  >([]);

  // Trigger celebration confetti on mount
  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  // Listen for room reactions and animate them
  useEffect(() => {
    if (room.reactions && room.reactions.length > 0) {
      const latest = room.reactions[room.reactions.length - 1];
      const newFloating = {
        id: Date.now() + Math.random(),
        emoji: latest.emoji,
        x: 20 + Math.random() * 60,
      };
      setFloatingEmojis((prev) => [...prev.slice(-15), newFloating]);
    }
  }, [room.reactions]);

  const handleDownload = (dataUrl?: string, playerName?: string) => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${sheet.title}-${playerName || "masterpiece"}.png`;
    a.click();
  };

  const handleVoteClick = (playerId: string) => {
    if (hasVoted || playerId === currentPlayer.id) return;
    onVote(playerId);
    setHasVoted(true);
  };

  const playersList = Object.values(room.players);
  // Sort by votes descending for leader presentation
  const sortedPlayers = [...playersList].sort((a, b) => b.votes - a.votes);

  const reactionEmojis = ["❤️", "🔥", "✨", "🎨", "👏", "😍"];

  return (
    <div className="min-h-screen bg-stone-50 py-10 px-4 relative overflow-hidden">
      {/* Floating Reactions Layer */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            className="absolute text-4xl animate-bounce"
            style={{
              left: `${item.x}%`,
              bottom: "10%",
              transition: "transform 2s ease-out, opacity 2s ease-out",
            }}
          >
            {item.emoji}
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Header Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md shadow-amber-200 mb-3">
            <Trophy className="w-4 h-4" />
            <span>THE GRAND REVEAL</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight">
            See How Everyone Colored!
          </h1>
          <p className="text-stone-500 text-sm mt-2 max-w-md mx-auto">
            The same original drawing—interpreted with completely different aesthetics, colors, and shading styles.
          </p>

          {/* Emoji Reaction Bar */}
          <div className="mt-6 flex items-center justify-center gap-2 bg-white/90 backdrop-blur-md border border-stone-200 shadow-sm rounded-full px-4 py-2 w-fit mx-auto">
            <span className="text-xs font-bold text-stone-400 mr-1">React:</span>
            {reactionEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className="text-xl hover:scale-125 transition-transform active:scale-95 px-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Side-by-Side Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedPlayers.map((player, index) => {
            const isWinner = index === 0 && player.votes > 0;
            return (
              <div
                key={player.id}
                className={`bg-white rounded-3xl p-5 border shadow-sm transition hover:shadow-md flex flex-col justify-between ${
                  isWinner ? "border-amber-400 ring-2 ring-amber-400/30" : "border-stone-200"
                }`}
              >
                {/* Player Info Header */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{player.avatar}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-stone-900">{player.name}</h3>
                          {player.id === currentPlayer.id && (
                            <span className="text-[10px] text-stone-400 font-semibold">(You)</span>
                          )}
                        </div>
                        {isWinner && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            <Trophy className="w-3 h-3 text-amber-500" /> Most Voted
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-stone-100 rounded-full px-2.5 py-1 text-xs font-bold text-stone-700">
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                      <span>{player.votes}</span>
                    </div>
                  </div>

                  {/* Artwork Showcase Display */}
                  <div className="relative aspect-square w-full rounded-2xl bg-[#FAF8F5] border border-stone-200 overflow-hidden shadow-inner flex items-center justify-center p-2 mb-4">
                    {player.canvasDataUrl ? (
                      <img
                        src={player.canvasDataUrl}
                        alt={`${player.name}'s coloring`}
                        className="w-full h-full object-contain rounded-xl"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <span className="text-3xl mb-1 block">🎨</span>
                        <p className="text-xs text-stone-400">Still shading...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls: Vote & Download */}
                <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                  <button
                    onClick={() => handleVoteClick(player.id)}
                    disabled={hasVoted || player.id === currentPlayer.id}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                      player.id === currentPlayer.id
                        ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                        : hasVoted
                        ? "bg-stone-100 text-stone-500 cursor-default"
                        : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>{hasVoted ? "Voted" : "Vote for Art"}</span>
                  </button>

                  {player.canvasDataUrl && (
                    <button
                      onClick={() => handleDownload(player.canvasDataUrl, player.name)}
                      className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition active:scale-95"
                      title="Download PNG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

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
