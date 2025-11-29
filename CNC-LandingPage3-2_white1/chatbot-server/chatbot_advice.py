# ================================================================
#  CNC 불량품 분석 자동화 서버 - 최종 안정버전
#  평균/표준편차 기반 이상값 탐지 + 상관관계 자동 매칭 + GPT 간결 요약
# ================================================================

import os
from typing import Dict, Any, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import numpy as np
from openai import OpenAI

# --------------------------------------------------------------
# 환경 변수 로드
# --------------------------------------------------------------
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------
# TOP10 센서 평균 & 표준편차
# --------------------------------------------------------------
STATS = {
    "X_OutputCurrent":     {"mean": 326.895875, "std": 2.25},
    "M_CURRENT_FEEDRATE":  {"mean": 18.425237,  "std": 11.75},
    "Y_OutputCurrent":     {"mean": 325.936658, "std": 3.00},
    "S_ActualVelocity":    {"mean": 42.731494,  "std": 13.87575},
    "S_OutputCurrent":     {"mean": 322.996474, "std": 6.25},
    "S_SetVelocity":       {"mean": 42.382763,  "std": 13.825},
    "S_SetPosition":       {"mean": -105.221758,"std": 1072.5},
    "S_ActualPosition":    {"mean": -105.538962,"std": 1072.738},
    "Z_ActualPosition":    {"mean": 52.99695,   "std": 23.375},
    "Z_SetPosition":       {"mean": 52.994572,  "std": 23.375}
}

TOP10 = list(STATS.keys())

# --------------------------------------------------------------
# 🔥 CORR_GROUPS — (스핀들 완전 분리 / 위치축도 분리)
# --------------------------------------------------------------
CORR_GROUPS = {
    "Axis Load": [
        "X_OutputCurrent",
        "Y_OutputCurrent"
    ],

    "Feed": [
        "M_CURRENT_FEEDRATE"
    ],

    "Z Axis": [
        "Z_SetPosition",
        "Z_ActualPosition"
    ],

    "Spindle RPM": [
        "S_ActualVelocity",
        "S_SetVelocity"
    ],

    "Spindle Load": [
        "S_OutputCurrent"
    ],

    "Spindle Position": [
        "S_SetPosition",
        "S_ActualPosition"
    ]
}

# --------------------------------------------------------------
# 🔥 그룹 우선순위
# --------------------------------------------------------------
GROUP_PRIORITY = {
    "Spindle Load": 1,
    "Spindle RPM": 2,
    "Axis Load": 3,
    "Feed": 4,
    "Spindle Position": 5,
    "Z Axis": 6,
}


# --------------------------------------------------------------
# 🔥 CORR_RULES — CNC 실제 논리 기반 상관관계
# --------------------------------------------------------------
CORR_RULES = {
    # Axis Load ↔ Feed
    ("Axis Load", "Feed"): "부하가 높은데 이송이 낮으면 절삭저항 증가 또는 공구 마모 가능성이 있습니다.",
    ("Feed", "Axis Load"): "이송이 낮은데 부하가 높으면 절삭 조건 불균형으로 공정 진동이 발생할 수 있습니다.",

    # Axis Load ↔ Z Axis
    ("Axis Load", "Z Axis"): "부하 변화와 Z축 위치 변동이 함께 발생하면 절삭 깊이 변화 또는 위치보정 문제일 수 있습니다.",
    ("Z Axis", "Axis Load"): "Z축 튐 + 부하 변동은 오프셋 오류 또는 절삭 깊이 불안정 가능성이 있습니다.",

    # Spindle RPM ↔ Spindle Load
    ("Spindle RPM", "Spindle Load"): "RPM과 스핀들 부하가 동시에 증가하면 절삭조건 과부하 또는 베어링 마모가 의심됩니다.",
    ("Spindle Load", "Spindle RPM"): "스핀들 부하 상승 + RPM 변동은 칩 배출 문제 또는 절삭저항 증가와 관련될 수 있습니다.",

    # Spindle Position ↔ Z Axis
    ("Spindle Position", "Z Axis"): "스핀들 위치와 Z축 위치가 동시에 튀면 축 직각도 문제 또는 오프셋 보정 오류 가능성이 있습니다.",
    ("Z Axis", "Spindle Position"): "Z축/스핀들 위치 변화 동시 발생은 위치 센서 또는 축 정렬 문제일 수 있습니다.",

    # Spindle RPM ↔ Spindle Position
    ("Spindle RPM", "Spindle Position"): "RPM 변화 + 스핀들 위치 변동은 스핀들 흔들림 또는 진동 가능성이 있습니다.",
    ("Spindle Position", "Spindle RPM"): "스핀들 위치 불안정과 RPM 튐은 베어링 또는 정렬 문제 가능성을 나타냅니다.",

    # Feed ↔ Spindle Load
    ("Feed", "Spindle Load"): "이송이 낮은데 스핀들 부하가 높으면 절삭 저항 급증 또는 공구 마모 위험이 큽니다.",
    ("Spindle Load", "Feed"): "스핀들 부하가 높은데 이송이 낮으면 절삭 조건이 맞지 않아 부하가 증가한 상황입니다.",
}

# --------------------------------------------------------------
# z-score 계산
# --------------------------------------------------------------
def calc_z(value, mean, std):
    if std == 0:
        return 0
    return (value - mean) / std

# --------------------------------------------------------------
# 이상값 탐지
# --------------------------------------------------------------
def detect_abnormal(features):

    abnormal = {}

    for key, value in features.items():
        if key not in STATS:
            continue

        mean = STATS[key]["mean"]
        std = STATS[key]["std"]
        z = calc_z(value, mean, std)

        # z-score 절대값 2 이상이면 이상치
        if abs(z) >= 2:
            diff = abs(round(value - mean, 2))
            level = (
                "경미" if abs(z) < 3 else "주의" if abs(z) < 4 else "심각"
            )  # NEW

            abnormal[key] = {
                "value": float(value),
                "reason": f"평균보다 {diff}만큼 {'높음' if z > 0 else '낮음'}",
                "z": round(z, 2),
                "level": level,
            }

    return abnormal
# --------------------------------------------------------------
# 상관관계 자동 분석
# --------------------------------------------------------------
def correlate(abnormal_keys):

    active_groups = set()

    # 어떤 그룹에 속하는 값이 튀었는지 체크
    for g, members in CORR_GROUPS.items():
        if any(k in members for k in abnormal_keys):
            active_groups.add(g)

    # 그룹 1개만 튀면 상관관계 의미 없음 (NEW)
    if len(active_groups) < 2:
        return []

    # 우선순위 정렬 (NEW)
    sorted_groups = sorted(active_groups, key=lambda x: GROUP_PRIORITY[x])

    correlations = []

    for g1 in sorted_groups:
        for g2 in sorted_groups:
            rule = CORR_RULES.get((g1, g2))
            if rule:
                correlations.append(rule)

    # 중복 제거 (NEW)
    return list(dict.fromkeys(correlations))


# --------------------------------------------------------------
# GPT 요약 (짧고 간결하게)
# --------------------------------------------------------------
def gpt_summarize(abnormal, correlations):

    try:
        prompt = f"""
다음 CNC 이상 상황을 5줄 이내로 간결히 요약해줘.

● 이상값:
{abnormal}

● 상관관계:
{correlations}

조건:
- 핵심 위주
- 실무자가 바로 조치할 수 있도록
- 어려운 용어 쓰지 말기
"""

        res = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )

        return res.choices[0].message.content

    except Exception as e:
        return f"GPT 오류: {str(e)}"


# --------------------------------------------------------------
# 입력 데이터 스키마
# --------------------------------------------------------------
class DefectData(BaseModel):
    cncName: Optional[str]
    productId: Optional[str]
    features: Dict[str, Any]


# --------------------------------------------------------------
# 메인 API
# --------------------------------------------------------------
@app.post("/chatbot/diagnose-from-defect")
def diagnose_from_defect(data: DefectData):

    # TOP10 기준으로 feature 추출
    features = {k: float(data.features.get(k, 0)) for k in TOP10}

    # 이상값 탐지
    abnormal = detect_abnormal(features)

    # 상관관계 분석
    correlations = correlate(list(abnormal.keys()))

    # GPT 요약
    advice = gpt_summarize(abnormal, correlations)

    # UI 색상 강조용 심각도 전달 (NEW)
    severity = (
        "심각"
        if any(v["level"] == "심각" for v in abnormal.values())
        else "주의"
        if any(v["level"] == "주의" for v in abnormal.values())
        else "경미"
    )

    return {
        "status": "FAIL",
        "cncName": data.cncName or "",
        "productId": data.productId or "",
        "diagnosis": {
            "expert_advice": advice,
            "abnormal": abnormal,
            "correlations": correlations
        }
    }


# --------------------------------------------------------------
# 헬스 체크
# --------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}
