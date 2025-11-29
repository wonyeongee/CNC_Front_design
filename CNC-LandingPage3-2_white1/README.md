# CNC Landing Page

CNC 조각 애니메이션이 포함된 랜딩 페이지입니다.

## 시작하기

### 의존성 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 결과를 확인하세요.

### 프로덕션 빌드

```bash
npm run build
npm start
```

## 프로젝트 구조

```
CNC-LandingPage/
├── app/
│   ├── layout.tsx      # 루트 레이아웃
│   ├── page.tsx        # 메인 랜딩 페이지
│   └── globals.css     # 전역 스타일 및 CSS 변수
├── components/
│   └── ui/
│       └── button.tsx  # Button 컴포넌트
├── lib/
│   └── utils.ts        # 유틸리티 함수
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## 기술 스택

- **Next.js 14** - React 프레임워크
- **TypeScript** - 타입 안정성
- **Tailwind CSS** - 스타일링
- **React** - UI 라이브러리

