import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/model/User";
import { requireAuth } from "@/lib/requireAuth";

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Friend code required" }, { status: 400 });
    }

    const found = await User.findOne({ friendCode: code.toUpperCase() }).select("username email avatar friendCode").lean();

    if (!found) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (found._id.toString() === user.userId) {
      return NextResponse.json({ error: "That's you!" }, { status: 400 });
    }

    return NextResponse.json({
      user: {
        userId: found._id,
        username: found.username,
        email: found.email,
        avatar: found.avatar || "",
        friendCode: found.friendCode,
      },
    });
  } catch (error) {
    console.error("FRIEND_SEARCH_ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
