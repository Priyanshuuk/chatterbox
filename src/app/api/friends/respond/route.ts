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
    const { requestId, action } = await req.json();

    if (!requestId || !["accept", "reject"].includes(action)) {
      return NextResponse.json({ error: "requestId and action (accept/reject) required" }, { status: 400 });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const myId = new Types.ObjectId(user.userId);
    if (!request.recipient.equals(myId)) {
      return NextResponse.json({ error: "Not your request to respond to" }, { status: 403 });
    }

    if (request.status !== "pending") {
      return NextResponse.json({ error: "Request already responded to" }, { status: 400 });
    }

    const socketUrl = `http://localhost:${process.env.SOCKET_PORT || "3001"}`;

    if (action === "accept") {
      request.status = "accepted";
      await request.save();

      await User.findByIdAndUpdate(myId, { $addToSet: { friends: request.sender } });
      await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: myId } });

      const me = await User.findById(myId).select("username email avatar friendCode").lean();

      fetch(`${socketUrl}/api/emit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: request.sender.toString(),
          event: "friend-request-accepted",
          data: {
            requestId: request._id,
            by: me ? { userId: me._id, username: me.username, email: me.email, avatar: me.avatar || "" } : null,
          },
        }),
      }).catch(() => {});

      return NextResponse.json({
        message: "Friend request accepted",
        request: { id: request._id, status: "accepted" },
      });
    } else {
      request.status = "rejected";
      await request.save();

      fetch(`${socketUrl}/api/emit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: request.sender.toString(),
          event: "friend-request-rejected",
          data: { requestId: request._id },
        }),
      }).catch(() => {});

      return NextResponse.json({
        message: "Friend request rejected",
        request: { id: request._id, status: "rejected" },
      });
    }
  } catch (error) {
    console.error("FRIEND_RESPOND_ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
