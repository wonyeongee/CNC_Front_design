import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'premium-blue': 'var(--premium-blue)',
        'premium-blue-light': 'var(--premium-blue-light)',
        'premium-blue-bright': 'var(--premium-blue-bright)',
        'premium-blue-deep': 'var(--premium-blue-deep)',
        'premium-blue-dark': 'var(--premium-blue-dark)',
        'white-silver': 'var(--white-silver)',
        'cnc-black': 'var(--cnc-black)',
        'cnc-cobalt': 'var(--cnc-cobalt)',
        'cnc-silver': 'var(--cnc-silver)',
        'cnc-grid': 'var(--cnc-grid)',
        bg: 'var(--bg)',
        'bg-secondary': 'var(--bg-secondary)',
        text: 'var(--text)',
        'text-secondary': 'var(--text-secondary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-dark': 'var(--primary-dark)',
        'neon-glow': 'var(--neon-glow)',
        'neon-glow-strong': 'var(--neon-glow-strong)',
        'neon-glow-subtle': 'var(--neon-glow-subtle)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        success: {
          DEFAULT: 'var(--success)',
          foreground: 'var(--success-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}
export default config

