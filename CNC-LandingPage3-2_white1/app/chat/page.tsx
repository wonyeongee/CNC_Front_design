// app/chat/page.tsx
'use client';

import { useState } from 'react';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: trimmed,
    };

    // 1) 우선 화면에 유저 메시지 추가
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          history: [...messages, userMessage], // 지금까지 대화 히스토리
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        console.error('Chat API error:', data?.error);
        // 간단한 에러 메시지 추가
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '⚠️ 서버 에러가 발생했습니다. 잠시 후 다시 시도해주세요.',
          },
        ]);
        return;
      }

      const botReply: ChatMessage = data.reply;

      setMessages((prev) => [...prev, botReply]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ 네트워크 에러가 발생했습니다.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black text-[#111111] dark:text-white p-4">
      <h1 className="text-2xl font-bold mb-4">프로젝트 챗봇 데모</h1>

      {/* 메시지 리스트 */}
      <div className="flex-1 border border-[#82c7ff] dark:border-gray-700 rounded-lg p-3 overflow-y-auto mb-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-[#111111] dark:text-gray-400 text-sm">
            아직 대화가 없습니다. 아래 입력창에 메시지를 입력해보세요.
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-[#82c7ff] dark:bg-blue-600 ml-auto text-[#111111] dark:text-white'
                : 'bg-white dark:bg-gray-800 mr-auto text-[#111111] dark:text-gray-100 border border-[#82c7ff] dark:border-gray-700'
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      {/* 입력 영역 */}
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-900 border border-[#82c7ff] dark:border-gray-700 text-[#111111] dark:text-white text-sm outline-none focus:ring-2 focus:ring-[#82c7ff] dark:focus:ring-blue-500"
          placeholder="메시지를 입력하고 Enter를 눌러보세요."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={handleSend}
          disabled={isSending || !input.trim()}
          className="px-4 py-2 rounded-lg bg-[#82c7ff] dark:bg-blue-600 text-[#111111] dark:text-white text-sm disabled:opacity-50"
        >
          {isSending ? '전송 중...' : '전송'}
        </button>
      </div>
    </div>
  );
}