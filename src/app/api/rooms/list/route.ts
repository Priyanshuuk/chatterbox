import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Room } from "@/model/Room";
import { Message } from "@/model/Messages";
import { requireAuth } from "@/lib/requireAuth";
import { Types } from "mongoose";

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const rooms = await Room.find({
      participants: new Types.ObjectId(user.userId),
      type: "group",
    })
      .populate("participants", "email username avatar")
      .sort({ updatedAt: -1 })
      .lean();

    const result = await Promise.all(
      rooms.map(async (room: any) => {
        const lastMsg = await Message.findOne({ room: room._id })
          .sort({ createdAt: -1 })
          .select("content type createdAt")
          .lean();
        return {
          roomCode: room.code,
          roomId: room._id.toString(),
          participantCount: room.participants?.length || 0,
          lastMessage: lastMsg
            ? { content: lastMsg.content, type: lastMsg.type, createdAt: lastMsg.createdAt }
            : null,
          updatedAt: room.updatedAt,
          expiresAt: room.expiresAt || null,
        };
      })
    );

    return NextResponse.json({ rooms: result });
  } catch (err) {
    console.error("ROOMS_LIST_ERROR:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
