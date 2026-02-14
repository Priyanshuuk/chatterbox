import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import { User } from "@/model/User";


export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Cannot have the email or password empty" },
        { status: 400 }
      );
    }

   
    await connectDB();

    // 🔍 Find user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: "User not registered" },
        { status: 401 }
      );
    }

   
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 🎟️ Create JWT
 

    // Set cookie
    const response = NextResponse.json(
      {
        message: "Login successful",
        userId: user._id,
      },
      { status: 200 }
    );

  

    return response;
  } catch (error) {
    console.error("LOGIN_ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
