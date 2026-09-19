"use client";
import { useEffect, useState } from "react";
import { ReportView } from "@/components/report/ReportView";
import { DecisionSupportBanner } from "@/components/report/DecisionSupportBanner";
import type { CandidateReport } from "@shared/contracts";

export default function OfflineReport() {
  const [report, setReport] = useState<CandidateReport | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      try { const saved = localStorage.getItem("claimproof-offline-report"); if (saved) setReport(JSON.parse(saved)); } catch { /* Missing/corrupt session stays explicitly unavailable. */ }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  return <main className="mx-auto max-w-4xl space-y-6 p-8"><a href="/candidate" className="text-sky-700 underline">Back to candidate session</a><h1 className="text-3xl font-semibold">Offline rehearsal report</h1><p className="rounded-lg bg-amber-50 p-4">This report contains this browser’s submitted answers. Assessments are unresolved; no live model or external verification was performed.</p><DecisionSupportBanner />{report ? <ReportView report={report} /> : <p>No completed offline session found. Complete an offline rehearsal first.</p>}</main>;
}
