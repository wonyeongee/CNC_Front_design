// app/api/chat/route.ts
// Python Flask 서버로 프록시하는 API 라우트
import { NextRequest, NextResponse } from 'next/server';

const FLASK_SERVER_URL = process.env.FLASK_CHATBOT_URL || 'http://localhost:4002';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const message: string = body?.message;
    const history: any[] = body?.history || [];

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'message 필드가 필요합니다.' },
        { status: 400 }
      );
    }

    // Python Flask 서버로 프록시
    try {
      const flaskResponse = await fetch(`${FLASK_SERVER_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          history: history.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!flaskResponse.ok) {
        throw new Error(`Flask server error: ${flaskResponse.status}`);
      }

      const flaskData = await flaskResponse.json();
      
      return NextResponse.json(
        {
          success: true,
          reply: {
            role: 'assistant',
            content: flaskData.answer || flaskData.message || '답변을 받지 못했습니다.',
          },
        },
        { status: 200 }
      );
    } catch (flaskError) {
      console.error('[Flask 서버 연결 실패]', flaskError);
      return NextResponse.json(
        {
          success: false,
          error: '챗봇 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.',
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('[API /api/chat] 에러:', error);
    return NextResponse.json(
      { success: false, error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}