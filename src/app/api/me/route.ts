import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);

  if (error) return error;

  return NextResponse.json({
    authenticated: true,
    user,
  });
}
