import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, password, position } = await req.json();

    // ✅ 서버 사이드 유효성 검사
    if (!email || !password || !position) {
      return NextResponse.json(
        { success: false, error: "모든 필드를 입력해주세요." },
        { status: 400 }
      );
    }

    // ✅ 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "올바른 이메일 형식을 입력해주세요." },
        { status: 400 }
      );
    }

    // ✅ 비밀번호 길이 검증
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "비밀번호는 최소 8자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // ✅ 직급 검증
    if (position.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "직급은 최소 2자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // ✅ 중복 이메일 체크
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { success: false, error: "이미 존재하는 이메일입니다." },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: { 
        email, 
        password: hashed, 
        name: position // 직급을 name 필드에 저장
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Signup error:", e);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}