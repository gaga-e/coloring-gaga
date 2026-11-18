"use client";

import React, { useState, useRef } from "react";
import { RoomState, Player } from "@/lib/rooms";
import { DRAWING_SHEETS } from "@/data/drawings";
import {
  Copy,
  Check,
  Users,
  Sparkles,
  Play,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "@/components/ui/icons";

interface PartyLobbyProps {
  room: RoomState;
  currentPlayer: Player;
  onReadyToggle: () => void;
  onStartGame: () => void;
  onChangeSheet?: (sheetId: string) => void;
  onLeaveRoom?: () => void;
}

export function PartyLobby({
  room,
  currentPlayer,
  onReadyToggle,
  onStartGame,
  onChangeSheet,
  onLeaveRoom,
}: PartyLobbyProps) {
  const [copied, setCopied] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const currentIndex = DRAWING_SHEETS.findIndex((s) => s.id === room.sheetId);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const currentSheet = DRAWING_SHEETS[safeIndex];

  const playersList = Object.values(room.players);

  const copyRoomLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/party/${room.code}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrevSheet = () => {
    const prevIndex = (safeIndex - 1 + DRAWING_SHEETS.length) % DRAWING_SHEETS.length;
    onChangeSheet?.(DRAWING_SHEETS[prevIndex].id);
  };

  const handleNextSheet = () => {
    const nextIndex = (safeIndex + 1) % DRAWING_SHEETS.length;
    onChangeSheet?.(DRAWING_SHEETS[nextIndex].id);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handlePrevSheet();
      } else {
        handleNextSheet();
      }
    }
    touchStartX.current = null;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 font-sans">
      {/* Top Header Navigation - Only Back to Home */}
      <div className="flex items-center mb-6">
        <button
          onClick={onLeaveRoom}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 text-xs font-semibold transition active:scale-95 shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Column: Lobby Info + Players List + Party Code Card */}
        <div className="space-y-4">
          {/* Left-aligned Room Header (Starts before player's card & party code) */}
          <div className="text-left space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-amber-100/70 text-amber-800 px-3 py-1 rounded-full text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {room.mode === "together" ? "Coloring Together" : "Coloring Differently"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 leading-tight">
              Party Lobby
            </h1>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
              {room.mode === "together"
                ? "Everyone shares the same canvas in real-time."
                : "Everyone colors privately, then all versions are revealed at the end."}
            </p>
          </div>

          {/* Players Card */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-stone-500" />
                <h3 className="font-bold text-stone-800 text-sm">
                  Players ({playersList.length})
                </h3>
              </div>
            </div>

            <div className="space-y-2">
              {playersList.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-100"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg shrink-0">{player.avatar}</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium text-xs text-stone-800 truncate max-w-[110px] sm:max-w-[140px]" title={player.name}>
                        {player.name}
                      </span>
                      {player.isHost && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-md font-semibold shrink-0">
                          Host
                        </span>
                      )}
                      {player.id === currentPlayer.id && (
                        <span className="text-stone-400 text-[10px] shrink-0">(You)</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    {player.isReady ? (
                      <span
                        className="inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-200"
                        title="Ready"
                      >
                        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="hidden sm:inline">Ready</span>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center justify-center text-[11px] font-medium text-stone-400 bg-stone-100 px-1.5 sm:px-2 py-0.5 rounded-full"
                        title="Waiting"
                      >
                        <span className="hidden sm:inline">Waiting</span>
                        <span className="sm:hidden text-[10px] leading-none px-0.5">···</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Ready / Start Buttons */}
            <div className="mt-5 space-y-2">
              {!currentPlayer.isHost ? (
                <button
                  onClick={onReadyToggle}
                  className={`w-full py-2.5 rounded-xl font-semibold text-xs transition active:scale-95 shadow-sm ${
                    currentPlayer.isReady
                      ? "bg-stone-200 text-stone-700 hover:bg-stone-300"
                      : "bg-amber-500 text-white hover:bg-amber-600"
                  }`}
                >
                  {currentPlayer.isReady ? "Cancel Ready" : "I'm Ready"}
                </button>
              ) : (
                <button
                  onClick={onStartGame}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs bg-amber-500 hover:bg-amber-600 text-white transition active:scale-95 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Coloring</span>
                </button>
              )}
            </div>
          </div>

          {/* Party Code Card (Directly Under Players Card) */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-sm flex items-center justify-between gap-3">
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Party Code
              </span>
              <span className="font-mono text-xl font-bold text-amber-600 tracking-wider">
                {room.code}
              </span>
            </div>
            <button
              onClick={copyRoomLink}
              className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold px-3 py-2 rounded-xl transition active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Center / Right: Drawing Selection & Preview */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-sm">
            {/* Header: Title and Difficulty Badge (No dropdown) */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                  Drawing Artwork ({safeIndex + 1} of {DRAWING_SHEETS.length})
                </span>
                <h3 className="font-bold text-base sm:text-lg text-stone-900 leading-snug">
                  {currentSheet.title}
                </h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 font-medium shrink-0">
                {currentSheet.difficulty}
              </span>
            </div>

            {/* Interactive Preview Canvas with Swipe & Navigation Arrows */}
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="relative aspect-square max-h-[380px] w-full rounded-xl bg-[#FAF8F5] border border-stone-100 overflow-hidden flex items-center justify-center p-4 group select-none"
            >
              {/* Previous Arrow Button */}
              <button
                type="button"
                onClick={handlePrevSheet}
                className="absolute left-3 z-10 w-8 h-8 rounded-full bg-white/95 hover:bg-white border border-stone-200 shadow-sm text-stone-700 flex items-center justify-center transition active:scale-90"
                aria-label="Previous drawing"
                title="Previous drawing"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Image Preview */}
              <img
                src={currentSheet.imageUrl}
                alt={currentSheet.title}
                className="w-full h-full object-contain pointer-events-none select-none"
                draggable={false}
              />

              {/* Next Arrow Button */}
              <button
                type="button"
                onClick={handleNextSheet}
                className="absolute right-3 z-10 w-8 h-8 rounded-full bg-white/95 hover:bg-white border border-stone-200 shadow-sm text-stone-700 flex items-center justify-center transition active:scale-90"
                aria-label="Next drawing"
                title="Next drawing"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Clean Footer with Hints */}
            <div className="mt-3 flex items-center justify-between text-xs text-stone-400">
              <span>Category: {currentSheet.category}</span>
              <span className="hidden sm:inline">Use arrows to change drawing</span>
              <span className="sm:hidden">Swipe or use arrows to change</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
