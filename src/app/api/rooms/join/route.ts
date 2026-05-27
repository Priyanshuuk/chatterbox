import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Room } from "@/model/Room";
import { requireAuth } from "@/lib/requireAuth";
import { Types } from "mongoose";

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const { code } = await req.json();

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: "Valid 6-digit room code required" }, { status: 400 });
    }

    const room = await Room.findOne({ code });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const uid = new Types.ObjectId(user.userId);

    if (room.maxParticipants && room.participants.length >= room.maxParticipants && !room.participants.some((p: Types.ObjectId) => p.equals(uid))) {
      return NextResponse.json({ error: "Room is full" }, { status: 403 });
    }

    if (!room.participants.some((p: Types.ObjectId) => p.equals(uid))) {
      room.participants.push(uid);
      await room.save();
    }

    return NextResponse.json({ room: { code: room.code, id: room._id, expiresAt: room.expiresAt, maxParticipants: room.maxParticipants, creator: room.creator } });
  } catch (error) {
    console.error("JOIN_ROOM_ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
