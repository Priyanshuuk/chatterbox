import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Room } from "@/model/Room";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode");
    if (!roomCode) {
      return NextResponse.json({ error: "roomCode required" }, { status: 400 });
    }

    const room = await Room.findOne({ code: roomCode }).populate("participants", "email username avatar friendCode");
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const members = room.participants.map((p: any) => ({
      _id: p._id,
      email: p.email,
      username: p.username,
      avatar: p.avatar,
      friendCode: p.friendCode,
    }));

    return NextResponse.json({ members });
  } catch (err) {
    console.error("MEMBERS_ERROR:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
