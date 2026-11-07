"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { DRAWING_SHEETS, DrawingSheet, ART_CATEGORIES } from "@/data/drawings";
import { GameMode } from "@/lib/rooms";
import {
  Sparkles,
  Users,
  Palette,
  Play,
  ArrowRight,
  Clock,
  Layers,
  ChevronRight,
  ShieldCheck,
  Check,
} from "@/components/ui/icons";

export default function HomePage() {
  const router = useRouter();

  // Create party modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<DrawingSheet>(DRAWING_SHEETS[0]);
  const [selectedMode, setSelectedMode] = useState<GameMode>("differently");
  const [duration, setDuration] = useState<number>(180);
  const [hostName, setHostName] = useState<string>("");
  const [hostAvatar, setHostAvatar] = useState<string>("🎨");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Join by code state
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  // Gallery filter
  const [activeCategory, setActiveCategory] = useState<string>("All Styles");

  const AVATARS = ["🎨", "✨", "🐱", "🦊", "🌸", "⭐", "🚀", "🐸", "🌻", "☕"];

  const filteredSheets =
    activeCategory === "All Styles"
      ? DRAWING_SHEETS
      : activeCategory === "Simple & Easy"
      ? DRAWING_SHEETS.filter((s) => s.difficulty === "Easy")
      : DRAWING_SHEETS.filter((s) => s.category === activeCategory);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          hostName: hostName.trim(),
          hostAvatar,
          sheetId: selectedSheet.id,
          mode: selectedMode,
          durationSeconds: duration,
        }),
      });

      if (!res.ok) throw new Error("Failed to create room");
      const data = await res.json();
      sessionStorage.setItem(`coloring_player_${data.room.code}`, data.hostId);
      router.push(`/party/${data.room.code}`);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setJoinError("Enter a valid 6-character party code");
      return;
    }
    router.push(`/party/${cleanCode}`);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 font-sans selection:bg-amber-200">
      {/* Top Clean Navigation */}
      <header className="sticky top-0 z-30 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-stone-200/70">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-200 text-lg">
              🎨
            </span>
            <span className="font-extrabold text-xl tracking-tight text-stone-900">
              Coloring<span className="text-amber-600">Gaga</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedSheet(DRAWING_SHEETS[0]);
                setIsCreateOpen(true);
              }}
              className="hidden sm:inline-flex items-center gap-2 bg-stone-900 hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-sm transition active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Create Party</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-100/80 text-amber-900 px-3.5 py-1.5 rounded-full text-xs font-bold mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Multiplayer Cozy Coloring Game</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-stone-900 max-w-3xl mx-auto leading-[1.15]">
          Hand-shade beautiful art <br />
          <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            together or in secret battles.
          </span>
        </h1>

        <p className="mt-4 text-stone-500 text-base sm:text-lg max-w-xl mx-auto font-normal">
          No cheap one-click fill. Tactile, soothing finger-shading with curated color
          palettes. Host a party, challenge friends, and reveal all interpretations side-by-side.
        </p>

        {/* Quick Action Boxes */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
          {/* Create Game Button */}
          <button
            onClick={() => {
              setSelectedSheet(DRAWING_SHEETS[0]);
              setIsCreateOpen(true);
            }}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm px-6 py-3.5 rounded-2xl shadow-lg shadow-amber-200 transition active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start a Coloring Party</span>
          </button>

          {/* Join with Code Box */}
          <form
            onSubmit={handleJoinByCode}
            className="w-full sm:w-auto flex-1 flex items-center bg-white border border-stone-200 rounded-2xl p-1 shadow-sm focus-within:ring-2 focus-within:ring-amber-500/20"
          >
            <input
              type="text"
              placeholder="PARTY CODE"
              maxLength={6}
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setJoinError("");
              }}
              className="w-full px-3 py-2 text-xs font-mono font-bold tracking-wider text-stone-800 placeholder:text-stone-400 focus:outline-none uppercase bg-transparent"
            />
            <button
              type="submit"
              className="bg-stone-900 hover:bg-black text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shrink-0 active:scale-95"
            >
              Join
            </button>
          </form>
        </div>
        {joinError && <p className="text-rose-500 text-xs font-semibold mt-2">{joinError}</p>}
      </section>

      {/* The Two Game Modes Explainer */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Mode 1 Card */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              BrushBrawl Style
            </span>
            <h3 className="text-xl font-black text-stone-900 mt-1 mb-2">
              Mode 1: Coloring Differently
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Everyone gets the exact same drawing to shade privately on their own screen with a
              synchronized timer. When time is up: <strong>The Grand Reveal</strong> displays all
              artworks side-by-side for voting and emoji reactions!
            </p>
          </div>

          {/* Mode 2 Card */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-700 flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600">
              Live Co-Op Jam
            </span>
            <h3 className="text-xl font-black text-stone-900 mt-1 mb-2">
              Mode 2: Coloring Together
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Join the same canvas in real-time. You and your friends draw, shade, and bring one
              shared illustration to life together with instant live strokes.
            </p>
          </div>
        </div>
      </section>

      {/* Artwork Catalog Gallery */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="space-y-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Curated Art Gallery
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              High-resolution, hand-crafted line art across aesthetic themes. Pick a drawing to start or join a party!
            </p>
          </div>

          {/* Category Filter Chips - Placed below title & subtitle, wraps cleanly without horizontal scroll wheel */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {ART_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-xs sm:text-sm px-4 py-2 rounded-full font-bold transition active:scale-95 ${
                  activeCategory === cat
                    ? "bg-stone-900 text-white shadow-sm"
                    : "bg-white border border-stone-200/90 text-stone-600 hover:bg-stone-100 hover:border-stone-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSheets.map((sheet) => (
            <div
              key={sheet.id}
              className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm hover:shadow-md transition flex flex-col justify-between group"
            >
              <div>
                {/* Real Drawing Image Preview */}
                <div className="aspect-square w-full rounded-2xl bg-[#FAF8F5] border border-stone-200 overflow-hidden flex items-center justify-center p-3 mb-4 relative shadow-inner group-hover:scale-[1.01] transition-transform">
                  <img
                    src={sheet.imageUrl}
                    alt={sheet.title}
                    className="w-full h-full object-contain select-none"
                    loading="lazy"
                  />
                  <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-[10px] font-bold text-stone-700 px-2.5 py-0.5 rounded-full shadow-xs border border-stone-200">
                    {sheet.difficulty}
                  </span>
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  {sheet.category}
                </span>
                <h3 className="font-extrabold text-stone-900 text-base mt-0.5 mb-1">
                  {sheet.title}
                </h3>
                <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                  {sheet.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedSheet(sheet);
                    setIsCreateOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-amber-600" />
                  <span>Choose This Artwork</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CREATE GAME MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-stone-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Host Party
                </span>
                <h2 className="text-2xl font-black text-stone-900">Create Game Room</h2>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              {/* Selected Sheet Header */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="w-14 h-14 rounded-xl bg-[#FAF8F5] border border-stone-200 p-1 shrink-0 overflow-hidden flex items-center justify-center">
                  <img
                    src={selectedSheet.imageUrl}
                    alt={selectedSheet.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-600 uppercase">
                    Selected Sheet
                  </span>
                  <h4 className="font-bold text-sm text-stone-900 leading-tight">
                    {selectedSheet.title}
                  </h4>
                  <p className="text-[11px] text-stone-400">{selectedSheet.category}</p>
                </div>
              </div>

              {/* Choose Game Mode */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Choose Game Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMode("differently")}
                    className={`p-3 rounded-2xl border text-left transition ${
                      selectedMode === "differently"
                        ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <span className="font-extrabold text-xs text-stone-900 block">
                      Coloring Differently
                    </span>
                    <span className="text-[11px] text-stone-500 leading-tight block mt-1">
                      Secret parallel shading &amp; Grand Reveal comparison.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMode("together")}
                    className={`p-3 rounded-2xl border text-left transition ${
                      selectedMode === "together"
                        ? "border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <span className="font-extrabold text-xs text-stone-900 block">
                      Coloring Together
                    </span>
                    <span className="text-[11px] text-stone-500 leading-tight block mt-1">
                      Real-time live co-op drawing on the same canvas.
                    </span>
                  </button>
                </div>
              </div>

              {/* Timer Duration */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Round Timer
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "1 min", secs: 60 },
                    { label: "3 min", secs: 180 },
                    { label: "5 min", secs: 300 },
                    { label: "10 min", secs: 600 },
                  ].map((t) => (
                    <button
                      key={t.secs}
                      type="button"
                      onClick={() => setDuration(t.secs)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        duration === t.secs
                          ? "bg-stone-900 text-white border-stone-900"
                          : "border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Host Nickname */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Your Nickname
                </label>
                <input
                  type="text"
                  required
                  maxLength={18}
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="e.g. Maya"
                  className="w-full px-4 py-2.5 rounded-2xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm font-semibold text-stone-900"
                />
              </div>

              {/* Host Avatar */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Choose Avatar
                </label>
                <div className="flex flex-wrap gap-2 justify-center">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setHostAvatar(av)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition ${
                        hostAvatar === av
                          ? "bg-amber-100 ring-2 ring-amber-500 scale-105"
                          : "bg-stone-100 hover:bg-stone-200"
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !hostName.trim()}
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-extrabold text-sm shadow-lg shadow-amber-200 transition active:scale-95"
              >
                {isSubmitting ? "Creating Room..." : "Launch Party Room"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
