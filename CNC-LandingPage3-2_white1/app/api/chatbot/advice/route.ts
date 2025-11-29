import { NextRequest, NextResponse } from 'next/server';

const ADVICE_SERVER_URL = process.env.CHATBOT_ADVICE_URL || 'http://localhost:8001';

export async function POST(req: NextRequest) {
  try {
    console.log("🔍 [API] /api/chatbot/advice 호출됨")
    console.log("🔍 [API] ADVICE_SERVER_URL:", process.env.CHATBOT_ADVICE_URL || 'http://localhost:8001')
    
    const body = await req.json();
    const defectData = body?.defectData;
    
    console.log("🔍 [API] 받은 defectData:", JSON.stringify(defectData, null, 2))

    if (!defectData || !defectData.features) {
      console.error("❌ [API] defectData 또는 features 없음")
      return NextResponse.json(
        { success: false, error: 'defectData가 필요합니다.' },
        { status: 400 }
      );
    }

    try {
      const adviceUrl = `${process.env.CHATBOT_ADVICE_URL || 'http://localhost:8001'}/chatbot/diagnose-from-defect`
      console.log("🔍 [API] Python 서버로 요청:", adviceUrl)
      console.log("🔍 [API] 전송할 defectData:", JSON.stringify(defectData, null, 2))
      
      
      // 타임아웃 설정 (90초) - GPT 응답 대기 시간 고려
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.error("⏱️ [Python 서버 타임아웃] 90초 내에 응답을 받지 못했습니다.")
        controller.abort()
      }, 90000)
      
      let adviceResponse: Response
      try {
        console.log("🔍 [API] Python 서버로 분석 요청 전송 중...")
        adviceResponse = await fetch(adviceUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(defectData),
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        console.log("✅ [API] Python 서버 응답 받음")
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        console.error("❌ [API] Python 서버 요청 실패:", fetchError.message)
        console.error("❌ [API] 에러 타입:", fetchError.name)
        console.error("❌ [API] 전체 에러:", fetchError)
        
        if (fetchError.name === 'AbortError') {
          throw new Error("Python 서버 응답 시간이 초과되었습니다. (90초)\n\n다음 명령으로 Python 서버를 실행해주세요:\ncd chatbot-server\nuvicorn chatbot_advice:app --reload --port 8001")
        }
        if (fetchError.message?.includes('fetch failed') || 
            fetchError.message?.includes('ECONNREFUSED') ||
            fetchError.message?.includes('network') ||
            fetchError.cause?.code === 'ECONNREFUSED') {
          throw new Error(`Python 서버에 연결할 수 없습니다.\n\n서버를 실행해주세요:\ncd chatbot-server\nuvicorn chatbot_advice:app --reload --port 8001\n\n서버 주소: ${adviceUrl}`)
        }
        throw fetchError
      }

      console.log("🔍 [API] Python 서버 응답 status:", adviceResponse.status, adviceResponse.statusText)

      if (!adviceResponse.ok) {
        const errorText = await adviceResponse.text()
        console.error("❌ [API] Python 서버 에러 응답:", errorText)
        throw new Error(`Advice server error: ${adviceResponse.status} - ${errorText}`);
      }

      const adviceData = await adviceResponse.json();
      console.log("🔍 [API] Python 서버 응답 데이터:", JSON.stringify(adviceData, null, 2))
      
      return NextResponse.json(
        {
          success: true,
          diagnosis: adviceData,
        },
        { status: 200 }
      );
    } catch (adviceError: any) {
      console.error('[❌ Advice 서버 연결 실패]', adviceError.message || adviceError);
      console.error('[❌ Advice 서버 에러 스택:', adviceError.stack);
      return NextResponse.json(
        {
          success: false,
          error: `불량품 분석 서버에 연결할 수 없습니다: ${adviceError.message || adviceError}`,
        },
        { status: 503 }
      );
    }
  } catch (error: any) {
    console.error('[❌ API /api/chatbot/advice] 에러:', error.message || error);
    console.error('[❌ API 에러 스택:', error.stack);
    return NextResponse.json(
      { success: false, error: `서버 에러가 발생했습니다: ${error.message || error}` },
      { status: 500 }
    );
  }
}

