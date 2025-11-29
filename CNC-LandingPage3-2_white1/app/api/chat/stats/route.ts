// app/api/chat/stats/route.ts
// 통계 기능 비활성화 (Python Flask 서버 사용으로 인해)
import { NextResponse } from 'next/server';

export async function GET() {
  // 통계 기능 비활성화
  return NextResponse.json({
    success: true,
    stats: {
      totalQuestions: 0,
      categories: [],
      updatedAt: new Date().toISOString(),
    },
  });
}

