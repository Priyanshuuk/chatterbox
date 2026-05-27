import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Room } from "@/model/Room";
import { User } from "@/model/User";
import { requireAuth } from "@/lib/requireAuth";

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const { friendUserId } = await req.json();

    if (!friendUserId) {
      return NextResponse.json({ error: "friendUserId required" }, { status: 400 });
    }

    const friend = await User.findById(friendUserId);
    if (!friend) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ids = [user.userId.toString(), friendUserId.toString()].sort();
    const code = `dm:${ids[0]}:${ids[1]}`;

    let room = await Room.findOne({ code });
    if (!room) {
      room = await Room.create({
        code,
        participants: [new Types.ObjectId(user.userId), new Types.ObjectId(friendUserId)],
        type: "dm",
      });
    }

    return NextResponse.json({
      room: { code: room.code, id: room._id.toString() },
      friend: {
        userId: friend._id.toString(),
        username: friend.username,
        email: friend.email,
        avatar: friend.avatar,
      },
    });
  } catch (err) {
    console.error("DM_START_ERROR:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
