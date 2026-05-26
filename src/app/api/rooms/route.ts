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

    let code = "";
    while (true) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await Room.findOne({ code });
      if (!existing) break;
    }

    const room = await Room.create({
      code,
      participants: [new Types.ObjectId(user.userId)],
    });

    return NextResponse.json({ room: { code: room.code, id: room._id } }, { status: 201 });
  } catch (error) {
    console.error("CREATE_ROOM_ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
