'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

// 각 글자별로 경로를 추출하는 함수
function extractLetterPaths(
  letter: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string,
  scale: number,
  width: number,
  height: number,
  data: Uint8ClampedArray
): Array<{ letter: string; points: number[][] }> {
  const paths: Array<{ letter: string; points: number[][] }> = []
  const visited = new Set<string>()
  
  // 글자 영역 계산
  const letterX = Math.floor(x * scale)
  const letterY = Math.floor((y - fontSize * 1.2) * scale)
  const letterWidth = Math.ceil(fontSize * 1.5 * scale)
  const letterHeight = Math.ceil(fontSize * 1.5 * scale)
  
  const startX = Math.max(0, letterX)
  const startY = Math.max(0, letterY)
  const endX = Math.min(width, letterX + letterWidth)
  const endY = Math.min(height, letterY + letterHeight)
  
  // 경계선 추적 함수
  const traceBoundary = (startSx: number, startSy: number): number[][] => {
    const boundaryPoints: number[][] = []
    let px = startSx
    let py = startSy
    const startPx = startSx
    const startPy = startSy
    let dir = 0
    const directions = [
      [1, 0], [1, 1], [0, 1], [-1, 1],
      [-1, 0], [-1, -1], [0, -1], [1, -1]
    ]
    let steps = 0
    const maxSteps = 3000
    
    while (steps < maxSteps) {
      boundaryPoints.push([px / scale, py / scale])
      visited.add(`${px},${py}`)
      
      let found = false
      for (let i = 0; i < 8; i++) {
        const checkDir = (dir + 2 + i) % 8
        const [dx, dy] = directions[checkDir]
        const nextX = px + dx
        const nextY = py + dy
        
        if (nextX >= startX - 1 && nextX < endX + 1 && nextY >= startY - 1 && nextY < endY + 1) {
          const nextIdx = (nextY * width + nextX) * 4
          const nextAlpha = data[nextIdx + 3]
          const nextKey = `${nextX},${nextY}`
          
          if (nextAlpha > 128) {
            let hasBackground = false
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue
                const nx = nextX + dx
                const ny = nextY + dy
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const nIdx = (ny * width + nx) * 4
                  if (data[nIdx + 3] < 128) {
                    hasBackground = true
                    break
                  }
                } else {
                  hasBackground = true
                }
                if (hasBackground) break
              }
              if (hasBackground) break
            }
            
            if (hasBackground && !visited.has(nextKey)) {
              px = nextX
              py = nextY
              dir = checkDir
              found = true
              break
            }
          }
        }
      }
      
      if (!found || (Math.abs(px - startPx) < 2 && Math.abs(py - startPy) < 2 && steps > 20)) {
        break
      }
      
      steps++
    }
    
    return boundaryPoints
  }
  
  // 경계점 찾기
  for (let sy = startY; sy < endY; sy++) {
    for (let sx = startX; sx < endX; sx++) {
      const idx = (sy * width + sx) * 4
      const alpha = data[idx + 3]
      const key = `${sx},${sy}`
      
      if (alpha > 128 && !visited.has(key)) {
        let isBoundary = false
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = sx + dx
            const ny = sy + dy
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = (ny * width + nx) * 4
              if (data[nIdx + 3] < 128) {
                isBoundary = true
                break
              }
            } else {
              isBoundary = true
            }
            if (isBoundary) break
          }
          if (isBoundary) break
        }
        
        if (isBoundary) {
          const boundaryPoints = traceBoundary(sx, sy)
          if (boundaryPoints.length > 10) {
            const simplified: number[][] = []
            const step = Math.max(1, Math.floor(boundaryPoints.length / 40))
            for (let i = 0; i < boundaryPoints.length; i += step) {
              simplified.push(boundaryPoints[i])
            }
            if (simplified.length > 0) {
              paths.push({ letter, points: simplified })
            }
          }
        }
      }
    }
  }
  
  // r 글자의 경우 세로선 위쪽 가로선을 명시적으로 추가
  if (letter === 'r' && paths.length > 0) {
    const fontSizeScaled = fontSize
    
    // 폴백 경로와 동일한 기준으로 계산
    // textY = textBounds.y + fontSize * 0.8
    // baseY = textBounds.y + fontSize * 0.2 + offsetY
    // r의 위쪽 가로선 = baseY + fontSize * 0.05
    // 따라서 y 기준으로는 y - fontSize * 0.6 + fontSize * 0.05 = y - fontSize * 0.55
    // 하지만 실제로는 textBaseline이 'alphabetic'이므로 조정 필요
    const baseY = y - fontSizeScaled * 0.6  // textY에서 baseY로 변환
    const yPos = baseY + fontSizeScaled * 0.05  // r의 세로선 위쪽 가로선 위치
    
    // r의 세로선 경로 찾기 (세로선 위쪽 부분의 x 좌표 범위만 찾기)
    let verticalStrokeMinX: number | null = null
    let verticalStrokeMaxX: number | null = null
    const yTolerance = fontSizeScaled * 0.1  // yPos 근처의 점만 고려
    
    for (const path of paths) {
      if (path.points.length > 5) {
        // 세로로 긴 경로인지 확인 (y 범위가 x 범위보다 큼)
        const xCoords = path.points.map(p => p[0])
        const yCoords = path.points.map(p => p[1])
        const xRange = Math.max(...xCoords) - Math.min(...xCoords)
        const yRange = Math.max(...yCoords) - Math.min(...yCoords)
        
        if (yRange > xRange * 2) {
          // 세로선으로 판단 - 위쪽 부분의 점만 필터링
          const topPoints = path.points.filter(p => Math.abs(p[1] - yPos) < yTolerance)
          if (topPoints.length > 0) {
            const topXCoords = topPoints.map(p => p[0])
            const minX = Math.min(...topXCoords)
            const maxX = Math.max(...topXCoords)
            if (verticalStrokeMinX === null || minX < verticalStrokeMinX) {
              verticalStrokeMinX = minX
            }
            if (verticalStrokeMaxX === null || maxX > verticalStrokeMaxX) {
              verticalStrokeMaxX = maxX
            }
          }
        }
      }
    }
    
    // 세로선을 찾지 못한 경우 x 좌표 사용 (세로선 두께 고려)
    const startX = verticalStrokeMinX !== null ? verticalStrokeMinX : x
    const fullEndX = verticalStrokeMaxX !== null ? verticalStrokeMaxX : (x + fontSizeScaled * 0.05)
    
    // 가로선 길이 조정 (약 40% 정도)
    const endX = startX + (fullEndX - startX) * 0.4
    
    // 세로선 위쪽 가로선 경로 추가 (가장 먼저 파기 위해 맨 앞에 추가)
    // 왼쪽에서 오른쪽으로 파지도록 순서대로 배치
    const topHorizontalLine: number[][] = []
    
    // 왼쪽에서 오른쪽으로 순서대로 점 추가
    for (let i = 0; i <= 8; i++) {
      const xPos = startX + (endX - startX) * (i / 8)
      topHorizontalLine.push([xPos, yPos])
    }
    
    // 맨 앞에 추가하여 가장 먼저 파지도록 함
    paths.unshift({ letter: 'r', points: topHorizontalLine })
  }
  
  return paths
}

// 텍스트 경로를 추출하는 함수 - 각 글자별로 추출
function extractTextPaths(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: string,
  textBounds: { x: number; y: number; width: number; height: number },
  woodWidth: number,
  woodHeight: number
): Array<{ letter: string; points: number[][] }> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []

  // 높은 해상도로 설정
  const scale = 4
  canvas.width = woodWidth * scale
  canvas.height = woodHeight * scale
  
  ctx.scale(scale, scale)
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = 'white'
  
  // 각 글자를 개별적으로 그려서 경로 추출 (F, o, r, e, Q 순서)
  const allPaths: Array<{ letter: string; points: number[][] }> = []
  const letters = ['F', 'o', 'r', 'e', ' ', 'Q'] // 공백 포함
  const textX = textBounds.x
  const textY = textBounds.y + fontSize * 0.8
  let currentX = textX
  
  for (const letter of letters) {
    if (letter === ' ') {
      const metrics = ctx.measureText(' ')
      currentX += metrics.width
      continue
    }
    
    // Canvas 초기화
    ctx.clearRect(0, 0, canvas.width / scale, canvas.height / scale)
    ctx.fillStyle = 'white'
    
    // 각 글자만 개별적으로 그림
    ctx.fillText(letter, currentX, textY)
    
    // 이미지 데이터 가져오기
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const width = canvas.width
    const height = canvas.height
    
    const metrics = ctx.measureText(letter)
    const letterWidth = metrics.width
    
    // 각 글자의 경로 추출
    const letterPaths = extractLetterPaths(
      letter,
      currentX,
      textY,
      fontSize,
      fontFamily,
      fontWeight,
      scale,
      width,
      height,
      data
    )
    
    allPaths.push(...letterPaths)
    currentX += letterWidth
  }
  
  return allPaths
}

function LandingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // 초기 상태: skip 파라미터가 있으면 바로 slideUp으로 시작
  const skipParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('skip') : null
  const initialStage = skipParam === 'true' ? 'slideUp' : 'woodSlideIn'
  const [animationStage, setAnimationStage] = useState<'blueText' | 'woodSlideIn' | 'carving' | 'woodFadeOut' | 'reveal' | 'slideUp'>(initialStage)
  const [currentStroke, setCurrentStroke] = useState(0)
  const [strokeProgress, setStrokeProgress] = useState(0)
  const [woodPosition, setWoodPosition] = useState(skipParam === 'true' ? 0 : -100)
  const [woodOpacity, setWoodOpacity] = useState(skipParam === 'true' ? 0 : 1)
  const [carvedStrokes, setCarvedStrokes] = useState<number[]>([])
  const [strokePaths, setStrokePaths] = useState<Array<{ letter: string; points: number[][] }>>([])
  const [textBounds, setTextBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [pathOffset, setPathOffset] = useState({ x: 0, y: 0 })
  const textRef = useRef<HTMLHeadingElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const woodRef = useRef<HTMLDivElement>(null)

  // 쿼리 파라미터로 애니메이션 스킵 확인
  useEffect(() => {
    const skip = searchParams.get('skip')
    if (skip === 'true') {
      // 애니메이션을 스킵하고 마지막 장면으로 이동
      setAnimationStage('slideUp')
      setWoodPosition(0)
      setWoodOpacity(0)
      // 텍스트 경로가 준비되면 모든 stroke 완료로 설정
      if (strokePaths.length > 0) {
        setCurrentStroke(strokePaths.length)
        setCarvedStrokes(Array.from({ length: strokePaths.length }, (_, i) => i))
      }
      // URL에서 쿼리 파라미터 제거
      setTimeout(() => {
        router.replace('/', { scroll: false })
      }, 0)
    }
  }, [searchParams, strokePaths.length, router])

  // skip=true일 때 텍스트 경로가 준비되면 stroke 설정
  useEffect(() => {
    const skip = searchParams.get('skip')
    if (skip === 'true' && strokePaths.length > 0 && animationStage === 'slideUp') {
      setCurrentStroke(strokePaths.length)
      setCarvedStrokes(Array.from({ length: strokePaths.length }, (_, i) => i))
    }
  }, [strokePaths.length, searchParams, animationStage])

  // 텍스트의 실제 위치와 크기 계산
  useEffect(() => {
    if (textRef.current) {
      const rect = textRef.current.getBoundingClientRect()
      const parentRect = textRef.current.parentElement?.getBoundingClientRect()
      if (parentRect) {
        setTextBounds({
          x: rect.left - parentRect.left,
          y: rect.top - parentRect.top,
          width: rect.width,
          height: rect.height
        })
      }
    }
  }, [])

  // 컴포넌트 마운트 시 텍스트 경로 추출
  useEffect(() => {
    const text = 'Fore Q'
    const fontSize = 160 // 10rem = 160px
    const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif'
    const fontWeight = '600'
    
    // 텍스트 위치가 계산될 때까지 대기
    const timer = setTimeout(() => {
      if (textBounds) {
        const woodWidth = 900
        const woodHeight = 300
        
        // 텍스트의 실제 위치를 기준으로 경로 추출 (이미 나무판 좌표계로 변환됨)
        const paths = extractTextPaths(
          text, 
          fontSize, 
          fontFamily, 
          fontWeight,
          textBounds,
          woodWidth,
          woodHeight
        )
        
        if (paths.length > 0) {
          // 경로를 나무판 중앙에 맞추기 위해 오프셋 계산
          const woodCenterX = woodWidth / 2
          const woodCenterY = woodHeight / 2
          const textCenterX = textBounds.x + textBounds.width / 2
          const textCenterY = textBounds.y + textBounds.height / 2
          
          // 중앙으로 이동시키기 위한 오프셋 (아래로 더 내리기)
          const offsetX = woodCenterX - textCenterX
          const offsetY = woodCenterY - textCenterY + 60 // 아래로 더 내리기
          
          // 모든 경로를 중앙으로 이동
          const centeredPaths = paths.map(path => ({
            ...path,
            points: path.points.map(point => [
              point[0] + offsetX,
              point[1] + offsetY
            ])
          }))
          
          setStrokePaths(centeredPaths)
        } else {
          // 폴백: 텍스트 위치에 맞춘 기본 경로 (F, o, r, e, Q 순서) - 중앙 정렬
          const woodCenterX = woodWidth / 2
          const woodCenterY = woodHeight / 2
          const textCenterX = textBounds.x + textBounds.width / 2
          const textCenterY = textBounds.y + textBounds.height / 2
          
          // 텍스트를 중앙에 맞추기 위한 오프셋 (아래로 더 내리기)
          const offsetX = woodCenterX - textCenterX
          const offsetY = woodCenterY - textCenterY + 60 // 아래로 더 내리기
          
          const baseX = textBounds.x + offsetX
          const baseY = textBounds.y + fontSize * 0.2 + offsetY
          
          // 각 글자의 시작 위치 계산
          const fX = baseX
          const oX = baseX + fontSize * 0.6
          const rX = baseX + fontSize * 1.2
          const eX = baseX + fontSize * 1.7
          const qX = baseX + fontSize * 2.5
          
          setStrokePaths([
            // F - 세로선
            { letter: 'F', points: [[fX, baseY], [fX, baseY + fontSize * 0.75]] },
            // F - 상단 가로선
            { letter: 'F', points: [[fX, baseY], [fX + fontSize * 0.5, baseY]] },
            // F - 중간 가로선
            { letter: 'F', points: [[fX, baseY + fontSize * 0.375], [fX + fontSize * 0.4375, baseY + fontSize * 0.375]] },
            
            // o - 원형
            { letter: 'o', points: [
              [oX + fontSize * 0.2, baseY + fontSize * 0.375], 
              [oX + fontSize * 0.35, baseY + fontSize * 0.2], 
              [oX + fontSize * 0.5, baseY + fontSize * 0.375], 
              [oX + fontSize * 0.35, baseY + fontSize * 0.55], 
              [oX + fontSize * 0.2, baseY + fontSize * 0.375]
            ]},
            
            // r - 세로선 위쪽 가로선 (세로선의 맨 위에 있는 가로선 - 가장 먼저 파기)
            { letter: 'r', points: [
              [rX, baseY + fontSize * 0.05], 
              [rX + fontSize * 0.01, baseY + fontSize * 0.05],
              [rX + fontSize * 0.02, baseY + fontSize * 0.05],
              [rX + fontSize * 0.03, baseY + fontSize * 0.05],
              [rX + fontSize * 0.04, baseY + fontSize * 0.05],
              [rX + fontSize * 0.05, baseY + fontSize * 0.05],
              [rX + fontSize * 0.06, baseY + fontSize * 0.05],
              [rX + fontSize * 0.07, baseY + fontSize * 0.05],
              [rX + fontSize * 0.08, baseY + fontSize * 0.05]
            ]},
            // r - 위쪽 가로선 (세로선 위에서 오른쪽으로 긴 가로선)
            { letter: 'r', points: [
              [rX, baseY + fontSize * 0.08], 
              [rX + fontSize * 0.02, baseY + fontSize * 0.08],
              [rX + fontSize * 0.04, baseY + fontSize * 0.08],
              [rX + fontSize * 0.06, baseY + fontSize * 0.08],
              [rX + fontSize * 0.08, baseY + fontSize * 0.08],
              [rX + fontSize * 0.1, baseY + fontSize * 0.08],
              [rX + fontSize * 0.12, baseY + fontSize * 0.08],
              [rX + fontSize * 0.14, baseY + fontSize * 0.08],
              [rX + fontSize * 0.16, baseY + fontSize * 0.08],
              [rX + fontSize * 0.18, baseY + fontSize * 0.08],
              [rX + fontSize * 0.2, baseY + fontSize * 0.08],
              [rX + fontSize * 0.22, baseY + fontSize * 0.08],
              [rX + fontSize * 0.24, baseY + fontSize * 0.08],
              [rX + fontSize * 0.26, baseY + fontSize * 0.08],
              [rX + fontSize * 0.28, baseY + fontSize * 0.08]
            ]},
            // r - 세로선 (맨 위에서 시작)
            { letter: 'r', points: [
              [rX, baseY + fontSize * 0.05], 
              [rX, baseY + fontSize * 0.08],
              [rX, baseY + fontSize * 0.12],
              [rX, baseY + fontSize * 0.16],
              [rX, baseY + fontSize * 0.2],
              [rX, baseY + fontSize * 0.3],
              [rX, baseY + fontSize * 0.4],
              [rX, baseY + fontSize * 0.5],
              [rX, baseY + fontSize * 0.6],
              [rX, baseY + fontSize * 0.7],
              [rX, baseY + fontSize * 0.8]
            ]},
            // r - 아래쪽 곡선 (세로선 중간에서 오른쪽으로 곡선)
            { letter: 'r', points: [
              [rX + fontSize * 0.28, baseY + fontSize * 0.08], 
              [rX + fontSize * 0.29, baseY + fontSize * 0.12],
              [rX + fontSize * 0.3, baseY + fontSize * 0.16],
              [rX + fontSize * 0.31, baseY + fontSize * 0.2],
              [rX + fontSize * 0.32, baseY + fontSize * 0.24],
              [rX + fontSize * 0.33, baseY + fontSize * 0.28]
            ]},
            
            // e - 중간 가로선
            { letter: 'e', points: [[eX + fontSize * 0.1, baseY + fontSize * 0.375], [eX + fontSize * 0.45, baseY + fontSize * 0.375]] },
            // e - 원형 부분
            { letter: 'e', points: [
              [eX + fontSize * 0.45, baseY + fontSize * 0.375], 
              [eX + fontSize * 0.5, baseY + fontSize * 0.2], 
              [eX + fontSize * 0.35, baseY + fontSize * 0.1], 
              [eX + fontSize * 0.15, baseY + fontSize * 0.2], 
              [eX + fontSize * 0.15, baseY + fontSize * 0.55], 
              [eX + fontSize * 0.35, baseY + fontSize * 0.65], 
              [eX + fontSize * 0.45, baseY + fontSize * 0.55]
            ]},
            
            // Q - 외곽 원형
            { letter: 'Q', points: [
              [qX + fontSize * 0.15, baseY + fontSize * 0.2], 
              [qX + fontSize * 0.3, baseY], 
              [qX + fontSize * 0.5, baseY], 
              [qX + fontSize * 0.65, baseY + fontSize * 0.2], 
              [qX + fontSize * 0.65, baseY + fontSize * 0.55], 
              [qX + fontSize * 0.5, baseY + fontSize * 0.75], 
              [qX + fontSize * 0.3, baseY + fontSize * 0.75], 
              [qX + fontSize * 0.15, baseY + fontSize * 0.55], 
              [qX + fontSize * 0.15, baseY + fontSize * 0.2]
            ]},
            // Q - 꼬리
            { letter: 'Q', points: [
              [qX + fontSize * 0.55, baseY + fontSize * 0.6], 
              [qX + fontSize * 0.75, baseY + fontSize * 0.8]
            ]},
          ])
        }
      }
    }, 300)
    
    return () => clearTimeout(timer)
  }, [textBounds])

  useEffect(() => {
    if (animationStage === 'woodSlideIn' && woodRef.current) {
      const element = woodRef.current
      let frameId1: number | null = null
      let frameId2: number | null = null
      let transitionEndHandler: (() => void) | null = null
      
      // 초기 위치 설정 (transition 없이)
      element.style.transition = 'none'
      element.style.transform = 'translateX(-100%)'
      
      // 다음 프레임에서 transition 활성화하고 위치 변경
      frameId1 = requestAnimationFrame(() => {
        frameId2 = requestAnimationFrame(() => {
          if (element && animationStage === 'woodSlideIn') {
            element.style.transition = 'transform 1.2s cubic-bezier(0.33, 1, 0.68, 1)'
            element.style.transform = 'translateX(0%)'
            setWoodPosition(0)
            
            // 애니메이션 완료 후 carving으로 전환
            transitionEndHandler = () => {
              if (animationStage === 'woodSlideIn') {
                setAnimationStage('carving')
              }
              if (element && transitionEndHandler) {
                element.removeEventListener('transitionend', transitionEndHandler)
              }
            }
            
            element.addEventListener('transitionend', transitionEndHandler)
          }
        })
      })
      
      return () => {
        if (frameId1 !== null) cancelAnimationFrame(frameId1)
        if (frameId2 !== null) cancelAnimationFrame(frameId2)
        if (element && transitionEndHandler) {
          element.removeEventListener('transitionend', transitionEndHandler)
        }
      }
    }
    
    if (animationStage === 'carving') {
      // carving 단계에서 woodPosition이 0으로 유지되도록 보장 (조건부로만)
      if (woodRef.current && Math.abs(woodPosition) > 0.1) {
        woodRef.current.style.transform = `translateX(0%)`
        setWoodPosition(0)
      }
      
      if (currentStroke >= strokePaths.length) {
        setTimeout(() => setAnimationStage('woodFadeOut'), 500)
        return
      }

      const duration = 250 // 250ms per stroke for faster carving
      const startTime = Date.now()
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        setStrokeProgress(progress)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setCarvedStrokes((prev: number[]) => [...prev, currentStroke])
          setCurrentStroke((prev: number) => prev + 1)
          setStrokeProgress(0)
        }
      }
      
      requestAnimationFrame(animate)
    }
    
    if (animationStage === 'woodFadeOut') {
      const duration = 500 // 더 빠르게
      const startTime = Date.now()
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        setWoodOpacity(1 - progress)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setAnimationStage('reveal')
        }
      }
      
      requestAnimationFrame(animate)
    }
  }, [animationStage, currentStroke])

  useEffect(() => {
    if (animationStage === 'reveal') {
      // reveal 단계에서 파내는 위치를 텍스트 위치에 정확히 맞추기
      if (textBounds) {
        const woodWidth = 900
        const woodHeight = 300
        const woodCenterX = woodWidth / 2
        const woodCenterY = woodHeight / 2
        const textCenterX = textBounds.x + textBounds.width / 2
        const textCenterY = textBounds.y + textBounds.height / 2
        
        // 나무판 중앙에서 텍스트 위치로 이동
        const offsetX = textCenterX - woodCenterX
        const offsetY = textCenterY - woodCenterY - 60 // 위로 올리기 (아래로 내린 60px 제거)
        
        setPathOffset({ x: offsetX, y: offsetY })
      }
      
      // reveal 단계에서 조금 기다린 후 slideUp으로 전환
      setTimeout(() => setAnimationStage('slideUp'), 800)
    } else {
      setPathOffset({ x: 0, y: 0 })
    }
  }, [animationStage, textBounds])

  const getGrinderPosition = () => {
    if (currentStroke >= strokePaths.length) return { x: 0, y: 0 }
    
    const stroke = strokePaths[currentStroke]
    const points = stroke.points.map(p => [p[0] + pathOffset.x, p[1] + pathOffset.y])
    
    if (points.length < 2) return { x: points[0][0], y: points[0][1] }
    
    // Calculate total path length
    let totalLength = 0
    const segments: number[] = []
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1][0] - points[i][0]
      const dy = points[i + 1][1] - points[i][1]
      const length = Math.sqrt(dx * dx + dy * dy)
      segments.push(length)
      totalLength += length
    }
    
    // Find position along path
    const targetLength = strokeProgress * totalLength
    let accumulatedLength = 0
    
    for (let i = 0; i < segments.length; i++) {
      if (accumulatedLength + segments[i] >= targetLength) {
        const segmentProgress = (targetLength - accumulatedLength) / segments[i]
        const x = points[i][0] + (points[i + 1][0] - points[i][0]) * segmentProgress
        const y = points[i][1] + (points[i + 1][1] - points[i][1]) * segmentProgress
        return { x, y }
      }
      accumulatedLength += segments[i]
    }
    
    return { x: points[points.length - 1][0], y: points[points.length - 1][1] }
  }

  const grinderPos = animationStage === 'carving' ? getGrinderPosition() : { x: 0, y: 0 }

  // 클릭 시 애니메이션 스킵
  const handleSkipAnimation = () => {
    if (animationStage !== 'slideUp') {
      setAnimationStage('slideUp')
      setWoodPosition(0)
      setWoodOpacity(0)
      setCurrentStroke(strokePaths.length) // 모든 stroke 완료로 표시
      setCarvedStrokes(Array.from({ length: strokePaths.length }, (_, i) => i)) // 모든 stroke 파진 것으로 표시
    }
  }

  return (
    <>
      {/* 테마 전환 버튼 - 우측 상단 */}
      <div className="fixed top-8 right-8 z-[10000]">
        <ThemeToggle />
      </div>

      {/* 클릭 안내 문구 - 메인 컨테이너 밖에서 완전히 고정 */}
      {animationStage !== 'slideUp' && (
        <div 
          className="fixed z-[9999] pointer-events-none"
          style={{
            bottom: '6rem',
            left: '50%',
            transform: 'translateX(-50%)',
            willChange: 'transform',
          }}
        >
          <div 
            className="backdrop-blur-sm px-8 py-4 rounded-full border skip-background"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              boxShadow: `
                0 0 10px var(--neon-glow-subtle),
                0 0 20px var(--neon-glow-subtle),
                0 0 30px var(--neon-glow-subtle),
                inset 0 0 10px var(--neon-glow-subtle)
              `,
              animation: 'bounce-slow-vertical 2s ease-in-out infinite',
            }}
          >
            <p className="skip-text text-base flex items-center gap-3">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
              화면 아무곳이나 클릭시 SKIP
            </p>
          </div>
        </div>
      )}

      <div 
        className="relative min-h-screen w-full overflow-hidden cursor-pointer"
        onClick={handleSkipAnimation}
        style={{ cursor: animationStage !== 'slideUp' ? 'pointer' : 'default' }}
      >
        <div 
          className="fixed inset-0 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--cnc-black)',
            backgroundImage: `
              linear-gradient(var(--cnc-grid) 1px, transparent 1px),
              linear-gradient(90deg, var(--cnc-grid) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center">
        <div 
          className="absolute flex flex-col items-center justify-center"
          style={{
            opacity: (animationStage === 'reveal' || animationStage === 'slideUp') ? 1 : 0,
            transition: animationStage === 'reveal' ? 'opacity 0.3s ease-in' : 'none',
            transform: (animationStage === 'woodSlideIn' || animationStage === 'carving' || animationStage === 'woodFadeOut') 
              ? `translateX(${woodPosition}%)` 
              : undefined,
          }}
        >
          <h1 
            ref={textRef}
            className={`font-bold tracking-wider ${animationStage === 'slideUp' ? 'animate-slideUp' : ''} ${animationStage === 'slideUp' ? 'animate-floatText' : ''}`}
            style={{
              fontSize: '10rem',
              color: 'var(--cnc-cobalt)',
              textShadow: `
                0 0 20px var(--neon-glow),
                0 0 40px var(--neon-glow),
                0 0 60px var(--neon-glow-strong)
              `,
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
              fontWeight: 600,
              transition: 'color 0.2s ease, text-shadow 0.2s ease',
            }}
          >
            F<span style={{ textTransform: 'lowercase' }}>ore</span> Q
          </h1>
          
          {animationStage === 'reveal' && (
            <div 
              className="absolute inset-0 animate-shine pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
              }}
            />
          )}
        </div>

        {(animationStage === 'woodSlideIn' || animationStage === 'carving' || animationStage === 'woodFadeOut') && (
          <div 
            ref={woodRef}
            className="absolute flex items-center justify-center"
            style={{
              transform: animationStage === 'woodSlideIn' ? undefined : `translateX(${woodPosition}%)`,
              opacity: woodOpacity,
              willChange: 'transform', // 성능 최적화
            }}
          >
            <div 
              className="relative rounded-lg"
              style={{
                width: '900px',
                height: '300px',
                background: `
                  linear-gradient(135deg, 
                    oklch(0.75 0.02 270) 0%, 
                    oklch(0.80 0.02 270) 25%,
                    oklch(0.78 0.02 270) 50%,
                    oklch(0.82 0.02 270) 75%,
                    oklch(0.76 0.02 270) 100%
                  )
                `,
                boxShadow: `
                  0 25px 80px rgba(0, 0, 0, 0.6),
                  inset 0 2px 0 rgba(255, 255, 255, 0.1),
                  inset 0 -2px 4px rgba(0, 0, 0, 0.3)
                `,
              }}
            >
              <svg 
                width="900" 
                height="300" 
                style={{ position: 'absolute', top: 0, left: 0 }}
                viewBox="0 0 900 300"
              >
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Completed strokes */}
                {carvedStrokes.map((strokeIndex: number) => {
                  const stroke = strokePaths[strokeIndex]
                  const pathData = `M ${stroke.points.map(p => `${p[0] + pathOffset.x},${p[1] + pathOffset.y}`).join(' L ')}`
                  return (
                    <path
                      key={strokeIndex}
                      d={pathData}
                      stroke="black"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  )
                })}
                
                {/* Current stroke being carved */}
                {animationStage === 'carving' && currentStroke < strokePaths.length && (
                  <path
                    d={`M ${strokePaths[currentStroke].points.map(p => `${p[0] + pathOffset.x},${p[1] + pathOffset.y}`).join(' L ')}`}
                    stroke="black"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray="1000"
                    strokeDashoffset={1000 * (1 - strokeProgress)}
                  />
                )}
              </svg>

              {animationStage === 'carving' && currentStroke < strokePaths.length && (
                <div 
                  className="absolute" 
                  style={{ 
                    left: `${grinderPos.x}px`,
                    top: `${grinderPos.y}px`,
                    pointerEvents: 'none',
                    filter: 'brightness(2) contrast(1.5)',
                  }}
                >
                  <div 
                    className="w-20 h-20 rounded-full absolute" 
                    style={{
                      left: '-40px',
                      top: '-40px',
                      background: 'radial-gradient(circle, #FFFFFF 0%, oklch(1 0.5 60) 20%, oklch(0.95 0.4 50) 50%, transparent 100%)',
                      boxShadow: `
                        0 0 80px 30px oklch(1 0.5 55),
                        0 0 120px 40px oklch(0.95 0.4 50)
                      `,
                      animation: 'grindPulse 0.2s ease-in-out infinite',
                    }}
                  />
                  
                  {[...Array(50)].map((_, i) => {
                    const angle = (i / 50) * Math.PI * 2
                    const distance = 25 + Math.random() * 80
                    const size = 2 + Math.random() * 6
                    const hue = 35 + Math.random() * 25
                    const delay = Math.random() * 0.3
                    
                    return (
                      <div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                          width: `${size}px`,
                          height: `${size}px`,
                          left: `${Math.cos(angle) * distance}px`,
                          top: `${Math.sin(angle) * distance}px`,
                          background: `radial-gradient(circle, oklch(1 0.5 ${hue}) 0%, oklch(0.9 0.4 ${hue}) 60%, transparent 100%)`,
                          boxShadow: `
                            0 0 ${size * 4}px oklch(1 0.5 ${hue}),
                            0 0 ${size * 8}px oklch(0.9 0.45 ${hue})
                          `,
                          opacity: 0.9,
                          animation: `sparkFly ${0.4 + Math.random() * 0.6}s ease-out infinite`,
                          animationDelay: `${delay}s`,
                        }}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {animationStage === 'slideUp' && (
          <div 
            className="flex flex-col items-center gap-6 animate-fadeInButtons" 
            style={{ marginTop: '280px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="lg"
              variant="ghost"
              className="px-16 py-8 text-2xl font-semibold transition-all duration-300 hover:scale-110 login-button hover:bg-transparent"
              style={{
                background: 'transparent',
                backgroundColor: 'transparent',
                color: 'var(--cnc-silver)',
                border: `1px solid var(--border)`,
                backdropFilter: 'blur(10px)',
              }}
              onClick={() => router.push('/login')}
            >
              로그인
            </Button>

            <button
              className="text-2xl font-medium transition-all duration-300 hover:scale-110 signup-button"
              style={{
                color: 'var(--cnc-silver)',
              }}
              onClick={() => router.push('/signup')}
            >
              회원가입
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes floatText {
          0%, 100% {
            transform: translateY(-100px);
          }
          50% {
            transform: translateY(-108px);
          }
        }

        .animate-floatText {
          animation: floatText 4s ease-in-out infinite;
          animation-delay: 1s;
        }

        @keyframes shine {
          0% {
            background-position: -200% 0;
          }
          20% {
            background-position: 200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @keyframes fadeInButtons {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeInButtons {
          animation: fadeInButtons 1s ease-out forwards;
          animation-delay: 0s;
        }

        @keyframes slideUp {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-100px);
          }
        }

        .animate-slideUp {
          animation: slideUp 1s ease-out forwards;
        }

        @keyframes sparkFly {
          0% { 
            opacity: 1; 
            transform: translate(0, 0) scale(1.2);
            filter: brightness(2);
          }
          40% {
            opacity: 0.9;
            filter: brightness(1.5);
          }
          100% { 
            opacity: 0; 
            transform: translate(
              calc(cos(var(--angle, 0)) * 80px),
              calc(sin(var(--angle, 0)) * 80px + 20px)
            ) scale(0.2);
            filter: brightness(0.3);
          }
        }

        @keyframes grindPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.85;
          }
        }

        .animate-float {
          animation: float 2.5s ease-in-out infinite;
        }

        .animate-shine {
          animation: shine 3s ease-in-out 0.5s;
        }

        .animate-fadeInButtons {
          animation: fadeInButtons 1s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 1s ease-out forwards;
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes bounce-slow-vertical {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

      `}</style>
      </div>
    </>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }} />}>
      <LandingPageContent />
    </Suspense>
  )
}

