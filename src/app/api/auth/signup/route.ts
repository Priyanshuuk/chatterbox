import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { User } from "@/model/User"; 

export async function POST(req: Request) {
  try {
    const { email, password, confirm_password, username } = await req.json();

    if (!email || !password || !confirm_password) { 
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password !== confirm_password) {
      return NextResponse.json(
        { error: "Passwords should match" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

   
    await connectDB();

   
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

   
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      username: username || normalizedEmail.split("@")[0],
    });

    return NextResponse.json(
      {
        message: "User created successfully",
        userId: user._id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("REGISTER_ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
