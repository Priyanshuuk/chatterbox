import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";


export async function POST(req: Request) {
    const { email, password } = await req.json();

    try {
        if (!email || !password) {
            return NextResponse.json({
                error: "Cannot have the email or password empty"
            }, {
                status: 400
            });
        }

   
     const user = await prisma.user.findUnique({where: { email },});


      if(!user){
        return NextResponse.json({
            error : "User not registered"
        },{status : 401});
      }

      const match = await bcrypt.compare(password, user.password);

      if(match){
        //go to chat
         return NextResponse.json(
        {
        message: "Login successful",
        userId: user.id,
         },
        { status: 200 }
     );
      }
    
        return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
      
    }

    catch (error) {
    console.error("LOGIN_ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
}
}