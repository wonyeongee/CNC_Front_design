'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    position: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [animationComplete, setAnimationComplete] = useState(false)
  const buttonWrapperRef = useRef<HTMLDivElement>(null)

  // ✅ 성공/에러 메시지 상태 추가
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // ✅ 이메일 형식 검증
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // ✅ 비밀번호 강도 검증 (최소 8자 이상)
  const validatePassword = (password: string) => {
    return password.length >= 8
  }

  // ✅ 회원가입 처리
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSuccessMsg('')
    setErrorMsg('')

    // ✅ 클라이언트 사이드 유효성 검사
    if (!formData.email || !formData.password || !formData.position) {
      setErrorMsg('모든 필드를 입력해주세요.')
      setIsSubmitting(false)
      return
    }

    if (!validateEmail(formData.email)) {
      setErrorMsg('올바른 이메일 형식을 입력해주세요.')
      setIsSubmitting(false)
      return
    }

    if (!validatePassword(formData.password)) {
      setErrorMsg('비밀번호는 최소 8자 이상이어야 합니다.')
      setIsSubmitting(false)
      return
    }

    if (formData.position.trim().length < 2) {
      setErrorMsg('직급은 최소 2자 이상이어야 합니다.')
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        console.log('[v0] Registration successful:', data)
        setSuccessMsg('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.')
        // ✅ 잠깐 문구 보여주고 로그인 페이지로 이동
        setTimeout(() => {
          router.push('/login')
        }, 1000)
      } else {
        console.error('[v0] Registration failed:', data.error || data.message)
        setErrorMsg(data.error || data.message || '회원가입에 실패했습니다.')
      }
    } catch (error) {
      console.error('[v0] Registration error:', error)
      setErrorMsg('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  useEffect(() => {
    // slide-up-in-delay-4 애니메이션이 0.4s delay + 0.6s duration = 1.0s 후 완료
    const timer = setTimeout(() => {
      setAnimationComplete(true)
      if (buttonWrapperRef.current) {
        // 애니메이션 완료 후 transform을 초기화하고 transition 활성화
        // 애니메이션 클래스를 제거하여 transform 충돌 방지
        buttonWrapperRef.current.classList.remove('slide-up-in-delay-4')
        buttonWrapperRef.current.style.transform = 'translateY(0) scale(1)'
        buttonWrapperRef.current.style.transition = 'transform 0.3s ease-out'
        buttonWrapperRef.current.style.animation = 'none'
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden transition-colors duration-200" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
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
        onClick={() => router.push('/?skip=true')}
        className="fixed top-[111px] right-[80px] z-30 group flex items-center gap-6 transition-transform hover:scale-150 duration-300 slide-up-in"
        aria-label="Go to home"
        onMouseEnter={(e) => {
          const span = e.currentTarget.querySelector('span')
          if (span) {
            span.style.filter = `drop-shadow(0 0 40px var(--neon-glow-strong)) drop-shadow(0 0 60px var(--neon-glow))`
            span.style.transform = "scale(1.15)"
          }
          const svg = e.currentTarget.querySelector('svg')
          if (svg) {
            svg.style.filter = `drop-shadow(0 0 10px var(--neon-glow))`
          }
        }}
        onMouseLeave={(e) => {
          const span = e.currentTarget.querySelector('span')
          if (span) {
            span.style.filter = `drop-shadow(0 0 20px var(--neon-glow-subtle))`
            span.style.transform = "scale(1)"
          }
          const svg = e.currentTarget.querySelector('svg')
          if (svg) {
            svg.style.filter = "none"
          }
        }}
      >
        <span 
          className="text-7xl tracking-wider pr-2 transition-transform duration-300"
          style={{
            fontFamily: "'Arial Black', sans-serif",
            background: "linear-gradient(135deg, var(--premium-blue-light) 0%, var(--primary) 50%, var(--primary-dark) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 20px var(--neon-glow-subtle))"
          }}
        >
          ore Q
        </span>
        <svg 
          width="48" 
          height="48" 
          viewBox="0 0 24 24" 
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="group-hover:scale-110 transition-transform"
        >
          <defs>
            <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--premium-blue-light)" />
              <stop offset="50%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--premium-blue-bright)" />
            </linearGradient>
          </defs>
          <path 
            d="M9 14 L4 9 L9 4" 
            stroke="url(#arrowGradient)" 
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path 
            d="M20 20v-7a4 4 0 0 0-4-4H4" 
            stroke="url(#arrowGradient)" 
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>

      <div className="relative min-h-screen flex items-start pt-24">
        <div className="w-full px-0">
          <div className="relative slide-up-in-delay-1 z-10">
            {/* F shape - Top horizontal bar */}
            <div
              className="absolute left-[310px] top-0 w-[55%] h-[20px] rounded-sm"
              style={{
                backgroundColor: 'var(--bg)',
                borderTop: '2px solid var(--border)',
                borderLeft: '2px solid var(--border)',
                boxShadow: `0 10px 25px var(--neon-glow), 0 18px 45px var(--neon-glow-subtle)`,
              }}
            />

            {/* F shape - Middle horizontal bar */}
            <div
              className="absolute left-[275px] top-[170px] w-[45%] h-[20px] rounded-sm"
              style={{
                backgroundColor: 'var(--bg)',
                borderTop: '2px solid var(--border)',
                borderLeft: '2px solid var(--border)',
                boxShadow: `0 10px 25px var(--neon-glow), 0 18px 45px var(--neon-glow-subtle)`,
              }}
            />

            {/* F shape - Vertical bar */}
            <div
              className="absolute left-[310px] top-0 w-[20px] h-[700px] rounded-sm rotate-[15deg] origin-top-left"
              style={{
                backgroundColor: 'var(--bg)',
                borderLeft: '2px solid var(--border)',
                boxShadow: `12px 0 25px var(--neon-glow), 22px 0 45px var(--neon-glow-subtle)`,
              }}
            />

            <form id="register-form" onSubmit={handleSubmit} className="relative z-10">
              <div className="absolute left-[480px] top-[50px] w-[500px] slide-up-in-delay-2">
                <label htmlFor="position" className="block text-lg mb-2 font-normal" style={{ color: 'var(--text)' }}>
                  Position :
                </label>
                <input
                  type="text"
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  required
                  className="w-full h-[50px] border-2 rounded-lg px-4 text-lg transition-all"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                  placeholder="직급을 입력하세요"
                />
              </div>

              <div className="absolute left-[480px] top-[235px] w-[500px] space-y-8 slide-up-in-delay-3">
                <div>
                  <label htmlFor="email" className="block text-lg mb-2 font-normal" style={{ color: 'var(--text)' }}>
                    email :
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full h-[50px] border-2 rounded-lg px-4 text-lg transition-all"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                    }}
                    placeholder="이메일을 입력하세요"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-lg mb-2 font-normal" style={{ color: 'var(--text)' }}>
                    PW :
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full h-[50px] border-2 rounded-lg px-4 text-lg transition-all"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                    }}
                    placeholder="비밀번호를 입력하세요"
                  />
                </div>

                {/* ✅ 성공/에러 메시지 표시 */}
                {successMsg && (
                  <p className="text-emerald-400 text-sm mt-2">
                    {successMsg}
                  </p>
                )}
                {errorMsg && (
                  <p className="text-red-400 text-sm mt-1">
                    {errorMsg}
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>

        <div 
          ref={buttonWrapperRef}
          className="fixed bottom-32 right-32 slide-up-in-delay-4 z-20"
          onMouseEnter={(e) => {
            if (animationComplete) {
              e.currentTarget.style.transform = "translateY(0) scale(1.2)"
            }
          }}
          onMouseLeave={(e) => {
            if (animationComplete) {
              e.currentTarget.style.transform = "translateY(0) scale(1)"
            }
          }}
        >
          <button
            type="submit"              // ✅ 폼 submit 트리거
            form="register-form"      // ❌ 대신, 아래처럼 id 연결하거나, 간단히 form에 id 빼고도 동작함
            onClick={(e) => {
              // type="submit" 이라 onClick 없이도 form onSubmit이 실행되지만,
              // hover 효과용 로직은 그대로 둬도 됨 (원래 코드 유지)
            }}
            disabled={isSubmitting}
            className="px-16 py-6 border-2 rounded-full text-2xl font-normal disabled:opacity-50 disabled:cursor-not-allowed w-full h-full transition-all duration-300"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.boxShadow = `0 0 30px var(--neon-glow), 0 0 60px var(--neon-glow-subtle), 0 0 90px var(--neon-glow-subtle)`
                e.currentTarget.style.borderColor = 'var(--primary)'
                e.currentTarget.style.color = 'var(--primary)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none"
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text)'
            }}
          >
            {isSubmitting ? '처리중...' : '회원가입'}
          </button>
        </div>
      </div>
    </div>
  )
}