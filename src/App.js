import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, collection, query, orderBy, onSnapshot } from "firebase/firestore";

const WEBHOOK_URL = "https://merge-works.app.n8n.cloud/webhook-test/dealguard-intake";

const COLORS = {
  bg: "linear-gradient(135deg, #EEF2FF 0%, #F8FAFF 100%)",
  card: "#FFFFFF",
  card2: "#F8FAFC",
  border: "#E2E8F0",
  blue: "#4F46E5",
  amber: "#B45309",
  red: "#DC2626",
  green: "#047857",
  purple: "#7C3AED",
  text: "#1E2333",
  muted: "#64748B",
  sub: "#475569",
};

const mockDeals = [
  {
    id: "deal_001",
    company: "Apex Roofing Co.",
    status: "complete",
    posture: "requires_retrading",
    industry: "Construction",
    annualSde: 197000,
    ev: 950000,
    time: "Jul 13 2026, 09:14 AM",
    severity: { critical: 2, high: 3, medium: 4, low: 2 },
    escalations: [
      { id: "e-001", text: "Customer concentration: HomeDepot Supply is 31.4% of trailing revenue — exceeds 25% threshold.", confirmed: null },
      { id: "e-002", text: "Owner dependency: Replacement cost ($18,500/mo) renders normalized SDE negative (-$2,100/mo).", confirmed: null },
    ],
    findings: [
      { id: "f-001", category: "customer_concentration", severity: "critical", flag: "Single customer exceeds 25% revenue threshold", detail: "HomeDepot Supply account represents 31.4% of trailing 24-month revenue. Change-of-control clause is not assignable.", rationale: "Any single customer above 25% of trailing revenue triggers a mandatory LOI protection clause per the DD framework.", source: "customer_revenue.csv row 2", loi: "Holdback recommended", loi_notes: "Recommend a 12-month holdback of 15% of purchase price contingent on Metro Housing contract renewal post-close." },
      { id: "f-002", category: "customer_concentration", severity: "high", flag: "Top-5 customers represent 58% of revenue", detail: "Renewal dates for 3 of 5 anchor accounts fall within 90 days of projected close.", rationale: "Top-5 concentration above 50% is a HIGH threshold breach. Combined with short renewal windows, this creates compounded transition risk.", source: "customer_revenue.csv rows 1-5", loi: "Earnout adjustment", loi_notes: "Structure earnout tied to customer retention rate at 12 months post-close." },
      { id: "f-003", category: "owner_dependency", severity: "critical", flag: "Owner replacement cost renders SDE negative", detail: "Monthly replacement cost of $18,500 exceeds normalized monthly SDE of $16,400. The business cannot sustain owner transition at current purchase terms.", rationale: "Negative normalized SDE after owner replacement is a deal-structure breaking finding.", source: "transcript 04:22", loi: "Consulting agreement", loi_notes: "Require 24-month seller consulting agreement at $8,500/month." },
      { id: "f-004", category: "owner_dependency", severity: "high", flag: "Owner failed vacation test (1/5)", detail: "Owner has not taken vacation longer than 3 days in 4 years. No documented succession plan.", rationale: "Vacation test score of 1/5 indicates extreme owner dependency. Business operability without the seller is under 30 days.", source: "transcript 11:08", loi: "Consulting agreement", loi_notes: "Extend consulting agreement to include customer relationship transition milestones." },
      { id: "f-005", category: "operational_sop", severity: "high", flag: "Only 2 of 5 critical workflows documented", detail: "Invoicing, vendor management, and employee onboarding are entirely undocumented. 90-day post-close operability: FAIL.", rationale: "Fewer than 3 of 5 critical workflows documented is a HIGH finding.", source: "sop_docs p.3", loi: "Holdback recommended", loi_notes: "SOP completion holdback: 10% of purchase price released upon delivery of all 5 documented workflows within 60 days." },
      { id: "f-006", category: "employee_culture", severity: "medium", flag: "3 of 5 key employees lack non-compete", detail: "Average tenure 2.8 years. Turnover rate 18% vs 12% industry average.", rationale: "Medium finding — combined departure of 2+ key staff would materially impact service delivery.", source: "roster rows 3-5", loi: "Retention bonus", loi_notes: "Retention bonus pool of $45,000 split across 3 key employees, vesting 12 months post-close." },
    ],
    concentrationData: [
      { customer: "Metro Housing Authority", pct: 37.8 },
      { customer: "Sunridge Apartments", pct: 18.9 },
      { customer: "Clearview Commercial", pct: 12.6 },
      { customer: "Parkside Developers", pct: 8.4 },
      { customer: "Westfield Schools", pct: 6.3 },
      { customer: "Other", pct: 16.0 },
    ],
  },
  {
    id: "deal_002",
    company: "Greenfield HVAC",
    status: "escalated",
    posture: "requires_retrading",
    industry: "HVAC Services",
    annualSde: 312000,
    ev: 1400000,
    time: "Jul 13 2026, 11:42 AM",
    severity: { critical: 3, high: 2, medium: 3, low: 1 },
    escalations: [
      { id: "e-001", text: "Customer concentration: Top customer is 43.2% of revenue.", confirmed: null },
      { id: "e-002", text: "Owner dependency: Owner is sole signatory on all vendor contracts.", confirmed: null },
      { id: "e-003", text: "SDE negative: Owner replacement cost renders SDE negative by $5,400/mo.", confirmed: null },
    ],
    findings: [
      { id: "f-001", category: "customer_concentration", severity: "critical", flag: "Top customer at 43.2% of revenue", detail: "Commercial HVAC Partners is 43.2% of trailing revenue. Deal-killer escalation threshold exceeded.", rationale: "43.2% exceeds both the 25% LOI clause threshold and the 40% human escalation threshold.", source: "revenue.csv row 1", loi: "Holdback recommended", loi_notes: "Full deal restructure conversation required." },
      { id: "f-002", category: "owner_dependency", severity: "critical", flag: "Owner sole signatory on all vendor contracts", detail: "No delegation documented. All 12 vendor relationships require owner signature.", rationale: "Single point of failure across all vendor relationships.", source: "transcript 06:14", loi: "Consulting agreement", loi_notes: "30-month consulting agreement with vendor relationship transfer milestones." },
      { id: "f-003", category: "owner_dependency", severity: "critical", flag: "SDE negative after replacement cost", detail: "Replacement cost of $22,000/mo exceeds monthly SDE of $16,600/mo by $5,400.", rationale: "Business cannot support its own management cost post-close.", source: "sde_calc", loi: "Earnout adjustment", loi_notes: "Purchase price reduction or earnout restructure required." },
    ],
    concentrationData: [
      { customer: "Commercial HVAC Partners", pct: 43.2 },
      { customer: "Riverside Office Park", pct: 19.1 },
      { customer: "Northern Schools", pct: 11.4 },
      { customer: "Metro Retail Group", pct: 8.7 },
      { customer: "Other", pct: 17.6 },
    ],
  },
  {
    id: "deal_003",
    company: "Meridian Logistics LLC",
    status: "running",
    posture: "escalate_to_analyst",
    industry: "Logistics",
    annualSde: 540000,
    ev: 2700000,
    time: "In progress",
    severity: { critical: 1, high: 1, medium: 0, low: 0 },
    escalations: [{ id: "e-001", text: "Concentration flag triggered on partial data.", confirmed: null }],
    findings: [
      { id: "f-001", category: "customer_concentration", severity: "critical", flag: "Preliminary concentration flag", detail: "One customer already exceeds 20% threshold in partial data.", rationale: "Partial data only — full analysis pending.", source: "partial csv", loi: "Pending", loi_notes: "Pending full analysis." },
    ],
    concentrationData: [
      { customer: "Anchor Client (partial)", pct: 22.4 },
      { customer: "Other (partial)", pct: 77.6 },
    ],
  },
  {
    id: "deal_004",
    company: "BlueSky Landscaping",
    status: "complete",
    posture: "proceed_with_clauses",
    industry: "Landscaping",
    annualSde: 285000,
    ev: 1100000,
    time: "Jul 12 2026, 3:55 PM",
    severity: { critical: 0, high: 2, medium: 4, low: 3 },
    escalations: [],
    findings: [
      { id: "f-001", category: "customer_concentration", severity: "high", flag: "Top-5 customers at 52% of revenue", detail: "No single customer exceeds 25%. Top-5 at 52% is slightly elevated.", rationale: "High but below critical. No immediate LOI protection required.", source: "revenue.csv", loi: "Monitor", loi_notes: "Monitor customer retention at 6 and 12 months post-close." },
      { id: "f-002", category: "employee_culture", severity: "high", flag: "2 key employees lack retention agreements", detail: "Operations Manager and Sales Lead lack non-compete or retention agreements.", rationale: "Departure of either within 12 months would materially impact operations.", source: "roster row 2,3", loi: "Retention bonus", loi_notes: "Retention bonus of $25,000 per employee, vesting 12 months post-close." },
    ],
    concentrationData: [
      { customer: "Green City Parks", pct: 18.2 },
      { customer: "Westside HOA", pct: 14.1 },
      { customer: "Northgate Commercial", pct: 10.3 },
      { customer: "Riverside Schools", pct: 9.7 },
      { customer: "Summit Estates", pct: 9.2 },
      { customer: "Other", pct: 38.5 },
    ],
  },
];

const pipelineNodes = [
  { label: "Intake", status: "complete" },
  { label: "Normalize", status: "complete" },
  { label: "Route", status: "complete" },
  { label: "Revenue Parse", status: "complete" },
  { label: "Concentration", status: "escalated" },
  { label: "Transcription", status: "complete" },
  { label: "PCS Scrub", status: "complete" },
  { label: "Owner Audit", status: "running" },
  { label: "SOP Parse", status: "complete" },
  { label: "SOP Classify", status: "running" },
  { label: "Culture", status: "waiting" },
  { label: "Merge", status: "waiting" },
  { label: "Validate", status: "waiting" },
  { label: "Generate", status: "waiting" },
  { label: "Deliver", status: "waiting" },
];

const sevColor = { critical: COLORS.red, high: COLORS.amber, medium: COLORS.blue, low: COLORS.muted };
const sevBg = { critical: "rgba(239,68,68,0.12)", high: "rgba(245,158,11,0.12)", medium: "rgba(79,70,229,0.12)", low: "rgba(100,116,139,0.12)" };
const postureConfig = {
  requires_retrading: { label: "Requires Retrading", color: COLORS.red, bg: "rgba(239,68,68,0.07)", border: "rgba(239,68,68,0.25)" },
  proceed_with_clauses: { label: "Proceed with Clauses", color: COLORS.green, bg: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.25)" },
  escalate_to_analyst: { label: "Escalate to Analyst", color: COLORS.amber, bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.25)" },
};
const catLabel = { customer_concentration: "Customer Concentration", owner_dependency: "Owner Dependency", operational_sop: "SOP / Process Risk", employee_culture: "Employee & Culture" };
const catIcon = { customer_concentration: "👥", owner_dependency: "🔑", operational_sop: "📋", employee_culture: "🏢" };

function ConcentrationChart({ data }) {
  const maxVal = Math.max(...data.map(d => d.pct), 30);
  const barColors = ["#4F46E5", "#7C3AED", "#047857", "#B45309", "#EC4899", "#64748B"];
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 12 }}>Revenue Concentration by Customer</div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: `${(25 / maxVal) * 100}%`, top: 0, bottom: 0, width: 1, background: COLORS.red, opacity: 0.6, zIndex: 1 }}>
          <div style={{ position: "absolute", top: -18, left: 4, fontSize: 9, color: COLORS.red, fontWeight: 700, whiteSpace: "nowrap" }}>25% threshold</div>
        </div>
        {data.map((d, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <div style={{ fontSize: 11, color: COLORS.sub }}>{d.customer}</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: d.pct > 25 ? COLORS.red : d.pct > 20 ? COLORS.amber : COLORS.sub }}>{d.pct}%</div>
            </div>
            <div style={{ height: 6, background: COLORS.border, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(d.pct / maxVal) * 100}%`, background: d.pct > 25 ? COLORS.red : d.pct > 20 ? COLORS.amber : barColors[i % barColors.length], borderRadius: 3, transition: "width 0.6s ease" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeverityDonut({ severity }) {
  const total = severity.critical + severity.high + severity.medium + severity.low;
  if (total === 0) return <div style={{ fontSize: 12, color: COLORS.muted }}>No findings</div>;
  const segments = [
    { key: "critical", color: COLORS.red, label: "Critical" },
    { key: "high", color: COLORS.amber, label: "High" },
    { key: "medium", color: COLORS.blue, label: "Medium" },
    { key: "low", color: COLORS.muted, label: "Low" },
  ].filter(s => severity[s.key] > 0);
  const size = 120; const radius = 45; const cx = size / 2; const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const arcs = segments.map(s => {
    const pct = severity[s.key] / total;
    const arc = { ...s, pct, offset, dasharray: `${pct * circumference} ${circumference}` };
    offset += pct * circumference;
    return arc;
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke={COLORS.border} strokeWidth={16} />
        {arcs.map((arc, i) => (
          <circle key={i} cx={cx} cy={cy} r={radius} fill="none" stroke={arc.color} strokeWidth={16} strokeDasharray={arc.dasharray} strokeDashoffset={-arc.offset} />
        ))}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" style={{ fill: COLORS.text, fontSize: 22, fontWeight: 700, fontFamily: "monospace", transform: "rotate(90deg)", transformOrigin: `${cx}px ${cy}px` }}>{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle" style={{ fill: COLORS.muted, fontSize: 9, transform: "rotate(90deg)", transformOrigin: `${cx}px ${cy}px` }}>findings</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.map(s => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <div style={{ fontSize: 11, color: COLORS.sub }}>{s.label}</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: s.color, marginLeft: "auto" }}>{severity[s.key]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NodeDot({ status }) {
  const configs = {
    complete: { bg: "rgba(16,185,129,0.15)", border: COLORS.green, color: COLORS.green, symbol: "✓", anim: false },
    running: { bg: "rgba(79,70,229,0.15)", border: COLORS.blue, color: COLORS.blue, symbol: "⟳", anim: true },
    escalated: { bg: "rgba(245,158,11,0.15)", border: COLORS.amber, color: COLORS.amber, symbol: "!", anim: false },
    waiting: { bg: "rgba(100,116,139,0.12)", border: COLORS.border, color: COLORS.muted, symbol: "·", anim: false },
  };
  const c = configs[status] || configs.waiting;
  return (
    <div style={{ width: 28, height: 28, borderRadius: "50%", background: c.bg, border: `2px solid ${c.border}`, color: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, animation: c.anim ? "spin 1.5s linear infinite" : "none" }}>{c.symbol}</div>
  );
}

function SeverityBar({ severity }) {
  const total = severity.critical + severity.high + severity.medium + severity.low || 1;
  return (
    <div style={{ height: 4, borderRadius: 2, background: COLORS.border, display: "flex", overflow: "hidden", gap: 1 }}>
      {severity.critical > 0 && <div style={{ width: `${(severity.critical / total) * 100}%`, background: COLORS.red, borderRadius: 1 }} />}
      {severity.high > 0 && <div style={{ width: `${(severity.high / total) * 100}%`, background: COLORS.amber, borderRadius: 1 }} />}
      {severity.medium > 0 && <div style={{ width: `${(severity.medium / total) * 100}%`, background: COLORS.blue, borderRadius: 1 }} />}
      {severity.low > 0 && <div style={{ width: `${(severity.low / total) * 100}%`, background: COLORS.muted, borderRadius: 1 }} />}
    </div>
  );
}

function DealCard({ deal, active, onClick }) {
  const statusColors = { complete: COLORS.green, running: COLORS.blue, escalated: COLORS.amber, failed: COLORS.red };
  const statusBg = { complete: "rgba(16,185,129,0.12)", running: "rgba(79,70,229,0.12)", escalated: "rgba(245,158,11,0.12)", failed: "rgba(239,68,68,0.12)" };
  return (
    <div onClick={onClick} style={{ padding: "12px", borderRadius: 8, cursor: "pointer", marginBottom: 6, background: active ? "rgba(79,70,229,0.07)" : COLORS.card2, border: `1px solid ${active ? COLORS.blue : "transparent"}`, transition: "all 0.15s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{deal.company}</div>
        <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: statusBg[deal.status], color: statusColors[deal.status] }}>{deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}</div>
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 10, color: COLORS.muted, marginBottom: 8 }}>{deal.id} · {deal.time}</div>
      <SeverityBar severity={deal.severity} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <div style={{ fontSize: 10, color: COLORS.muted }}>{deal.severity.critical} critical</div>
        <div style={{ fontSize: 10, color: COLORS.muted }}>{(postureConfig[deal.posture]?.label || "Reviewed").split(" ")[0]}</div>
      </div>
    </div>
  );
}

function FindingRow({ finding }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ borderTop: `1px solid ${COLORS.border}` }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: "flex", gap: 10, padding: "12px 0", cursor: "pointer" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: sevColor[finding.severity], marginTop: 6, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.sub }}>{finding.flag}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: sevBg[finding.severity], color: sevColor[finding.severity] }}>{finding.severity.toUpperCase()}</div>
              <div style={{ fontSize: 10, color: COLORS.muted }}>{expanded ? "▲" : "▼"}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 3 }}>{finding.detail.substring(0, 80)}...</div>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "0 0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: COLORS.card2, borderRadius: 8, padding: 14, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Full Detail</div>
            <div style={{ fontSize: 12, color: COLORS.sub, lineHeight: 1.6 }}>{finding.detail}</div>
          </div>
          <div style={{ background: "rgba(79,70,229,0.05)", borderRadius: 8, padding: 14, border: "1px solid rgba(79,70,229,0.15)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.blue, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Why This Was Flagged</div>
            <div style={{ fontSize: 12, color: COLORS.sub, lineHeight: 1.6 }}>{finding.rationale}</div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, background: COLORS.card2, borderRadius: 8, padding: 12, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Source</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: COLORS.sub }}>{finding.source}</div>
            </div>
            {finding.loi !== "Pending" && finding.loi !== "Monitor" && (
              <div style={{ flex: 2, background: "rgba(139,92,246,0.06)", borderRadius: 8, padding: 12, border: "1px solid rgba(139,92,246,0.2)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.purple, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>LOI Clause → {finding.loi}</div>
                <div style={{ fontSize: 11, color: COLORS.sub, lineHeight: 1.5 }}>{finding.loi_notes}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DealReport({ deal, analystName }) {
  const [escalations, setEscalations] = useState(deal.escalations);
  const [expandedCats, setExpandedCats] = useState({ customer_concentration: true, owner_dependency: true, operational_sop: false, employee_culture: false });
  const [reportGenerated, setReportGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [inputs, setInputs] = useState({ company: deal.company, industry: deal.industry, annualSde: deal.annualSde, ev: deal.ev });

  useEffect(() => {
    setEscalations(deal.escalations);
    setExpandedCats({ customer_concentration: true, owner_dependency: true, operational_sop: false, employee_culture: false });
    setReportGenerated(false);
    setInputs({ company: deal.company, industry: deal.industry, annualSde: deal.annualSde, ev: deal.ev });
  }, [deal.id]);

  const pc = postureConfig[deal.posture];
  const categories = ["customer_concentration", "owner_dependency", "operational_sop", "employee_culture"];
  const multipleRange = inputs.ev > 0 && inputs.annualSde > 0 ? `${(inputs.ev / inputs.annualSde).toFixed(1)}x` : "—";

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* LEFT FACTS PANEL */}
      <div style={{ width: 240, background: COLORS.card, borderRight: `1px solid ${COLORS.border}`, padding: 20, overflowY: "auto", flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 16 }}>Deal Facts</div>
        {[{ label: "Target Company", key: "company", type: "text" }, { label: "Industry", key: "industry", type: "text" }, { label: "Annual SDE ($)", key: "annualSde", type: "number" }, { label: "Enterprise Value ($)", key: "ev", type: "number" }].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 5, fontWeight: 600 }}>{f.label}</div>
            <input type={f.type} value={inputs[f.key]} onChange={e => setInputs(prev => ({ ...prev, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value }))}
              style={{ width: "100%", background: COLORS.card2, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "7px 10px", color: COLORS.text, fontSize: 12, outline: "none", fontFamily: "inherit" }} />
          </div>
        ))}
        <div style={{ padding: 12, background: COLORS.card2, borderRadius: 8, border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 2 }}>Implied Multiple</div>
          <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: COLORS.blue }}>{multipleRange} <span style={{ fontSize: 11, color: COLORS.muted }}>SDE</span></div>
          <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 4 }}>${inputs.annualSde.toLocaleString()} SDE · ${inputs.ev.toLocaleString()} EV</div>
        </div>
        <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 6, fontWeight: 600 }}>Analyst</div>
        <div style={{ fontSize: 12, color: COLORS.sub, padding: "7px 10px", background: COLORS.card2, borderRadius: 6, border: `1px solid ${COLORS.border}` }}>{analystName}</div>
      </div>

      {/* MAIN PANEL */}
      <div style={{ flex: 1, overflowY: "auto", padding: 28, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>{inputs.company}</div>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: COLORS.muted }}>{deal.id} · {deal.time} · {inputs.industry} · Analyst: {analystName}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: COLORS.card2, color: COLORS.sub, border: `1px solid ${COLORS.border}` }}>Export PDF</button>
            <button style={{ padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: COLORS.blue, color: "white", border: "none" }}>Download JSON</button>
          </div>
        </div>

        <div style={{ borderRadius: 10, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: pc.bg, border: `1px solid ${pc.border}` }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 3 }}>Deal Posture</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: pc.color }}>{pc.label}</div>
          </div>
          <div style={{ fontSize: 12, color: COLORS.sub, maxWidth: 420, textAlign: "right", lineHeight: 1.6 }}>
            {deal.posture === "requires_retrading" && "Critical findings present. Deal terms must be renegotiated before close."}
            {deal.posture === "proceed_with_clauses" && "No critical findings. LOI clause recommendations included for high findings."}
            {deal.posture === "escalate_to_analyst" && "Analysis in progress. Human review required before posture can be determined."}
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, flex: 1 }}>
            {[{ label: "Critical", val: deal.severity.critical, color: COLORS.red, sub: "Requires retrading" }, { label: "High", val: deal.severity.high, color: COLORS.amber, sub: "LOI clause required" }, { label: "Medium", val: deal.severity.medium, color: COLORS.blue, sub: "Monitor closely" }, { label: "Low", val: deal.severity.low, color: COLORS.sub, sub: "Flag for review" }].map(s => (
              <div key={s.label} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontFamily: "monospace", fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 6 }}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 200 }}>
            <SeverityDonut severity={deal.severity} />
          </div>
        </div>

        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>👥 Customer Concentration Analysis</div>
            <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: deal.concentrationData[0].pct > 25 ? sevBg.critical : sevBg.high, color: deal.concentrationData[0].pct > 25 ? COLORS.red : COLORS.amber }}>Top customer: {deal.concentrationData[0].pct}%</div>
          </div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>Red line marks 25% LOI protection threshold</div>
          <ConcentrationChart data={deal.concentrationData} />
        </div>

        {escalations.length > 0 && (
          <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>⚠</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.amber, textTransform: "uppercase", letterSpacing: "0.08em" }}>Escalation Required — Human Review</div>
              <div style={{ marginLeft: "auto", fontSize: 11, color: COLORS.muted }}>{escalations.filter(e => e.confirmed !== null).length}/{escalations.length} reviewed</div>
            </div>
            {escalations.map(e => (
              <div key={e.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: "1px solid rgba(245,158,11,0.1)", alignItems: "flex-start" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: e.confirmed === true ? COLORS.green : e.confirmed === false ? COLORS.muted : COLORS.amber, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, color: COLORS.sub, lineHeight: 1.5 }}>{e.text}</div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setEscalations(prev => prev.map(x => x.id === e.id ? { ...x, confirmed: true } : x))} style={{ padding: "5px 12px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", background: e.confirmed === true ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.1)", color: COLORS.green, border: "1px solid rgba(16,185,129,0.3)" }}>✓ Confirm</button>
                  <button onClick={() => setEscalations(prev => prev.map(x => x.id === e.id ? { ...x, confirmed: false } : x))} style={{ padding: "5px 12px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", background: e.confirmed === false ? "rgba(100,116,139,0.3)" : "rgba(100,116,139,0.1)", color: COLORS.muted, border: `1px solid ${COLORS.border}` }}>Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 14 }}>Findings by Category</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {categories.map(cat => {
              const catFindings = deal.findings.filter(f => f.category === cat);
              const topSev = catFindings.length === 0 ? "clean" : catFindings[0].severity;
              const isExpanded = expandedCats[cat];
              return (
                <div key={cat} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
                  <div onClick={() => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }))} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 16 }}>{catIcon[cat]}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{catLabel[cat]}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>{catFindings.length} finding{catFindings.length !== 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: topSev === "clean" ? "rgba(16,185,129,0.12)" : sevBg[topSev], color: topSev === "clean" ? COLORS.green : sevColor[topSev] }}>{topSev === "clean" ? "CLEAN" : topSev.toUpperCase()}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>{isExpanded ? "▲" : "▼"}</div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: "0 18px 16px" }}>
                      {catFindings.length === 0
                        ? <div style={{ fontSize: 12, color: COLORS.muted, padding: "12px 0", borderTop: `1px solid ${COLORS.border}` }}>No findings in this category.</div>
                        : catFindings.map(f => <FindingRow key={f.id} finding={f} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>📄 Generate Full Report</div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 16 }}>Lock findings and generate a complete sourced Red-Flag Risk Report. Saved to Google Drive and emailed to {analystName}.</div>
          {!reportGenerated ? (
            <button onClick={() => { setGenerating(true); setTimeout(() => { setGenerating(false); setReportGenerated(true); }, 2500); }} disabled={generating}
              style={{ width: "100%", padding: "12px", borderRadius: 8, background: generating ? COLORS.card2 : COLORS.blue, color: generating ? COLORS.muted : "white", border: generating ? `1px solid ${COLORS.border}` : "none", fontSize: 13, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer" }}>
              {generating ? "⟳ Generating report..." : "🔒 Lock Findings and Generate Report"}
            </button>
          ) : (
            <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 8, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 20 }}>✅</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.green, marginBottom: 3 }}>Report generated successfully</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>Saved to Google Drive · Email sent to {analystName} · <span style={{ color: COLORS.blue, cursor: "pointer" }}>View Report →</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── REPORT RENDERER ───────────────────────────────────────────────────────────
// Drop this component into your App.js and use it in the LiveView success state
// Replace the raw JSON display with <ReportRenderer report={result} />

function SeverityBadge({ severity }) {
  const s = (severity || '').toLowerCase();
  const config = {
    critical: { bg: "rgba(239,68,68,0.12)", color: "#DC2626" },
    high: { bg: "rgba(245,158,11,0.12)", color: "#B45309" },
    medium: { bg: "rgba(79,70,229,0.12)", color: "#4F46E5" },
    low: { bg: "rgba(100,116,139,0.12)", color: "#64748B" },
  };
  const c = config[s] || config.low;
  return (
    <div style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: c.bg, color: c.color, letterSpacing: "0.08em" }}>
      {s.toUpperCase()}
    </div>
  );
}

function ReportSeverityBar({ counts }) {
  const total = (counts.critical || 0) + (counts.high || 0) + (counts.medium || 0) + (counts.low || 0) || 1;
  return (
    <div style={{ height: 6, borderRadius: 3, background: "#E2E8F0", display: "flex", overflow: "hidden", gap: 1 }}>
      {counts.critical > 0 && <div style={{ width: `${(counts.critical / total) * 100}%`, background: "#DC2626", borderRadius: 2 }} />}
      {counts.high > 0 && <div style={{ width: `${(counts.high / total) * 100}%`, background: "#B45309", borderRadius: 2 }} />}
      {counts.medium > 0 && <div style={{ width: `${(counts.medium / total) * 100}%`, background: "#4F46E5", borderRadius: 2 }} />}
      {counts.low > 0 && <div style={{ width: `${(counts.low / total) * 100}%`, background: "#64748B", borderRadius: 2 }} />}
    </div>
  );
}

function FindingCard({ finding }) {
  const [expanded, setExpanded] = useState(false);
  const catIcons = {
    customer_concentration: "👥",
    owner_dependency: "🔑",
    operational_sop: "📋",
    employee_culture: "🏢"
  };
  const catLabels = {
    customer_concentration: "Customer Concentration",
    owner_dependency: "Owner Dependency",
    operational_sop: "SOP / Process Risk",
    employee_culture: "Employee & Culture"
  };

  const sevColor = {
    critical: "#DC2626",
    high: "#B45309",
    medium: "#4F46E5",
    low: "#64748B"
  };

  const sev = (finding.severity || '').toLowerCase();

  return (
    <div style={{ background: "#FFFFFF", border: `1px solid ${expanded ? sevColor[sev] || "#E2E8F0" : "#E2E8F0"}`, borderRadius: 10, overflow: "hidden", transition: "border-color 0.2s" }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding: "16px 20px", cursor: "pointer", display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 4, borderRadius: 2, background: sevColor[sev] || "#64748B", alignSelf: "stretch", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>{catIcons[finding.category] || "📌"}</span>
              <span style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{catLabels[finding.category] || finding.category}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SeverityBadge severity={finding.severity} />
              <span style={{ fontSize: 10, color: "#64748B" }}>{expanded ? "▲" : "▼"}</span>
            </div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1E2333", marginBottom: 4 }}>
            {finding.title || finding.flag}
          </div>
          <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
            {(finding.description || finding.detail || '').substring(0, 120)}...
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 20px 20px 38px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Full description */}
          <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 14, border: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Full Detail</div>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>{finding.description || finding.detail}</div>
          </div>

          {/* Sources */}
          {(finding.sources || [finding.source]).filter(Boolean).length > 0 && (
            <div style={{ background: "rgba(79,70,229,0.05)", borderRadius: 8, padding: 14, border: "1px solid rgba(79,70,229,0.15)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#4F46E5", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Evidence Sources</div>
              {(finding.sources || [finding.source]).filter(Boolean).map((src, i) => (
                <div key={i} style={{ marginBottom: i < (finding.sources || []).length - 1 ? 10 : 0 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: "#64748B", marginBottom: 3 }}>
                    {src.source_type || src.type} — {src.source_ref || src.ref}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569", fontStyle: "italic", lineHeight: 1.5 }}>
                    "{src.excerpt || src.quote}"
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LOI Clause */}
          {(finding.loi_clause?.recommended || finding.loi_clause?.clause_type) && (
            <div style={{ background: "rgba(139,92,246,0.06)", borderRadius: 8, padding: 14, border: "1px solid rgba(139,92,246,0.2)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                LOI Clause → {(finding.loi_clause.clause_type || '').replace(/_/g, ' ').toUpperCase()}
              </div>
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{finding.loi_clause.clause_notes}</div>
            </div>
          )}

          {/* Buyer Actions */}
          {(finding.buyer_actions || []).length > 0 && (
            <div style={{ background: "rgba(16,185,129,0.05)", borderRadius: 8, padding: 14, border: "1px solid rgba(16,185,129,0.15)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#047857", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Recommended Buyer Actions</div>
              {finding.buyer_actions.map((action, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: i < finding.buyer_actions.length - 1 ? 8 : 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(16,185,129,0.2)", color: "#047857", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{action}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Tolerant parsing shared by the live-run result view and the Live Tracker tab —
// n8n's output shape varies (raw JSON, {text: "```json..."}, array-wrapped, etc).
function parseReportData(report) {
  if (!report) return null;

  // Handle both direct report and wrapped in array
  let r = Array.isArray(report) ? report[0] : report;

  // Handle text field from n8n
  let parsed = r;
  if (r?.text) {
    try {
      // Strip markdown fences if present
      const cleaned = r.text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch(e) {
      parsed = r;
    }
  } else if (typeof r === 'string') {
    try {
      parsed = JSON.parse(r);
    } catch(e) {
      parsed = r;
    }
  }

  // If still wrapped in another array
  if (Array.isArray(parsed)) {
    parsed = parsed[0];
  }

  // Handle if text is inside parsed
  if (parsed?.text && typeof parsed.text === 'string') {
    try {
      const cleaned = parsed.text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch(e) {}
  }

  // Also handle message/raw_response fallback
  if (parsed?.message || parsed?.raw_response !== undefined) {
    return { parsed, incomplete: true };
  }

  const meta = parsed.report_metadata || { deal_id: parsed.deal_id, target_company: parsed.target_company, generated_at: parsed.generated_at };
  const summary = parsed.executive_summary || parsed.severity_summary || {};
  const findings = parsed.findings || [];
  const dqFlags = parsed.data_quality_flags || [];
  const postureDetail = parsed.deal_posture_detail || {};
  const costBreakdown = parsed.cost_breakdown || null;

  const counts = {
    critical: summary.critical_count ?? summary.critical ?? parsed.severity_summary?.critical ?? 0,
    high: summary.high_count ?? summary.high ?? parsed.severity_summary?.high ?? 0,
    medium: summary.medium_count ?? summary.medium ?? parsed.severity_summary?.medium ?? 0,
    low: summary.low_count ?? summary.low ?? parsed.severity_summary?.low ?? 0,
  };

  const posture = summary.deal_posture?.recommended_posture || parsed.overall_deal_posture || 'unknown';

  return { parsed, meta, summary, findings, dqFlags, postureDetail, costBreakdown, counts, posture, incomplete: false };
}

const REPORT_POSTURE_CONFIG = {
  requires_retrading: { label: "Requires Retrading", color: "#DC2626", bg: "rgba(239,68,68,0.07)", border: "rgba(239,68,68,0.25)" },
  proceed_with_clauses: { label: "Proceed with Clauses", color: "#047857", bg: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.25)" },
  escalate_to_analyst: { label: "Escalate to Analyst", color: "#B45309", bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.25)" },
  pause: { label: "Pause — Additional Data Required", color: "#B45309", bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.25)" },
  unknown: { label: "Review Required", color: "#64748B", bg: "rgba(100,116,139,0.07)", border: "rgba(100,116,139,0.25)" },
};

function ReportRenderer({ report }) {
  const [expandedCats, setExpandedCats] = useState({});

  const rd = parseReportData(report);
  if (!rd) return null;

  if (rd.incomplete) {
    const parsed = rd.parsed;
    return (
      <div style={{ padding: 20, background: "#FFFFFF", borderRadius: 10, border: "1px solid #E2E8F0" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#B45309", marginBottom: 8 }}>⚠ Workflow completed — report saved to Google Drive</div>
        <div style={{ fontSize: 12, color: "#475569" }}>{parsed.message || "Check Google Drive for the full report."}</div>
      </div>
    );
  }

  const { parsed, meta, summary, findings, dqFlags, postureDetail, costBreakdown, counts, posture } = rd;
  const pc = REPORT_POSTURE_CONFIG[posture] || REPORT_POSTURE_CONFIG.unknown;

  const knownCats = Object.keys(catLabel);
  const extraCats = Array.from(new Set(findings.map(f => f.category).filter(c => c && !knownCats.includes(c))));
  const allCats = [...knownCats, ...extraCats];
  const toggleCat = (cat, defaultExpanded) => {
    setExpandedCats(prev => ({ ...prev, [cat]: !(cat in prev ? prev[cat] : defaultExpanded) }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#1E2333", marginBottom: 4 }}>{meta.target_company}</div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#64748B" }}>
            {meta.deal_id} · Generated {meta.generated_at ? new Date(meta.generated_at).toLocaleString() : new Date().toLocaleString()} · DealGuard Red-Flag Risk Report
          </div>
        </div>
        <button onClick={() => navigator.clipboard.writeText(JSON.stringify(parsed, null, 2))}
          style={{ padding: "8px 16px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "#F8FAFC", color: "#475569", border: "1px solid #E2E8F0" }}>
          Copy JSON
        </button>
      </div>

      {/* DEAL POSTURE BANNER */}
      <div style={{ borderRadius: 10, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: pc.bg, border: `1px solid ${pc.border}` }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748B", marginBottom: 3 }}>Deal Posture</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: pc.color }}>{pc.label}</div>
        </div>
        <div style={{ fontSize: 12, color: "#475569", maxWidth: 420, textAlign: "right", lineHeight: 1.6 }}>
          {summary.deal_posture?.posture_rationale || parsed.escalation?.reason || ''}
        </div>
      </div>

      {/* MODEL SPEND */}
      {costBreakdown && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748B" }}>Model Spend — This Run</div>
            <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: "#4F46E5" }}>${(costBreakdown.total_usd ?? 0).toFixed(4)}</div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {Object.entries(costBreakdown.by_model || {}).map(([model, m]) => (
              <div key={model} style={{ flex: "1 1 140px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1E2333", textTransform: "capitalize", marginBottom: 6 }}>{model}</div>
                <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "#1E2333", marginBottom: 4 }}>${(m?.cost_usd ?? 0).toFixed(4)}</div>
                <div style={{ fontSize: 10, color: "#64748B" }}>{((m?.input_tokens ?? 0) + (m?.output_tokens ?? 0)).toLocaleString()} tokens · {(m?.input_tokens ?? 0).toLocaleString()} in / {(m?.output_tokens ?? 0).toLocaleString()} out</div>
              </div>
            ))}
            <div style={{ flex: "1 1 140px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1E2333", marginBottom: 6 }}>Total Tokens</div>
              <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "#1E2333", marginBottom: 4 }}>{(costBreakdown.total_tokens ?? 0).toLocaleString()}</div>
              <div style={{ fontSize: 10, color: "#64748B" }}>Across all models</div>
            </div>
          </div>
        </div>
      )}

      {/* SEVERITY SUMMARY + DONUT */}
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, flex: 1 }}>
          {[
            { label: "Critical", val: counts.critical, color: "#DC2626", sub: "Requires retrading" },
            { label: "High", val: counts.high, color: "#B45309", sub: "LOI clause required" },
            { label: "Medium", val: counts.medium, color: "#4F46E5", sub: "Monitor closely" },
            { label: "Low", val: counts.low, color: "#64748B", sub: "Flag for review" },
          ].map(s => (
            <div key={s.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748B", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: "monospace", fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 6 }}>{s.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 20, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 200 }}>
          <SeverityDonut severity={counts} />
        </div>
      </div>

      {/* SEVERITY BAR */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          Finding Distribution — {findings.length} total findings
        </div>
        <ReportSeverityBar counts={counts} />
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          {[["#DC2626", "Critical"], ["#B45309", "High"], ["#4F46E5", "Medium"], ["#64748B", "Low"]].map(([color, label]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              <span style={{ fontSize: 11, color: "#475569" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FINDINGS BY CATEGORY */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748B", marginBottom: 12 }}>
          Findings by Category — {findings.length} total
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {allCats.map(cat => {
            const catFindings = findings.filter(f => f.category === cat);
            const label = catLabel[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const icon = catIcon[cat] || "📌";
            const defaultExpanded = catFindings.length > 0;
            const isExpanded = cat in expandedCats ? expandedCats[cat] : defaultExpanded;
            const topSev = catFindings.length === 0 ? "clean" : (catFindings[0].severity || '').toLowerCase();
            return (
              <div key={cat} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden" }}>
                <div onClick={() => toggleCat(cat, defaultExpanded)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 16 }}>{icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1E2333" }}>{label}</div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{catFindings.length} finding{catFindings.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: topSev === "clean" ? "rgba(16,185,129,0.12)" : (sevBg[topSev] || sevBg.low), color: topSev === "clean" ? "#047857" : (sevColor[topSev] || sevColor.low) }}>{topSev === "clean" ? "CLEAN" : topSev.toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{isExpanded ? "▲" : "▼"}</div>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ padding: "0 18px 16px" }}>
                    {catFindings.length === 0
                      ? <div style={{ fontSize: 12, color: "#64748B", padding: "12px 0", borderTop: "1px solid #E2E8F0" }}>No findings in this category.</div>
                      : <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>{catFindings.map(f => <FindingCard key={f.finding_id || f.id} finding={f} />)}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* DATA QUALITY FLAGS */}
      {dqFlags.length > 0 && (
        <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#B45309", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚠</span> Data Quality Flags ({dqFlags.length})
          </div>
          {dqFlags.map((flag, i) => (
            <div key={flag.flag_id || i} style={{ padding: "12px 0", borderTop: i > 0 ? "1px solid rgba(245,158,11,0.1)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: "#B45309", fontWeight: 700 }}>{flag.flag_id}</div>
                <div style={{ fontSize: 10, color: "#64748B" }}>{flag.affected_category?.replace(/_/g, ' ')}</div>
              </div>
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, marginBottom: 6 }}>{flag.description}</div>
              <div style={{ fontSize: 11, color: "#047857" }}>→ {flag.recommended_resolution}</div>
            </div>
          ))}
        </div>
      )}

      {/* CONDITIONS TO ADVANCE */}
      {(postureDetail.conditions_to_advance || []).length > 0 && (
        <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#047857", marginBottom: 14 }}>✓ Conditions to Advance</div>
          {postureDetail.conditions_to_advance.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < postureDetail.conditions_to_advance.length - 1 ? 10 : 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#047857", marginTop: 6, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{c}</div>
            </div>
          ))}
        </div>
      )}

      {/* CONDITIONS TO REPRICE */}
      {(postureDetail.conditions_to_reprice || []).length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", marginBottom: 14 }}>⬇ Conditions to Reprice</div>
          {postureDetail.conditions_to_reprice.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < postureDetail.conditions_to_reprice.length - 1 ? 10 : 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#DC2626", marginTop: 6, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{c}</div>
            </div>
          ))}
        </div>
      )}

      {/* ANALYST NOTES */}
      {parsed.analyst_notes && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Analyst Notes — Non-Scored</div>
          <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.7, fontStyle: "italic" }}>{parsed.analyst_notes}</div>
        </div>
      )}

    </div>
  );
}

// ── LIVE VIEW ─────────────────────────────────────────────────────────────────
async function saveDealPacketToFirestore(uid, fileName, content) {
  if (!uid) {
    console.warn("DealGuard: no signed-in user; skipping deal packet save to Firestore.");
    return;
  }
  try {
    const id = `${Date.now()}-${fileName}`;
    await setDoc(doc(db, "users", uid, "dealPackets", id), {
      fileName,
      content,
      uploadedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("DealGuard: failed to save deal packet to Firestore.", err);
  }
}

async function saveReportToFirestore(uid, dealId, data) {
  if (!uid) {
    console.warn("DealGuard: no signed-in user; skipping report save to Firestore.");
    return;
  }
  try {
    const rd = parseReportData(data);
    const id = String(dealId || rd?.meta?.deal_id || Date.now());
    await setDoc(doc(db, "users", uid, "reports", id), {
      dealId: id,
      targetCompany: rd?.meta?.target_company || null,
      severityCounts: rd?.counts || { critical: 0, high: 0, medium: 0, low: 0 },
      posture: rd?.posture || null,
      report: data,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("DealGuard: failed to save report to Firestore.", err);
  }
}

function LiveView({ analystName, uid }) {
  const [jsonInput, setJsonInput] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState({
    customer_concentration: true,
    owner_dependency: true,
    operational_sop: true,
    employee_culture: true,
  });

  const toggleCategory = (cat) => {
    setSelectedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const categoryConfig = [
    { key: "customer_concentration", label: "Customer Concentration", icon: "👥", required: "customer_revenue_csv", description: "Revenue CSV required" },
    { key: "owner_dependency", label: "Owner Dependency", icon: "🔑", required: "owner_interview_transcript", description: "Interview transcript required" },
    { key: "operational_sop", label: "SOP / Process Risk", icon: "📋", required: "sop_documents", description: "SOP documents required" },
    { key: "employee_culture", label: "Employee & Culture", icon: "🏢", required: "employee_roster", description: "Employee roster required" },
  ];

  const handleSend = async () => {
    let parsed;
    try {
      parsed = JSON.parse(jsonInput);
    } catch (e) {
      setErrorMsg("Invalid JSON — please check your input and try again.");
      setStatus("error");
      return;
    }

    const activeCategories = Object.entries(selectedCategories)
      .filter(([_, v]) => v)
      .map(([k]) => k);

    if (activeCategories.length === 0) {
      setErrorMsg("Please select at least one DD category to run.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setResult(null);
    setErrorMsg("");
    setElapsed(0);

    const start = Date.now();
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed,
          analyst_name: analystName,
          analyst_email: `${analystName.toLowerCase().replace(/\s/g, ".")}@dealguard.com`,
          selected_categories: activeCategories,
        }),
      });
      clearInterval(interval);
      if (!res.ok) throw new Error(`n8n returned ${res.status}`);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { raw_response: text, message: "Workflow completed but returned non-JSON response. Check Google Drive for the full report." };
      }
      setResult(data);
      setStatus("success");
      saveReportToFirestore(uid, parsed?.deal_id, data);
    } catch (e) {
      clearInterval(interval);
      setErrorMsg("Unable to reach the DealGuard analysis engine. Please try again in a moment or contact your administrator if the issue persists.");
      setStatus("error");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonInput(ev.target.result);
      saveDealPacketToFirestore(uid, file.name, ev.target.result);
    };
    reader.readAsText(file);
  };

  const loadExample = () => {
    const example = {
      deal_id: "test_001",
      target_company: "Pinnacle Plumbing Services LLC",
      industry: "Plumbing Services",
      annual_sde: 420000,
      ev: 2100000,
      interview_input_type: "transcript",
      source_type: "seller_provided_files",
      input_type: "customer_revenue_csv",
      customer_revenue_csv: "customer,revenue\nMetro Housing Authority,378000\nSunridge Apartments,189000\nClearview Commercial,126000\nParkside Developers,84000\nWestfield Schools,63000\nOther,118000",
      owner_interview_transcript: "Owner handles all customer relationships personally. Has not taken a vacation in 3 years. No second in command. Replacement cost estimated at $14,500/month.",
      org_chart: "Owner/CEO: handles all customer relationships, pricing, vendor management. Foreman: field operations only. Office Manager: part time, data entry.",
      sop_documents: "Job scheduling: whiteboard and spreadsheet system. Customer onboarding: no formal process. Emergency response: owner contacted directly.",
      employee_roster: "name,role,department,tenure_years,salary_annual,has_noncompete\nRick Torrence,Foreman,Operations,12,72000,yes\nLinda Marsh,Office Manager,Admin,4,28000,no\nJose Martinez,Lead Plumber,Field,7,68000,no",
      site_visit_notes: "Office is a converted garage. Whiteboard is the primary job tracking system. Employees deferred all business questions to the owner."
    };
    setJsonInput(JSON.stringify(example, null, 2));
  };

  const activeCount = Object.values(selectedCategories).filter(Boolean).length;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>Live Analysis</div>
        <div style={{ fontSize: 12, color: COLORS.muted }}>Submit a real deal packet to the DealGuard agent. Select which DD categories to run — useful when not all documents are available yet.</div>
      </div>

      {/* CATEGORY SELECTOR */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>DD Categories to Run</div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>{activeCount} of 4 selected</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {categoryConfig.map(cat => {
            const active = selectedCategories[cat.key];
            return (
              <div key={cat.key} onClick={() => toggleCategory(cat.key)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, cursor: "pointer", background: active ? "rgba(79,70,229,0.07)" : COLORS.card2, border: `1px solid ${active ? COLORS.blue : COLORS.border}`, transition: "all 0.15s" }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${active ? COLORS.blue : COLORS.muted}`, background: active ? COLORS.blue : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                  {active && <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ fontSize: 14 }}>{cat.icon}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: active ? COLORS.text : COLORS.muted }}>{cat.label}</div>
                  <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{cat.description}</div>
                </div>
                {!active && (
                  <div style={{ marginLeft: "auto", fontSize: 10, color: COLORS.muted, fontStyle: "italic" }}>Skipped</div>
                )}
              </div>
            );
          })}
        </div>
        {activeCount < 4 && (
          <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6, fontSize: 11, color: COLORS.amber }}>
            ⚠ Partial analysis — {4 - activeCount} categor{4 - activeCount === 1 ? "y" : "ies"} skipped. Missing categories will be marked incomplete in the report.
          </div>
        )}
      </div>

      {/* JSON INPUT */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>Deal Packet JSON</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={loadExample} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: COLORS.card2, color: COLORS.sub, border: `1px solid ${COLORS.border}` }}>Load Example</button>
            <label style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: COLORS.card2, color: COLORS.sub, border: `1px solid ${COLORS.border}` }}>
              Upload JSON <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>
          </div>
        </div>
        <textarea
          value={jsonInput}
          onChange={e => setJsonInput(e.target.value)}
          placeholder='Paste your deal packet JSON here, or click "Load Example" to use the test deal...'
          style={{ width: "100%", height: 240, background: COLORS.card2, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 14, color: COLORS.text, fontSize: 11, fontFamily: "monospace", outline: "none", resize: "vertical", lineHeight: 1.6 }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <div style={{ fontSize: 11, color: COLORS.muted }}>
            Analyst: <span style={{ color: COLORS.blue, fontWeight: 600 }}>{analystName}</span> · Running: <span style={{ color: COLORS.blue, fontWeight: 600 }}>{activeCount} categor{activeCount === 1 ? "y" : "ies"}</span>
          </div>
          <button onClick={handleSend} disabled={status === "sending" || !jsonInput.trim() || activeCount === 0}
            style={{ padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: status === "sending" || !jsonInput.trim() || activeCount === 0 ? "not-allowed" : "pointer", background: status === "sending" || activeCount === 0 ? COLORS.card2 : COLORS.blue, color: status === "sending" || activeCount === 0 ? COLORS.muted : "white", border: "none", transition: "all 0.2s" }}>
            {status === "sending" ? `⟳ Running — ${elapsed}s` : `Send to DealGuard →`}
          </button>
        </div>
      </div>

      {/* STATUS */}
      {status === "sending" && (
        <div style={{ background: "rgba(79,70,229,0.06)", border: "1px solid rgba(79,70,229,0.2)", borderRadius: 10, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${COLORS.blue}`, borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.blue }}>Workflow running — {elapsed}s elapsed</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Intake", "Normalize", "Route", "Parse", "Classify", "Audit", "Merge", "Validate", "Generate", "Deliver"].map((step, i) => (
              <div key={step} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: elapsed > i * 4 ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.12)", color: elapsed > i * 4 ? COLORS.green : COLORS.muted, border: `1px solid ${elapsed > i * 4 ? "rgba(16,185,129,0.3)" : COLORS.border}`, fontWeight: 600, transition: "all 0.5s" }}>
                {elapsed > i * 4 ? "✓ " : ""}{step}
              </div>
            ))}
          </div>
        </div>
      )}

      {status === "error" && (
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.red, marginBottom: 8 }}>⚠ Submission Failed</div>
          <div style={{ fontSize: 12, color: COLORS.sub, lineHeight: 1.6 }}>{errorMsg}</div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 12 }}>If this issue persists, please contact your DealGuard administrator.</div>
        </div>
      )}

      {status === "success" && result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 10, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 20 }}>✅</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#047857", marginBottom: 2 }}>Workflow completed successfully</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>Report generated · Saved to Google Drive · Email sent to {analystName}</div>
            </div>
          </div>
          <ReportRenderer report={result} />
        </div>
      )}
    </div>
  );
}

// ── LIVE TRACKER ──────────────────────────────────────────────────────────────
function LiveTrackerView({ uid, onGoLive }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!uid) {
      setRuns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, "users", uid, "reports"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          company: data.targetCompany || data.dealId || d.id,
          time: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : "",
          severity: data.severityCounts || { critical: 0, high: 0, medium: 0, low: 0 },
          status: "complete",
          posture: data.posture || "unknown",
          report: data.report,
        };
      });
      setRuns(list);
      setLoading(false);
    }, (err) => {
      console.error("DealGuard: failed to load run history from Firestore.", err);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    if (runs.length > 0 && !runs.some(r => r.id === selectedId)) {
      setSelectedId(runs[0].id);
    }
  }, [runs, selectedId]);

  const selectedRun = runs.find(r => r.id === selectedId) || null;

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: COLORS.muted }}>
        Loading your past runs…
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>No runs yet</div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 20, lineHeight: 1.6 }}>Head to Live Analysis to get started — completed runs will show up here automatically.</div>
          <button onClick={onGoLive} style={{ padding: "10px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: COLORS.blue, color: "white", border: "none" }}>Go to Live Analysis →</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ width: 264, background: COLORS.card, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.muted }}>Run History</div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: COLORS.blue, fontWeight: 700 }}>{runs.length} run{runs.length !== 1 ? "s" : ""}</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {runs.map(r => (
            <DealCard key={r.id} deal={r} active={selectedId === r.id} onClick={() => setSelectedId(r.id)} />
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
        {selectedRun && <ReportRenderer key={selectedRun.id} report={selectedRun.report} />}
      </div>
    </>
  );
}


// ── RUN MONITOR ───────────────────────────────────────────────────────────────
function RunMonitorView({ analystName }) {
  const runningDeal = mockDeals.find(d => d.status === "running");
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>Run Monitor</div>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: COLORS.muted }}>Live pipeline · Active: {runningDeal?.company} · Analyst: {analystName}</div>
      </div>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 20 }}>Pipeline — {runningDeal?.id}</div>
        <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", paddingBottom: 8 }}>
          {pipelineNodes.map((node, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", flexShrink: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <NodeDot status={node.status} />
                <div style={{ fontSize: 9, color: COLORS.muted, textAlign: "center", maxWidth: 56, lineHeight: 1.3 }}>{node.label}</div>
              </div>
              {i < pipelineNodes.length - 1 && <div style={{ width: 20, height: 2, marginTop: 13, background: node.status === "complete" ? COLORS.green : COLORS.border, opacity: 0.4, flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 16 }}>All Runs</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 70px 70px 70px 70px 140px", gap: 8, marginBottom: 8 }}>
          {["Company", "Deal ID", "Status", "Crit", "High", "Med", "Low", "Posture"].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase" }}>{h}</div>
          ))}
        </div>
        {mockDeals.map(d => {
          const pc = postureConfig[d.posture];
          const sc = { complete: COLORS.green, running: COLORS.blue, escalated: COLORS.amber, failed: COLORS.red };
          return (
            <div key={d.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 70px 70px 70px 70px 140px", gap: 8, padding: "10px 0", borderTop: `1px solid ${COLORS.border}`, alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{d.company}</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: COLORS.muted }}>{d.id}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: sc[d.status] }}>{d.status.toUpperCase()}</div>
              <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: COLORS.red }}>{d.severity.critical}</div>
              <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: COLORS.amber }}>{d.severity.high}</div>
              <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: COLORS.blue }}>{d.severity.medium}</div>
              <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: COLORS.sub }}>{d.severity.low}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: pc.color }}>{pc.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
const AUTH_PALETTES = {
  light: {
    pageBg: "linear-gradient(135deg, #EEF2FF 0%, #F5F7FF 100%)",
    cardBg: "#FFFFFF",
    cardShadow: "0 24px 60px rgba(79,70,229,0.16)",
    panelBg: "linear-gradient(150deg, #E0E7FF 0%, #C7D2FE 100%)",
    accent: "#4F46E5",
    accentContrast: "#FFFFFF",
    text: "#1E2333",
    muted: "#6B7280",
    inputBg: "#F8FAFC",
    inputBorder: "#E2E8F0",
    buttonDisabledBg: "#E5E7EB",
    buttonDisabledText: "#9CA3AF",
    toggleBg: "#FFFFFF",
    toggleBorder: "#E2E8F0",
    panelHeadline: "#1E2333",
    panelSub: "#4B5566",
    docCardBg: "#FFFFFF",
    docCardBorder: "#C7D2FE",
    docLine: "#C7D2FE",
    chartCardBg: "rgba(255,255,255,0.6)",
    chartCardBorder: "#C7D2FE",
  },
  dark: {
    pageBg: "linear-gradient(135deg, #0A0F1E 0%, #111827 100%)",
    cardBg: "#111827",
    cardShadow: "0 24px 60px rgba(0,0,0,0.5)",
    panelBg: "linear-gradient(150deg, #1E1B4B 0%, #3730A3 100%)",
    accent: "#6366F1",
    accentContrast: "#FFFFFF",
    text: "#F1F5F9",
    muted: "#94A3B8",
    inputBg: "#1A2235",
    inputBorder: "#1E2D45",
    buttonDisabledBg: "#1E2D45",
    buttonDisabledText: "#64748B",
    toggleBg: "#1A2235",
    toggleBorder: "#1E2D45",
    panelHeadline: "#F1F5F9",
    panelSub: "#C7D2FE",
    docCardBg: "#1A2235",
    docCardBorder: "#3730A3",
    docLine: "#3730A3",
    chartCardBg: "rgba(30,27,75,0.5)",
    chartCardBorder: "#4338CA",
  },
};

function AuthIllustration({ pal }) {
  return (
    <svg viewBox="0 0 320 320" width="100%" style={{ maxWidth: 220 }}>
      {/* bar-chart card, tucked behind top-right */}
      <rect x="150" y="24" width="130" height="104" rx="14" fill={pal.chartCardBg} stroke={pal.chartCardBorder} strokeWidth="1.5" />
      <rect x="168" y="88" width="14" height="26" rx="3" fill={pal.accent} opacity="0.5" />
      <rect x="190" y="70" width="14" height="44" rx="3" fill={pal.accent} opacity="0.7" />
      <rect x="212" y="50" width="14" height="64" rx="3" fill={pal.accent} />
      <rect x="234" y="78" width="14" height="36" rx="3" fill={pal.accent} opacity="0.55" />

      {/* document card, in front */}
      <rect x="40" y="70" width="180" height="220" rx="18" fill={pal.docCardBg} stroke={pal.docCardBorder} strokeWidth="1.5" />
      <rect x="64" y="98" width="90" height="10" rx="5" fill={pal.accent} opacity="0.85" />
      <rect x="64" y="120" width="130" height="6" rx="3" fill={pal.docLine} />
      <rect x="64" y="134" width="110" height="6" rx="3" fill={pal.docLine} />
      <rect x="64" y="148" width="120" height="6" rx="3" fill={pal.docLine} />

      {/* checklist rows */}
      {[190, 220, 250].map((y, i) => (
        <g key={i}>
          <circle cx="76" cy={y} r="10" fill={pal.accent} />
          <path d={`M71 ${y} l4 4 l7 -8`} stroke={pal.accentContrast} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="96" y={y - 4} width={i === 1 ? 90 : 106} height="8" rx="4" fill={pal.docLine} />
        </g>
      ))}
    </svg>
  );
}

function firebaseAuthErrorMessage(err) {
  switch (err?.code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/user-not-found":
      return "No account found with that email.";
    case "auth/email-already-in-use":
      return "An account with that email already exists.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again in a moment.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function AuthScreen({ onAuthenticated, initialMode }) {
  const [theme, setTheme] = useState("light"); // light | dark — local to this screen only
  const [mode, setMode] = useState(initialMode === "signup" ? "signup" : "signin"); // signin | signup
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");

  const pal = AUTH_PALETTES[theme];
  const switchMode = (m) => { setMode(m); setAuthError(""); };

  const canSubmit = mode === "signin"
    ? email.trim() && password.trim()
    : fullName.trim() && email.trim() && password.trim();

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setAuthError("");
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: fullName.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onAuthenticated?.();
    } catch (err) {
      setAuthError(firebaseAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };

  const inputStyle = { width: "100%", background: pal.inputBg, border: `1px solid ${pal.inputBorder}`, borderRadius: 10, padding: "10px 13px", color: pal.text, fontSize: 13, outline: "none", fontFamily: "inherit" };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: pal.text, marginBottom: 6 };

  return (
    <div style={{ minHeight: "100vh", background: pal.pageBg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif", padding: 24, transition: "background 0.2s" }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } input:focus { border-color: ${pal.accent} !important; }`}</style>
      <div style={{ position: "relative", width: "100%", maxWidth: 780, background: pal.cardBg, borderRadius: 24, boxShadow: pal.cardShadow, display: "flex", overflow: "hidden", transition: "background 0.2s" }}>

        {/* THEME TOGGLE */}
        <button onClick={() => setTheme(t => t === "light" ? "dark" : "light")} aria-label="Toggle light/dark theme"
          style={{ position: "absolute", top: 20, right: 20, width: 34, height: 34, borderRadius: "50%", border: `1px solid ${pal.toggleBorder}`, background: pal.toggleBg, color: pal.accent, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 2 }}>
          {theme === "dark" ? "☀" : "☾"}
        </button>

        {/* LEFT — FORM */}
        <div style={{ flex: "0 0 55%", padding: "48px 40px 36px", display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, letterSpacing: "0.14em", color: pal.accent, marginBottom: 30 }}>DEALGUARD</div>

          <div style={{ fontSize: 24, fontWeight: 700, color: pal.text, marginBottom: 6 }}>
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </div>
          <div style={{ fontSize: 13, color: pal.muted, marginBottom: 28, lineHeight: 1.5 }}>
            {mode === "signin" ? "Sign in to pick up your due diligence review where you left off." : "Set up access to start reviewing deal packets."}
          </div>

          {mode === "signup" && (
            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>Full Name</div>
              <input placeholder="e.g. Sam Jaganathan" value={fullName} onChange={e => setFullName(e.target.value)} onKeyDown={handleKeyDown} style={inputStyle} />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>Email</div>
            <input type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyDown} style={inputStyle} />
          </div>

          <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ ...labelStyle, marginBottom: 0 }}>Password</div>
            {mode === "signin" && <div style={{ fontSize: 11, color: pal.accent, cursor: "pointer", fontWeight: 600 }}>Forgot password?</div>}
          </div>
          <input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown}
            style={{ ...inputStyle, marginTop: 6, marginBottom: mode === "signin" ? 14 : 26 }} />

          {mode === "signin" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 26, cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ width: 15, height: 15, accentColor: pal.accent, cursor: "pointer" }} />
              <span style={{ fontSize: 12, color: pal.muted }}>Remember me</span>
            </label>
          )}

          {authError && (
            <div style={{ fontSize: 12, color: "#DC2626", marginBottom: 14, lineHeight: 1.4 }}>{authError}</div>
          )}

          <button onClick={handleSubmit} disabled={!canSubmit || submitting}
            style={{ width: "100%", padding: "12px", borderRadius: 10, background: (canSubmit && !submitting) ? pal.accent : pal.buttonDisabledBg, color: (canSubmit && !submitting) ? pal.accentContrast : pal.buttonDisabledText, border: "none", fontSize: 13, fontWeight: 700, cursor: (canSubmit && !submitting) ? "pointer" : "not-allowed", transition: "all 0.15s" }}>
            {submitting ? "Please wait…" : (mode === "signin" ? "Sign In" : "Create Account")}
          </button>

          <div style={{ marginTop: "auto", paddingTop: 28, fontSize: 12, color: pal.muted, textAlign: "center" }}>
            {mode === "signin"
              ? <>New to DealGuard? <span onClick={() => switchMode("signup")} style={{ color: pal.accent, fontWeight: 700, cursor: "pointer" }}>Create an account</span></>
              : <>Already have an account? <span onClick={() => switchMode("signin")} style={{ color: pal.accent, fontWeight: 700, cursor: "pointer" }}>Sign in</span></>}
          </div>
        </div>

        {/* RIGHT — ILLUSTRATION PANEL */}
        <div style={{ flex: "0 0 45%", background: pal.panelBg, padding: "40px 30px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", transition: "background 0.2s" }}>
          <AuthIllustration pal={pal} />
          <div style={{ fontSize: 17, fontWeight: 700, color: pal.panelHeadline, marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>
            Every deal has a story hiding in the numbers.
          </div>
          <div style={{ fontSize: 12.5, color: pal.panelSub, lineHeight: 1.6, maxWidth: 240 }}>
            DealGuard surfaces customer concentration, owner dependency, and SOP gaps before they become post-close surprises.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("demo"); // demo | live | tracker
  const [view, setView] = useState("deals"); // deals | monitor
  const [selectedDeal, setSelectedDeal] = useState(mockDeals[0]);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode] = useState(() => new URLSearchParams(window.location.search).get("mode"));

  const toPlainUser = (u) => (u ? { uid: u.uid, displayName: u.displayName, email: u.email } : null);
  const syncUser = () => setFirebaseUser(toPlainUser(auth.currentUser));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(toPlainUser(user));
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const loggedIn = !!firebaseUser;
  const analystName = firebaseUser
    ? (firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split("@")[0] : ""))
    : "";

  useEffect(() => {
    if (!authLoading && !loggedIn && !authMode) {
      window.location.replace("/landing.html");
    }
  }, [authLoading, loggedIn, authMode]);

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg, fontFamily: "Inter, system-ui, sans-serif", fontSize: 13, color: COLORS.muted }}>
        Loading…
      </div>
    );
  }

  if (!loggedIn && !authMode) {
    return null; // redirecting to the marketing landing page
  }

  if (!loggedIn) {
    return <AuthScreen initialMode={authMode} onAuthenticated={syncUser} />;
  }

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, height: "100vh", display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden" }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 2px; }
        input:focus, textarea:focus { border-color: #4F46E5 !important; }
      `}</style>

      {/* TOPBAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.card, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: COLORS.blue }}>DealGuard</div>
          <div style={{ width: 1, height: 20, background: COLORS.border }} />
          <div style={{ fontSize: 12, fontWeight: 500, color: COLORS.sub }}>Operational Due Diligence Agent</div>

          {/* DEMO / LIVE TOGGLE */}
          <div style={{ marginLeft: 8, display: "flex", background: COLORS.card2, borderRadius: 8, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
            <button onClick={() => setMode("demo")} style={{ padding: "5px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", border: "none", background: mode === "demo" ? "rgba(100,116,139,0.3)" : "transparent", color: mode === "demo" ? COLORS.sub : COLORS.muted, transition: "all 0.15s", letterSpacing: "0.05em" }}>DEMO</button>
            <button onClick={() => setMode("live")} style={{ padding: "5px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", border: "none", background: mode === "live" ? "rgba(16,185,129,0.2)" : "transparent", color: mode === "live" ? COLORS.green : COLORS.muted, transition: "all 0.15s", letterSpacing: "0.05em" }}>
              {mode === "live" && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: COLORS.green, marginRight: 5, animation: "pulse 2s infinite", verticalAlign: "middle" }} />}
              LIVE
            </button>
            <button onClick={() => setMode("tracker")} style={{ padding: "5px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", border: "none", background: mode === "tracker" ? "rgba(79,70,229,0.15)" : "transparent", color: mode === "tracker" ? COLORS.blue : COLORS.muted, transition: "all 0.15s", letterSpacing: "0.05em" }}>TRACKER</button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {mode === "demo" && (
            <div style={{ display: "flex", background: COLORS.card2, borderRadius: 8, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
              {[["deals", "Deal Dashboard"], ["monitor", "Run Monitor"]].map(([v, label]) => (
                <button key={v} onClick={() => setView(v)} style={{ padding: "6px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: view === v ? COLORS.blue : "transparent", color: view === v ? "white" : COLORS.muted, transition: "all 0.15s" }}>{label}</button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 12, color: COLORS.sub, fontWeight: 500 }}>{analystName}</div>
            <button onClick={() => signOut(auth)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: COLORS.card2, color: COLORS.sub, border: `1px solid ${COLORS.border}` }}>Sign Out</button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* SIDEBAR — demo mode only */}
        {mode === "demo" && (
          <div style={{ width: 264, background: COLORS.card, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.muted }}>Deal Pipeline</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: COLORS.blue, fontWeight: 700 }}>{mockDeals.length} deals</div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
              {mockDeals.map(d => (
                <DealCard key={d.id} deal={d} active={selectedDeal?.id === d.id} onClick={() => { setSelectedDeal(d); setView("deals"); }} />
              ))}
            </div>
          </div>
        )}

        {/* CONTENT */}
        {mode === "demo" && view === "deals" && selectedDeal && <DealReport deal={selectedDeal} analystName={analystName} />}
        {mode === "demo" && view === "monitor" && <RunMonitorView analystName={analystName} />}
        {mode === "live" && <LiveView analystName={analystName} uid={firebaseUser?.uid} />}
        {mode === "tracker" && <LiveTrackerView uid={firebaseUser?.uid} onGoLive={() => setMode("live")} />}
      </div>
    </div>
  );
}
