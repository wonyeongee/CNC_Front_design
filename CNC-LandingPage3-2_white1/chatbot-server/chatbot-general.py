# chatbot-general.py
# 잡담 전용 챗봇 - GPT만 사용 (PDF 검색 없음)
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
# CORS 설정 - Next.js 프론트엔드에서 접근 가능하도록
CORS(app)

# ✅ OpenAI 클라이언트 초기화
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def ask_gpt_general(question, history=None):
    """잡담/일반 질문 - GPT만 사용"""
    messages = [
        {"role": "system", "content": "너는 자연스럽고 친근한 한국어 챗봇이다. 편하게 잡담해라."}
    ]
    
    # 대화 기록이 있으면 추가
    if history:
        messages.extend(history)
    
    # 현재 질문 추가
    messages.append({"role": "user", "content": question})
    
    # GPT 호출
    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages
    )
    return res.choices[0].message.content

# =========================
# API 엔드포인트
# =========================
@app.route("/api/chat", methods=["POST"])
def chat():
    """잡담 챗봇 API - GPT만 사용"""
    data = request.get_json()
    question = (data.get("message") or "").strip()
    history = data.get("history", [])  # 프론트에서 넘기면 대화 유지 가능
    
    if not question:
        return jsonify({"answer": "질문이 비어있습니다.", "route": "GENERAL"}), 400
    
    # GPT로 잡담 답변 생성
    answer = ask_gpt_general(question, history=history)
    
    return jsonify({
        "answer": answer,
        "route": "GENERAL"
    })

@app.route("/health", methods=["GET"])
def health():
    """서버 상태 확인"""
    return jsonify({"status": "ok", "type": "general_chatbot"})

if __name__ == "__main__":
    print("🚀 잡담 챗봇 서버 시작 (포트 4002)")
    print("💬 GPT만 사용하는 일반 대화 챗봇입니다.")
    app.run(port=4002, debug=True)


