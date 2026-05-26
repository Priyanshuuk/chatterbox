import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { FriendRequest } from "@/model/FriendRequest";
import { requireAuth } from "@/lib/requireAuth";
import { Types } from "mongoose";

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const myId = new Types.ObjectId(user.userId);

    const incoming = await FriendRequest.find({ recipient: myId, status: "pending" })
      .populate("sender", "username email avatar friendCode")
      .sort({ createdAt: -1 })
      .lean();

    const outgoing = await FriendRequest.find({ sender: myId, status: "pending" })
      .populate("recipient", "username email avatar friendCode")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      incoming: incoming.map((r: any) => ({
        id: r._id,
        from: {
          userId: r.sender._id,
          username: r.sender.username,
          email: r.sender.email,
          avatar: r.sender.avatar || "",
          friendCode: r.sender.friendCode,
        },
        status: r.status,
        createdAt: r.createdAt,
      })),
      outgoing: outgoing.map((r: any) => ({
        id: r._id,
        to: {
          userId: r.recipient._id,
          username: r.recipient.username,
          email: r.recipient.email,
          avatar: r.recipient.avatar || "",
          friendCode: r.recipient.friendCode,
        },
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("FRIEND_REQUESTS_ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
