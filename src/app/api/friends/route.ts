import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/model/User";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const me = await User.findById(user.userId)
      .populate("friends", "username email avatar friendCode")
      .lean();

    return NextResponse.json({
      friends: (me?.friends || []).map((f: any) => ({
        userId: f._id,
        username: f.username,
        email: f.email,
        avatar: f.avatar || "",
        friendCode: f.friendCode,
      })),
    });
  } catch (error) {
    console.error("FRIENDS_LIST_ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
