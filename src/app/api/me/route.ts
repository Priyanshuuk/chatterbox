import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/model/User";
import { requireAuth } from "@/lib/requireAuth";

function generateFriendCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);

  if (error) return error;

  try {
    await connectDB();
    let dbUser = await User.findById(user.userId);

    if (!dbUser) {
      return NextResponse.json({ authenticated: true, user });
    }

    if (!dbUser.friendCode) {
      let code = generateFriendCode();
      while (await User.findOne({ friendCode: code })) {
        code = generateFriendCode();
      }
      dbUser.friendCode = code;
      await dbUser.save();
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        userId: user.userId,
        email: user.email,
        username: dbUser.username || user.email.split("@")[0],
        avatar: dbUser.avatar || "",
        friendCode: dbUser.friendCode || "",
        friends: dbUser.friends || [],
      },
    });
  } catch {
    return NextResponse.json({
      authenticated: true,
      user,
    });
  }
}
