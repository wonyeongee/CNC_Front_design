"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, GripVertical, X, Users, AlertTriangle, Edit2, Trash2, Phone, ToggleLeft, ToggleRight, LayoutGrid, List, User, LogOut, Bot, Send, PackageX, Folder, FolderOpen, ChevronDown, ChevronRight, ChevronUp, Calendar as CalendarIcon, CheckCircle, Check, RotateCcw, Trash, ArrowRight } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { AlertCircle, FileText, TrendingDown, TrendingUp } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

// date-fns format 함수 (간단한 버전)
const formatDate = (date: Date, formatStr: string): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  if (formatStr === 'yyyy-MM-dd') {
    return `${year}-${month}-${day}`
  }
  return `${year}-${month}-${day}`
}

type CNCMachine = {
  id: string
  name: string
  productNumber?: string // 선택적 (기존 데이터 호환성)
  speed?: number // 선택적 (기존 데이터 호환성)
}

type Product = {
  id: string | number
  position: number // 0-100% (레일 상의 위치)
  stage: "moving" | "machining" | "processed" | "completed" // 제품 상태
  isDefect: boolean // 불량 여부
  shape: "square" | "circle" | "triangle" // 제품 형태
  color: string // 제품 색상
  status: "raw" | "ok" | "fail" // 가공 상태
  machiningProgress: number // 가공 진행률
  payload?: any
}

type ProductionRail = {
  id: string
  cncId: string
  products: Product[]
  hasAlert: boolean
  isStopped: boolean
  lastTimestamp?: number
  sensorHistory?: any[]
  latestPayload?: any
  pendingDefects?: number
}

type Employee = {
  id: string
  name: string
  phone: string
  email: string
  isWorking: boolean
  assignedCNC?: string
}

export function CNCDashboard() {
  const [machines, setMachines] = useState<CNCMachine[]>(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: `cnc-${i + 1}`,
      name: `CNC-${String(i + 1).padStart(3, "0")}`,
      productNumber: `P-${String(i + 1).padStart(3, "0")}`,
      speed: Math.floor(Math.random() * 20) + 80,
    })),
  )
  const [selectedMachines, setSelectedMachines] = useState<string[]>([])
  const [isFolderOpen, setIsFolderOpen] = useState(true)
  const [draggedMachine, setDraggedMachine] = useState<string | null>(null)
  const [productionRails, setProductionRails] = useState<ProductionRail[]>([])

  const [draggedRailIndex, setDraggedRailIndex] = useState<number | null>(null)
  const [dragOverRailIndex, setDragOverRailIndex] = useState<number | null>(null)
  const [isMoving, setIsMoving] = useState(true)

  const [showEmployeePanel, setShowEmployeePanel] = useState(false)
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid")

  const router = useRouter()
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [currentUser, setCurrentUser] = useState({
    name: "로딩 중...",
    email: ""
  })

  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: "1",
      name: "김철수",
      phone: "010-1234-5678",
      email: "kim@company.com",
      isWorking: true,
      assignedCNC: "CNC-001",
    },
    {
      id: "2",
      name: "이영희",
      phone: "010-2345-6789",
      email: "lee@company.com",
      isWorking: true,
      assignedCNC: "CNC-002",
    },
    { id: "3", name: "박민수", phone: "010-3456-7890", email: "park@company.com", isWorking: false },
  ])
  const [isAddingEmployee, setIsAddingEmployee] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null)
  const [employeeForm, setEmployeeForm] = useState({ name: "", phone: "", email: "" })

  const [draggedEmployee, setDraggedEmployee] = useState<string | null>(null)

  const [emergencyCallRailId, setEmergencyCallRailId] = useState<string | null>(null)

  const [focusedRailId, setFocusedRailId] = useState<string | null>(null)

  // 🔴 불량품 조회 관련 state
  const [showDefectPanel, setShowDefectPanel] = useState(false)
  const [selectedDefectProduct, setSelectedDefectProduct] = useState<any>(null)
  const [defectHistory, setDefectHistory] = useState<any[]>([])
  const [expandedCNCDefects, setExpandedCNCDefects] = useState<string | null>(null)
  const [showDefectDetail, setShowDefectDetail] = useState(false)
  const [selectedDefect, setSelectedDefect] = useState<any>(null)
  const [defectAnalysis, setDefectAnalysis] = useState<any>(null)
  const [expandedDefects, setExpandedDefects] = useState<Record<string, boolean>>({})
  const [expandedDefectCnc, setExpandedDefectCnc] = useState<Record<string, boolean>>({})

  // 추가본 📌 평균/표준편차 기반 불량 탐지용 통계
  const SENSOR_STATS: Record<string, { mean: number; std: number }> = {
    X_OutputCurrent: { mean: 326.895875, std: 2.25 },
    M_CURRENT_FEEDRATE: { mean: 18.425237, std: 11.75 },
    Y_OutputCurrent: { mean: 325.936658, std: 3.0 },
    S_ActualVelocity: { mean: 42.731494, std: 13.87575 },
    S_OutputCurrent: { mean: 322.996474, std: 6.25 },
    S_SetVelocity: { mean: 42.382763, std: 13.825 },
    S_SetPosition: { mean: -105.221758, std: 1072.5 },
    S_ActualPosition: { mean: -105.538962, std: 1072.738 },
    Z_ActualPosition: { mean: 52.99695, std: 23.375 },
    Z_SetPosition: { mean: 52.994572, std: 23.375 },
  }

  // 📌 평균/표준편차 기반 이상값 판단 함수 (z-score > 3 또는 < -3이면 이상)
  const isAbnormal = useCallback((sensorName: string, value: number): boolean => {
    const stats = SENSOR_STATS[sensorName]
    if (!stats) return false // 통계가 없으면 정상으로 판단
    
    const zScore = Math.abs((value - stats.mean) / stats.std)
    return zScore > 3 // z-score가 3 표준편차를 벗어나면 이상
  }, [])


  // 날짜 필터 관련 state
  const [dateSearchMode, setDateSearchMode] = useState<"single" | "range" | null>(null)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [startDateInput, setStartDateInput] = useState<string>("")
  const [endDateInput, setEndDateInput] = useState<string>("")

  // 확인된 물품 관련 state
  const [confirmedDefects, setConfirmedDefects] = useState<any[]>([])
  const [expandedConfirmedCnc, setExpandedConfirmedCnc] = useState<Record<string, boolean>>({})
  const [showConfirmedPanel, setShowConfirmedPanel] = useState(false)
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<number>>(new Set())
  const [selectedFoldersForDeletion, setSelectedFoldersForDeletion] = useState<Set<string>>(new Set())

  // 확인 처리 관련 state
  const [selectedForConfirmation, setSelectedForConfirmation] = useState<Set<number>>(new Set())
  const [folderMoveDialog, setFolderMoveDialog] = useState<{ cncId: string; cncName: string } | null>(null)

  // 🔵 챗봇 UI용 state
  const [showChatbot, setShowChatbot] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  type UiMessage = {
    type: "user" | "bot"
    text: string
  }

  // 초기값을 null로 설정하고 복원 후에 설정
  const [chatMessages, setChatMessages] = useState<UiMessage[] | null>(null)

  const [chatInput, setChatInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const chatInputRef = useRef<HTMLInputElement | null>(null)
  const idCounterRef = useRef<number>(0) // 고유 ID 생성을 위한 카운터

  // 🔄 localStorage에서 상태 복원
  useEffect(() => {
    try {
      // CNC 기계 목록 복원
      const savedMachines = localStorage.getItem('cnc-dashboard-machines')
      if (savedMachines) {
        const parsed = JSON.parse(savedMachines)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMachines(parsed)
        }
      }

      // 생산 라인 먼저 복원 (선택된 기계 복원 전에)
      const savedProductionRails = localStorage.getItem('cnc-dashboard-productionRails')
      if (savedProductionRails) {
        const parsed = JSON.parse(savedProductionRails)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProductionRails(parsed)
        }
      }

      // 선택된 기계 복원
      const savedSelected = localStorage.getItem('cnc-dashboard-selectedMachines')
      if (savedSelected) {
        const parsed = JSON.parse(savedSelected)
        if (Array.isArray(parsed)) {
          setSelectedMachines(parsed)
        }
      }

      // 작업자 목록 복원
      const savedEmployees = localStorage.getItem('cnc-dashboard-employees')
      if (savedEmployees) {
        const parsed = JSON.parse(savedEmployees)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEmployees(parsed)
        }
      }

      // 레이아웃 모드 복원
      const savedLayoutMode = localStorage.getItem('cnc-dashboard-layoutMode')
      if (savedLayoutMode === 'grid' || savedLayoutMode === 'list') {
        setLayoutMode(savedLayoutMode)
      }

      // UI 상태 복원
      const savedShowEmployeePanel = localStorage.getItem('cnc-dashboard-showEmployeePanel')
      if (savedShowEmployeePanel === 'true') {
        setShowEmployeePanel(true)
      }

      const savedShowChatbot = localStorage.getItem('cnc-dashboard-showChatbot')
      if (savedShowChatbot === 'true') {
        setShowChatbot(true)
      }

      // 🔴 불량품 조회 관련 복원
      const savedShowDefectPanel = localStorage.getItem('cnc-dashboard-showDefectPanel')
      if (savedShowDefectPanel === 'true') {
        setShowDefectPanel(true)
      }

      // 최근 불량품 확장/축소 state 복원
      const savedExpandedDefects = localStorage.getItem("cnc-dashboard-expandedDefects")
      if (savedExpandedDefects) {
        try {
          const parsed = JSON.parse(savedExpandedDefects)
          setExpandedDefects(parsed)
        } catch (err) {
          console.error("최근 불량품 확장/축소 state 복원 실패:", err)
        }
      }

      const savedDefectHistory = localStorage.getItem('cnc-dashboard-defectHistory')
      if (savedDefectHistory) {
        try {
          const parsed = JSON.parse(savedDefectHistory)
          if (Array.isArray(parsed) && parsed.length > 0) {
            // timestamp를 Date 객체로 변환
            const restored = parsed.map(defect => ({
              ...defect,
              timestamp: new Date(defect.timestamp)
            }))
            setDefectHistory(restored)
          }
        } catch (err) {
          console.error('불량품 기록 복원 실패:', err)
        }
      }

      // 🔵 챗봇 대화 내용 복원
      const savedChatMessages = localStorage.getItem('cnc-dashboard-chatMessages')
      if (savedChatMessages) {
        try {
          const parsed = JSON.parse(savedChatMessages)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChatMessages(parsed)
          } else {
            // 저장된 내용이 없으면 기본 메시지 설정
            setChatMessages([
              { type: "bot", text: "안녕하세요! CNC 모니터링 챗봇입니다. 무엇을 도와드릴까요?" },
            ])
          }
        } catch (err) {
          console.error('챗봇 대화 내용 복원 실패:', err)
          // 복원 실패 시 기본 메시지 설정
          setChatMessages([
            { type: "bot", text: "안녕하세요! CNC 모니터링 챗봇입니다. 무엇을 도와드릴까요?" },
          ])
        }
      } else {
        // 저장된 내용이 없으면 기본 메시지 설정
        setChatMessages([
          { type: "bot", text: "안녕하세요! CNC 모니터링 챗봇입니다. 무엇을 도와드릴까요?" },
        ])
      }
    } catch (error) {
      console.error('상태 복원 실패:', error)
    }
  }, [])

  // productionRails 복원 여부 추적 (초기 로드 시 한 번만 확인)
  const [hasRestoredRails, setHasRestoredRails] = useState(false)
  
  // 초기 로드 시 productionRails 복원 여부 확인
  useEffect(() => {
    const savedProductionRails = localStorage.getItem('cnc-dashboard-productionRails')
    if (savedProductionRails) {
      try {
        const parsed = JSON.parse(savedProductionRails)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHasRestoredRails(true)
        }
      } catch (error) {
        console.error('productionRails 복원 확인 실패:', error)
      }
    }
  }, []) // 컴포넌트 마운트 시 한 번만 실행
  
  // 선택된 기계가 복원되면 해당 기계의 데이터 다시 가져오기 (productionRails가 복원되지 않은 경우만)
  useEffect(() => {
    // productionRails가 이미 복원되었으면 데이터를 다시 가져올 필요 없음
    if (hasRestoredRails) return
    
    // productionRails가 복원되지 않았고, 선택된 기계가 있으면 데이터를 다시 가져오기
    if (machines.length > 0 && selectedMachines.length > 0 && productionRails.length === 0) {
      // 복원된 기계들의 데이터를 다시 가져오기
      selectedMachines.forEach((machineId: string) => {
        const machine = machines.find(m => m.id === machineId)
        if (machine && !productionRails.some(r => r.cncId === machineId)) {
          handleSelectMachine(machineId).catch(err => {
            console.error('기계 데이터 복원 실패:', err)
          })
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machines, selectedMachines, hasRestoredRails]) // machines, selectedMachines가 복원된 후 실행

  // 🔄 상태 변경 시 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem('cnc-dashboard-machines', JSON.stringify(machines))
    } catch (error) {
      console.error('기계 목록 저장 실패:', error)
    }
  }, [machines])

  useEffect(() => {
    try {
      localStorage.setItem('cnc-dashboard-selectedMachines', JSON.stringify(selectedMachines))
    } catch (error) {
      console.error('선택된 기계 저장 실패:', error)
    }
  }, [selectedMachines])

  useEffect(() => {
    try {
      localStorage.setItem('cnc-dashboard-productionRails', JSON.stringify(productionRails))
    } catch (error) {
      console.error('생산 라인 저장 실패:', error)
    }
  }, [productionRails])

  useEffect(() => {
    try {
      localStorage.setItem('cnc-dashboard-employees', JSON.stringify(employees))
    } catch (error) {
      console.error('작업자 목록 저장 실패:', error)
    }
  }, [employees])

  useEffect(() => {
    try {
      localStorage.setItem('cnc-dashboard-layoutMode', layoutMode)
    } catch (error) {
      console.error('레이아웃 모드 저장 실패:', error)
    }
  }, [layoutMode])

  useEffect(() => {
    try {
      localStorage.setItem('cnc-dashboard-showEmployeePanel', String(showEmployeePanel))
    } catch (error) {
      console.error('작업자 패널 상태 저장 실패:', error)
    }
  }, [showEmployeePanel])

  useEffect(() => {
    try {
      localStorage.setItem('cnc-dashboard-showChatbot', String(showChatbot))
    } catch (error) {
      console.error('챗봇 상태 저장 실패:', error)
    }
  }, [showChatbot])

  // 🔴 불량품 조회 관련 저장
  useEffect(() => {
    try {
      localStorage.setItem('cnc-dashboard-showDefectPanel', String(showDefectPanel))
    } catch (error) {
      console.error('불량품 패널 상태 저장 실패:', error)
    }
  }, [showDefectPanel])

  useEffect(() => {
    try {
      localStorage.setItem('cnc-dashboard-defectHistory', JSON.stringify(defectHistory))
    } catch (error) {
      console.error('불량품 기록 저장 실패:', error)
    }
  }, [defectHistory])

  // 최근 불량품 확장/축소 state 저장
  useEffect(() => {
    try {
      localStorage.setItem("cnc-dashboard-expandedDefects", JSON.stringify(expandedDefects))
    } catch (error) {
      console.error("최근 불량품 확장/축소 state 저장 실패:", error)
    }
  }, [expandedDefects])

  // 🔵 챗봇 대화 내용 저장 (null이 아닐 때만 저장)
  useEffect(() => {
    if (chatMessages === null) return // 복원 전에는 저장하지 않음
    
    try {
      localStorage.setItem('cnc-dashboard-chatMessages', JSON.stringify(chatMessages))
    } catch (error) {
      console.error('챗봇 대화 내용 저장 실패:', error)
    }
  }, [chatMessages])

  // 사용자 정보 가져오기
  useEffect(() => {
    // 🔓 임시로 로그인 체크 비활성화
    setCurrentUser({ name: "테스트 사용자", email: "test@example.com" })
    
    // const fetchUser = async () => {
    //   try {
    //     const response = await fetch("/api/user")
    //     const data = await response.json()
    //     if (data.success && data.user) {
    //       setCurrentUser(data.user)
    //     } else {
    //       // 인증 실패 시 로그인 페이지로
    //       router.push("/login")
    //     }
    //   } catch (error) {
    //     console.error("사용자 정보 가져오기 실패:", error)
    //     router.push("/login")
    //   }
    // }
    // fetchUser()
  }, [router])

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
      })
      const data = await response.json()
      if (data.success) {
        router.push("/")
      }
    } catch (error) {
      console.error("로그아웃 실패:", error)
      // 에러가 나도 랜딩페이지로 이동
      router.push("/")
    }
  }

  // 기존 handleSendMessage는 handleChatSend로 대체됨

  // Remove CNC machine
  const handleRemoveMachine = (id: string) => {
    setMachines(machines.filter((m) => m.id !== id))
    setSelectedMachines(selectedMachines.filter((sid) => sid !== id))
    setProductionRails(productionRails.filter((r) => r.cncId !== id))
  }

  const handleSelectMachine = async (id: string) => {
    // 이미 선택된 CNC면 아무것도 하지 않음 (레일은 X 버튼으로만 제거)
    if (selectedMachines.includes(id)) {
      return
    }
  
    // 🔹 id는 "machine.id" 이고, 백엔드 cnc_id는 "CNC-001" 같은 name이야.
    const machine = machines.find((m) => m.id === id)
    if (!machine) return
  
    // 🔥 백엔드에서 이 CNC의 레일 히스토리 가져오기
    let sensorHistory: any[] = []
    try {
      const res = await fetch(`http://localhost:5000/cnc/${machine.name}/rail`)
      const json = await res.json()
      if (json.status === "ok" && Array.isArray(json.items)) {
        sensorHistory = json.items
      }
    } catch (err) {
      console.error("rail fetch error", err)
    }
  
    // 선택 목록 업데이트
    setProductionRails((prev) => {
      const exists = prev.some((r) => r.cncId === id)
      if (exists) return prev

      return [
        ...prev,
        {
          id: `rail-${Date.now()}-${++idCounterRef.current}`,
          cncId: id,
          products: generateInitialProducts(sensorHistory),
          hasAlert: false,
          isStopped: false,
          sensorHistory,
          pendingDefects: 0,
        },
      ]
    })

    setSelectedMachines((prev) => {
      if (prev.includes(id)) return prev
      return [...prev, id]
    })
  }

  // 대시보드에서 CNC 제거
  const handleRemoveFromDashboard = (id: string) => {
    // selectedMachines에서 제거
    setSelectedMachines((prev) => prev.filter((machineId) => machineId !== id))
    
    // 해당 CNC의 레일도 제거
    setProductionRails((prev) => prev.filter((rail) => rail.cncId !== id))
  }

  // Generate initial products for a rail
  const generateInitialProducts = (sensorHistory?: any[]): Product[] => {
    return Array.from({ length: 5 }, (_, i) => {
      const payload = sensorHistory && sensorHistory[i] ? sensorHistory[i] : null

      let status: "raw" | "ok" | "fail" = "raw"
      const labelFromHistory = payload?.m1_label

      return {
        id: `${Date.now()}-${i}-${++idCounterRef.current}`,
        position: i * 20,
        stage: "moving" as const,
        isDefect: false,
        shape: "square" as const,
        color: "white",
        status,
        machiningProgress: 0,
        payload,
      }
    })
  }

  // Drag handlers
  const handleDragStart = (machineId: string) => {
    setDraggedMachine(machineId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDropToSplit = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedMachine && !selectedMachines.includes(draggedMachine)) {
      handleSelectMachine(draggedMachine)
    }
    setDraggedMachine(null)
  }

  const handleAddEmployee = () => {
    if (employeeForm.name.trim()) {
      const newEmployee: Employee = {
        id: `employee-${Date.now()}-${++idCounterRef.current}`,
        name: employeeForm.name,
        phone: employeeForm.phone,
        email: employeeForm.email,
        isWorking: false,
      }
      setEmployees([...employees, newEmployee])
      setEmployeeForm({ name: "", phone: "", email: "" })
      setIsAddingEmployee(false)
    }
  }

  const handleUpdateEmployee = () => {
    if (editingEmployee && employeeForm.name.trim()) {
      setEmployees(
        employees.map((emp) =>
          emp.id === editingEmployee
            ? { ...emp, name: employeeForm.name, phone: employeeForm.phone, email: employeeForm.email }
            : emp,
        ),
      )
      setEmployeeForm({ name: "", phone: "", email: "" })
      setEditingEmployee(null)
    }
  }

  const handleDeleteEmployee = (id: string) => {
    setEmployees(employees.filter((emp) => emp.id !== id))
  }

  const startEditingEmployee = (employee: Employee) => {
    setEditingEmployee(employee.id)
    setEmployeeForm({ name: employee.name, phone: employee.phone, email: employee.email })
    setIsAddingEmployee(false)
  }

  const toggleEmployeeWorkStatus = (employeeId: string) => {
    setEmployees(
      employees.map((emp) =>
        emp.id === employeeId
          ? { ...emp, isWorking: !emp.isWorking, assignedCNC: emp.isWorking ? undefined : emp.assignedCNC }
          : emp,
      ),
    )
  }

  const handleEmployeeDragStart = (employeeId: string) => {
    setDraggedEmployee(employeeId)
  }

  const handleDropEmployeeToCNC = (cncName: string, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (draggedEmployee) {
      setEmployees(
        employees.map((emp) => {
          // 드래그한 작업자를 해당 CNC에 배치하고 작업중으로 변경
          if (emp.id === draggedEmployee) {
            return { ...emp, isWorking: true, assignedCNC: cncName }
          }
          // 기존에 해당 CNC에 배치되어 있던 작업자는 빠지고 비작업중으로 변경
          if (emp.assignedCNC === cncName) {
            return { ...emp, isWorking: false, assignedCNC: undefined }
          }
          return emp
        }),
      )
      setDraggedEmployee(null)
    }
  }

  const sortedEmployees = [...employees].sort((a, b) => {
    if (a.isWorking && !b.isWorking) return -1
    if (!a.isWorking && b.isWorking) return 1
    return 0
  })

  const getAssignedEmployee = (cncName: string) => {
    return employees.find((emp) => emp.isWorking && emp.assignedCNC === cncName)
  }

  const handleEmergencyCall = (railId: string) => {
    setEmergencyCallRailId(railId)
  }

  const closeEmergencyCall = () => {
    setEmergencyCallRailId(null)
  }

  // 🔴 불량품 기록 함수
  const recordDefect = (cncId: string, product: any) => {
    const machine = machines.find(m => m.id === cncId)
    
    // TOP10 센서 목록
    const TOP10_SENSORS = [
      "X_OutputCurrent",
      "M_CURRENT_FEEDRATE",
      "Y_OutputCurrent",
      "S_OutputCurrent",
      "S_SetVelocity",
      "S_ActualVelocity",
      "S_SetPosition",
      "Z_ActualPosition",
      "S_ActualPosition",
      "Z_SetPosition"
    ]
    
    // payload에서 TOP10 센서 값 추출 (있으면 사용, 없으면 정상/비정상 평균값 기반으로 생성)
    let featuresData: Record<string, number> = {}
    const payload = product.payload || {}
    
    // 정상/비정상 평균값 (사용자 제공 데이터 기반)
    const normalMeans: Record<string, number> = {
      "X_OutputCurrent": 326.895875,
      "M_CURRENT_FEEDRATE": 18.425237,
      "Y_OutputCurrent": 325.936658,
      "S_ActualVelocity": 42.731494,
      "S_OutputCurrent": 322.996474,
      "S_SetVelocity": 42.382763,
      "S_SetPosition": -105.221758,
      "S_ActualPosition": -105.538962,
      "Z_ActualPosition": 52.996950,
      "Z_SetPosition": 52.994572
    }
    
    const abnormalMeans: Record<string, number> = {
      "X_OutputCurrent": 327.0,
      "M_CURRENT_FEEDRATE": 6.0,
      "Y_OutputCurrent": 326.0,
      "S_ActualVelocity": 56.4,
      "S_OutputCurrent": 323.0,
      "S_SetVelocity": 56.3,
      "S_SetPosition": -119.0,
      "S_ActualPosition": -120.0,
      "Z_ActualPosition": 34.1,
      "Z_SetPosition": 34.1
    }
    
    // payload에서 직접 추출하거나, 없으면 비정상 평균값 사용 (불량품이므로)
    TOP10_SENSORS.forEach(sensor => {
      if (payload[sensor] !== undefined && payload[sensor] !== null) {
        featuresData[sensor] = payload[sensor]
      } else {
        // 비정상 평균값에 약간의 랜덤 변동 추가
        const mean = abnormalMeans[sensor] || 0
        const std = sensor.includes("Position") ? 2.0 : sensor.includes("Velocity") || sensor.includes("FEEDRATE") ? 1.0 : 0.5
        featuresData[sensor] = mean + (Math.random() - 0.5) * std * 2
      }
    })
    
    const defectRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${++idCounterRef.current}`,
      cncId,
      cncName: machine?.name || '',
      productId: product.id,
      timestamp: new Date(),
      features: featuresData, // TOP10 센서 값만 저장
      payload: product.payload // 원본 payload도 보관
    }
    setDefectHistory(prev => [defectRecord, ...prev])
  }

  useEffect(() => {
    if (selectedMachines.length === 0) return

    const interval = setInterval(() => {
      setProductionRails((prevRails) =>
        prevRails.map((rail) => {
          // 레일이 멈춰있으면 제품 이동하지 않음
          if (rail.isStopped) return rail;

          let railShouldStop = false
          let productToMachine: Product | null = null

          let updatedPending = rail.pendingDefects ?? 0
          let hasNewAlert = false
          
          const updatedProducts = rail.products
            .map((p) => {
              // 60% 위치에서 가공 체크
              if (p.position >= 60 && p.position < 62 && p.stage === "moving") {
                railShouldStop = true
                productToMachine = p
                return { ...p, stage: "machining" as const, machiningProgress: 0 }
              }

              // 가공 중
              if (p.stage === "machining") {
                railShouldStop = true
                const newProgress = p.machiningProgress + 10
                if (newProgress >= 100) {
                  // 가공 완료 - 불량 판정
                  let isDefect = false
                  
                  // Kafka에서 pendingDefects가 있으면 불량품으로 판정
                  if (updatedPending > 0) {
                    isDefect = true
                    updatedPending = updatedPending - 1
                  hasNewAlert = true
                  } else {
                    // 가라데이터 모드: 15개 중 1개 확률로 불량품 생성
                    // 실제 센서 값이 정상 범위를 벗어났을 때만 불량품으로 기록
                    const shouldCheck = Math.random() < (1 / 15)
                    
                    if (shouldCheck) {
                      // 실제 센서 값을 확인하여 정상 범위를 벗어났는지 체크
                      const payload = p.payload || {}
                      const TOP10_SENSORS = [
                        "X_OutputCurrent", "M_CURRENT_FEEDRATE", "Y_OutputCurrent",
                        "S_OutputCurrent", "S_SetVelocity", "S_ActualVelocity",
                        "S_SetPosition", "Z_ActualPosition", "S_ActualPosition", "Z_SetPosition"
                      ]
                      
                      // 정상 범위 정의
                      const normalRanges: Record<string, [number, number]> = {
                        "X_OutputCurrent": [322.0, 331.0],
                        "M_CURRENT_FEEDRATE": [3.0, 50.0],
                        "Y_OutputCurrent": [321.0, 333.0],
                        "S_ActualVelocity": [2.997, 58.5],
                        "S_OutputCurrent": [307.0, 332.0],
                        "S_SetVelocity": [3.0, 58.3],
                        "S_SetPosition": [-2135.0, 2155.0],
                        "S_ActualPosition": [-2135.953, 2155.0],
                        "Z_ActualPosition": [30.5, 124.0],
                        "Z_SetPosition": [30.5, 124.0]
                      }
                      
                      // payload의 센서 값이 정상 범위를 벗어났는지 확인
                      let hasAbnormalValue = false
                      
                      if (payload && Object.keys(payload).length > 0) {
                        // payload에 센서 값이 있는지 확인
                        for (const sensor of TOP10_SENSORS) {
                          const value = payload[sensor]
                          const range = normalRanges[sensor]
                          
                          if (value !== undefined && value !== null && range) {
                            if (value < range[0] || value > range[1]) {
                              hasAbnormalValue = true
                              break
                            }
                          }
                        }
                      }
                      
                      // 정상 범위를 벗어난 값이 있을 때만 불량품으로 기록
                      if (hasAbnormalValue) {
                        isDefect = true
              hasNewAlert = true
                        recordDefect(rail.cncId, {
                          id: p.id,
                          position: p.position,
                          status: "fail" as const,
                          payload: p.payload,
                        })
                      }
                      // 정상 범위 내 값만 있으면 불량품으로 기록하지 않음 (isDefect는 false로 유지)
                    }
                  }
                  
                  return {
                    ...p,
                    stage: "processed" as const,
                    isDefect,
                    status: isDefect ? ("fail" as const) : ("ok" as const),
                    shape: isDefect ? ("triangle" as const) : ("circle" as const),
                    color: isDefect ? "red" : "green",
                  }
                }
                return { ...p, machiningProgress: newProgress }
              }

              // 레일이 멈추지 않으면 제품 이동
              if (!railShouldStop) {
                return { ...p, position: p.position + 0.8 }
              }
              return p
            })
            .filter((p) => p.position <= 100) // 100% 초과한 제품 제거

          // 제품이 제거되었거나 마지막 제품이 충분히 멀어졌으면 새 제품 추가
          const lastProduct = updatedProducts.length > 0 ? updatedProducts[updatedProducts.length - 1] : null
          const shouldAddProduct = !lastProduct || lastProduct.position > 20

          // 새 제품 추가 조건: 8개 미만이고, 마지막 제품과의 간격이 충분할 때
          if (shouldAddProduct && updatedProducts.length < 8) {
              updatedProducts.push({
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${++idCounterRef.current}`,
                position: 0,
              stage: "moving",
              isDefect: false,
              shape: "square",
              color: "white",
              status: "raw",
              machiningProgress: 0,
            })
          }

          return {
            ...rail,
            products: updatedProducts,
            pendingDefects: updatedPending,
            hasAlert: hasNewAlert || rail.hasAlert,
          }
        }),
      )
    }, 50) // 50ms 간격으로 부드럽게 업데이트

    return () => clearInterval(interval)
  }, [selectedMachines, recordDefect])
  

  useEffect(() => {
    if (messagesEndRef.current && showChatbot) {
      // 약간의 지연을 주어 DOM 업데이트 후 스크롤
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        })
      }, 100)
    }
  }, [chatMessages, showChatbot])

  // 챗봇 패널이 열릴 때 입력 필드에 포커스
  useEffect(() => {
    if (showChatbot) {
      setTimeout(() => {
        chatInputRef.current?.focus()
      }, 200)
    }
  }, [showChatbot])

  // 🔥 Step 2 — 최신 Kafka 메시지 polling
  useEffect(() => {
    if (selectedMachines.length === 0) return

    const interval = setInterval(async () => {
      let anyAlive = false
      // 선택된 모든 CNC에 대해 체크
      for (const machineId of selectedMachines) {
        const machine = machines.find((m) => m.id === machineId)
        if (!machine) continue

        try {
          const res = await fetch(`http://localhost:5000/cnc/${machine.name}/latest`)
          const json = await res.json()

          // CNC가 데이터가 없을 수도 있음
          if (json.status !== "ok" || !json.latest) {
            setProductionRails((prev) =>
              prev.map((rail) =>
                rail.cncId === machineId ? { ...rail, isStopped: true } : rail,
              ),
            )
            continue
          }

          const latestPayload = json.latest
          const latestTimestamp = json.latest._recv_ts ?? json.latest.ts

          const now = Date.now()
          const diff = now - latestTimestamp
          const isAlive = diff < 2000

          setProductionRails((prev) =>
            prev.map((rail) => {
              if (rail.cncId !== machineId) return rail

              const previousTimestamp = rail.lastTimestamp ?? 0

              // 🔥 타임스탬프가 바뀌었다 = 새 데이터 들어옴
              if (latestTimestamp !== previousTimestamp) {
                anyAlive = true

                const prevPending = rail.pendingDefects ?? 0
                let nextPending = prevPending
                if (latestPayload.m1_label === "fail") {
                  // 실제 센서 값이 이상인지 확인
                  const TOP10_SENSORS = [
                    "X_OutputCurrent", "M_CURRENT_FEEDRATE", "Y_OutputCurrent",
                    "S_OutputCurrent", "S_SetVelocity", "S_ActualVelocity",
                    "S_SetPosition", "Z_ActualPosition", "S_ActualPosition", "Z_SetPosition"
                  ]
                  
                  // TOP10 센서 중 하나라도 이상값이 있으면 불량품으로 기록
                  const hasAbnormalValue = TOP10_SENSORS.some(sensor => {
                    const value = latestPayload[sensor]
                    return value !== undefined && value !== null && isAbnormal(sensor, value)
                  })
                  
                  if (hasAbnormalValue) {
                  nextPending = prevPending + 1
                  
                  // 🔴 불량품 기록
                  const defectProduct = {
                      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${++idCounterRef.current}`,
                    position: 0,
                    status: "fail" as const,
                    payload: latestPayload,
                  }
                  recordDefect(rail.cncId, defectProduct)
                  }
                }
                return {
                  ...rail,
                  lastTimestamp: latestTimestamp,
                  latestPayload: latestPayload,
                  isStopped: false, // 다시 움직이게
                  pendingDefects: nextPending,
                }
              }

              // 🔥 타임스탬프가 그대로다 = 새 데이터 없음 → 멈춤
              return {
                ...rail,
                isStopped: true,
              }
            }),
          )
        } catch (err) {
          console.error("polling error:", err)
        }
      }

      // 🔥 한 바퀴 돌고 나서, 전부 멈췄으면 애니메이션 중지
      setIsMoving(anyAlive)
    }, 2000) // 2초마다 polling

    return () => clearInterval(interval)
  }, [selectedMachines, machines, isAbnormal])

  // 불량품 발생 시 레일을 맨 위로 이동
  useEffect(() => {
    const defectiveMachines = productionRails.filter((rail) => rail.hasAlert).map((rail) => rail.cncId)

    if (defectiveMachines.length > 0) {
      setSelectedMachines((prevSelected) => {
        const withDefects = prevSelected.filter((id) => defectiveMachines.includes(id))
        const withoutDefects = prevSelected.filter((id) => !defectiveMachines.includes(id))
        return [...withDefects, ...withoutDefects]
      })
    }
  }, [productionRails])

  const getGridCols = () => {
    if (layoutMode === "list") {
      return "grid-cols-1"
    }
    const count = selectedMachines.length
    if (count === 1) return "grid-cols-1"
    if (count === 2) return "grid-cols-2"
    return "grid-cols-2"
  }

  const handleRailDragStart = (index: number) => {
    setDraggedRailIndex(index)
  }

  const handleRailDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverRailIndex(index)
  }

  const handleRailDrop = (targetIndex: number) => {
    if (draggedRailIndex === null) return

    const reorderedMachines = [...selectedMachines]
    const [movedMachine] = reorderedMachines.splice(draggedRailIndex, 1)
    reorderedMachines.splice(targetIndex, 0, movedMachine)

    setSelectedMachines(reorderedMachines)
    setDraggedRailIndex(null)
    setDragOverRailIndex(null)
  }

  const handleRailDragEnd = () => {
    setDraggedRailIndex(null)
    setDragOverRailIndex(null)
  }

   // 🔵 여기부터 챗봇 전송 핸들러
   const handleChatSend = async () => {
    const message = chatInput.trim()
    if (!message || isSending || !chatMessages) return

    const userMsg: UiMessage = { type: "user", text: message }

    // 1) 사용자 메시지를 먼저 UI에 추가
    setChatMessages((prev) => prev ? [...prev, userMsg] : [userMsg])
    setChatInput("")
    setIsSending(true)

    try {
      // 2) 지금까지 채팅 → API용 history 포맷으로 변환
      const historyForApi = [
        ...(chatMessages || []).map((m) => ({
          role: m.type === "user" ? "user" : "assistant",
          content: m.text,
        })),
        { role: "user", content: message },
      ]

      // 3) /api/chat 호출 (Python Flask 서버로 프록시)
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: historyForApi,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.success) {
        console.error("Chat API error:", data?.error)
        setChatMessages((prev) => prev ? [
          ...prev,
          { type: "bot", text: "⚠️ 서버 에러가 발생했습니다. 잠시 후 다시 시도해주세요." },
        ] : [{ type: "bot", text: "⚠️ 서버 에러가 발생했습니다. 잠시 후 다시 시도해주세요." }])
        return
      }

      const botReply = data.reply as { role: string; content: string }

      setChatMessages((prev) => prev ? [
        ...prev,
        { type: "bot", text: botReply.content },
      ] : [{ type: "bot", text: botReply.content }])
    } catch (error) {
      console.error(error)
      setChatMessages((prev) => prev ? [
        ...prev,
        { type: "bot", text: "⚠️ 네트워크 에러가 발생했습니다." },
      ] : [{ type: "bot", text: "⚠️ 네트워크 에러가 발생했습니다." }])
    } finally {
      setIsSending(false)
      // 메시지 전송 후 입력 필드에 포커스 유지
      setTimeout(() => {
        chatInputRef.current?.focus()
      }, 100)
    }
  }

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleChatSend()
    }
  }

  // 🔵 챗봇 대화 초기화 확인 모달 열기
  const handleChatClear = () => {
    setShowClearConfirm(true)
  }

  // 🔵 챗봇 대화 초기화 실행
  const confirmChatClear = () => {
    const initialMessage: UiMessage[] = [
      { type: "bot", text: "안녕하세요! CNC 모니터링 챗봇입니다. 무엇을 도와드릴까요?" },
    ]
    setChatMessages(initialMessage)
    // localStorage도 초기화
    try {
      localStorage.setItem('cnc-dashboard-chatMessages', JSON.stringify(initialMessage))
    } catch (error) {
      console.error('챗봇 대화 초기화 저장 실패:', error)
    }
    setShowClearConfirm(false)
  }

  // 🔵 여기까지 추가

  // 폴더에 있는 CNC (대시보드에 없는 것들)
  const machinesInFolder = machines.filter((m) => !selectedMachines.includes(m.id))

  // 대시보드에 있는 CNC (선택된 것들)
  const machinesInDashboard = machines.filter((m) => selectedMachines.includes(m.id))

  // 불량품을 CNC별로 그룹화
  // 날짜 조회에 따른 필터링
  const getFilteredDefects = useCallback(() => {
    if (!dateSearchMode) return defectHistory // 전체 조회

    // 하루 조회
    if (dateSearchMode === "single" && startDate) {
      return defectHistory.filter((d) => {
        const defectDate = new Date(d.timestamp)
        return (
          defectDate.getFullYear() === startDate.getFullYear() &&
          defectDate.getMonth() === startDate.getMonth() &&
          defectDate.getDate() === startDate.getDate()
        )
      })
    }

    // 기간별 조회
    if (dateSearchMode === "range" && startDate && endDate) {
      return defectHistory.filter((d) => {
        const defectDate = new Date(d.timestamp)
        return defectDate >= startDate && defectDate <= endDate
      })
    }

    return defectHistory
  }, [defectHistory, dateSearchMode, startDate, endDate])

  // 날짜 입력 핸들러
  const handleStartDateInputChange = (value: string) => {
    setStartDateInput(value)
    if (value) {
      const date = new Date(value + 'T00:00:00')
      setStartDate(date)
    } else {
      setStartDate(undefined)
    }
  }

  const handleEndDateInputChange = (value: string) => {
    setEndDateInput(value)
    if (value) {
      const date = new Date(value + 'T23:59:59')
      setEndDate(date)
    } else {
      setEndDate(undefined)
    }
  }

  // 날짜 범위 유틸리티 - 당일 기준 7일 전까지만 조회 가능
  const getMinSelectableDate = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // 오늘을 00:00:00으로 설정
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 6) // 7일 전까지만 (오늘 포함하여 총 7일간)
    sevenDaysAgo.setHours(0, 0, 0, 0) // 시간을 00:00:00으로 설정
    return sevenDaysAgo
  }

  const getMaxSelectableDate = () => {
    return new Date() // 오늘
  }

  // 조회 버튼 핸들러
  const handleSearch = useCallback(() => {
    console.log("[조회 실행]:", { dateSearchMode, startDate, endDate })
  }, [dateSearchMode, startDate, endDate])

  // 오늘 날짜로 조회
  const handleSearchToday = useCallback(() => {
    const today = new Date()
    setStartDate(today)
    setEndDate(undefined)
    setDateSearchMode("single")
    setStartDateInput(formatDate(today, "yyyy-MM-dd"))
    setEndDateInput("")
  }, [])

  // 미확인 → 확인된 물품 이동
  const handleMoveSelectedToConfirmed = useCallback(() => {
    const itemsToMove = defectHistory.filter((d) => selectedForConfirmation.has(d.id))
    setConfirmedDefects((prev) => [...prev, ...itemsToMove])
    setDefectHistory((prev) => prev.filter((d) => !selectedForConfirmation.has(d.id)))
    setSelectedForConfirmation(new Set())
  }, [defectHistory, selectedForConfirmation])

  // 폴더 전체를 확인된 물품으로 이동
  const handleMoveFolderToConfirmed = useCallback(
    (cncId: string) => {
      const folderItems = defectHistory.filter((d) => d.cncId === cncId)
      setConfirmedDefects((prev) => [...prev, ...folderItems])
      setDefectHistory((prev) => prev.filter((d) => d.cncId !== cncId))
      setFolderMoveDialog(null)
      setSelectedFoldersForDeletion((prev) => {
        const newSet = new Set(prev)
        newSet.delete(cncId)
        return newSet
      })
    },
    [defectHistory],
  )

  // 확인된 폴더 삭제
  const handleDeleteConfirmedFolder = useCallback((cncId: string) => {
    setConfirmedDefects((prev) => prev.filter((d) => d.cncId !== cncId))
    setSelectedFoldersForDeletion((prev) => {
      const newSet = new Set(prev)
      newSet.delete(cncId)
      return newSet
    })
  }, [])

  // 확인된 → 미확인 물품으로 되돌리기
  const handleMoveBackToUnconfirmed = useCallback(
    (defectId: number) => {
      const itemToMove = confirmedDefects.find((d) => d.id === defectId)
      if (itemToMove) {
        setDefectHistory((prev) => [...prev, itemToMove])
        setConfirmedDefects((prev) => prev.filter((d) => d.id !== defectId))
      }
    },
    [confirmedDefects],
  )

  // 선택된 확인된 물품 삭제
  const handleDeleteSelectedDefects = useCallback(() => {
    // 개별 항목 삭제
    setConfirmedDefects((prev) => prev.filter((d) => !selectedForDeletion.has(d.id)))
    
    // 선택된 폴더 전체 삭제
    if (selectedFoldersForDeletion.size > 0) {
      setConfirmedDefects((prev) => prev.filter((d) => !selectedFoldersForDeletion.has(d.cncId)))
    }
    
    setSelectedForDeletion(new Set())
    setSelectedFoldersForDeletion(new Set())
  }, [selectedForDeletion, selectedFoldersForDeletion])

  // 전체 확인된 물품 삭제
  const handleDeleteAllConfirmedDefects = useCallback(() => {
    setConfirmedDefects([])
    setSelectedForDeletion(new Set())
  }, [])

  // 개별 확인된 물품 삭제
  const handleDeleteConfirmedDefect = useCallback((defectId: number) => {
    setConfirmedDefects((prev) => prev.filter((d) => d.id !== defectId))
  }, [])

  const defectsByCNC: Record<string, any[]> = defectHistory.reduce((acc, defect) => {
    const cncName = defect.cncName || defect.cncId
    if (!acc[cncName]) {
      acc[cncName] = []
    }
    acc[cncName].push(defect)
    return acc
  }, {} as Record<string, any[]>)

  // 불량품 클릭 핸들러
  const handleDefectClick = async (defect: any) => {
    setSelectedDefect(defect)
    setShowDefectDetail(true)
    setDefectAnalysis(null) // 분석 결과 초기화
    
    // 챗봇이 열려있지 않으면 열기
    if (!showChatbot) {
      setShowChatbot(true)
    }
    
    // 불량품 분석 요청 (모달과 챗봇 둘 다에 결과 표시)
    await requestDefectAnalysis(defect)
  }

  // 불량품 분석 요청 함수
  const requestDefectAnalysis = async (defect: any) => {
    try {
      // 챗봇이 초기화되지 않았으면 초기화
      if (!chatMessages) {
        const initialMessage: UiMessage[] = [
          { type: "bot", text: "안녕하세요! CNC 모니터링 챗봇입니다. 무엇을 도와드릴까요?" },
        ]
        setChatMessages(initialMessage)
      }
      
      // 챗봇에 "불량품 분석 중..." 메시지 추가
      setChatMessages((prev) => prev ? [
        ...prev,
        { type: "bot", text: "🔍 불량품 분석을 진행하고 있습니다..." },
      ] : [{ type: "bot", text: "🔍 불량품 분석을 진행하고 있습니다..." }])
      
      // 불량품 데이터를 chatbot_advice.py가 이해할 형식으로 변환
      // TOP10 센서 목록
      const TOP10_SENSORS = [
        "X_OutputCurrent",
        "M_CURRENT_FEEDRATE",
        "Y_OutputCurrent",
        "S_OutputCurrent",
        "S_SetVelocity",
        "S_ActualVelocity",
        "S_SetPosition",
        "Z_ActualPosition",
        "S_ActualPosition",
        "Z_SetPosition"
      ]
      
      // defect.features에서 TOP10 센서 값만 추출
      const featuresObj = defect.features || {}
      const featuresData: Record<string, number> = {}
      
      // payload에서도 확인 (기존 데이터 호환성)
      const payload = defect.payload || {}
      
      // 비정상 평균값 (payload에 없을 때 사용)
      const abnormalMeans: Record<string, number> = {
        "X_OutputCurrent": 327.0,
        "M_CURRENT_FEEDRATE": 6.0,
        "Y_OutputCurrent": 326.0,
        "S_ActualVelocity": 56.4,
        "S_OutputCurrent": 323.0,
        "S_SetVelocity": 56.3,
        "S_SetPosition": -119.0,
        "S_ActualPosition": -120.0,
        "Z_ActualPosition": 34.1,
        "Z_SetPosition": 34.1
      }
      
      // TOP10 센서 값만 추출
      TOP10_SENSORS.forEach(sensor => {
        // features에 있으면 사용
        if (featuresObj[sensor] !== undefined && featuresObj[sensor] !== null) {
          featuresData[sensor] = featuresObj[sensor]
        }
        // payload에 있으면 사용
        else if (payload[sensor] !== undefined && payload[sensor] !== null) {
          featuresData[sensor] = payload[sensor]
        }
        // 둘 다 없으면 비정상 평균값 사용
        else {
          featuresData[sensor] = abnormalMeans[sensor] || 0
        }
      })
      
      const defectData = {
        cncName: defect.cncName || defect.cncId,
        productId: String(defect.productId || defect.id || ''),
        features: featuresData // TOP10 센서 값만 전송
      }
      
      // API 호출
      console.log("🔍 [불량품 분석 요청] defectData:", defectData)
      
      // 타임아웃 설정 (90초) - GPT 응답 대기 시간 고려
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.error("⏱️ [타임아웃] 90초 내에 응답을 받지 못했습니다.")
        controller.abort()
      }, 90000)
      
      let res: Response
      try {
        res = await fetch("/api/chatbot/advice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ defectData }),
          signal: controller.signal
        })
        clearTimeout(timeoutId)
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          throw new Error("분석 요청 시간이 초과되었습니다. (90초) 다시 시도해주세요.")
        }
        throw fetchError
      }
      
      console.log("🔍 [불량품 분석 응답] status:", res.status, res.statusText)
      
      const data = await res.json()
      console.log("🔍 [불량품 분석 응답] data:", data)
      
      if (!res.ok || !data?.success) {
        console.error("❌ [불량품 분석 실패] res.ok:", res.ok, "data.success:", data?.success, "error:", data?.error)
        throw new Error(data?.error || "분석 실패")
      }
      
      const diagnosis = data.diagnosis
      console.log("✅ [불량품 분석 성공] diagnosis:", diagnosis)
      
      // 분석 결과를 state에 저장 (모달에서도 사용) - 전체 diagnosis 객체 저장
      setDefectAnalysis(diagnosis)
      
      // 분석 결과를 챗봇 메시지로 추가
      let analysisMessage = `📊 **불량품 분석 결과** (${defect.cncName || defect.cncId} - ${defect.productId || 'N/A'})\n\n`
      
      if (diagnosis.status === "FAIL") {
        analysisMessage += `**핵심 원인:**\n`
        if (diagnosis.root_causes && Array.isArray(diagnosis.root_causes)) {
          diagnosis.root_causes.forEach((cause: string) => {
            analysisMessage += `• ${cause}\n`
          })
        }
        
        analysisMessage += `\n**분석:**\n${diagnosis.diagnosis || "분석 정보가 없습니다."}`
      } else if (diagnosis.status === "ERROR") {
        analysisMessage += `❌ **분석 오류:**\n${diagnosis.error || "알 수 없는 오류가 발생했습니다."}`
        // 에러인 경우에도 defectAnalysis 업데이트
      } else {
        analysisMessage += "장비는 정상 동작 중입니다."
      }
      
      // 이전 "분석 중..." 메시지 제거하고 분석 결과 추가
      setChatMessages((prev) => {
        if (!prev) return [{ type: "bot", text: analysisMessage }]
        // 마지막 메시지가 "분석을 진행하고 있습니다"면 제거
        const filtered = prev.filter((msg, idx) => 
          !(idx === prev.length - 1 && msg.text.includes("분석을 진행하고 있습니다"))
        )
        return [...filtered, { type: "bot", text: analysisMessage }]
      })
      
    } catch (error: any) {
      console.error("❌ [불량품 분석 실패] 전체 에러:", error)
      console.error("❌ [불량품 분석 실패] 에러 이름:", error?.name)
      console.error("❌ [불량품 분석 실패] 에러 메시지:", error?.message)
      console.error("❌ [불량품 분석 실패] 에러 스택:", error?.stack)
      
      let errorMsg = "알 수 없는 오류가 발생했습니다. 다시 시도해주세요."
      
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        errorMsg = "분석 요청 시간이 초과되었습니다. (90초) Python 서버가 실행 중인지 확인해주세요."
      } else if (error.message) {
        errorMsg = error.message
      }
      
      // 에러 상태도 저장 (모달에서 표시)
      setDefectAnalysis({
        status: "ERROR",
        error: errorMsg
      })
      
      const errorMessage = `⚠️ **불량품 분석 실패**\n${errorMsg}\n\nPython 서버가 http://localhost:8001 에서 실행 중인지 확인해주세요.`
      
      setChatMessages((prev) => {
        if (!prev) return [{ type: "bot", text: errorMessage }]
        // 마지막 메시지가 "분석을 진행하고 있습니다"면 제거
        const filtered = prev.filter((msg, idx) => 
          !(idx === prev.length - 1 && msg.text.includes("분석을 진행하고 있습니다"))
        )
        return [...filtered, { type: "bot", text: errorMessage }]
      })
    }
  }

  const sortedRails = [...productionRails].sort((a, b) => {
    const aIndex = selectedMachines.indexOf(a.cncId)
    const bIndex = selectedMachines.indexOf(b.cncId)
    return aIndex - bIndex
  })

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-semibold text-foreground">CNC 관리</h1>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div>
              {/* 폴더 헤더 - 클릭하면 열고 닫기 */}
              <button
                onClick={() => setIsFolderOpen(!isFolderOpen)}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                {isFolderOpen ? (
                  <FolderOpen className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Folder className="h-5 w-5 text-yellow-500" />
                )}
                <span className="text-sm font-medium text-foreground flex-1 text-left">CNC 폴더</span>
                <span className="text-xs text-muted-foreground">{machinesInFolder.length}개</span>
                {isFolderOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {/* 폴더가 열려있을 때만 CNC 목록 표시 */}
              {isFolderOpen && (
                <div className="mt-2 ml-2 space-y-1">
                  {machinesInFolder.map((machine) => (
              <div
                key={machine.id}
                draggable
                onDragStart={() => handleDragStart(machine.id)}
                      className="flex items-center justify-between p-2 rounded-lg border border-[#3c3c3c] dark:border-border bg-secondary/50 hover:bg-secondary cursor-move transition-colors"
                onClick={() => handleSelectMachine(machine.id)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#111111] dark:text-foreground font-medium">{machine.name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 대시보드 섹션 - 선택된 CNC만 표시 */}
            {machinesInDashboard.length > 0 && (
              <div>
                <div className="flex items-center gap-2 p-2 mb-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">대시보드</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-1">
                  {machinesInDashboard.map((machine) => (
                    <div
                      key={machine.id}
                      draggable
                      onDragStart={() => handleDragStart(machine.id)}
                      className="flex items-center justify-between p-3 rounded-lg border border-[#82c7ff] dark:border-primary bg-primary/20 hover:bg-primary/30 cursor-move transition-colors"
              >
                <div className="flex items-center gap-2 flex-1">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#111111] dark:text-foreground font-medium">{machine.name}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                          handleRemoveFromDashboard(machine.id)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col" onDragOver={handleDragOver} onDrop={handleDropToSplit}>
        <div className="p-4 border-b border-border bg-card flex justify-end gap-2 relative">
          <Button
            variant="outline"
            onClick={() => setShowChatbot(!showChatbot)}
            className="border-blue-500 bg-blue-500/20 hover:bg-blue-500/30 gap-2"
          >
            <Bot className="h-5 w-5 text-blue-400" />
            챗봇
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowDefectPanel(!showDefectPanel)}
            className="gap-2 bg-red-500/10 hover:bg-red-500/20 border-red-500/50"
            title="이상값 조회"
          >
            <AlertCircle className="h-5 w-5 text-red-500" />
            이상값 조회
          </Button>

          <Button
            variant="outline"
            onClick={() => setLayoutMode(layoutMode === "grid" ? "list" : "grid")}
            className="gap-2 border-2 dashboard-button"
            title={layoutMode === "grid" ? "리스트 보기" : "그리드 보기"}
          >
            {layoutMode === "grid" ? (
              <>
                <List className="h-4 w-4" />
                리스트 보기
              </>
            ) : (
              <>
                <LayoutGrid className="h-4 w-4" />
                그리드 보기
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => setShowEmployeePanel(!showEmployeePanel)} className="gap-2 border-2 dashboard-button">
            <Users className="h-4 w-4" />
            작업자 목록
          </Button>
          
          {/* 테마 전환 버튼 */}
          <ThemeToggle />
          
          <div className="relative">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowUserProfile(!showUserProfile)}
              className="gap-2"
            >
              <User className="h-4 w-4" />
            </Button>
            
            {showUserProfile && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50 p-4">
                <div className="space-y-3">
                  <div className="border-b border-border pb-3 relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-6 w-6"
                      onClick={() => setShowUserProfile(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <p className="font-medium text-foreground pr-8">{currentUser.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{currentUser.email}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 bg-transparent text-destructive hover:text-destructive hover:bg-destructive/10 border-red-400/50 hover:border-red-400 hover:shadow-[0_0_8px_rgba(239,68,68,0.4)] hover:scale-105 transition-all"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    로그아웃
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Main production view */}
          <div className="flex-1 overflow-hidden">
            {selectedMachines.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg mb-2">CNC를 선택하거나 여기로 드래그하세요</p>
                  <p className="text-sm">좌측에서 CNC를 클릭하거나 드래그하여 모니터링을 시작하세요</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className={cn("grid gap-4 p-4", getGridCols())}>
                  {selectedMachines.map((machineId, machineIndex) => {
                    const machine = machines.find((m) => m.id === machineId)
                    const rails = sortedRails.filter((r) => r.cncId === machineId)
                    const assignedEmployee = machine ? getAssignedEmployee(machine.name) : null

                    const hasAnyAlert = rails.some(r => r.hasAlert)
                    const hasAnyStopped = rails.some(r => r.isStopped)

                    return (
                      <div
                        key={machineId}
                        draggable
                        onDragStart={() => handleRailDragStart(machineIndex)}
                        onDragOver={(e) => {
                          handleRailDragOver(e, machineIndex)
                          if (draggedEmployee) {
                            e.preventDefault()
                          }
                        }}
                        onDrop={(e) => {
                          handleRailDrop(machineIndex)
                          if (draggedEmployee && machine) {
                            handleDropEmployeeToCNC(machine.name, e)
                          }
                        }}
                        onDragEnd={handleRailDragEnd}
                        className={cn(
                          "flex flex-col border-2 transition-all",
                          hasAnyAlert && "border-red-500 ring-2 ring-red-500/50",  // 불량 발생 시 빨간 테두리
                          hasAnyStopped && "border-orange-500 ring-2 ring-orange-500/50",  // 정지 시 주황 테두리
                          draggedRailIndex === machineIndex && "opacity-50",
                          dragOverRailIndex === machineIndex && "ring-2 ring-blue-500",
                        )}
                      >
                        <div className="p-4 border-b border-border bg-card">
                          <div className="flex items-center gap-3">
                            <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h2 className="text-xl font-semibold text-foreground">{machine?.name}</h2>
                                {assignedEmployee && (
                                  <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-primary/10">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-sm text-foreground">{assignedEmployee.name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveFromDashboard(machineId)
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* 🔴 최근 불량품 표시 */}
                        <div className="px-4 pb-4 border-b border-border">
                          <button
                            onClick={() => setExpandedDefects((prev) => ({ ...prev, [machineId]: !prev[machineId] }))}
                            className="w-full flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                          >
                            <span>최근 불량품 ({defectHistory.filter((d) => d.cncId === machineId).length}건)</span>
                            {expandedDefects[machineId] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>

                          {/* 화살표 클릭했을 때만 불량품 목록 표시 */}
                          {expandedDefects[machineId] && (
                            <div className="space-y-2 mt-2">
                            {defectHistory.filter(d => {
                              const rail = sortedRails.find(r => r.cncId === machineId)
                              return rail && d.cncId === machineId
                            }).slice(0, 5).map(defect => (
                              <button
                                key={defect.id}
                                onClick={() => setSelectedDefectProduct(defect)}
                                className="w-full bg-secondary/50 hover:bg-secondary p-3 rounded-lg text-left transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm text-[#111111] dark:text-foreground">제품 #{defect.productId}</div>
                                    <div className="text-xs text-[#111111] dark:text-muted-foreground">
                                      {defect.timestamp.toLocaleTimeString('ko-KR')}
                                    </div>
                                  </div>
                                  <AlertCircle className="h-4 w-4 text-[#82c7ff] dark:text-red-400" />
                                </div>
                              </button>
                            ))}
                            {defectHistory.filter(d => d.cncId === machineId).length === 0 && (
                              <div className="text-xs text-muted-foreground text-center py-2">
                                불량품 기록이 없습니다
                              </div>
                            )}
                          </div>
                          )}
                        </div>

                        <ScrollArea className="flex-1 p-6 max-h-[calc(100vh-12rem)]">
                          <div className="space-y-6">
                            {rails.map((rail, railIndex) => (
                              <ProductionRail
                                key={rail.id}
                                rail={rail}
                                index={railIndex}
                                isFocused={focusedRailId === rail.id}
                                onFocus={() => setFocusedRailId(focusedRailId === rail.id ? null : rail.id)}
                                onClearAlert={() => {
                                  // hasAlert를 false로 설정하여 빨간 테두리만 제거
                                  setProductionRails(
                                    productionRails.map((r) => (r.id === rail.id ? { ...r, hasAlert: false } : r)),
                                  )
                                }}
                                onEmergencyCall={() => handleEmergencyCall(rail.id)}
                                assignedEmployee={assignedEmployee}
                                showEmergencyCall={emergencyCallRailId === rail.id}
                                onCloseEmergencyCall={closeEmergencyCall}
                                onRemove={() => {
                                  setProductionRails(productionRails.filter((r) => r.id !== rail.id))
                                  if (focusedRailId === rail.id) {
                                    setFocusedRailId(null)
                                  }
                                }}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* 챗봇 패널 */}
          {showChatbot && (
            <div className="w-96 bg-white dark:bg-zinc-900 border-l border-[#82c7ff] dark:border-zinc-800 flex flex-col relative">
              {/* 헤더 */}
              <div className="p-4 border-b border-[#82c7ff] dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[#82c7ff] dark:bg-blue-500 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-[#111111] dark:text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                  <div>
                    <div className="font-semibold text-[#111111] dark:text-white">CNC 챗봇</div>
                    <div className="text-xs text-[#111111] dark:text-zinc-400">항상 도와드릴게요</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleChatClear}
                      className="h-8 px-2 hover:bg-gray-200 dark:hover:bg-zinc-800 text-[#111111] dark:text-zinc-400 hover:text-[#111111] dark:hover:text-white"
                    >
                      초기화
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowChatbot(false)}
                  className="hover:bg-gray-200 dark:hover:bg-zinc-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* 채팅 메시지 영역 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages && chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.type === 'bot' && (
                      <div className="w-8 h-8 rounded-full bg-[#82c7ff] dark:bg-blue-500 flex items-center justify-center mr-2 flex-shrink-0">
                        <Bot className="h-5 w-5 text-[#111111] dark:text-white" />
                      </div>
                    )}
                    <div 
                      className={`max-w-[70%] p-3 rounded-lg ${
                        msg.type === 'bot' 
                          ? 'bg-[#82c7ff] dark:bg-blue-600 text-[#111111] dark:text-white border border-[#82c7ff] dark:border-blue-600' 
                          : 'bg-white dark:bg-zinc-800 text-[#111111] dark:text-zinc-100 border border-[#82c7ff] dark:border-zinc-700'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {/* 🔵 여기가 "맨 아래 표시점" - 메시지 영역 안에 있어야 함 */}
                <div ref={messagesEndRef} />
              </div>

              {/* 입력 영역 */}
              <div className="p-4 border-t border-[#82c7ff] dark:border-zinc-800">
                <div className="flex gap-2">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder="메시지를 입력하세요..."
                    disabled={isSending}
                    className="flex-1 bg-gray-100 dark:bg-zinc-800 border border-[#82c7ff] dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-[#111111] dark:text-white placeholder:text-gray-500 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#82c7ff] dark:focus:ring-blue-500 disabled:opacity-50"
                    autoFocus
                  />
                  <Button
                    onClick={handleChatSend}
                    disabled={isSending}
                    className="bg-[#82c7ff] dark:bg-blue-600 hover:bg-[#6bb5ff] dark:hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 초기화 확인 모달 */}
              {showClearConfirm && (
                <div className="absolute inset-0 bg-black/50 dark:bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white dark:bg-zinc-800 border border-[#82c7ff] dark:border-zinc-700 rounded-lg p-6 w-[320px] shadow-xl">
                    <div className="text-[#111111] dark:text-white font-semibold mb-4">대화내용을 초기화 할까요?</div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        onClick={confirmChatClear}
                        className="bg-[#82c7ff] dark:bg-blue-600 hover:bg-[#6bb5ff] dark:hover:bg-blue-700"
                      >
                        예
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowClearConfirm(false)}
                        className="transition-colors border-[#82c7ff] dark:border-zinc-700"
                        style={{ backgroundColor: 'transparent' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {showEmployeePanel && (
            <div className="w-96 border-l border-border bg-card flex flex-col">
              <div className="p-4 border-b border-border relative">
                <h2 className="text-lg font-semibold text-foreground">작업자 관리</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-6 w-6"
                  onClick={() => setShowEmployeePanel(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  {sortedEmployees.map((employee) => (
                    <Card
                      key={employee.id}
                      className="p-4 cursor-move hover:bg-accent/50 transition-colors"
                      draggable
                      onDragStart={() => handleEmployeeDragStart(employee.id)}
                      onDragEnd={() => setDraggedEmployee(null)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1">
                          <div
                            className={cn(
                              "w-3 h-3 rounded-full mt-1 flex-shrink-0",
                              employee.isWorking ? "bg-green-500" : "bg-red-500",
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{employee.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{employee.phone}</p>
                            <p className="text-xs text-muted-foreground">{employee.email}</p>
                            {employee.isWorking && employee.assignedCNC && (
                              <p className="text-xs text-primary mt-2 font-medium">작업 중: {employee.assignedCNC}</p>
                            )}
                            {employee.isWorking && !employee.assignedCNC && (
                              <p className="text-xs text-muted-foreground mt-2 italic">CNC로 드래그하세요</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleEmployeeWorkStatus(employee.id)}
                            title="작업 상태 변경"
                          >
                            {employee.isWorking ? (
                              <ToggleRight className="h-4 w-4 text-green-500" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEditingEmployee(employee)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDeleteEmployee(employee.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border space-y-3">
                {(isAddingEmployee || editingEmployee) && (
                  <div className="space-y-2 mb-3">
                    <Input
                      placeholder="이름"
                      value={employeeForm.name}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    />
                    <Input
                      placeholder="전화번호"
                      value={employeeForm.phone}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                    />
                    <Input
                      placeholder="이메일"
                      value={employeeForm.email}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={editingEmployee ? handleUpdateEmployee : handleAddEmployee}
                        className="flex-1"
                      >
                        {editingEmployee ? "수정" : "추가"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsAddingEmployee(false)
                          setEditingEmployee(null)
                          setEmployeeForm({ name: "", phone: "", email: "" })
                        }}
                        className="flex-1"
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                )}

                {!isAddingEmployee && !editingEmployee && (
                  <Button variant="outline" className="w-full bg-transparent" onClick={() => setIsAddingEmployee(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    작업자 추가
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ✅ 불량품 조회 패널 */}
          {showDefectPanel && (
            <div className="w-96 bg-white dark:bg-zinc-900 border-l border-[#82c7ff] dark:border-zinc-800 flex flex-col max-h-screen">
              {/* 헤더 */}
              <div className="p-4 border-b border-[#82c7ff] dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-6 w-6 text-[#82c7ff] dark:text-red-500" />
                  <div>
                    <div className="font-semibold text-[#111111] dark:text-white">이상값 조회</div>
                    <div className="text-xs text-[#111111] dark:text-zinc-400">총 {getFilteredDefects().length}건</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDefectPanel(false)}
                  className="hover:bg-zinc-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {/* 날짜 조회 필터 */}
                  <div className="space-y-3">
                    {/* 하루 조회 / 기간별 조회 선택 버튼 */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={dateSearchMode === "single" ? "default" : "outline"}
                        onClick={() => setDateSearchMode("single")}
                        className={`flex-1 transition-all ${
                          dateSearchMode === "single"
                            ? "bg-blue-500/20 border-blue-400/50 text-blue-300"
                            : "border-blue-400/50 text-blue-400 hover:bg-blue-500/20 hover:shadow-[0_0_10px_rgba(59,130,246,0.4)]"
                        }`}
                      >
                        하루 조회
                      </Button>
                      <Button
                        size="sm"
                        variant={dateSearchMode === "range" ? "default" : "outline"}
                        onClick={() => setDateSearchMode("range")}
                        className={`flex-1 transition-all ${
                          dateSearchMode === "range"
                            ? "bg-blue-500/20 border-blue-400/50 text-blue-300"
                            : "border-blue-400/50 text-blue-400 hover:bg-blue-500/20 hover:shadow-[0_0_10px_rgba(59,130,246,0.4)]"
                        }`}
                      >
                        기간별 조회
                      </Button>
                  </div>

                    {/* 하루 조회 날짜 입력 */}
                    {dateSearchMode === "single" && (
                      <div className="space-y-2">
                        <label className="text-xs text-[#111111] dark:text-zinc-400">조회 날짜</label>
                        <input
                          type="date"
                          value={startDateInput}
                          onChange={(e) => handleStartDateInputChange(e.target.value)}
                          min={formatDate(getMinSelectableDate(), "yyyy-MM-dd")}
                          max={formatDate(getMaxSelectableDate(), "yyyy-MM-dd")}
                          className="w-full px-3 py-2 bg-gray-100 dark:bg-zinc-800 border border-[#82c7ff] dark:border-zinc-700 rounded text-[#111111] dark:text-white text-sm"
                        />
                      </div>
                    )}

                    {/* 기간별 조회 날짜 입력 */}
                    {dateSearchMode === "range" && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label className="text-xs text-[#111111] dark:text-zinc-400">시작 날짜</label>
                          <input
                            type="date"
                            value={startDateInput}
                            onChange={(e) => handleStartDateInputChange(e.target.value)}
                            min={formatDate(getMinSelectableDate(), "yyyy-MM-dd")}
                            max={formatDate(getMaxSelectableDate(), "yyyy-MM-dd")}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-zinc-800 border border-[#82c7ff] dark:border-zinc-700 rounded text-[#111111] dark:text-white text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-[#111111] dark:text-zinc-400">종료 날짜</label>
                          <input
                            type="date"
                            value={endDateInput}
                            onChange={(e) => handleEndDateInputChange(e.target.value)}
                            min={startDateInput || formatDate(getMinSelectableDate(), "yyyy-MM-dd")}
                            max={formatDate(getMaxSelectableDate(), "yyyy-MM-dd")}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-zinc-800 border border-[#82c7ff] dark:border-zinc-700 rounded text-[#111111] dark:text-white text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {/* 조회 버튼 */}
                    {dateSearchMode && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSearch}
                        className="w-full border border-blue-400/50 text-blue-400 hover:bg-blue-500/20 hover:shadow-[0_0_10px_rgba(59,130,246,0.4)] transition-all"
                      >
                        조회
                      </Button>
                    )}

                    {/* 오늘 날짜로 조회 버튼 */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSearchToday}
                      className="w-full border border-cyan-400/50 text-cyan-400 hover:bg-cyan-500/10 hover:shadow-[0_0_10px_rgba(34,211,238,0.4)] transition-all"
                    >
                      <CalendarIcon className="h-4 w-4 mr-2 text-[#111111] dark:text-white" />
                      오늘 날짜로 조회
                    </Button>

                    {/* 필터 초기화 버튼 */}
                    {dateSearchMode && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDateSearchMode(null)
                          setStartDate(undefined)
                          setEndDate(undefined)
                          setStartDateInput("")
                          setEndDateInput("")
                        }}
                        className="w-full border border-red-400/50 text-red-400 hover:bg-red-500/10 hover:shadow-[0_0_10px_rgba(239,68,68,0.4)] transition-all"
                      >
                        필터 초기화
                      </Button>
                    )}
                  </div>

                  {/* 미확인/확인된 물품 탭 */}
                  <div className="flex gap-2 border-t border-zinc-800 pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowConfirmedPanel(false)}
                      className={`flex-1 transition-all ${
                        !showConfirmedPanel
                          ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
                          : "border-orange-400/50 text-orange-400 hover:bg-orange-500/10 hover:shadow-[0_0_10px_rgba(251,146,60,0.3)]"
                      }`}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      미확인 물품
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowConfirmedPanel(true)}
                      className={`flex-1 transition-all ${
                        showConfirmedPanel
                          ? "border-green-500/50 bg-green-500/10 text-green-400"
                          : "border-green-400/50 text-green-400 hover:bg-green-500/10 hover:shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                      }`}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      확인된 물품
                    </Button>
                  </div>

                  {/* 확인된 물품 목록 */}
                  {showConfirmedPanel ? (
                    <>
                      {/* 선택 삭제 / 전체 삭제 버튼 */}
                      {confirmedDefects.length > 0 && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDeleteSelectedDefects}
                            disabled={selectedForDeletion.size === 0 && selectedFoldersForDeletion.size === 0}
                            className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent"
                          >
                            <Trash className="h-3 w-3 mr-1" />
                            선택 삭제
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDeleteAllConfirmedDefects}
                            className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            전체 삭제
                          </Button>
                        </div>
                      )}

                      {/* CNC 폴더별 확인된 불량품 목록 */}
                      {Array.from(new Set(confirmedDefects.map((d) => d.cncId))).map((cncId) => {
                        const cncDefects = confirmedDefects.filter((d) => d.cncId === cncId)
                        const cncName = cncDefects[0]?.cncName || ""
                        const isExpanded = expandedConfirmedCnc[cncId]

                        return (
                          <div key={cncId} className="border border-green-700/50 rounded-lg overflow-hidden">
                            {/* 폴더 헤더 */}
                            <button
                              onClick={() => setExpandedConfirmedCnc((prev) => ({ ...prev, [cncId]: !prev[cncId] }))}
                              className="w-full bg-green-900/20 p-3 flex items-center justify-between hover:bg-green-900/30 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-green-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-green-400" />
                                )}
                                <CheckCircle className="h-4 w-4 text-[#82c7ff] dark:text-green-400" />
                                <span className="font-medium text-[#111111] dark:text-white">{cncName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-[#82c7ff]/20 dark:bg-green-500/20 text-[#82c7ff] dark:text-green-400 px-2 py-1 rounded">
                                  {cncDefects.length}건
                                </span>
                                {/* 폴더 삭제 체크박스 */}
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedFoldersForDeletion((prev) => {
                                      const newSet = new Set(prev)
                                      if (newSet.has(cncId)) {
                                        newSet.delete(cncId)
                                      } else {
                                        newSet.add(cncId)
                                      }
                                      return newSet
                                    })
                                  }}
                                  className={`w-4 h-4 rounded border cursor-pointer flex items-center justify-center transition-all ${
                                    selectedFoldersForDeletion.has(cncId)
                                      ? "bg-red-500 border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                                      : "border-red-400/50 hover:border-red-400 hover:shadow-[0_0_4px_rgba(239,68,68,0.4)]"
                                  }`}
                                >
                                  {selectedFoldersForDeletion.has(cncId) && (
                                    <Check className="h-2.5 w-2.5 text-[#111111] dark:text-white" strokeWidth={3} />
                                  )}
                                </div>
                              </div>
                            </button>

                            {/* 폴더 내 불량품 목록 */}
                            {isExpanded && (
                              <div className="divide-y divide-zinc-700">
                                {cncDefects.map((defect) => (
                                  <div
                                    key={defect.id}
                                    className="p-3 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors flex items-center gap-3"
                                  >
                                    {/* 개별 삭제 체크박스 */}
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedForDeletion((prev) => {
                                          const newSet = new Set(prev)
                                          if (newSet.has(defect.id)) {
                                            newSet.delete(defect.id)
                                          } else {
                                            newSet.add(defect.id)
                                          }
                                          return newSet
                                        })
                                      }}
                                      className={`w-5 h-5 rounded border-2 cursor-pointer flex items-center justify-center transition-all ${
                                        selectedForDeletion.has(defect.id)
                                          ? "bg-cyan-500 border-cyan-400"
                                          : "border-cyan-400/50 hover:border-cyan-400 hover:shadow-[0_0_5px_rgba(34,211,238,0.4)]"
                                      }`}
                                    >
                                      {selectedForDeletion.has(defect.id) && (
                                        <Check className="h-3 w-3 text-black" strokeWidth={3} />
                                      )}
                                    </div>

                                    {/* 불량품 정보 */}
                                    <button
                                      onClick={() => handleDefectClick(defect)}
                                      className="flex-1 text-left"
                                    >
                                      <div className="text-sm text-[#111111] dark:text-white">제품 #{defect.productId}</div>
                                      <div className="text-xs text-[#111111] dark:text-zinc-400 mt-1">
                                        {defect.timestamp.toLocaleString("ko-KR")}
                                      </div>
                                    </button>

                                    {/* 미확인으로 되돌리기 버튼 */}
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleMoveBackToUnconfirmed(defect.id)
                                      }}
                                      className="hover:bg-yellow-500/10 hover:text-yellow-400"
                                      title="미확인 물품으로 되돌리기"
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                    </Button>

                                    {/* 개별 삭제 버튼 */}
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteConfirmedDefect(defect.id)
                                      }}
                                      className="hover:bg-red-500/10 hover:text-red-400"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {confirmedDefects.length === 0 && (
                        <div className="text-center text-[#111111] dark:text-zinc-400 py-8">
                          <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">확인된 물품이 없습니다</p>
                        </div>
                      )}
                    </>
                ) : (
                  <>
                      {/* 미확인 물품 - 확인된 물품으로 넘기기 버튼 */}
                      {getFilteredDefects().length > 0 && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleMoveSelectedToConfirmed}
                            disabled={selectedForConfirmation.size === 0}
                            className="flex-1 border-green-500/50 text-green-400 hover:bg-green-500/10 bg-transparent"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            확인된 물품으로 넘기기
                          </Button>
                        </div>
                      )}

                      {/* CNC 폴더별 미확인 불량품 목록 */}
                      {Array.from(new Set(getFilteredDefects().map((d) => d.cncId))).map((cncId) => {
                        const cncDefects = getFilteredDefects().filter((d) => d.cncId === cncId)
                        const cncName = cncDefects[0]?.cncName || ""
                        const isExpanded = expandedDefectCnc[cncId]
                      
                      return (
                        <div key={cncId} className="border border-zinc-700 rounded-lg overflow-hidden">
                            {/* 폴더 헤더 */}
                            <button
                              onClick={() => setExpandedDefectCnc((prev) => ({ ...prev, [cncId]: !prev[cncId] }))}
                              className="w-full bg-gray-100 dark:bg-zinc-800/50 p-3 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
                            >
                            <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-[#111111] dark:text-zinc-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-[#111111] dark:text-zinc-400" />
                                )}
                                <AlertCircle className="h-4 w-4 text-[#82c7ff] dark:text-red-400" />
                              <span className="font-medium text-[#111111] dark:text-white">{cncName}</span>
                            </div>
                              <div className="flex items-center gap-2">
                            <span className="text-xs bg-[#82c7ff]/20 dark:bg-red-500/20 text-[#82c7ff] dark:text-red-400 px-2 py-1 rounded">
                              {cncDefects.length}건
                            </span>
                                {/* 폴더 전체 확인 화살표 버튼 */}
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setFolderMoveDialog({ cncId, cncName })
                                  }}
                                  className="w-4 h-4 cursor-pointer hover:opacity-70"
                                >
                                  <ArrowRight className="h-4 w-4 text-green-400" />
                          </div>
                              </div>
                            </button>

                            {/* 폴더 내 불량품 목록 */}
                            {isExpanded && (
                          <div className="divide-y divide-zinc-700">
                                {cncDefects.map((defect) => (
                                  <div
                                key={defect.id}
                                    className="p-3 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors flex items-center gap-3"
                                  >
                                    {/* 개별 확인 체크박스 */}
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedForConfirmation((prev) => {
                                          const newSet = new Set(prev)
                                          if (newSet.has(defect.id)) {
                                            newSet.delete(defect.id)
                                          } else {
                                            newSet.add(defect.id)
                                          }
                                          return newSet
                                        })
                                      }}
                                      className={`w-5 h-5 rounded-full border-2 cursor-pointer flex items-center justify-center transition-all ${
                                        selectedForConfirmation.has(defect.id)
                                          ? "bg-cyan-500/20 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]"
                                          : "border-cyan-400/50 hover:border-cyan-400 hover:shadow-[0_0_5px_rgba(34,211,238,0.4)]"
                                      }`}
                                    >
                                      {selectedForConfirmation.has(defect.id) && (
                                        <Check className="h-3 w-3 text-cyan-400" strokeWidth={3} />
                                      )}
                                    </div>

                                    {/* 불량품 정보 */}
                                    <button
                                      onClick={() => handleDefectClick(defect)}
                                      className="flex-1 text-left"
                                    >
                                    <div className="text-sm text-[#111111] dark:text-white">제품 #{defect.productId}</div>
                                    <div className="text-xs text-[#111111] dark:text-zinc-400 mt-1">
                                      {defect.timestamp.toLocaleString("ko-KR")}
                                    </div>
                              </button>
                                  </div>
                            ))}
                          </div>
                            )}
                        </div>
                      )
                    })}

                      {getFilteredDefects().length === 0 && (
                        <div className="text-center text-[#111111] dark:text-zinc-400 py-8">
                          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">불량품 데이터가 없습니다</p>
                        </div>
                      )}
                  </>
                )}
              </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* ✅ 불량 상세 모달 (불량품 클릭 시) — 최종본 */}
      {showDefectDetail && selectedDefect && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white dark:bg-zinc-900 border border-[#82c7ff] dark:border-zinc-700 rounded-lg w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
            {/* 모달 헤더 */}
            <div className="p-6 border-b border-[#82c7ff] dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#111111] dark:text-white">이상값 상세 분석</h3>
                  <p className="text-sm text-[#111111] dark:text-zinc-400 mt-1">
                    {selectedDefect.cncName} - 제품 #{selectedDefect.productId}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDefectDetail(false)}
                  className="hover:bg-gray-200 dark:hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* 모달 내용 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="text-muted-foreground">발생 시간</span>
                    <p className="font-medium text-foreground mt-1">
                      {selectedDefect.timestamp.toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">제품 ID</span>
                    <p className="font-medium font-mono text-foreground mt-1">
                      {selectedDefect.productId}
                    </p>
                  </div>
                </div>

                {/* feature 이상값 표시 */}
                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    측정 항목 및 이상값
                  </h4>

                  <div className="space-y-3">
                    {/* TOP10 센서 목록 */}
                    {(() => {
                      const TOP10_SENSORS = [
                        "X_OutputCurrent",
                        "M_CURRENT_FEEDRATE",
                        "Y_OutputCurrent",
                        "S_OutputCurrent",
                        "S_SetVelocity",
                        "S_ActualVelocity",
                        "S_SetPosition",
                        "Z_ActualPosition",
                        "S_ActualPosition",
                        "Z_SetPosition"
                      ]
                      
                      // features가 객체 형태인 경우만 처리
                      const featuresObj = typeof selectedDefect.features === 'object' && selectedDefect.features !== null
                        ? selectedDefect.features
                        : {}
                      
                      // 전체 불량품 여부 판단
                      const isDefect = Object.entries(featuresObj).some(([key, val]) =>
                        isAbnormal(key, val as number)
                      )
                      
                      // TOP10 센서만 필터링
                      const top10Features = TOP10_SENSORS.map(sensor => ({
                        name: sensor,
                        value: featuresObj[sensor] || 0,
                        unit: ''
                      }))
                      
                      return top10Features
                    })().map((feature: any, idx: number) => {
                      // ✅ 네가 준 정상 min/max/mean/median을 feature.name 기준으로 직접 매핑
                      let normalMin = feature.normalRange?.[0] || 0
                      let normalMax = feature.normalRange?.[1] || 0
                      let mean: number | null = null
                      let median: number | null = null

                      switch (feature.name) {
                        case "X_OutputCurrent":
                          normalMin = 322.0
                          normalMax = 331.0
                          mean = 326.895875
                          median = 327.0
                          break
                        case "M_CURRENT_FEEDRATE":
                          normalMin = 3.0
                          normalMax = 50.0
                          mean = 18.425237
                          median = 6.0
                          break
                        case "Y_OutputCurrent":
                          normalMin = 321.0
                          normalMax = 333.0
                          mean = 325.936658
                          median = 326.0
                          break
                        case "S_ActualVelocity":
                          normalMin = 2.997
                          normalMax = 58.5
                          mean = 42.731494
                          median = 56.4
                          break
                        case "S_OutputCurrent":
                          normalMin = 307.0
                          normalMax = 332.0
                          mean = 322.996474
                          median = 323.0
                          break
                        case "S_SetVelocity":
                          normalMin = 3.0
                          normalMax = 58.3
                          mean = 42.382763
                          median = 56.3
                          break
                        case "S_SetPosition":
                          normalMin = -2135.0
                          normalMax = 2155.0
                          mean = -105.221758
                          median = -119.0
                          break
                        case "S_ActualPosition":
                          normalMin = -2135.953
                          normalMax = 2155.0
                          mean = -105.538962
                          median = -120.0
                          break
                        case "Z_ActualPosition":
                          normalMin = 30.5
                          normalMax = 124.0
                          mean = 52.99695
                          median = 34.1
                          break
                        case "Z_SetPosition":
                          normalMin = 30.5
                          normalMax = 124.0
                          mean = 52.994572
                          median = 34.1
                          break
                        default:
                          // feature.name이 위 목록에 없으면 기존 normalRange 그대로 씀
                          break
                      }

                      // 개별 feature에 대한 이상 여부 판단
                      const featureIsAbnormal = isAbnormal(feature.name, feature.value)
                      
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "p-4 rounded-lg border",
                            featureIsAbnormal
                              ? "bg-red-500/10 border-red-500/50"
                              : "bg-secondary/30 border-border",
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-foreground">{feature.name}</span>
                            {featureIsAbnormal && (
                              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
                                이상
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {/* 측정값 */}
                            <div>
                              <span className="text-muted-foreground">측정값</span>
                              <p
                                className={cn(
                                  "font-mono mt-1",
                                  featureIsAbnormal
                                    ? "text-red-500 font-semibold"
                                    : "text-foreground",
                                )}
                              >
                                {feature.value} {feature.unit || ''}
                              </p>

                              {/* ✅ 평균/중앙값 표시(값이 있을 때만) */}
                              {mean !== null && median !== null && (
                                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                                  <p>평균: {mean}</p>
                                  <p>중앙값: {median}</p>
                          </div>
                              )}
                            </div>

                            {/* 정상 범위 */}
                            <div>
                              <span className="text-muted-foreground">정상 범위</span>
                              <p className="font-mono text-foreground mt-1">
                                {normalMin} ~ {normalMax} {feature.unit || ''}
                              </p>

                              {/* ✅ 최소/최대도 같이 표기(값이 있을 때만) */}
                              {mean !== null && median !== null && (
                                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                                  <p>최소값: {normalMin}</p>
                                  <p>최대값: {normalMax}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* AI 분석 영역 */}
                <div className="border-t border-[#82c7ff] dark:border-zinc-800 pt-4">
                  <div className="text-sm font-medium text-[#111111] dark:text-zinc-400 mb-3">AI 분석 결과</div>

                  {defectAnalysis ? (
                    defectAnalysis.status === "ERROR" ? (
                      /* === 오류 출력 === */
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                            <X className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-red-400 font-medium mb-2">분석 오류</div>
                            <div className="text-sm text-[#111111] dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                              {defectAnalysis.error}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* === 성공 출력 === */
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#82c7ff] dark:bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-5 w-5 text-[#111111] dark:text-white" />
                      </div>

                      <div className="flex-1">
                            {/* 전문가 조언 */}
                            <div className="text-sm text-[#82c7ff] dark:text-blue-400 font-medium mb-2">전문가 조언</div>
                            <div className="text-sm text-[#111111] dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                              {defectAnalysis.diagnosis?.expert_advice || "분석 정보가 없습니다."}
                            </div>

                            {/* 이상 Feature */}
                            {defectAnalysis.diagnosis?.abnormal &&
                              Object.keys(defectAnalysis.diagnosis.abnormal).length > 0 && (
                                <>
                                  <div className="text-sm text-[#82c7ff] dark:text-blue-400 font-medium mt-4 mb-1">
                                    이상 감지된 Feature
                                  </div>
                                  <ul className="list-disc list-inside space-y-1 text-sm text-[#111111] dark:text-zinc-300">
                                    {Object.entries(defectAnalysis.diagnosis.abnormal).map(
                                      ([key, info]: any, idx: number) => (
                                        <li key={idx}>
                                          <strong>{key}</strong> – {info.reason}
                                  </li>
                                )
                                    )}
                          </ul>
                                </>
                              )}

                            {/* 상관관계 분석 */}
                            {defectAnalysis.diagnosis?.correlations &&
                              defectAnalysis.diagnosis.correlations.length > 0 && (
                                <>
                                  <div className="text-sm text-[#82c7ff] dark:text-blue-400 font-medium mt-4 mb-1">
                                    상관관계 분석
                        </div>
                                  <ul className="list-disc list-inside space-y-1 text-sm text-[#111111] dark:text-zinc-300">
                                    {defectAnalysis.diagnosis.correlations.map(
                                      (c: string, idx: number) => (
                                        <li key={idx}>{c}</li>
                                      )
                                    )}
                                  </ul>
                                </>
                              )}
                      </div>
                    </div>
                  </div>
                    )
                  ) : (
                    /* === 로딩 === */
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Bot className="h-5 w-5 text-[#82c7ff] dark:text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h5 className="font-medium text-[#111111] dark:text-zinc-400 mb-2">분석 중...</h5>
                          <p className="text-sm text-[#111111] dark:text-zinc-400">불량품 분석을 진행하고 있습니다.</p>
                </div>
              </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 확인 버튼 */}
            <div className="p-6 border-t border-[#82c7ff] dark:border-zinc-800">
              <Button className="w-full" onClick={() => setShowDefectDetail(false)}>
                확인
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 폴더 이동 확인 다이얼로그 */}
      {folderMoveDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white dark:bg-zinc-900 border border-[#82c7ff] dark:border-zinc-700 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-[#111111] dark:text-white mb-4">폴더 이동 확인</h3>
            <p className="text-sm text-[#111111] dark:text-zinc-400 mb-6">
              <span className="text-[#111111] dark:text-white font-medium">{folderMoveDialog.cncName}</span> 폴더를 확인된 물품으로
              옮기시겠습니까?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => handleMoveFolderToConfirmed(folderMoveDialog.cncId)}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                예
              </Button>
              <Button variant="outline" onClick={() => setFolderMoveDialog(null)} className="flex-1">
                아니오
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductionRail({
  rail,
  index,
  isFocused,
  onFocus,
  onClearAlert,
  onEmergencyCall,
  assignedEmployee,
  showEmergencyCall,
  onCloseEmergencyCall,
  onRemove,
}: {
  rail: ProductionRail
  index: number
  isFocused: boolean
  onFocus: () => void
  onClearAlert: () => void
  onEmergencyCall: () => void
  assignedEmployee: Employee | null | undefined
  showEmergencyCall: boolean
  onCloseEmergencyCall: () => void
  onRemove: () => void
}) {
  useEffect(() => {
    if (rail.latestPayload) {
      console.log(
        `%c[NEW PAYLOAD] rail ${rail.id}`,
        "color: #00c853; font-weight: bold;",
        rail.latestPayload
      );
    }
  }, [rail.latestPayload]);

  const renderProduct = (prod: Product) => {
    const baseSize = 40 // 제품 크기
    const centerDotSize = 6 // 중앙 점 크기

    const isDefective = prod.isDefect

    // 가공 전 - 흰색 사각형 (light mode에서는 연회색)
    if (prod.status === "raw") {
      return (
        <div className="relative" style={{ width: baseSize, height: baseSize }}>
          {/* 반투명 외곽 사각형 */}
          <div className="absolute inset-0 bg-[#dcdcdc]/80 dark:bg-white/20 border border-[#b0b0b0] dark:border-white/40 rounded-sm" />
          {/* 중앙 진한 점 */}
          <div
            className="absolute bg-[#3c3c3c] dark:bg-white"
            style={{
              width: centerDotSize,
              height: centerDotSize,
              left: `calc(50% - ${centerDotSize / 2}px)`,
              top: `calc(50% - ${centerDotSize / 2}px)`,
            }}
          />
        </div>
      )
    } 
    // 양호품 - 초록색 원
    else if (prod.status === "ok" && !isDefective) {
      return (
        <div className="relative" style={{ width: baseSize, height: baseSize }}>
          {/* 반투명 외곽 원 */}
          <div className="absolute inset-0 bg-green-500/20 border border-green-500/40 rounded-full" />
          {/* 중앙 진한 점 */}
          <div
            className="absolute bg-green-500 rounded-full"
            style={{
              width: centerDotSize,
              height: centerDotSize,
              left: `calc(50% - ${centerDotSize / 2}px)`,
              top: `calc(50% - ${centerDotSize / 2}px)`,
            }}
          />
        </div>
      )
    } 
    // 불량품 - 빨간색 삼각형
    else if (prod.status === "fail" || isDefective) {
      return (
        <div className="relative" style={{ width: baseSize, height: baseSize }}>
          {/* 반투명 외곽 삼각형 */}
          <div
            className="absolute border-l-[20px] border-r-[20px] border-b-[34px] border-l-transparent border-r-transparent border-b-red-500/20"
            style={{ left: 0, top: 3 }}
          />
          {/* 진한 외곽선 삼각형 */}
          <div
            className="absolute border-l-[20px] border-r-[20px] border-b-[34px] border-l-transparent border-r-transparent border-b-red-500/40"
            style={{ left: 0, top: 3, borderWidth: "0 20px 34px 20px", borderStyle: "solid" }}
          />
          {/* 중앙 진한 점 */}
          <div
            className="absolute bg-red-500"
            style={{
              width: centerDotSize,
              height: centerDotSize,
              left: `calc(50% - ${centerDotSize / 2}px)`,
              top: `calc(50% - ${centerDotSize / 2}px + 5px)`,
            }}
          />
        </div>
      )
    }

    return null
  }

  return (
    <Card
      className={cn(
        "p-6 bg-card/50 backdrop-blur cursor-pointer transition-all relative",
        isFocused && "ring-2 ring-primary scale-105",
        rail.hasAlert && "ring-2 ring-destructive",  // 불량 발생 시 빨간 테두리
        rail.isStopped && "ring-2 ring-orange-500",  // 정지 시 주황 테두리
      )}
      onClick={onFocus}
    >
      {/* X 버튼 - 레일 오른쪽 위 */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 opacity-70 hover:opacity-100 hover:bg-destructive/20 hover:text-destructive z-10"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        <X className="h-4 w-4" />
      </Button>
      {rail.hasAlert && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">불량 제품 감지!</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onClearAlert()
            }}
          >
            확인
          </Button>
        </div>
      )}

      {showEmergencyCall && (
        <div className="mb-4 p-4 bg-orange-500/10 border-2 border-orange-500 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium text-orange-500">긴급 연락</span>
          </div>
          {assignedEmployee ? (
            <div className="space-y-3">
              <div className="text-sm">
                <p className="font-medium text-foreground">{assignedEmployee.name}</p>
                <p className="text-lg font-semibold text-primary mt-1">{assignedEmployee.phone}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.location.href = `tel:${assignedEmployee.phone}`
                  }}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  통화하기
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCloseEmergencyCall()
                  }}
                >
                  닫기
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              <p>담당 작업자가 없습니다.</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 bg-transparent"
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseEmergencyCall()
                }}
              >
                닫기
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">생산 라인 #{index + 1}</h3>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation()
              onEmergencyCall()
            }}
            className="gap-2"
          >
            <Phone className="h-4 w-4" />
            긴급전화
          </Button>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>양호</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span>불량</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative h-24 bg-white dark:bg-black rounded-lg overflow-hidden border border-gray-300 dark:border-zinc-800">
        {/* START 라벨 */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[#111111] dark:text-green-400 z-20">
          START
        </div>

        {/* END 라벨 */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[#111111] dark:text-red-400 z-20">
          END
        </div>

        {/* 중앙 라인 */}
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-[#3c3c3c] dark:bg-zinc-700" />

        {/* 제품들 렌더링 */}
        {rail.products.map((prod) => (
          <div
            key={prod.id}
            className="absolute transition-all duration-100"
            style={{
              left: `${prod.position}%`, // 0-100% 범위
              top: "50%", // 라인 중앙
              transform: "translate(-50%, -50%)", // 제품 중앙이 라인에 오도록
            }}
          >
            {renderProduct(prod)}

            {/* 가공 중 스파크 애니메이션 */}
            {prod.stage === "machining" && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(12)].map((_, i) => {
                  const angle = (i * Math.PI * 2) / 12
                  const distance = 30
                  return (
                    <div
                      key={i}
                      className="absolute w-1.5 h-1.5 bg-yellow-400 rounded-full"
                      style={{
                        left: "50%",
                        top: "50%",
                        animation: "sparkFly 0.6s ease-out infinite",
                        animationDelay: `${i * 0.05}s`,
                        "--spark-x": `${Math.cos(angle) * distance}px`,
                        "--spark-y": `${Math.sin(angle) * distance}px`,
                      } as React.CSSProperties}
                    />
                  )
                })}
              </div>
            )}
          </div>
        ))}

        {/* CNC 가공 구역 - 61% 위치 */}
        <div
          className="absolute z-10"
          style={{
            left: "60.8%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* CNC 라벨 */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-12 text-xs font-bold text-[#82c7ff] dark:text-cyan-400">
            CNC
          </div>

          {/* 위쪽 압착 도구 */}
          <div
            className="absolute bg-[#3c3c3c] dark:bg-zinc-700 border-2 border-[#82c7ff] dark:border-cyan-400"
            style={{
              width: "48px",
              height: "16px",
              left: "50%",
              transform: `translateX(-50%) translateY(${
                rail.products.some((p) => p.stage === "machining") ? "-4px" : "-20px"
              })`,
              transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              top: "-16px",
              clipPath: "polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)",
            }}
          />

          {/* 아래쪽 압착 도구 */}
          <div
            className="absolute bg-[#3c3c3c] dark:bg-zinc-700 border-2 border-[#82c7ff] dark:border-cyan-400"
            style={{
              width: "48px",
              height: "16px",
              left: "50%",
              transform: `translateX(-50%) translateY(${
                rail.products.some((p) => p.stage === "machining") ? "4px" : "20px"
              })`,
              transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              bottom: "-16px",
              clipPath: "polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)",
            }}
          />
        </div>
      </div>
    </Card>
  )
}

