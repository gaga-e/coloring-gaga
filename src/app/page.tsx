"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { DRAWING_SHEETS, DrawingSheet, ART_CATEGORIES } from "@/data/drawings";
import { GameMode } from "@/lib/rooms";
import {
  Sparkles,
  Play,
  Users,
  Layers,
  Check,
  ChevronDown,
  ChevronUp,
  Palette,
} from "@/components/ui/icons";

export default function HomePage() {
  const router = useRouter();

  // Create party modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<DrawingSheet>(DRAWING_SHEETS[0]);
  const [isArtworkPickerOpen, setIsArtworkPickerOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>("together");
  const [duration, setDuration] = useState<number>(180);
  const [hostName, setHostName] = useState<string>("");
  const [hostAvatar, setHostAvatar] = useState<string>("🎨");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Join by code state
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  // Gallery filter
  const [activeCategory, setActiveCategory] = useState<string>("All Styles");

  const AVATARS = ["🎨", "✨", "🐱", "🦊", "🌸", "⭐", "🚀"];

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
      const cleanHostName = hostName.trim().slice(0, 12);
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          hostName: cleanHostName,
          hostAvatar,
          sheetId: selectedSheet.id,
          mode: selectedMode,
          durationSeconds: duration,
        }),
      });

      if (!res.ok) throw new Error("Failed to create room");
      const data = await res.json();
      const code = data.room.code;
      sessionStorage.setItem(`coloring_player_${code}`, data.hostId);
      sessionStorage.setItem(`coloring_room_${code}`, JSON.stringify(data.room));
      router.push(`/party/${code}`);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (cleanCode.length !== 6) {
      setJoinError("Enter a valid 6-character code");
      return;
    }
    router.push(`/party/${cleanCode}`);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-800 font-sans">
      {/* Top Clean Navigation */}
      <header className="sticky top-0 z-30 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-stone-200/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-6 h-6 text-amber-500 stroke-[2.2] shrink-0" />
            <span className="font-extrabold text-xl tracking-tight text-stone-900">
              Coloring<span className="text-amber-600">Gaga</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedSheet(DRAWING_SHEETS[0]);
                setIsArtworkPickerOpen(false);
                setIsCreateOpen(true);
              }}
              className="hidden sm:inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition active:scale-95 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Party</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 pt-12 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-100/70 text-amber-800 px-3 py-1 rounded-full text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Social Coloring</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-stone-900 leading-tight">
          Color, unwind, and <br />
          <span className="bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
            create together.
          </span>
        </h1>

        <p className="mt-3.5 text-stone-600 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          Soothing, tactile coloring with beautiful curated palettes. Shade peacefully with friends in real time or compare interpretations at the end.
        </p>

        {/* Quick Action Boxes */}
        <div className="mt-8 flex flex-col sm:flex-row items-stretch justify-center gap-3 max-w-md mx-auto">
          {/* Create Game Button */}
          <button
            onClick={() => {
              setSelectedSheet(DRAWING_SHEETS[0]);
              setIsArtworkPickerOpen(false);
              setIsCreateOpen(true);
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm px-5 py-3 rounded-xl shadow-sm transition active:scale-95 min-h-[48px]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start a Party</span>
          </button>

          {/* Join with Code Box */}
          <form
            onSubmit={handleJoinByCode}
            className="flex-1 flex items-center bg-white border border-stone-200 rounded-xl p-1 shadow-sm focus-within:border-amber-400 min-h-[48px]"
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
              className="w-full px-3 py-1.5 text-xs font-mono font-bold tracking-wider text-stone-800 placeholder:text-stone-400 focus:outline-none uppercase bg-transparent"
            />
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shrink-0 active:scale-95"
            >
              Join
            </button>
          </form>
        </div>
        {joinError && <p className="text-rose-500 text-xs font-medium mt-2">{joinError}</p>}
      </section>

      {/* The Two Modes Explainer */}
      <section className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mode 1 Card: Same Canvas */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center mb-3">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-1.5">
                Coloring Together
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Everyone draws on the exact same canvas in real-time. You and your friends shade, color, and bring one shared illustration to life together with instant live strokes.
              </p>
            </div>
          </div>

          {/* Mode 2 Card: Different Canvases */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center mb-3">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-1.5">
                Coloring Differently
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Everyone gets the same original drawing to shade secretly on their own separate canvas. When time is up, The Grand Reveal displays all different canvases side-by-side with celebratory confetti.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Artwork Catalog Gallery */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="space-y-3 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Curated Art Gallery
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Pick a drawing to start or explore our styles.
            </p>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {ART_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition active:scale-95 ${
                  activeCategory === cat
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSheets.map((sheet) => (
            <div
              key={sheet.id}
              className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-sm hover:border-amber-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-square w-full rounded-xl bg-[#FAF8F5] border border-stone-100 overflow-hidden flex items-center justify-center p-2 mb-3">
                  <img
                    src={sheet.imageUrl}
                    alt={sheet.title}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                  <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs text-[10px] font-semibold text-stone-700 px-2 py-0.5 rounded-md border border-stone-200">
                    {sheet.difficulty}
                  </span>
                </div>

                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                  {sheet.category}
                </span>
                <h3 className="font-bold text-stone-900 text-sm mt-0.5 mb-1">
                  {sheet.title}
                </h3>
                <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                  {sheet.description}
                </p>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-stone-100">
                <button
                  onClick={() => {
                    setSelectedSheet(sheet);
                    setIsArtworkPickerOpen(false);
                    setIsCreateOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-stone-100 hover:bg-amber-50 hover:text-amber-800 text-stone-700 text-xs font-semibold transition active:scale-95"
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
        <div className="fixed inset-0 z-50 bg-stone-900/25 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-stone-200 shadow-xl relative animate-in fade-in zoom-in-95 duration-150 my-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                  Host Party
                </span>
                <h2 className="text-xl font-bold text-stone-900">Create Room</h2>
              </div>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setIsArtworkPickerOpen(false);
                }}
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              {/* Custom On-Theme Artwork Selector */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-stone-700">
                    Drawing Artwork
                  </label>
                  <span className="text-[10px] text-stone-400 font-medium">
                    {DRAWING_SHEETS.length} artworks available
                  </span>
                </div>

                {/* Interactive Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsArtworkPickerOpen(!isArtworkPickerOpen)}
                  className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border text-left transition active:scale-[0.99] ${
                    isArtworkPickerOpen
                      ? "border-amber-500 bg-amber-50/30 ring-2 ring-amber-500/10"
                      : "border-stone-200 bg-stone-50 hover:bg-stone-100/70 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-[#FAF8F5] border border-stone-200/80 p-1 shrink-0 overflow-hidden flex items-center justify-center">
                      <img
                        src={selectedSheet.imageUrl}
                        alt={selectedSheet.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-stone-900 truncate">
                        {selectedSheet.title}
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        {selectedSheet.category} • {selectedSheet.difficulty}
                      </p>
                    </div>
                  </div>

                  <div className="p-1 text-stone-400 hover:text-stone-600 shrink-0">
                    {isArtworkPickerOpen ? (
                      <ChevronUp className="w-4 h-4 text-stone-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                </button>

                {/* Custom Popover Dropdown Menu - Floats over other elements without increasing modal height */}
                {isArtworkPickerOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-stone-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-stone-100 animate-in fade-in zoom-in-95 duration-100">
                    {DRAWING_SHEETS.map((sheet) => {
                      const isSelected = sheet.id === selectedSheet.id;
                      return (
                        <button
                          key={sheet.id}
                          type="button"
                          onClick={() => {
                            setSelectedSheet(sheet);
                            setIsArtworkPickerOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 text-left transition ${
                            isSelected
                              ? "bg-amber-50/80 text-amber-900"
                              : "hover:bg-stone-50 text-stone-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-md bg-[#FAF8F5] border border-stone-200 p-0.5 shrink-0 overflow-hidden flex items-center justify-center">
                              <img
                                src={sheet.imageUrl}
                                alt={sheet.title}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">{sheet.title}</p>
                              <p className="text-[10px] text-stone-500">
                                {sheet.category} • {sheet.difficulty}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-amber-600 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Choose Game Mode */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMode("together")}
                    className={`p-3 rounded-xl border text-left transition ${
                      selectedMode === "together"
                        ? "border-amber-500 bg-amber-50/50"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <span className="font-bold text-xs text-stone-900 block">
                      Coloring Together
                    </span>
                    <span className="text-[11px] text-stone-500 leading-tight block mt-1">
                      Everyone draws on the same canvas in real-time.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMode("differently")}
                    className={`p-3 rounded-xl border text-left transition ${
                      selectedMode === "differently"
                        ? "border-amber-500 bg-amber-50/50"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <span className="font-bold text-xs text-stone-900 block">
                      Coloring Differently
                    </span>
                    <span className="text-[11px] text-stone-500 leading-tight block mt-1">
                      Two different canvases shown side-by-side at the end.
                    </span>
                  </button>
                </div>
              </div>

              {/* Timer Duration */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Round Duration
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
                      className={`py-2 rounded-xl text-xs font-semibold border transition ${
                        duration === t.secs
                          ? "bg-amber-500 text-white border-amber-500 shadow-sm"
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
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value.slice(0, 12))}
                  placeholder="e.g. Maya"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:border-amber-500 text-xs font-medium text-stone-900"
                />
              </div>

              {/* Host Avatar (All in one line) */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Avatar
                </label>
                <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setHostAvatar(av)}
                      className={`flex-1 aspect-square max-w-[44px] rounded-xl text-lg flex items-center justify-center transition active:scale-95 ${
                        hostAvatar === av
                          ? "bg-amber-100 ring-2 ring-amber-500 shadow-2xs"
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
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold text-xs shadow-sm transition active:scale-95"
              >
                {isSubmitting ? "Creating Room..." : "Launch Room"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
