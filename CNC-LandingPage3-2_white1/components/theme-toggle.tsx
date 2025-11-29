'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 달 아이콘 SVG (선으로 그려진 깔끔한 디자인)
  const MoonIcon = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-transform duration-200"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )

  // 해 아이콘 SVG (선으로 그려진 깔끔한 디자인)
  const SunIcon = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-transform duration-200"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )

  if (!mounted) {
    return (
      <button
        className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-border bg-card hover:bg-accent"
        aria-label="Toggle theme"
      >
        <MoonIcon />
        <span className="text-sm font-medium">다크모드</span>
      </button>
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 hover:bg-primary/10 hover:scale-105 border-2 bg-card theme-toggle-button"
      aria-label="Toggle theme"
      style={{
        color: 'var(--text)',
      }}
    >
      {isDark ? (
        <>
          <SunIcon />
          <span className="text-sm font-medium">화이트모드</span>
        </>
      ) : (
        <>
          <MoonIcon />
          <span className="text-sm font-medium">다크모드</span>
        </>
      )}
    </button>
  )
}

