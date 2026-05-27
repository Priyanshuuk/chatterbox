import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Room } from "@/model/Room";
import { requireAuth } from "@/lib/requireAuth";

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const sessionDuration = body.sessionDuration ? parseInt(body.sessionDuration, 10) : null;
    const maxParticipants = body.maxParticipants ? parseInt(body.maxParticipants, 10) : null;

    let code = "";
    while (true) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await Room.findOne({ code });
      if (!existing) break;
    }

    const uid = new Types.ObjectId(user.userId);
    const room = await Room.create({
      code,
      participants: [uid],
      creator: uid,
      expiresAt: sessionDuration ? new Date(Date.now() + sessionDuration * 60 * 1000) : null,
      maxParticipants,
    });

    return NextResponse.json({
      room: { code: room.code, id: room._id, expiresAt: room.expiresAt, maxParticipants: room.maxParticipants, creator: user.userId },
    }, { status: 201 });
  } catch (error) {
    console.error("CREATE_ROOM_ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
