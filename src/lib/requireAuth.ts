import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "./auth";

export function requireAuth(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized: No token provided" },
        { status: 401 }
      ),
    };
  }

  try {

    const user = verifyJwt(token);
    
   
    return { user };
    
  } catch (err: any) {
    
    console.error("JWT Verification failed:", err.message);

    return {
      error: NextResponse.json(
        { error: "Invalid or expired token", details: err.message },
        { status: 401 }
      ),
    };
  }
}
