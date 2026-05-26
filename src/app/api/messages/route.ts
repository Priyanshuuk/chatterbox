import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Message } from "@/model/Messages";
import { Room } from "@/model/Room";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("roomCode");

    if (!code) {
      return NextResponse.json({ error: "roomCode query param required" }, { status: 400 });
    }

    const room = await Room.findOne({ code });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const messages = await Message.find({ room: room._id })
      .populate("sender", "email username avatar")
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("GET_MESSAGES_ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
