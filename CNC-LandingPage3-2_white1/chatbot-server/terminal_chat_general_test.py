# terminal_chat_general_test.py
# 잡담 챗봇 테스트용 터미널 클라이언트
import requests
import json

URL = "http://localhost:4002/api/chat"

print("=" * 50)
print("잡담 챗봇 테스트 시작")
print("GPT만 사용하는 일반 대화 챗봇입니다.")
print("종료하려면 'exit' 입력")
print("=" * 50)

history = []

while True:
    msg = input("\nYou: ").strip()
    if msg.lower() == "exit":
        print("종료합니다.")
        break
    
    if not msg:
        continue
    
    payload = {
        "message": msg,
        "history": history
    }
    
    try:
        r = requests.post(URL, json=payload)
        r.raise_for_status()
        data = r.json()
        
        answer = data.get("answer")
        route = data.get("route", "GENERAL")
        
        print(f"\nBot({route}): {answer}")
        
        # 대화 기록 유지
        history.append({"role": "user", "content": msg})
        history.append({"role": "assistant", "content": answer})
        
    except requests.exceptions.ConnectionError:
        print("❌ 서버에 연결할 수 없습니다. chatbot-general.py가 실행 중인지 확인하세요.")
    except Exception as e:
        print(f"❌ 오류 발생: {e}")


