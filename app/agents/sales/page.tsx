"use client";

import Link from "next/link";
import { useState, useMemo, memo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Rectangle,
} from "recharts";

const MOCK_COMPANIES = [
  {
    id: "1",
    name: "(주)테크솔루션",
    bizNumber: "123-45-67890",
    ceoName: "김대표",
    address: "서울특별시 강남구 테헤란로 123",
    mainPhone: "02-1234-5678",
    taxEmail: "tax@techsolution.co.kr",
    accountBank: "기업은행",
    accountNumber: "123-456-789012",
    bizLicenseImageUrl: "",
    bankbookImageUrl: "",
    contacts: [
      { id: "c1", name: "박지현", title: "과장", phone: "010-1234-5678", email: "jh.park@techsolution.co.kr" },
      { id: "c2", name: "이정우", title: "대리", phone: "010-2345-6789", email: "jw.lee@techsolution.co.kr" },
    ],
  },
  {
    id: "2",
    name: "글로벌트레이드",
    bizNumber: "234-56-78901",
    ceoName: "",
    address: "",
    mainPhone: "",
    taxEmail: "",
    accountBank: "",
    accountNumber: "",
    bizLicenseImageUrl: "",
    bankbookImageUrl: "",
    contacts: [],
  },
  {
    id: "3",
    name: "디지털인프라",
    bizNumber: "345-67-89012",
    ceoName: "",
    address: "",
    mainPhone: "",
    taxEmail: "",
    accountBank: "",
    accountNumber: "",
    bizLicenseImageUrl: "",
    bankbookImageUrl: "",
    contacts: [],
  },
  {
    id: "4",
    name: "스마트시티코리아",
    bizNumber: "456-78-90123",
    ceoName: "",
    address: "",
    mainPhone: "",
    taxEmail: "",
    accountBank: "",
    accountNumber: "",
    bizLicenseImageUrl: "",
    bankbookImageUrl: "",
    contacts: [],
  },
];

type CustomerContact = {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
};

function newContactId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nextImageId(): string {
  return `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const MOCK_PROJECTS_BY_COMPANY: Record<string, { id: string; name: string; due: string; progress: number; revenue: number; status: string }[]> = {
  "1": [
    { id: "p1", name: "2025 유지보수 계약 이행", due: "2025-06-30", progress: 65, revenue: 36000000, status: "진행중" },
    { id: "p2", name: "Q2 신규 모듈 도입", due: "2025-05-15", progress: 30, revenue: 85000000, status: "진행중" },
    { id: "p3", name: "정기 점검 3월", due: "2025-03-20", progress: 80, revenue: 12000000, status: "완료" },
  ],
  "2": [
    { id: "p4", name: "수출 계약 이행", due: "2025-04-30", progress: 20, revenue: 150000000, status: "진행중" },
  ],
  "3": [
    { id: "p5", name: "인프라 확장 1차", due: "2025-07-31", progress: 10, revenue: 220000000, status: "진행중" },
    { id: "p6", name: "보안 점검", due: "2025-05-10", progress: 50, revenue: 45000000, status: "완료" },
  ],
  "4": [],
};

function formatRevenue(n: number): string {
  return n.toLocaleString("ko-KR") + "원";
}

type ProjectDetailFields = {
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  manager: string;
  department: string;
  desc: string;
  note?: string;
  revenue?: number;
  budget?: number;
  costs?: { id: string; date: string; title: string; amount?: number; note?: string }[];
};
const PROJECT_DETAIL: Record<string, ProjectDetailFields> = {
  p1: { name: "2025 유지보수 계약 이행", status: "진행중", startDate: "2025-01-01", endDate: "2025-06-30", manager: "김영업", department: "영업팀", desc: "연간 유지보수 계약 이행 프로젝트. 정기 점검, 장애 대응, 소규모 개선 요청 반영.", revenue: 36000000, budget: 40000000, costs: [{ id: "cost_p1_1", date: "2025-02-10", title: "현장 출장비", amount: 1800000 }, { id: "cost_p1_2", date: "2025-03-05", title: "부품 교체비", amount: 4200000 }] },
  p2: { name: "Q2 신규 모듈 도입", status: "기획", startDate: "2025-04-01", endDate: "2025-05-15", manager: "박기획", department: "기획팀", desc: "신규 모듈 요구사항 정리 및 제안서 작성. 예산 확정 후 착수.", revenue: 85000000, budget: 12000000, costs: [{ id: "cost_p2_1", date: "2025-03-22", title: "사전 조사비", amount: 900000 }] },
  p3: { name: "정기 점검 3월", status: "완료", startDate: "2025-03-01", endDate: "2025-03-20", manager: "김영업", department: "영업팀", desc: "3월 정기 방문 점검. 현장 2명 동행, 점검 리포트 제출.", revenue: 12000000, budget: 4500000, costs: [{ id: "cost_p3_1", date: "2025-03-08", title: "점검 장비 대여", amount: 1200000 }] },
  p4: { name: "수출 계약 이행", status: "진행중", startDate: "2025-03-01", endDate: "2025-04-30", manager: "이대리", department: "영업팀", desc: "수출 계약에 따른 납품 및 서류 진행.", revenue: 150000000, budget: 30000000, costs: [{ id: "cost_p4_1", date: "2025-03-12", title: "통관 서류 처리비", amount: 2600000 }] },
  p5: { name: "인프라 확장 1차", status: "기획", startDate: "2025-05-01", endDate: "2025-07-31", manager: "박팀장", department: "기술팀", desc: "서버 및 네트워크 확장 1차 공사.", revenue: 220000000, budget: 50000000, costs: [{ id: "cost_p5_1", date: "2025-04-02", title: "장비 사전 발주금", amount: 4300000 }] },
  p6: { name: "보안 점검", status: "완료", startDate: "2025-04-01", endDate: "2025-05-10", manager: "박팀장", department: "기술팀", desc: "전사 보안 점검 및 개선 권고안 작성.", revenue: 45000000, budget: 8000000, costs: [{ id: "cost_p6_1", date: "2025-04-14", title: "취약점 진단 도구", amount: 1500000 }] },
};

const MEETING_NOTES_BY_PROJECT: Record<string, { date: string; title: string; summary: string }[]> = {
  p1: [
    { date: "2025-03-10 11:00", title: "Q2 제안서 검토 회의", summary: "신규 모듈 도입 시기, 예산 범위 합의. 다음 주 내 제안서 초안 전달 예정." },
    { date: "2025-03-01 16:00", title: "3월 정기 점검 일정 협의", summary: "3/20 방문 점검 확정. 담당자 박기획, 현장 2명 동행." },
    { date: "2025-02-15 14:00", title: "2월 진행 상황 점검", summary: "이슈 없음. 3월 점검 일정만 확정 요청." },
  ],
  p2: [{ date: "2025-03-08 10:00", title: "신규 모듈 킥오프", summary: "범위 및 일정 논의. 4월 초 요구사항 정리본 공유." }],
  p3: [{ date: "2025-03-01 16:00", title: "3월 정기 점검 일정 협의", summary: "3/20 방문 점검 확정." }],
  p4: [],
  p5: [],
  p6: [],
};

const TIMELINE_ITEMS = [
  { time: "2025-03-12 14:30", type: "approval" as const, typeLabel: "전자결재", title: "계약서 검토 결재 승인", desc: "김영업 → 이대표 결재 완료." },
  { time: "2025-03-10 11:00", type: "meeting" as const, typeLabel: "회의록", title: "Q2 제안서 검토 회의 요약", desc: "신규 모듈 도입 시기, 예산 범위 합의." },
  { time: "2025-03-05 09:15", type: "receipt" as const, typeLabel: "전표", title: "교육비 지출 120만 원", desc: "온라인 교육 플랫폼 이용료." },
  { time: "2025-03-01 16:00", type: "meeting" as const, typeLabel: "회의록", title: "3월 정기 점검 일정 협의", desc: "3/20 방문 점검 확정." },
  { time: "2025-02-28 10:00", type: "approval" as const, typeLabel: "전자결재", title: "견적서 결재 대기 → 승인", desc: "추가 라이선스 50건 견적." },
];

const initialProjectDetail = (id: string): ProjectDetailFields =>
  PROJECT_DETAIL[id]
    ? { ...PROJECT_DETAIL[id], costs: [...(PROJECT_DETAIL[id].costs ?? [])] }
    : { name: "", status: "", startDate: "", endDate: "", manager: "", department: "", desc: "", revenue: 0, budget: 0, costs: [] };

const OVERVIEW_LABELS = ["올해 목표", "계획", "진행", "확정"] as const;
const OVERVIEW_YEAR_TARGET = 700_000_000;

type ProjectStatusKey = "planned" | "inProgress" | "done";
type ProjectStatusFilter = "all" | ProjectStatusKey;
type ProjectListItem = { id: string; name: string; due: string; progress: number; revenue: number; status: string };
type ProjectRow = {
  companyId: string;
  companyName: string;
  projectId: string;
  projectName: string;
  due: string;
  progress: number;
  revenue: number;
  status: ProjectStatusKey;
  statusLabel: "계획" | "진행" | "완료";
};

function newProjectId(): string {
  return `np_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function newCostId(): string {
  return `cost_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const CompanyCreateModal = memo(function CompanyCreateModal(props: {
  onClose: () => void;
  onSave: (payload: { name: string }) => void;
}) {
  const [name, setName] = useState("");

  return (
    <div
      className="sales-project-edit-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && props.onClose()}
    >
      <div className="sales-project-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sales-project-edit-modal-header">고객사 추가</div>
        <div className="sales-project-edit-modal-body">
          <div className="sales-detail-section">
            <div className="sales-detail-section-title">고객 정보</div>
            <div className="sales-detail-grid">
              <label className="sales-detail-label">고객사명</label>
              <input
                className="sales-project-edit-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: (주)테크솔루션"
                autoFocus
              />
            </div>
          </div>
        </div>
        <div className="sales-project-edit-modal-footer">
          <button type="button" className="sales-project-edit-cancel" onClick={props.onClose}>
            취소
          </button>
          <button
            type="button"
            className="sales-project-edit-save"
            onClick={() => {
              const n = name.trim();
              if (!n) return;
              props.onSave({ name: n });
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
});

export default function SalesAgentPage() {
  const [viewMode, setViewMode] = useState<"overview" | "detail">("overview");
  // overview 첫 화면은 프로젝트 현황으로 고정
  const [selectedCompanyId, setSelectedCompanyId] = useState("1");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [companyCreateOpen, setCompanyCreateOpen] = useState(false);
  const [companies, setCompanies] = useState(() => MOCK_COMPANIES);
  const initialProjectId = (MOCK_PROJECTS_BY_COMPANY["1"] ?? [])[0]?.id ?? null;
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId);
  const [projectEditing, setProjectEditing] = useState(false);
  const [addedProjectsByCompany, setAddedProjectsByCompany] = useState<Record<string, ProjectListItem[]>>({});
  const [editedProjectDetails, setEditedProjectDetails] = useState<Record<string, ProjectDetailFields>>({});
  const [budgetApplyOpen, setBudgetApplyOpen] = useState(false);
  const [budgetApplyValue, setBudgetApplyValue] = useState<string>("");
  const [editForm, setEditForm] = useState<ProjectDetailFields>(initialProjectDetail("p1"));
  const [detailMode, setDetailMode] = useState<"project" | "customer">("project");
  const [customerEditing, setCustomerEditing] = useState(false);
  const [customerEditForm, setCustomerEditForm] = useState({
    name: "",
    bizNumber: "",
    ceoName: "",
    address: "",
    mainPhone: "",
    taxEmail: "",
    accountBank: "",
    accountNumber: "",
    contacts: [] as CustomerContact[],
  });
  const [checkedCustomerContactIds, setCheckedCustomerContactIds] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<null | { title: string; url: string }>(null);
  const [projectStatusFilter, setProjectStatusFilter] = useState<ProjectStatusFilter>("all");
  // 프로젝트 현황 리스트는 10행 높이로 고정하고, 그 이상은 스크롤로 노출

  const getProjectRevenue = (projectId: string, fallback: number) =>
    editedProjectDetails[projectId]?.revenue ?? fallback;

  const projectsByCompany = useMemo(() => {
    const result: Record<string, ProjectListItem[]> = {};
    Object.entries(MOCK_PROJECTS_BY_COMPANY).forEach(([companyId, list]) => {
      result[companyId] = [...list, ...(addedProjectsByCompany[companyId] ?? [])];
    });
    Object.entries(addedProjectsByCompany).forEach(([companyId, list]) => {
      if (!result[companyId]) result[companyId] = [...list];
    });
    return result;
  }, [addedProjectsByCompany]);

  const salesOverviewAmounts = useMemo(() => {
    let 계획 = 0;
    let 진행 = 0;
    let 완료 = 0;
    Object.entries(projectsByCompany).forEach(([, list]) => {
      list.forEach((p) => {
        const rev = getProjectRevenue(p.id, p.revenue);
        if (p.status === "기획") 계획 += rev;
        else if (p.status === "진행중") 진행 += rev;
        else if (p.status === "완료") 완료 += rev;
      });
    });
    return {
      "올해 목표": OVERVIEW_YEAR_TARGET,
      계획,
      진행,
      완료,
      확정: 완료,
    };
  }, [editedProjectDetails, companies, projectsByCompany]);

  const filteredCompanies = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [searchKeyword, companies]);

  const projects = useMemo(() => projectsByCompany[selectedCompanyId] ?? [], [selectedCompanyId, projectsByCompany]);
  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) ?? null,
    [selectedCompanyId, companies],
  );

  const allProjects = useMemo((): ProjectRow[] => {
      const fromMock = (): ProjectRow[] => {
      const rows: ProjectRow[] = [];
      Object.entries(projectsByCompany).forEach(([companyId, list]) => {
        const companyName = companies.find((c) => c.id === companyId)?.name ?? "고객사";
        list.forEach((p) => {
          const rev = getProjectRevenue(p.id, p.revenue);
          const status: ProjectStatusKey =
            p.status === "완료" ? "done" : p.status === "진행중" ? "inProgress" : "planned";
          const statusLabel: ProjectRow["statusLabel"] =
            status === "done" ? "완료" : status === "inProgress" ? "진행" : "계획";
          rows.push({
            companyId,
            companyName,
            projectId: p.id,
            projectName: p.name,
            due: p.due,
            progress: p.progress,
            revenue: rev,
            status,
            statusLabel,
          });
        });
      });
      return rows;
    };

    const rows = fromMock();
    rows.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
    return rows;
  }, [editedProjectDetails, companies, projectsByCompany]);

  const filteredAllProjects = useMemo(() => {
    if (projectStatusFilter === "all") return allProjects;
    return allProjects.filter((p) => p.status === projectStatusFilter);
  }, [allProjects, projectStatusFilter]);

  // (DB 연동 시에도) filteredAllProjects를 그대로 렌더링하고 컨테이너에서 스크롤 처리
  const projectDetail = selectedProjectId
    ? (editedProjectDetails[selectedProjectId] ?? PROJECT_DETAIL[selectedProjectId] ?? null)
    : null;
  const meetingNotes = selectedProjectId ? (MEETING_NOTES_BY_PROJECT[selectedProjectId] ?? []).slice().reverse() : [];

  const companySummary = useMemo(() => {
    const list = projects;
    let 진행중 = 0;
    let 완료 = 0;
    list.forEach((p) => {
      const rev = getProjectRevenue(p.id, p.revenue);
      if (p.status === "진행중") 진행중 += rev;
      else if (p.status === "완료") 완료 += rev;
    });
    return { 진행중, 완료 };
  }, [projects, editedProjectDetails]);

  const openProjectEdit = () => {
    if (!selectedProjectId || !projectDetail) return;
    setEditForm({
      ...projectDetail,
      revenue: projectDetail.revenue ?? projects.find((p) => p.id === selectedProjectId)?.revenue ?? 0,
      budget: projectDetail.budget ?? 0,
      costs: [...(projectDetail.costs ?? [])],
    });
    setProjectEditing(true);
  };
  const closeProjectEdit = () => setProjectEditing(false);
  const saveProjectEdit = () => {
    if (!selectedProjectId) return;
    const rev = typeof editForm.revenue === "number" && !Number.isNaN(editForm.revenue)
      ? editForm.revenue
      : Math.max(0, Number(String(editForm.revenue ?? "").replace(/,/g, "")) || 0);
    const budget = typeof editForm.budget === "number" && !Number.isNaN(editForm.budget)
      ? editForm.budget
      : Math.max(0, Number(String(editForm.budget ?? "").replace(/,/g, "")) || 0);
    const costs = (editForm.costs ?? []).map((c) => ({
      id: c.id || newCostId(),
      date: c.date || "",
      title: c.title || "",
      amount: Math.max(0, Number(String(c.amount ?? 0).replace(/,/g, "")) || 0),
      note: c.note || "",
    }));
    setEditedProjectDetails((prev) => ({ ...prev, [selectedProjectId]: { ...editForm, revenue: rev, budget, costs } }));
    setAddedProjectsByCompany((prev) => {
      const list = prev[selectedCompanyId] ?? [];
      if (!list.some((p) => p.id === selectedProjectId)) return prev;
      const mapped = list.map((p) =>
        p.id === selectedProjectId
          ? {
              ...p,
              name: editForm.name || p.name,
              due: editForm.endDate || p.due,
              status: editForm.status || p.status,
              revenue: rev,
            }
          : p,
      );
      return { ...prev, [selectedCompanyId]: mapped };
    });
    setProjectEditing(false);
  };

  const TargetOverviewSection = () => (
    <>
      {/* KPI 카드: 올해 목표, 확정, 진행, 계획 */}
      <div className="sales-kpi-grid">
        <div className="sales-kpi-card">
          <div className="sales-kpi-icon sales-kpi-icon-target">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </div>
          <div className="sales-kpi-body">
            <span className="sales-kpi-label">올해 목표</span>
            <span className="sales-kpi-value">{formatRevenue(salesOverviewAmounts["올해 목표"])}</span>
          </div>
        </div>
        <div className="sales-kpi-card">
          <div className="sales-kpi-icon sales-kpi-icon-done">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="sales-kpi-body">
            <span className="sales-kpi-label">확정</span>
            <span className="sales-kpi-value">{formatRevenue(salesOverviewAmounts.확정)}</span>
            <span className="sales-kpi-rate">
              목표 대비 {salesOverviewAmounts["올해 목표"] > 0 ? ((salesOverviewAmounts.확정 / salesOverviewAmounts["올해 목표"]) * 100).toFixed(1) : "0"}%
            </span>
          </div>
        </div>
        <div className="sales-kpi-card">
          <div className="sales-kpi-icon sales-kpi-icon-progress">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div className="sales-kpi-body">
            <span className="sales-kpi-label">진행</span>
            <span className="sales-kpi-value">{formatRevenue(salesOverviewAmounts.진행)}</span>
            <span className="sales-kpi-rate">
              목표 대비 {salesOverviewAmounts["올해 목표"] > 0 ? ((salesOverviewAmounts.진행 / salesOverviewAmounts["올해 목표"]) * 100).toFixed(1) : "0"}%
            </span>
          </div>
        </div>
        <div className="sales-kpi-card">
          <div className="sales-kpi-icon sales-kpi-icon-plan">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="sales-kpi-body">
            <span className="sales-kpi-label">계획</span>
            <span className="sales-kpi-value">{formatRevenue(salesOverviewAmounts.계획)}</span>
            <span className="sales-kpi-rate">
              목표 대비 {salesOverviewAmounts["올해 목표"] > 0 ? ((salesOverviewAmounts.계획 / salesOverviewAmounts["올해 목표"]) * 100).toFixed(1) : "0"}%
            </span>
          </div>
        </div>
      </div>

      {/* 목표(100% 기준) · 현황(확정+진행+계획 누적), 동일 금액 축으로 달성 여부 판단 */}
      <div className="sales-overview-chart-card">
        {(() => {
          const targetAmount = salesOverviewAmounts["올해 목표"];
          const total = salesOverviewAmounts.확정 + salesOverviewAmounts.진행 + salesOverviewAmounts.계획;
          const achievementRate = targetAmount > 0 ? (total / targetAmount * 100) : 0;
          const extraNeeded = Math.max(0, targetAmount - total);
          return (
            <div className="sales-overview-chart-head">
              <h3 className="sales-overview-chart-title">단계별 구성 금액</h3>
              <div className="sales-overview-chart-achievement">
                목표 대비 달성률 <strong>{achievementRate.toFixed(1)}%</strong>
                {achievementRate >= 100 ? "" : ` (추가 필요: ${formatRevenue(extraNeeded)})`}
              </div>
            </div>
          );
        })()}
        {(() => {
          const targetAmount = salesOverviewAmounts["올해 목표"];
          const total = salesOverviewAmounts.확정 + salesOverviewAmounts.진행 + salesOverviewAmounts.계획;
          const maxVal = Math.max(targetAmount, total, 1);
          const achievementRate = targetAmount > 0 ? (total / targetAmount * 100) : 0;
          const stackData = [
            { name: "목표", 목표: targetAmount },
            {
              name: "현황",
              확정: salesOverviewAmounts.확정,
              진행: salesOverviewAmounts.진행,
              계획: salesOverviewAmounts.계획,
              total,
            },
          ];
          const STACK_COLORS = { 확정: "#0d9488", 진행: "#6667AB", 계획: "#64748b", 목표: "#475569" };
          const chartHeight = 130;
          const chartMargins = 16 + 16;
          const barCategoryGap = 12;
          const bandHeight = (chartHeight - chartMargins - barCategoryGap) / 2;
          const barSize = 32;
          const barOffset = (bandHeight - barSize) / 2;
          const labelFontSize = 14;
          const renderTargetLabel = (value: number) => {
            if (value <= 0) return "";
            return `${formatRevenue(value)} (100%)`;
          };
          const renderStackLabel = (value: number, segmentName: string) => {
            if (value <= 0) return "";
            const pctOfTarget = targetAmount > 0 ? (value / targetAmount * 100).toFixed(1) : "0";
            return `${segmentName}(${pctOfTarget}%)`;
          };
          const toNum = (n: string | number | undefined) => (typeof n === "number" ? n : Number(n) || 0);
          const barLabelContentTarget = (props: Record<string, unknown>) => {
            const v = toNum(props.value as number | string | undefined);
            const text = renderTargetLabel(v);
            if (!text) return null;
            const x = toNum(props.x as number | string | undefined);
            const y = toNum(props.y as number | string | undefined);
            const w = toNum(props.width as number | string | undefined);
            const cx = x + w / 2;
            const cy = y + barOffset + barSize / 2;
            return <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={labelFontSize}>{text}</text>;
          };
          const barLabelContentStack = (segmentName: "확정" | "진행" | "계획") => (props: Record<string, unknown>) => {
            const v = toNum(props.value as number | string | undefined);
            const text = renderStackLabel(v, segmentName);
            if (!text) return null;
            const x = toNum(props.x as number | string | undefined);
            const y = toNum(props.y as number | string | undefined);
            const w = toNum(props.width as number | string | undefined);
            const cx = x + w / 2;
            const cy = y;
            return <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={labelFontSize}>{text}</text>;
          };
          return (
            <div className="sales-stacked-chart-wrap">
              <ResponsiveContainer width="100%" height={130}>
                <BarChart layout="vertical" data={stackData} margin={{ top: 16, right: 180, left: 48, bottom: 16 }} barCategoryGap={12} barGap={4}>
                  <XAxis type="number" hide domain={[0, maxVal]} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={56}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={36}
                    tick={({ x, y, payload }) => (
                      <g transform={`translate(${x},${y})`}>
                        <text textAnchor="end" dominantBaseline="middle" fill="currentColor" style={{ fontSize: 14, fontWeight: 600 }}>
                          {payload?.value}
                        </text>
                      </g>
                    )}
                  />
                  <Tooltip cursor={false}
                    content={((tooltipProps: unknown) => {
                      const props = tooltipProps as { active?: boolean; payload?: { payload: Record<string, unknown> }[] };
                      const { active, payload } = props;
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload as { name: string; 목표?: number; 확정?: number; 진행?: number; 계획?: number; total?: number };
                      if (item.name === "목표") {
                        return (
                          <div className="sales-chart-tooltip">
                            <div className="sales-chart-tooltip-row">
                              <span style={{ color: STACK_COLORS.목표 }}>목표</span>
                              <span>{formatRevenue(item.목표 ?? 0)}</span>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="sales-chart-tooltip">
                          <div className="sales-chart-tooltip-row">
                            <span style={{ color: STACK_COLORS.확정 }}>확정</span>
                            <span>{formatRevenue(item.확정 ?? 0)} (목표 대비 {targetAmount > 0 ? ((item.확정 ?? 0) / targetAmount * 100).toFixed(1) : "0"}%)</span>
                          </div>
                          <div className="sales-chart-tooltip-row">
                            <span style={{ color: STACK_COLORS.진행 }}>진행</span>
                            <span>{formatRevenue(item.진행 ?? 0)} (목표 대비 {targetAmount > 0 ? ((item.진행 ?? 0) / targetAmount * 100).toFixed(1) : "0"}%)</span>
                          </div>
                          <div className="sales-chart-tooltip-row">
                            <span style={{ color: STACK_COLORS.계획 }}>계획</span>
                            <span>{formatRevenue(item.계획 ?? 0)} (목표 대비 {targetAmount > 0 ? ((item.계획 ?? 0) / targetAmount * 100).toFixed(1) : "0"}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  />
                  <Bar
                    dataKey="목표"
                    fill={STACK_COLORS.목표}
                    barSize={barSize}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={barSize}
                    shape={(props: unknown) => (
                      <Rectangle {...(props as object)} y={((props as { y?: number }).y ?? 0) + barOffset} height={barSize} />
                    )}
                  >
                    <LabelList dataKey="목표" content={barLabelContentTarget as never} />
                  </Bar>
                  <Bar
                    dataKey="확정"
                    stackId="a"
                    fill={STACK_COLORS.확정}
                    radius={0}
                    barSize={barSize}
                    shape={(props: unknown) => {
                      const p = props as { y?: number; [k: string]: unknown };
                      const y = p.y ?? 0;
                      const top = y - barSize / 2;
                      return <Rectangle {...(p as object)} y={top} height={barSize} />;
                    }}
                  >
                    <LabelList dataKey="확정" content={barLabelContentStack("확정") as never} />
                  </Bar>
                  <Bar
                    dataKey="진행"
                    stackId="a"
                    fill={STACK_COLORS.진행}
                    radius={0}
                    barSize={barSize}
                    shape={(props: unknown) => {
                      const p = props as { y?: number; [k: string]: unknown };
                      const y = p.y ?? 0;
                      const top = y - barSize / 2;
                      return <Rectangle {...(p as object)} y={top} height={barSize} />;
                    }}
                  >
                    <LabelList dataKey="진행" content={barLabelContentStack("진행") as never} />
                  </Bar>
                  <Bar
                    dataKey="계획"
                    stackId="a"
                    fill={STACK_COLORS.계획}
                    radius={[0, 4, 4, 0]}
                    barSize={barSize}
                    shape={(props: unknown) => {
                      const p = props as { y?: number; [k: string]: unknown };
                      const y = p.y ?? 0;
                      const top = y - barSize / 2;
                      return <Rectangle {...(p as object)} y={top} height={barSize} />;
                    }}
                  >
                    <LabelList dataKey="계획" content={barLabelContentStack("계획") as never} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        })()}
      </div>
    </>
  );

  return (
    <div className="agent-page sales-onepage">
      <header className="agent-page-header">
        <h1 className="agent-page-title">프로젝트 관리</h1>
        <Link href="/" className="agent-page-home-btn">
          홈으로 돌아가기
        </Link>
      </header>
      <main className="agent-page-body">
        <div className="sales-onepage-wrap">
          <aside className={`sales-master ${searchOpen ? "is-search-open" : ""}`}>
            <div className="sales-status-section">
              <div className="sales-status-header">
                <span className="sales-master-title">프로젝트 현황</span>
              </div>
              <div className="sales-status-list">
                <button
                  type="button"
                  className={`sales-master-item ${viewMode === "overview" ? "is-selected" : ""}`}
                  onClick={() => setViewMode("overview")}
                >
                  <span className="sales-master-item-name">프로젝트 현황</span>
                </button>
              </div>
            </div>
            <div className="sales-master-header">
              <span className="sales-master-title">고객사</span>
              <button
                type="button"
                className="sales-search-btn"
                title="고객사 추가"
                onClick={() => setCompanyCreateOpen(true)}
              >
                추가
              </button>
              <button
                type="button"
                className="sales-search-btn"
                title="키워드 검색"
                onClick={() => setSearchOpen((v) => !v)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
            <div className="sales-search-wrap">
              <input
                type="text"
                className="sales-search-input"
                placeholder="고객사명 검색..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
            <div className="sales-master-list">
              {filteredCompanies.map((c) => {
                const companyProjects = projectsByCompany[c.id] ?? [];
                const inProgress = companyProjects.filter((p) => p.status === "진행중").length;
                const total = companyProjects.length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`sales-master-item ${selectedCompanyId === c.id ? "is-selected" : ""}`}
                    onClick={() => {
                      setSelectedCompanyId(c.id);
                      const first = companyProjects[0]?.id ?? null;
                      setSelectedProjectId(first);
                      setViewMode("detail");
                    }}
                  >
                    <div className="sales-master-item-left">
                      <span className="sales-master-item-name">{c.name}</span>
                      <span className="sales-master-item-meta">사업자번호: {c.bizNumber}</span>
                    </div>
                    <span className="sales-master-item-count">
                      <span className="sales-master-item-count-progress">{inProgress}</span> / {total}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
          {companyCreateOpen && (
            <CompanyCreateModal
              onClose={() => setCompanyCreateOpen(false)}
              onSave={({ name }) => {
                const id = `c_${Date.now()}`;
                setCompanies((prev) => [
                  {
                    id,
                    name,
                    bizNumber: "-",
                    ceoName: "",
                    address: "",
                    mainPhone: "",
                    taxEmail: "",
                    accountBank: "",
                    accountNumber: "",
                    bizLicenseImageUrl: "",
                    bankbookImageUrl: "",
                    contacts: [],
                  },
                  ...prev,
                ]);
                setSelectedCompanyId(id);
                setCompanyCreateOpen(false);
                setViewMode("detail");
                setDetailMode("customer");
                setSelectedProjectId(null);
              }}
            />
          )}
          <div className="sales-detail-area">
            {viewMode === "overview" ? (
              <div className="sales-overview-full">
                <h2 className="sales-overview-full-title">프로젝트 현황</h2>

                <>
                  <TargetOverviewSection />
                  <div className="sales-project-status-wrap">
                      <div className="sales-overview-chart-head">
                        <h3 className="sales-overview-chart-title">프로젝트 현황</h3>
                        <div className="sales-overview-chart-achievement">
                          총 <strong>{filteredAllProjects.length}</strong>건
                        </div>
                      </div>
                    <div className="sales-project-status-toolbar">
                      <div className="sales-project-status-filters">
                        <button
                          type="button"
                          className={`sales-filter-chip ${projectStatusFilter === "all" ? "is-active" : ""}`}
                          onClick={() => {
                            setProjectStatusFilter("all");
                          }}
                        >
                          전체
                        </button>
                        <button
                          type="button"
                          className={`sales-filter-chip ${projectStatusFilter === "planned" ? "is-active" : ""}`}
                          onClick={() => {
                            setProjectStatusFilter("planned");
                          }}
                        >
                          계획
                        </button>
                        <button
                          type="button"
                          className={`sales-filter-chip ${projectStatusFilter === "inProgress" ? "is-active" : ""}`}
                          onClick={() => {
                            setProjectStatusFilter("inProgress");
                          }}
                        >
                          진행
                        </button>
                        <button
                          type="button"
                          className={`sales-filter-chip ${projectStatusFilter === "done" ? "is-active" : ""}`}
                          onClick={() => {
                            setProjectStatusFilter("done");
                          }}
                        >
                          완료
                        </button>
                      </div>
                    </div>

                    {filteredAllProjects.length === 0 ? (
                      <div className="sales-project-status-empty">해당 조건의 프로젝트가 없습니다.</div>
                    ) : (
                      <div className="sales-project-status-table">
                        <div className="sales-project-status-table-head">
                          <span>상태</span>
                          <span>프로젝트</span>
                          <span>고객명</span>
                          <span>마감</span>
                          <span>진행률</span>
                          <span>금액</span>
                        </div>
                        <div className="sales-project-status-list">
                          {filteredAllProjects.map((p) => (
                            <button
                              key={p.projectId}
                              type="button"
                              className="sales-project-status-item"
                              onClick={() => {
                                setSelectedCompanyId(p.companyId);
                                setViewMode("detail");
                                setDetailMode("project");
                                setSelectedProjectId(p.projectId);
                              }}
                            >
                              <div className="sales-project-status-item-row">
                                <span
                                  className={`sales-project-status-badge ${
                                    p.status === "done"
                                      ? "status-done"
                                      : p.status === "inProgress"
                                      ? "status-inprogress"
                                      : "status-planned"
                                  }`}
                                >
                                  {p.statusLabel}
                                </span>
                                <span className="sales-project-status-cell sales-project-status-name">{p.projectName}</span>
                                <span className="sales-project-status-cell sales-project-status-company">{p.companyName}</span>
                                <span className="sales-project-status-cell sales-project-status-meta">{p.due}</span>
                                <span className="sales-project-status-cell sales-project-status-meta">{p.progress}%</span>
                                <span className="sales-project-status-cell sales-project-status-revenue">{formatRevenue(p.revenue)}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              </div>
            ) : (
            <div className="sales-bottom">
              <aside className="sales-left">
                <h2 className="sales-left-title">고객정보</h2>
                <button
                  type="button"
                  className="sales-customer-info"
                  onClick={() => {
                    setDetailMode("customer");
                    setSelectedProjectId(null);
                    setProjectEditing(false);
                  }}
                >
                  {selectedCompany ? (
                    <div className="sales-customer-info-body">
                      <div className="sales-customer-info-name">{selectedCompany.name}</div>
                      <div className="sales-customer-info-meta">사업자번호: {selectedCompany.bizNumber}</div>
                    </div>
                  ) : (
                    <div className="sales-customer-info-body">
                      <div className="sales-customer-info-meta">선택된 고객사가 없습니다.</div>
                    </div>
                  )}
                </button>
                <div className="sales-left-header">
                  <h2 className="sales-left-title">프로젝트</h2>
                  <button
                    type="button"
                    className="sales-left-add-btn"
                    onClick={() => {
                      const id = newProjectId();
                      const today = new Date().toISOString().slice(0, 10);
                      setAddedProjectsByCompany((prev) => ({
                        ...prev,
                        [selectedCompanyId]: [
                          ...(prev[selectedCompanyId] ?? []),
                          { id, name: "신규 프로젝트", due: today, progress: 0, revenue: 0, status: "기획" },
                        ],
                      }));
                      setEditedProjectDetails((prev) => ({
                        ...prev,
                        [id]: {
                          name: "신규 프로젝트",
                          status: "기획",
                          startDate: today,
                          endDate: today,
                          manager: "",
                          department: "",
                          desc: "",
                          note: "",
                          revenue: 0,
                          budget: 0,
                          costs: [],
                        },
                      }));
                      setDetailMode("project");
                      setSelectedProjectId(id);
                      setEditForm({
                        name: "신규 프로젝트",
                        status: "기획",
                        startDate: today,
                        endDate: today,
                        manager: "",
                        department: "",
                        desc: "",
                        note: "",
                        revenue: 0,
                        budget: 0,
                        costs: [],
                      });
                      setProjectEditing(true);
                    }}
                  >
                    추가
                  </button>
                </div>
                {projects.length > 0 && (
                  <div className="sales-company-summary">
                    <div className="sales-company-summary-row">
                      <span className="sales-company-summary-label">진행중 합계</span>
                      <span className="sales-company-summary-value">{formatRevenue(companySummary.진행중)}</span>
                    </div>
                    <div className="sales-company-summary-row">
                      <span className="sales-company-summary-label">완료 합계</span>
                      <span className="sales-company-summary-value">{formatRevenue(companySummary.완료)}</span>
                    </div>
                  </div>
                )}
                {projects.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>등록된 프로젝트가 없습니다.</p>
                ) : (
                  projects.map((p) => (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      className={`sales-project-card sales-project-card-clickable ${selectedProjectId === p.id ? "is-selected" : ""}`}
                      onClick={() => {
                        setDetailMode("project");
                        setSelectedProjectId(p.id);
                        setProjectEditing(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setDetailMode("project");
                          setSelectedProjectId(p.id);
                          setProjectEditing(false);
                        }
                      }}
                    >
                      <div className="sales-project-head">
                        <p className="sales-project-name">
                          <span
                            className={
                              `sales-project-status-badge ${
                                p.status === "완료"
                                  ? "status-done"
                                  : p.status === "진행중"
                                  ? "status-inprogress"
                                  : "status-planned"
                              }`
                            }
                          >
                            {p.status === "완료" ? "완료" : p.status === "진행중" ? "진행" : "계획"}
                          </span>
                          {p.name}
                        </p>
                        <span className="sales-project-revenue">{formatRevenue(getProjectRevenue(p.id, p.revenue))}</span>
                      </div>
                      <p className="sales-project-meta">마감 {p.due}</p>
                      <div className="sales-progress-row">
                        <div className="sales-progress-wrap">
                          <div className="sales-progress-bar" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="sales-progress-pct">{p.progress}%</span>
                      </div>
                    </div>
                  ))
                )}
              </aside>
              <div className="sales-right">
                {detailMode === "customer" ? (
                  <>
                  <div className="sales-project-detail-panel">
                    <div className="sales-project-detail-panel-header">
                      <h2 className="sales-project-detail-panel-title">고객 상세정보</h2>
                      <div className="sales-project-detail-panel-actions">
                        {customerEditing ? (
                          <>
                            <button
                              type="button"
                              className="sales-project-detail-edit-btn"
                              onClick={() => {
                                if (!selectedCompany) return;
                                const name = customerEditForm.name.trim();
                                const bizNumber = customerEditForm.bizNumber.trim() || "-";
                                const ceoName = customerEditForm.ceoName.trim();
                                const address = customerEditForm.address.trim();
                                const mainPhone = customerEditForm.mainPhone.trim();
                                const taxEmail = customerEditForm.taxEmail.trim();
                                const accountBank = customerEditForm.accountBank.trim();
                                const accountNumber = customerEditForm.accountNumber.trim();
                                const contacts = (customerEditForm.contacts ?? []).map((p) => ({
                                  id: p.id || newContactId(),
                                  name: p.name ?? "",
                                  title: p.title ?? "",
                                  phone: p.phone ?? "",
                                  email: p.email ?? "",
                                }));
                                if (!name) return;
                                setCompanies((prev) =>
                                  prev.map((c) =>
                                    c.id === selectedCompany.id
                                      ? { ...c, name, bizNumber, ceoName, address, mainPhone, taxEmail, accountBank, accountNumber, contacts }
                                      : c,
                                  ),
                                );
                                setCustomerEditing(false);
                                setCheckedCustomerContactIds([]);
                              }}
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              className="sales-project-detail-edit-btn"
                              onClick={() => {
                                if (selectedCompany) {
                                  setCustomerEditForm({
                                    name: selectedCompany.name ?? "",
                                    bizNumber: (selectedCompany.bizNumber ?? "") === "-" ? "" : (selectedCompany.bizNumber ?? ""),
                                    ceoName: selectedCompany.ceoName ?? "",
                                    address: selectedCompany.address ?? "",
                                    mainPhone: selectedCompany.mainPhone ?? "",
                                    taxEmail: selectedCompany.taxEmail ?? "",
                                    accountBank: selectedCompany.accountBank ?? "",
                                    accountNumber: selectedCompany.accountNumber ?? "",
                                    contacts: ((selectedCompany.contacts ?? []) as any[]).map((p) => ({
                                      id: (p?.id as string | undefined) ?? newContactId(),
                                      name: (p?.name as string | undefined) ?? "",
                                      title: (p?.title as string | undefined) ?? "",
                                      phone: (p?.phone as string | undefined) ?? "",
                                      email: (p?.email as string | undefined) ?? "",
                                    })),
                                  });
                                }
                                setCheckedCustomerContactIds([]);
                                setCustomerEditing(false);
                              }}
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="sales-project-detail-edit-btn"
                            onClick={() => {
                              if (!selectedCompany) return;
                              setCustomerEditForm({
                                name: selectedCompany.name ?? "",
                                bizNumber: (selectedCompany.bizNumber ?? "") === "-" ? "" : (selectedCompany.bizNumber ?? ""),
                                ceoName: selectedCompany.ceoName ?? "",
                                address: selectedCompany.address ?? "",
                                mainPhone: selectedCompany.mainPhone ?? "",
                                taxEmail: selectedCompany.taxEmail ?? "",
                                accountBank: selectedCompany.accountBank ?? "",
                                accountNumber: selectedCompany.accountNumber ?? "",
                                contacts: ((selectedCompany.contacts ?? []) as any[]).map((p) => ({
                                  id: (p?.id as string | undefined) ?? newContactId(),
                                  name: (p?.name as string | undefined) ?? "",
                                  title: (p?.title as string | undefined) ?? "",
                                  phone: (p?.phone as string | undefined) ?? "",
                                  email: (p?.email as string | undefined) ?? "",
                                })),
                              });
                              setCheckedCustomerContactIds([]);
                              setCustomerEditing(true);
                            }}
                          >
                            수정
                          </button>
                        )}
                        <button
                          type="button"
                          className="sales-project-detail-delete-btn"
                          onClick={() => {
                            if (!selectedCompany) return;
                            const ok = window.confirm(`'${selectedCompany.name}' 고객사를 삭제할까요?`);
                            if (!ok) return;
                            setCompanies((prev) => prev.filter((c) => c.id !== selectedCompany.id));
                            setSelectedCompanyId((prevId) => {
                              if (prevId !== selectedCompany.id) return prevId;
                              const next = companies.filter((c) => c.id !== selectedCompany.id)[0]?.id ?? "1";
                              return next;
                            });
                            setDetailMode("project");
                            setSelectedProjectId(null);
                            setCustomerEditing(false);
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    {selectedCompany ? (
                      <>
                        <div className="sales-detail-section">
                          <div className="sales-detail-section-title">기본 정보</div>
                          <div className="sales-customer-basic-wrap">
                            <div className="sales-detail-grid">
                            <span className="sales-detail-label">고객사명</span>
                            {customerEditing ? (
                              <input
                                className="sales-project-edit-input"
                                value={customerEditForm.name}
                                onChange={(e) => setCustomerEditForm((f) => ({ ...f, name: e.target.value }))}
                              />
                            ) : (
                              <p className="sales-detail-value">{selectedCompany.name}</p>
                            )}
                            <span className="sales-detail-label">사업자등록번호</span>
                            {customerEditing ? (
                              <input
                                className="sales-project-edit-input"
                                value={customerEditForm.bizNumber}
                                onChange={(e) => setCustomerEditForm((f) => ({ ...f, bizNumber: e.target.value }))}
                                placeholder="예: 123-45-67890"
                              />
                            ) : (
                              <p className="sales-detail-value">{selectedCompany.bizNumber || "-"}</p>
                            )}
                            <span className="sales-detail-label">대표자명</span>
                            {customerEditing ? (
                              <input
                                className="sales-project-edit-input"
                                value={customerEditForm.ceoName}
                                onChange={(e) => setCustomerEditForm((f) => ({ ...f, ceoName: e.target.value }))}
                                placeholder="예: 홍길동"
                              />
                            ) : (
                              <p className="sales-detail-value">{selectedCompany.ceoName || "-"}</p>
                            )}
                            <span className="sales-detail-label">주소</span>
                            {customerEditing ? (
                              <input
                                className="sales-project-edit-input"
                                value={customerEditForm.address}
                                onChange={(e) => setCustomerEditForm((f) => ({ ...f, address: e.target.value }))}
                                placeholder="예: 서울특별시 강남구 ..."
                              />
                            ) : (
                              <p className="sales-detail-value">{selectedCompany.address || "-"}</p>
                            )}
                            <span className="sales-detail-label">대표연락처</span>
                            {customerEditing ? (
                              <input
                                className="sales-project-edit-input"
                                value={customerEditForm.mainPhone}
                                onChange={(e) => setCustomerEditForm((f) => ({ ...f, mainPhone: e.target.value }))}
                                placeholder="예: 02-1234-5678"
                              />
                            ) : (
                              <p className="sales-detail-value">{selectedCompany.mainPhone || "-"}</p>
                            )}
                            <span className="sales-detail-label">세금계산서 이메일</span>
                            {customerEditing ? (
                              <input
                                className="sales-project-edit-input"
                                value={customerEditForm.taxEmail}
                                onChange={(e) => setCustomerEditForm((f) => ({ ...f, taxEmail: e.target.value }))}
                                placeholder="예: tax@example.com"
                              />
                            ) : (
                              <p className="sales-detail-value">{selectedCompany.taxEmail || "-"}</p>
                            )}
                              <span className="sales-detail-label">계좌번호</span>
                              {customerEditing ? (
                                <div className="sales-customer-account-row">
                                  <input
                                    className="sales-project-edit-input sales-customer-account-bank"
                                    value={customerEditForm.accountBank}
                                    onChange={(e) => setCustomerEditForm((f) => ({ ...f, accountBank: e.target.value }))}
                                    placeholder="은행명"
                                  />
                                  <input
                                    className="sales-project-edit-input sales-customer-account-number"
                                    value={customerEditForm.accountNumber}
                                    onChange={(e) => setCustomerEditForm((f) => ({ ...f, accountNumber: e.target.value }))}
                                    placeholder="계좌번호"
                                  />
                                </div>
                              ) : (
                                <p className="sales-detail-value">
                                  {selectedCompany.accountBank || selectedCompany.accountNumber
                                    ? `${selectedCompany.accountBank ?? ""}${selectedCompany.accountBank && selectedCompany.accountNumber ? " " : ""}${selectedCompany.accountNumber ?? ""}`.trim()
                                    : "-"}
                                </p>
                              )}
                            </div>
                            <div className="sales-customer-basic-files">
                              <div className="sales-customer-file-card">
                                <div className="sales-customer-file-title-row">
                                  <div className="sales-customer-file-title">사업자 등록증</div>
                                  {customerEditing ? (
                                    <label className="sales-project-detail-edit-btn sales-customer-file-upload">
                                      업로드
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (!file || !selectedCompany) return;
                                          const url = URL.createObjectURL(file);
                                          setCompanies((prev) =>
                                            prev.map((c) =>
                                              c.id === selectedCompany.id ? { ...c, bizLicenseImageUrl: url } : c,
                                            ),
                                          );
                                          e.currentTarget.value = "";
                                        }}
                                      />
                                    </label>
                                  ) : null}
                                </div>
                                <div className="sales-customer-file-body">
                                  {selectedCompany.bizLicenseImageUrl ? (
                                    <button
                                      type="button"
                                      className="sales-customer-file-preview"
                                      onClick={() => setImagePreview({ title: "사업자 등록증", url: selectedCompany.bizLicenseImageUrl })}
                                    >
                                      <img src={selectedCompany.bizLicenseImageUrl} alt="사업자 등록증 미리보기" />
                                    </button>
                                  ) : (
                                    <div className="sales-customer-file-empty">업로드된 파일이 없습니다.</div>
                                  )}
                                </div>
                              </div>
                              <div className="sales-customer-file-card">
                                <div className="sales-customer-file-title-row">
                                  <div className="sales-customer-file-title">통장사본</div>
                                  {customerEditing ? (
                                    <label className="sales-project-detail-edit-btn sales-customer-file-upload">
                                      업로드
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (!file || !selectedCompany) return;
                                          const url = URL.createObjectURL(file);
                                          setCompanies((prev) =>
                                            prev.map((c) =>
                                              c.id === selectedCompany.id ? { ...c, bankbookImageUrl: url } : c,
                                            ),
                                          );
                                          e.currentTarget.value = "";
                                        }}
                                      />
                                    </label>
                                  ) : null}
                                </div>
                                <div className="sales-customer-file-body">
                                  {selectedCompany.bankbookImageUrl ? (
                                    <button
                                      type="button"
                                      className="sales-customer-file-preview"
                                      onClick={() => setImagePreview({ title: "통장사본", url: selectedCompany.bankbookImageUrl })}
                                    >
                                      <img src={selectedCompany.bankbookImageUrl} alt="통장사본 미리보기" />
                                    </button>
                                  ) : (
                                    <div className="sales-customer-file-empty">업로드된 파일이 없습니다.</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="sales-detail-section">
                          <div className="sales-detail-section-title-row">
                            <div className="sales-detail-section-title">고객담당자</div>
                            {customerEditing && (
                              <div className="sales-customer-contacts-actions">
                                <button
                                  type="button"
                                  className="sales-project-detail-edit-btn"
                                  onClick={() => {
                                    setCustomerEditForm((f) => ({
                                      ...f,
                                      contacts: [
                                        ...(f.contacts ?? []),
                                        { id: newContactId(), name: "", title: "", phone: "", email: "" },
                                      ],
                                    }));
                                  }}
                                >
                                  추가
                                </button>
                                <button
                                  type="button"
                                  className="sales-project-detail-delete-btn"
                                  disabled={checkedCustomerContactIds.length === 0}
                                  onClick={() => {
                                    if (checkedCustomerContactIds.length === 0) return;
                                    setCustomerEditForm((f) => ({
                                      ...f,
                                      contacts: (f.contacts ?? []).filter((p) => !checkedCustomerContactIds.includes(p.id)),
                                    }));
                                    setCheckedCustomerContactIds([]);
                                  }}
                                >
                                  삭제
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="sales-customer-contacts">
                            <div className="sales-customer-contacts-head">
                              <div className="sales-customer-contacts-cell sales-customer-contacts-check" />
                              <div className="sales-customer-contacts-cell">이름</div>
                              <div className="sales-customer-contacts-cell">직급</div>
                              <div className="sales-customer-contacts-cell">연락처</div>
                              <div className="sales-customer-contacts-cell">이메일</div>
                            </div>
                            {(customerEditing ? customerEditForm.contacts : (selectedCompany.contacts ?? [])).length === 0 ? (
                              <div className="sales-customer-contacts-empty">등록된 고객담당자가 없습니다.</div>
                            ) : (
                              <div className="sales-customer-contacts-body">
                                {(customerEditing ? customerEditForm.contacts : (selectedCompany.contacts ?? [])).map(
                                  (p: any, idx: number) => {
                                    const id = (p?.id as string | undefined) ?? `row_${idx}`;
                                    const checked = checkedCustomerContactIds.includes(id);
                                    return (
                                      <div key={id} className="sales-customer-contacts-row">
                                        <div className="sales-customer-contacts-cell sales-customer-contacts-check">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={!customerEditing}
                                            onChange={(e) => {
                                              if (!customerEditing) return;
                                              const next = e.target.checked
                                                ? [...checkedCustomerContactIds, id]
                                                : checkedCustomerContactIds.filter((x) => x !== id);
                                              setCheckedCustomerContactIds(next);
                                            }}
                                          />
                                        </div>
                                        {customerEditing ? (
                                          <>
                                            <div className="sales-customer-contacts-cell">
                                              <input
                                                className="sales-customer-contacts-input"
                                                value={(p?.name as string | undefined) ?? ""}
                                                onChange={(e) =>
                                                  setCustomerEditForm((f) => ({
                                                    ...f,
                                                    contacts: (f.contacts ?? []).map((x) =>
                                                      x.id === id ? { ...x, name: e.target.value } : x,
                                                    ),
                                                  }))
                                                }
                                                placeholder="이름"
                                              />
                                            </div>
                                            <div className="sales-customer-contacts-cell">
                                              <input
                                                className="sales-customer-contacts-input"
                                                value={(p?.title as string | undefined) ?? ""}
                                                onChange={(e) =>
                                                  setCustomerEditForm((f) => ({
                                                    ...f,
                                                    contacts: (f.contacts ?? []).map((x) =>
                                                      x.id === id ? { ...x, title: e.target.value } : x,
                                                    ),
                                                  }))
                                                }
                                                placeholder="직급"
                                              />
                                            </div>
                                            <div className="sales-customer-contacts-cell">
                                              <input
                                                className="sales-customer-contacts-input"
                                                value={(p?.phone as string | undefined) ?? ""}
                                                onChange={(e) =>
                                                  setCustomerEditForm((f) => ({
                                                    ...f,
                                                    contacts: (f.contacts ?? []).map((x) =>
                                                      x.id === id ? { ...x, phone: e.target.value } : x,
                                                    ),
                                                  }))
                                                }
                                                placeholder="연락처"
                                              />
                                            </div>
                                            <div className="sales-customer-contacts-cell">
                                              <input
                                                className="sales-customer-contacts-input"
                                                value={(p?.email as string | undefined) ?? ""}
                                                onChange={(e) =>
                                                  setCustomerEditForm((f) => ({
                                                    ...f,
                                                    contacts: (f.contacts ?? []).map((x) =>
                                                      x.id === id ? { ...x, email: e.target.value } : x,
                                                    ),
                                                  }))
                                                }
                                                placeholder="이메일"
                                              />
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <div className="sales-customer-contacts-cell">{p?.name || "-"}</div>
                                            <div className="sales-customer-contacts-cell">{p?.title || "-"}</div>
                                            <div className="sales-customer-contacts-cell">{p?.phone || "-"}</div>
                                            <div className="sales-customer-contacts-cell">{p?.email || "-"}</div>
                                          </>
                                        )}
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="sales-detail-section">
                          <div className="sales-detail-section-title">메모</div>
                          <p className="sales-detail-desc-block">-</p>
                        </div>
                      </>
                    ) : (
                      <p className="sales-right-empty-msg">선택된 고객사가 없습니다.</p>
                    )}
                  </div>
                  </>
                ) : projects.length === 0 ? (
                  <p className="sales-right-empty-msg">등록된 프로젝트가 없습니다.</p>
                ) : !selectedProjectId ? (
                  <>
                    <h2 className="sales-right-title">통합 히스토리 타임라인</h2>
                    <ul className="sales-timeline-onepage">
                      {TIMELINE_ITEMS.map((item, i) => (
                        <li key={i} className={`sales-tl-item ${item.type}`}>
                          <div className="sales-tl-time">{item.time}</div>
                          <span className="sales-tl-badge">{item.typeLabel}</span>
                          <p className="sales-tl-title">{item.title}</p>
                          <p className="sales-tl-desc">{item.desc}</p>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="sales-detail-view">
                    <div className="sales-project-detail-panel">
                      <button
                        type="button"
                        className="sales-back-to-list"
                        onClick={() => {
                          setSelectedProjectId(null);
                          setDetailMode("project");
                          setProjectEditing(false);
                        }}
                      >
                        ← 목록으로
                      </button>
                      <div className="sales-project-detail-panel-header">
                        <h2 className="sales-project-detail-panel-title">프로젝트 상세</h2>
                        {projectEditing ? (
                          <div className="sales-project-detail-panel-actions">
                            <button type="button" className="sales-project-detail-edit-btn" onClick={closeProjectEdit}>
                              취소
                            </button>
                            <button type="button" className="sales-project-detail-edit-btn" onClick={saveProjectEdit}>
                              저장
                            </button>
                          </div>
                        ) : (
                          <button type="button" className="sales-project-detail-edit-btn" onClick={openProjectEdit}>
                            수정
                          </button>
                        )}
                      </div>
                      {projectDetail && (
                        <>
                          <div className="sales-detail-section">
                            <div className="sales-detail-section-title">기본 정보</div>
                            <div className="sales-detail-grid">
                              <span className="sales-detail-label">프로젝트명</span>
                              {projectEditing ? (
                                <input
                                  className="sales-project-edit-input"
                                  value={editForm.name}
                                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                />
                              ) : (
                                <p className="sales-detail-value">{projectDetail.name}</p>
                              )}
                              <span className="sales-detail-label">상태</span>
                              {projectEditing ? (
                                <input
                                  className="sales-project-edit-input"
                                  value={editForm.status}
                                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                                />
                              ) : (
                                <p className="sales-detail-value">{projectDetail.status}</p>
                              )}
                              <span className="sales-detail-label">프로젝트 규모</span>
                              {projectEditing ? (
                                <input
                                  className="sales-project-edit-input"
                                  type="number"
                                  min={0}
                                  value={editForm.revenue ?? ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === "") setEditForm((f) => ({ ...f, revenue: undefined }));
                                    else {
                                      const n = Number(v.replace(/,/g, ""));
                                      if (!Number.isNaN(n)) setEditForm((f) => ({ ...f, revenue: n }));
                                    }
                                  }}
                                  placeholder="숫자만 입력"
                                />
                              ) : (
                                <p className="sales-detail-value sales-detail-revenue">
                                  {formatRevenue(projectDetail.revenue ?? projects.find((p) => p.id === selectedProjectId)?.revenue ?? 0)}
                                </p>
                              )}
                              <span className="sales-detail-label">프로젝트 예산</span>
                              {projectEditing ? (
                                <input
                                  className="sales-project-edit-input"
                                  type="number"
                                  min={0}
                                  value={editForm.budget ?? ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === "") setEditForm((f) => ({ ...f, budget: undefined }));
                                    else {
                                      const n = Number(v.replace(/,/g, ""));
                                      if (!Number.isNaN(n)) setEditForm((f) => ({ ...f, budget: n }));
                                    }
                                  }}
                                  placeholder="숫자만 입력"
                                />
                              ) : (
                                <p className="sales-detail-value sales-detail-revenue">{formatRevenue(projectDetail.budget ?? 0)}</p>
                              )}
                            </div>
                          </div>
                          {(() => {
                            const budget = projectEditing ? (editForm.budget ?? 0) : (projectDetail.budget ?? 0);
                            const costList = projectEditing ? (editForm.costs ?? []) : (projectDetail.costs ?? []);
                            const usedAmount = costList.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
                            const remainAmount = budget - usedAmount;
                            return (
                              <div className="sales-detail-section">
                                <div className="sales-detail-section-title-row">
                                  <div className="sales-detail-section-title">비용 내역</div>
                                  {projectEditing && (
                                    <div className="sales-budget-actions">
                                      <button
                                        type="button"
                                        className="sales-project-detail-edit-btn"
                                        onClick={() => {
                                          const currentBudget =
                                            editForm.budget ?? projectDetail?.budget ?? 0;
                                          setBudgetApplyValue(
                                            currentBudget === 0 ? "" : String(currentBudget),
                                          );
                                          setBudgetApplyOpen(true);
                                        }}
                                      >
                                        예산반영
                                      </button>
                                      <button
                                        type="button"
                                        className="sales-project-detail-edit-btn"
                                        onClick={() =>
                                          setEditForm((f) => ({
                                            ...f,
                                            costs: [
                                              ...(f.costs ?? []),
                                              {
                                                id: newCostId(),
                                                date: new Date().toISOString().slice(0, 10),
                                                title: "",
                                                amount: 0,
                                                note: "",
                                              },
                                            ],
                                          }))
                                        }
                                      >
                                        비용 추가
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="sales-project-budget-summary">
                                  <div className="sales-project-budget-summary-item">
                                    <span>총 예산</span>
                                    <strong>{formatRevenue(budget)}</strong>
                                  </div>
                                  <div className="sales-project-budget-summary-item">
                                    <span>사용 금액</span>
                                    <strong>{formatRevenue(usedAmount)}</strong>
                                  </div>
                                  <div className="sales-project-budget-summary-item">
                                    <span>남은 금액</span>
                                    <strong className={remainAmount < 0 ? "is-over" : ""}>{formatRevenue(remainAmount)}</strong>
                                  </div>
                                </div>
                                <div className="sales-project-cost-list">
                                  <div className={`sales-project-cost-head ${projectEditing ? "is-editing" : ""}`}>
                                    <span>일자</span>
                                    <span>항목</span>
                                    <span>금액</span>
                                    <span>비고</span>
                                    {projectEditing && <span>관리</span>}
                                  </div>
                                  {costList.length === 0 ? (
                                    <div className="sales-project-cost-empty">등록된 비용 내역이 없습니다.</div>
                                  ) : (
                                    <div className="sales-project-cost-rows">
                                      {costList.map((cost) => (
                                        <div key={cost.id} className={`sales-project-cost-row ${projectEditing ? "is-editing" : ""}`}>
                                          {projectEditing ? (
                                            <>
                                              <input
                                                className="sales-project-edit-input"
                                                type="date"
                                                value={cost.date}
                                                onChange={(e) =>
                                                  setEditForm((f) => ({
                                                    ...f,
                                                    costs: (f.costs ?? []).map((c) =>
                                                      c.id === cost.id ? { ...c, date: e.target.value } : c,
                                                    ),
                                                  }))
                                                }
                                              />
                                              <input
                                                className="sales-project-edit-input"
                                                value={cost.title}
                                                onChange={(e) =>
                                                  setEditForm((f) => ({
                                                    ...f,
                                                    costs: (f.costs ?? []).map((c) =>
                                                      c.id === cost.id ? { ...c, title: e.target.value } : c,
                                                    ),
                                                  }))
                                                }
                                                placeholder="예: 장비 구매"
                                              />
                                              <input
                                                className="sales-project-edit-input"
                                                type="number"
                                                min={0}
                                                step={1}
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                value={cost.amount ?? ""}
                                                onKeyDown={(e) => {
                                                  if ((e.ctrlKey || e.metaKey) && !e.shiftKey) return;
                                                  const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End", "Enter"];
                                                  if (allowed.includes(e.key)) return;
                                                  if (/^\d$/.test(e.key)) return;
                                                  e.preventDefault();
                                                }}
                                                onChange={(e) =>
                                                  setEditForm((f) => ({
                                                    ...f,
                                                    costs: (f.costs ?? []).map((c) =>
                                                      c.id === cost.id
                                                        ? (() => {
                                                            const v = e.target.value;
                                                            if (v === "") return { ...c, amount: undefined };
                                                            const digits = v.replace(/[^\d]/g, "");
                                                            if (!digits) return { ...c, amount: undefined };
                                                            const n = Number(digits);
                                                            return { ...c, amount: Math.max(0, Number.isNaN(n) ? 0 : n) };
                                                          })()
                                                        : c,
                                                    ),
                                                  }))
                                                }
                                                placeholder="0"
                                              />
                                              <input
                                                className="sales-project-edit-input"
                                                value={cost.note ?? ""}
                                                onChange={(e) =>
                                                  setEditForm((f) => ({
                                                    ...f,
                                                    costs: (f.costs ?? []).map((c) =>
                                                      c.id === cost.id ? { ...c, note: e.target.value } : c,
                                                    ),
                                                  }))
                                                }
                                                placeholder="비고"
                                              />
                                              <button
                                                type="button"
                                                className="sales-project-detail-delete-btn sales-project-cost-delete-btn"
                                                onClick={() =>
                                                  setEditForm((f) => ({
                                                    ...f,
                                                    costs: (f.costs ?? []).filter((c) => c.id !== cost.id),
                                                  }))
                                                }
                                              >
                                                삭제
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <p className="sales-detail-value">{cost.date || "-"}</p>
                                              <p className="sales-detail-value">{cost.title || "-"}</p>
                                              <p className="sales-detail-value">{formatRevenue(cost.amount || 0)}</p>
                                              <p className="sales-detail-value">{cost.note || "-"}</p>
                                            </>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div className="sales-project-cost-count">{costList.length}건</div>
                                </div>
                              </div>
                            );
                          })()}
                          <div className="sales-detail-section">
                            <div className="sales-detail-section-title">일정</div>
                            <div className="sales-detail-grid">
                              <span className="sales-detail-label">시작일</span>
                              {projectEditing ? (
                                <input
                                  className="sales-project-edit-input"
                                  type="date"
                                  value={editForm.startDate}
                                  onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
                                />
                              ) : (
                                <p className="sales-detail-value">{projectDetail.startDate}</p>
                              )}
                              <span className="sales-detail-label">종료일</span>
                              {projectEditing ? (
                                <input
                                  className="sales-project-edit-input"
                                  type="date"
                                  value={editForm.endDate}
                                  onChange={(e) => setEditForm((f) => ({ ...f, endDate: e.target.value }))}
                                />
                              ) : (
                                <p className="sales-detail-value">{projectDetail.endDate}</p>
                              )}
                            </div>
                          </div>
                          <div className="sales-detail-section">
                            <div className="sales-detail-section-title">담당</div>
                            <div className="sales-detail-grid">
                              <span className="sales-detail-label">담당자</span>
                              {projectEditing ? (
                                <input
                                  className="sales-project-edit-input"
                                  value={editForm.manager}
                                  onChange={(e) => setEditForm((f) => ({ ...f, manager: e.target.value }))}
                                />
                              ) : (
                                <p className="sales-detail-value">{projectDetail.manager}</p>
                              )}
                              <span className="sales-detail-label">참여 부서</span>
                              {projectEditing ? (
                                <input
                                  className="sales-project-edit-input"
                                  value={editForm.department}
                                  onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                                />
                              ) : (
                                <p className="sales-detail-value">{projectDetail.department}</p>
                              )}
                            </div>
                          </div>
                          <div className="sales-detail-section">
                            <div className="sales-detail-section-title">상세 설명</div>
                            {projectEditing ? (
                              <textarea
                                className="sales-project-edit-input"
                                value={editForm.desc}
                                onChange={(e) => setEditForm((f) => ({ ...f, desc: e.target.value }))}
                                rows={4}
                              />
                            ) : (
                              <p className="sales-detail-desc-block">{projectDetail.desc}</p>
                            )}
                          </div>
                          {(projectEditing || projectDetail.note) && (
                            <div className="sales-detail-section">
                              <div className="sales-detail-section-title">비고</div>
                              {projectEditing ? (
                                <textarea
                                  className="sales-project-edit-input"
                                  value={editForm.note ?? ""}
                                  onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value || undefined }))}
                                  rows={2}
                                  placeholder="선택 입력"
                                />
                              ) : (
                                <p className="sales-detail-desc-block">{projectDetail.note}</p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="sales-meeting-notes-panel">
                      <h3>회의록 (최신순)</h3>
                      {meetingNotes.length === 0 ? (
                        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>등록된 회의록이 없습니다.</p>
                      ) : (
                        meetingNotes.map((n, i) => (
                          <div key={i} className="sales-meeting-note-item">
                            <div className="sales-meeting-note-date">{n.date}</div>
                            <p className="sales-meeting-note-title">{n.title}</p>
                            <p className="sales-meeting-note-summary">{n.summary}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      </main>
      {imagePreview && (
        <div className="sales-image-preview-overlay" onClick={() => setImagePreview(null)}>
          <div className="sales-image-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sales-image-preview-header">
              <div className="sales-image-preview-title">{imagePreview.title}</div>
              <button type="button" className="sales-image-preview-close" onClick={() => setImagePreview(null)}>
                닫기
              </button>
            </div>
            <div className="sales-image-preview-body">
              <img src={imagePreview.url} alt={imagePreview.title} />
            </div>
          </div>
        </div>
      )}
      {budgetApplyOpen && selectedProjectId && projectDetail && (
        <div
          className="sales-project-edit-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setBudgetApplyOpen(false)}
        >
          <div className="sales-project-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sales-project-edit-modal-header">예산 반영</div>
            <div className="sales-project-edit-modal-body">
              <div className="sales-detail-section">
                <div className="sales-detail-section-title">프로젝트 예산</div>
                <div className="sales-detail-grid">
                  <span className="sales-detail-label">총 예산(원)</span>
                  <input
                    className="sales-project-edit-input"
                    type="number"
                    min={0}
                    value={budgetApplyValue}
                    onChange={(e) => setBudgetApplyValue(e.target.value)}
                    placeholder="예: 50000000"
                  />
                </div>
              </div>
            </div>
            <div className="sales-project-edit-modal-footer">
              <button type="button" className="sales-project-edit-cancel" onClick={() => setBudgetApplyOpen(false)}>
                취소
              </button>
              <button
                type="button"
                className="sales-project-edit-save"
                onClick={() => {
                  if (!selectedProjectId) return;
                  const n = Math.max(0, Number(String(budgetApplyValue ?? "").replace(/,/g, "")) || 0);
                  setEditForm((f) => ({ ...f, budget: n }));
                  setEditedProjectDetails((prev) => ({
                    ...prev,
                    [selectedProjectId]: {
                      ...(prev[selectedProjectId] ?? projectDetail),
                      budget: n,
                    },
                  }));
                  setBudgetApplyOpen(false);
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
