# 챗봇 서버

Python Flask 기반의 잡담 챗봇 서버입니다.

## 설치

```bash
pip install -r requirements.txt
```

## 환경 변수 설정

`.env` 파일을 생성하고 OpenAI API 키를 추가하세요:

```
OPENAI_API_KEY=your-api-key-here
```

## 실행

```bash
python chatbot-general.py
```

서버가 `http://localhost:4002`에서 실행됩니다.

## 테스트

터미널에서 테스트하려면:

```bash
python terminal_chat_general_test.py
```

## API 엔드포인트

### POST /api/chat

챗봇과 대화하기

**요청:**
```json
{
  "message": "안녕하세요",
  "history": [
    {"role": "user", "content": "이전 메시지"},
    {"role": "assistant", "content": "이전 답변"}
  ]
}
```

**응답:**
```json
{
  "answer": "안녕하세요! 무엇을 도와드릴까요?",
  "route": "GENERAL"
}
```

### GET /health

서버 상태 확인


