"use client";

import { useEffect, useState } from "react";

export default function TestCNC() {
  const [latest, setLatest] = useState<any>(null);
  const [rail, setRail] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const res1 = await fetch("http://localhost:5000/cnc/CNC-001/latest");
      const json1 = await res1.json();

      const res2 = await fetch("http://localhost:5000/cnc/CNC-001/rail");
      const json2 = await res2.json();

      setLatest(json1);
      setRail(json2.items || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // 첫 로드 때 한번
    fetchData();

    // 🔥 1초마다 반복
    const timer = setInterval(fetchData, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>🔍 CNC-001 데이터 테스트 (자동 갱신)</h1>

      <h2>/latest</h2>
      <pre>{JSON.stringify(latest, null, 2)}</pre>

      <h2>/rail</h2>
      <pre>{JSON.stringify(rail, null, 2)}</pre>
    </div>
  );
}

