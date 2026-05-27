import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Room } from "@/model/Room";
import { Message } from "@/model/Messages";
import { User } from "@/model/User";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectDB();

    const rooms = await Room.find({
      participants: new Types.ObjectId(user.userId),
      type: "dm",
    }).sort({ updatedAt: -1 }).lean();

    const dms = await Promise.all(
      rooms.map(async (room: any) => {
        const otherUserId = room.participants.find(
          (p: any) => p.toString() !== user.userId
        );
        let otherUser = null;
        if (otherUserId) {
          otherUser = await User.findById(otherUserId)
            .select("username email avatar friendCode")
            .lean();
        }

        const lastMessage = await Message.findOne({ room: room._id })
          .sort({ createdAt: -1 })
          .select("content type createdAt")
          .lean();

        return {
          roomCode: room.code,
          roomId: room._id.toString(),
          otherUser: otherUser
            ? {
                userId: (otherUser as any)._id.toString(),
                username: (otherUser as any).username,
                email: (otherUser as any).email,
                avatar: (otherUser as any).avatar,
              }
            : null,
          lastMessage: lastMessage
            ? {
                content: (lastMessage as any).content,
                type: (lastMessage as any).type,
                createdAt: (lastMessage as any).createdAt,
              }
            : null,
          updatedAt: room.updatedAt,
        };
      })
    );

    return NextResponse.json({ dms });
  } catch (err) {
    console.error("DM_LIST_ERROR:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
