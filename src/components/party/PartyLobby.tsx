"use client";

import React, { useState } from "react";
import { RoomState, Player } from "@/lib/rooms";
import { DRAWING_SHEETS, DrawingSheet, ART_CATEGORIES } from "@/data/drawings";
import { Copy, Check, Users, Sparkles, Clock, Palette, Play } from "@/components/ui/icons";

interface PartyLobbyProps {
  room: RoomState;
  currentPlayer: Player;
  onReadyToggle: () => void;
  onStartGame: () => void;
}

export function PartyLobby({
  room,
  currentPlayer,
  onReadyToggle,
  onStartGame,
}: PartyLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All Styles");

  const currentSheet =
    DRAWING_SHEETS.find((s) => s.id === room.sheetId) || DRAWING_SHEETS[0];

  const playersList = Object.values(room.players);
  const allReady = playersList.every((p) => p.isReady);

  const copyRoomLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/party/${room.code}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const filteredSheets =
    selectedCategory === "All Styles"
      ? DRAWING_SHEETS
      : DRAWING_SHEETS.filter((s) => s.category === selectedCategory);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top Hero Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-900 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>
            {room.mode === "differently"
              ? "Mode: Coloring Differently (BrushBrawl Battle)"
              : "Mode: Coloring Together (Live Co-Op)"}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 mb-2">
          Coloring Party Room
        </h1>
        <p className="text-stone-500 text-sm max-w-lg mx-auto">
          {room.mode === "differently"
            ? "Everyone colors this same drawing secretly. When the timer ends, we reveal all masterpieces side-by-side!"
            : "Everyone draws and shades on the same collaborative canvas in real-time."}
        </p>

        {/* Room Code Card */}
        <div className="mt-5 inline-flex items-center gap-3 bg-white border border-stone-200 shadow-sm rounded-2xl px-5 py-3">
          <div className="text-left">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Party Code
            </span>
            <span className="font-mono text-2xl font-black text-amber-600 tracking-wider">
              {room.code}
            </span>
          </div>
          <button
            onClick={copyRoomLink}
            className="flex items-center gap-1.5 ml-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold px-3 py-2 rounded-xl transition active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Players List & Game Controls */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-stone-500" />
                <h3 className="font-bold text-stone-800 text-sm">
                  Lobby Players ({playersList.length})
                </h3>
              </div>
              <span className="text-xs text-stone-400 font-medium">
                {room.durationSeconds / 60}m timer
              </span>
            </div>

            <div className="space-y-2">
              {playersList.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-stone-50 border border-stone-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{player.avatar}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-stone-800">
                          {player.name}
                        </span>
                        {player.isHost && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            Host
                          </span>
                        )}
                        {player.id === currentPlayer.id && (
                          <span className="text-stone-400 text-[10px]">(You)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    {player.isReady ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Check className="w-3 h-3" /> Ready
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-stone-400 bg-stone-200/50 px-2 py-0.5 rounded-full">
                        Waiting
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
                  className={`w-full py-3 rounded-2xl font-bold text-sm transition active:scale-95 shadow-sm ${
                    currentPlayer.isReady
                      ? "bg-stone-200 text-stone-700 hover:bg-stone-300"
                      : "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200"
                  }`}
                >
                  {currentPlayer.isReady ? "Cancel Ready" : "I'm Ready!"}
                </button>
              ) : (
                <button
                  onClick={onStartGame}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-95 transition active:scale-95 shadow-md shadow-amber-200"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Coloring Round</span>
                </button>
              )}
            </div>
          </div>

          {/* Mode Rules Explainer Card */}
          <div className="bg-amber-50/70 border border-amber-200/60 rounded-3xl p-4 text-xs text-amber-900 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              Round Duration: {room.durationSeconds / 60} minutes
            </p>
            <p className="text-amber-800/80 leading-relaxed">
              {room.mode === "differently"
                ? "Touch or drag with your finger/mouse to shade. When the timer expires, everyone's finished artwork will be displayed side-by-side!"
                : "Work together on one drawing. You'll see each other's colors appear in real-time."}
            </p>
          </div>
        </div>

        {/* Right Column: Active Drawing Sheet Preview */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                  Selected Artwork
                </span>
                <h3 className="font-bold text-xl text-stone-900">{currentSheet.title}</h3>
                <p className="text-xs text-stone-500 mt-0.5">{currentSheet.description}</p>
              </div>
              <span className="bg-stone-100 text-stone-700 text-xs px-2.5 py-1 rounded-full font-semibold">
                {currentSheet.difficulty}
              </span>
            </div>

            {/* Large Line Art Preview */}
            <div className="w-full aspect-square max-h-[380px] mx-auto bg-[#FAF8F5] rounded-2xl border border-stone-200 overflow-hidden shadow-inner flex items-center justify-center p-4">
              <img
                src={currentSheet.imageUrl}
                alt={currentSheet.title}
                className="w-full h-full max-h-[360px] object-contain select-none"
              />
            </div>

            {/* Category / Sheet Tags */}
            <div className="mt-4 flex flex-wrap gap-2 items-center justify-center">
              {DRAWING_SHEETS.map((sheet) => (
                <div
                  key={sheet.id}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                    sheet.id === currentSheet.id
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {sheet.title}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
