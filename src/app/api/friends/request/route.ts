import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/model/User";
import { FriendRequest } from "@/model/FriendRequest";
import { requireAuth } from "@/lib/requireAuth";
import { Types } from "mongoose";

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Friend code required" }, { status: 400 });
    }

    const recipient = await User.findOne({ friendCode: code.toUpperCase() });
    if (!recipient) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const myId = new Types.ObjectId(user.userId);
    const recipientId = recipient._id;

    if (myId.equals(recipientId)) {
      return NextResponse.json({ error: "Cannot send request to yourself" }, { status: 400 });
    }

    const me = await User.findById(myId);
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (me.friends.some((f: Types.ObjectId) => f.equals(recipientId))) {
      return NextResponse.json({ error: "Already friends" }, { status: 400 });
    }

    const existing = await FriendRequest.findOne({
      $or: [
        { sender: myId, recipient: recipientId, status: "pending" },
        { sender: recipientId, recipient: myId, status: "pending" },
      ],
    });
    if (existing) {
      return NextResponse.json({ error: "Request already pending" }, { status: 400 });
    }

    const request = await FriendRequest.create({
      sender: myId,
      recipient: recipientId,
      status: "pending",
    });

    const socketUrl = `http://localhost:${process.env.SOCKET_PORT || "3001"}`;
    fetch(`${socketUrl}/api/emit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: recipientId.toString(),
        event: "friend-request",
        data: {
          id: request._id,
          from: { userId: me._id, username: me.username, email: me.email, avatar: me.avatar || "", friendCode: me.friendCode },
        },
      }),
    }).catch(() => {});

    return NextResponse.json({
      message: "Request sent",
      request: {
        id: request._id,
        status: request.status,
      },
    });
  } catch (error) {
    console.error("FRIEND_REQUEST_ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
