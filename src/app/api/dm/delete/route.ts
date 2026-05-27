import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Room } from "@/model/Room";
import { Message } from "@/model/Messages";
import { requireAuth } from "@/lib/requireAuth";

export async function DELETE(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode");

    if (!roomCode) {
      return NextResponse.json({ error: "roomCode required" }, { status: 400 });
    }

    const room = await Room.findOne({ code: roomCode });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const isParticipant = (room.participants as any[]).some(
      (p: any) => p.toString() === user.userId
    );
    if (!isParticipant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await Message.deleteMany({ room: room._id });
    await Room.deleteOne({ _id: room._id });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DM_DELETE_ERROR:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
