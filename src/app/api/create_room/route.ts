import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Room } from "@/model/Room";
import { User } from "@/model/User";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  try {
    await connectDB();

   
    const { email, name } = await req.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

   
    const roomCode = randomBytes(3).toString("hex");

   
    const room = await Room.create({
      code: roomCode,
      name,
      createdBy: user._id,
    });

    return NextResponse.json(
      {
        message: "Room created successfully",
        room,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("ROOM_CREATE_ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
