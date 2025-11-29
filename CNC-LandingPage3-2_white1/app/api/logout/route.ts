import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // 쿠키 삭제
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}

