"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"   // ✅ axios 추가
import { Input } from "@/components/ui/input"
import { Eye, EyeOff } from "lucide-react"


const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [autoLogin, setAutoLogin] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")   // ✅ 에러 메시지 상태

  // ✅ 로그인 폼 제출 시 실행되는 함수
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")

    // (옵션) 프론트 간단 유효성 검사
    if (!formData.email || !formData.password) {
      setErrorMsg("이메일과 비밀번호를 모두 입력해주세요.")
      return
    }

    try {
      // ✅ 백엔드 /api/login 으로 axios 요청
      const res = await axios.post(`${API_BASE_URL}/login`, {
        email: formData.email,
        password: formData.password,
      })

      // ✅ 로그인 성공 시 대시보드로 이동
      if (res.data?.success) {
        router.push("/dashboard")
      } else {
        setErrorMsg(res.data?.message || "로그인에 실패했습니다.")
      }
    } catch (err: any) {
      // 서버에서 에러 응답 온 경우
      const msg = err?.response?.data?.message || "서버 오류로 로그인에 실패했습니다."
      setErrorMsg(msg)
    }
  }

  const handleLogoClick = () => {
    router.push("/?skip=true")
  }

  const handleLoginClick = () => {
    const form = document.querySelector("form")
    if (form) {
      form.requestSubmit()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-200" style={{ backgroundColor: 'var(--bg)' }}>
      {/* 배경 모눈 패턴 - 랜딩 페이지와 동일 */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundColor: 'var(--cnc-black)',
          backgroundImage: `
            linear-gradient(var(--cnc-grid) 1px, transparent 1px),
            linear-gradient(90deg, var(--cnc-grid) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      <button
        onClick={handleLogoClick}
        className="absolute top-12 left-12 text-5xl font-bold tracking-tight transition-all duration-300 z-30 slide-up-in group"
        style={{
          fontFamily: "'Arial Black', sans-serif",
        }}
        onMouseEnter={(e) => {
          const span = e.currentTarget.querySelector("span")
          if (span) {
            span.style.filter = `drop-shadow(0 0 40px var(--neon-glow-strong)) drop-shadow(0 0 60px var(--neon-glow))`
          }
        }}
        onMouseLeave={(e) => {
          const span = e.currentTarget.querySelector("span")
          if (span) {
            span.style.filter = `drop-shadow(0 0 20px var(--neon-glow-subtle))`
          }
        }}
      >
        <span
          className="inline-block transition-all duration-300 group-hover:scale-150"
          style={{
            background: "linear-gradient(135deg, var(--premium-blue-light) 0%, var(--primary) 50%, var(--primary-dark) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 20px var(--neon-glow-subtle))",
          }}
        >
          Fore
        </span>
      </button>

      <div
        className="absolute slide-up-wrapper-delay-1 z-10"
        style={{ left: "350px", top: "50%", transform: "translateY(-50%)" }}
      >
        <div
          className="w-[1400px] h-[1400px] rounded-full relative flex items-center justify-center"
          style={{
            border: "50px solid transparent",
            backgroundImage:
              `linear-gradient(var(--bg), var(--bg)), linear-gradient(135deg, var(--premium-blue-light) 0%, var(--primary) 50%, var(--primary-dark) 100%)`,
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
            boxShadow: `0 0 80px var(--neon-glow), inset 0 0 50px var(--neon-glow-subtle)`,
          }}
        />
      </div>

      <div
        className="absolute top-1/2 left-1/2 slide-up-wrapper-delay-2 w-[500px] space-y-6 z-20"
        style={{ transform: "translate(-50%, -50%)" }}
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="text-xl mb-3 block font-bold tracking-wide" style={{ color: 'var(--text)' }}>E-Mail :</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="border-2 text-xl h-16 transition-colors input-highlight"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="text-xl mb-3 block font-bold tracking-wide" style={{ color: 'var(--text)' }}>PW :</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="border-2 text-xl h-16 transition-colors pr-14 input-highlight"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                }}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--text)' }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={28} /> : <Eye size={28} />}
              </button>
            </div>
          </div>

          {/* ✅ 에러 메시지 표시 */}
          {errorMsg && (
            <p className="text-red-400 text-sm mt-2">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="autoLogin"
              checked={autoLogin}
              onChange={(e) => setAutoLogin(e.target.checked)}
              className="w-6 h-6 rounded border-2 cursor-pointer transition-colors"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--bg-secondary)',
                accentColor: 'var(--primary)',
              }}
            />
            <label
              htmlFor="autoLogin"
              className="text-[#E8E9EA] text-xl font-semibold tracking-wide cursor-pointer"
            >
              자동 로그인
            </label>
          </div>
        </form>
      </div>

      <div
        className="absolute slide-up-wrapper-delay-3 transition-transform duration-300 z-20"
        style={{
          bottom: "-100px",
          right: "150px",
          width: "700px",
          height: "180px",
          transform: "rotate(45deg) scale(1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "rotate(45deg) scale(1.3)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "rotate(45deg) scale(1)"
        }}
      >
        <button
          onClick={handleLoginClick}
          className="group transition-all duration-300 cursor-pointer z-30 w-full h-full"
          style={{
            background: `linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 50%, var(--primary-dark) 100%)`,
            boxShadow: `0 4px 20px var(--neon-glow-subtle), 0 0 30px var(--neon-glow-subtle)`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow =
              `0 8px 40px var(--neon-glow-strong), 0 0 60px var(--neon-glow), 0 0 100px var(--neon-glow-subtle)`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow =
              `0 4px 20px var(--neon-glow-subtle), 0 0 30px var(--neon-glow-subtle)`
          }}
          aria-label="Login button"
        >
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={{ transform: "rotate(-45deg)" }}
          >
            <span
              className="absolute text-7xl font-black tracking-widest group-hover:scale-120 transition-transform"
              style={{
                color: "var(--text)",
                textShadow: `0 0 8px var(--neon-glow-subtle), 0 0 12px var(--neon-glow-subtle)`,
                fontFamily:
                  "var(--font-fredoka-one), 'Fredoka One', 'Bubblegum Sans', 'Comic Sans MS', cursive",
                top: "calc(-35% - 61px)",
                left: "15%",
              }}
            >
              LOG
            </span>
            <span
              className="absolute text-7xl font-black tracking-widest group-hover:scale-120 transition-transform"
              style={{
                color: "var(--text)",
                textShadow: `0 0 8px var(--neon-glow-subtle), 0 0 12px var(--neon-glow-subtle)`,
                fontFamily:
                  "var(--font-fredoka-one), 'Fredoka One', 'Bubblegum Sans', 'Comic Sans MS', cursive",
                top: "calc(5% - 65px)",
                left: "30%",
              }}
            >
              IN
            </span>
          </div>
        </button>
      </div>

      <div className="absolute bottom-16 left-16 z-30 slide-up-in-delay-4">
        <h2
          className="text-4xl tracking-wider animate-float"
          style={{
            fontFamily: "'Brush Script MT', cursive",
            color: 'var(--text-secondary)',
          }}
        >
          Foresee Quality
        </h2>
      </div>
    </div>
  )
}