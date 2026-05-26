import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/model/User";
import { requireAuth } from "@/lib/requireAuth";

export async function PATCH(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();
    const update: Record<string, any> = {};

    if (body.username !== undefined) {
      if (!body.username.trim()) {
        return NextResponse.json({ error: "Username cannot be empty" }, { status: 400 });
      }
      update.username = body.username.trim();
    }

    if (body.avatar !== undefined) {
      update.avatar = body.avatar;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await User.findByIdAndUpdate(user.userId, update);

    return NextResponse.json({ message: "Profile updated", ...update });
  } catch (error) {
    console.error("UPDATE_USER_ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
