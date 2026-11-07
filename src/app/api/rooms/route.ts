import { NextRequest, NextResponse } from "next/server";
import { createRoom, joinRoom } from "@/lib/rooms";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { hostName, hostAvatar, sheetId, mode, durationSeconds } = body;
      const result = createRoom(
        hostName,
        hostAvatar,
        sheetId || "cozy-capybara",
        mode || "differently",
        durationSeconds || 180
      );
      return NextResponse.json(result);
    }

    if (action === "join") {
      const { code, playerName, playerAvatar } = body;
      const result = joinRoom(code, playerName, playerAvatar);
      if (!result) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Room API error:", error);
    return NextResponse.json({ error: "Failed to process room request" }, { status: 500 });
  }
}
