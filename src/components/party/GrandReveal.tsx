"use client";

import React, { useEffect, useState } from "react";
import { RoomState, Player } from "@/lib/rooms";
import { DrawingSheet } from "@/data/drawings";
import { Download, RotateCcw, ArrowLeft } from "@/components/ui/icons";
import confetti from "@/lib/confetti";

interface GrandRevealProps {
  room: RoomState;
  sheet: DrawingSheet;
  currentPlayer: Player;
  onResetRoom: () => void;
  onLeaveRoom?: () => void;
}

export function GrandReveal({
  room,
  sheet,
  currentPlayer,
  onResetRoom,
  onLeaveRoom,
}: GrandRevealProps) {
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

  const handleDownload = (dataUrl?: string, titleSuffix?: string) => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${sheet.title}-${titleSuffix || "artwork"}.png`;
    a.click();
  };

  const playersList = Object.values(room.players);

  // In together mode: Everyone drew on the SAME canvas
  const sharedCollaborativeUrl =
    playersList.find((p) => p.canvasDataUrl && p.canvasDataUrl.length > 100)?.canvasDataUrl ||
    (currentPlayer.canvasDataUrl && currentPlayer.canvasDataUrl.length > 100
      ? currentPlayer.canvasDataUrl
      : "") ||
    localDraft ||
    sheet.imageUrl;

  return (
    <div
      className="min-h-[100dvh] bg-[#FAF8F5] py-8 sm:py-12 px-4 relative overflow-hidden flex flex-col justify-center"
      style={{
        paddingBottom: "max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 2rem))",
      }}
    >
      <div className="max-w-5xl mx-auto w-full">
        {/* Top Navigation */}
        <div className="flex items-center mb-6">
          <button
            onClick={onLeaveRoom}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 text-xs font-semibold transition active:scale-95 shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
        </div>
        {/* Same Canvas (Together Mode) */}
        {room.mode === "together" ? (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/90 shadow-sm flex flex-col items-center">
              {/* Clean Canvas Display */}
              <div className="relative aspect-square w-full rounded-xl bg-[#FAF8F5] border border-stone-200 overflow-hidden flex items-center justify-center p-2 mb-4">
                <img
                  src={sharedCollaborativeUrl}
                  alt={sheet.title}
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>

              {/* Minimal Footer: Download */}
              <div className="w-full flex items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  {playersList.map((player) => (
                    <span
                      key={player.id}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-full shrink-0"
                      title={player.name}
                    >
                      <span>{player.avatar}</span>
                      <span className="truncate max-w-[90px]">{player.name}</span>
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => handleDownload(sharedCollaborativeUrl, "artwork")}
                  className="flex items-center gap-1.5 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 border border-stone-200 hover:border-stone-300 text-xs font-semibold px-3.5 py-2 rounded-xl transition active:scale-95 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-stone-500" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Separate Canvases (Differently Mode) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {playersList.map((player) => {
              const artworkUrl =
                player.canvasDataUrl ||
                (player.id === currentPlayer.id ? localDraft : "") ||
                sheet.imageUrl;

              return (
                <div
                  key={player.id}
                  className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Player Info Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl shrink-0">{player.avatar}</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="font-bold text-sm text-stone-900 truncate max-w-[110px] sm:max-w-[140px]" title={player.name}>
                            {player.name}
                          </h3>
                          {player.id === currentPlayer.id && (
                            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md shrink-0">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Canvas Display */}
                    <div className="relative aspect-square w-full rounded-xl bg-[#FAF8F5] border border-stone-200 overflow-hidden flex items-center justify-center p-2 mb-3">
                      <img
                        src={artworkUrl}
                        alt={`${player.name}'s coloring`}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Download */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-end">
                    <button
                      onClick={() => handleDownload(artworkUrl, player.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 border border-stone-200 hover:border-stone-300 text-xs font-semibold transition active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5 text-stone-500" />
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
          <div className="mt-8 text-center">
            <button
              onClick={onResetRoom}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm transition active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Play Another Round</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
