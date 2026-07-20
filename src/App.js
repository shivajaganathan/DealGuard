import { useState, useEffect } from "react";

const WEBHOOK_URL = "https://merge-works.app.n8n.cloud/webhook-test/dealguard-intake";

const COLORS = {
  bg: "#0A0F1E",
  card: "#111827",
  card2: "#1A2235",
  border: "#1E2D45",
  blue: "#3B82F6",
  amber: "#F59E0B",
  red: "#EF4444",
  green: "#10B981",
  purple: "#8B5CF6",
  text: "#F1F5F9",
  muted: "#64748B",
  sub: "#94A3B8",
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
const sevBg = { critical: "rgba(239,68,68,0.12)", high: "rgba(245,158,11,0.12)", medium: "rgba(59,130,246,0.12)", low: "rgba(100,116,139,0.12)" };
const postureConfig = {
  requires_retrading: { label: "Requires Retrading", color: COLORS.red, bg: "rgba(239,68,68,0.07)", border: "rgba(239,68,68,0.25)" },
  proceed_with_clauses: { label: "Proceed with Clauses", color: COLORS.green, bg: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.25)" },
  escalate_to_analyst: { label: "Escalate to Analyst", color: COLORS.amber, bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.25)" },
};
const catLabel = { customer_concentration: "Customer Concentration", owner_dependency: "Owner Dependency", operational_sop: "SOP / Process Risk", employee_culture: "Employee & Culture" };
const catIcon = { customer_concentration: "👥", owner_dependency: "🔑", operational_sop: "📋", employee_culture: "🏢" };

function ConcentrationChart({ data }) {
  const maxVal = Math.max(...data.map(d => d.pct), 30);
  const barColors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EC4899", "#64748B"];
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
    running: { bg: "rgba(59,130,246,0.15)", border: COLORS.blue, color: COLORS.blue, symbol: "⟳", anim: true },
    escalated: { bg: "rgba(245,158,11,0.15)", border: COLORS.amber, color: COLORS.amber, symbol: "!", anim: false },
    waiting: { bg: "rgba(30,45,69,0.5)", border: COLORS.border, color: COLORS.muted, symbol: "·", anim: false },
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
  const statusBg = { complete: "rgba(16,185,129,0.12)", running: "rgba(59,130,246,0.12)", escalated: "rgba(245,158,11,0.12)", failed: "rgba(239,68,68,0.12)" };
  return (
    <div onClick={onClick} style={{ padding: "12px", borderRadius: 8, cursor: "pointer", marginBottom: 6, background: active ? "rgba(59,130,246,0.07)" : COLORS.card2, border: `1px solid ${active ? COLORS.blue : "transparent"}`, transition: "all 0.15s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{deal.company}</div>
        <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: statusBg[deal.status], color: statusColors[deal.status] }}>{deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}</div>
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 10, color: COLORS.muted, marginBottom: 8 }}>{deal.id} · {deal.time}</div>
      <SeverityBar severity={deal.severity} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <div style={{ fontSize: 10, color: COLORS.muted }}>{deal.severity.critical} critical</div>
        <div style={{ fontSize: 10, color: COLORS.muted }}>{postureConfig[deal.posture].label.split(" ")[0]}</div>
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
          <div style={{ background: "rgba(59,130,246,0.05)", borderRadius: 8, padding: 14, border: "1px solid rgba(59,130,246,0.15)" }}>
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
    critical: { bg: "rgba(239,68,68,0.12)", color: "#EF4444" },
    high: { bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
    medium: { bg: "rgba(59,130,246,0.12)", color: "#3B82F6" },
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
    <div style={{ height: 6, borderRadius: 3, background: "#1E2D45", display: "flex", overflow: "hidden", gap: 1 }}>
      {counts.critical > 0 && <div style={{ width: `${(counts.critical / total) * 100}%`, background: "#EF4444", borderRadius: 2 }} />}
      {counts.high > 0 && <div style={{ width: `${(counts.high / total) * 100}%`, background: "#F59E0B", borderRadius: 2 }} />}
      {counts.medium > 0 && <div style={{ width: `${(counts.medium / total) * 100}%`, background: "#3B82F6", borderRadius: 2 }} />}
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
    critical: "#EF4444",
    high: "#F59E0B",
    medium: "#3B82F6",
    low: "#64748B"
  };

  const sev = (finding.severity || '').toLowerCase();

  return (
    <div style={{ background: "#111827", border: `1px solid ${expanded ? sevColor[sev] || "#1E2D45" : "#1E2D45"}`, borderRadius: 10, overflow: "hidden", transition: "border-color 0.2s" }}>
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
          <div style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", marginBottom: 4 }}>
            {finding.title || finding.flag}
          </div>
          <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>
            {(finding.description || finding.detail || '').substring(0, 120)}...
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 20px 20px 38px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Full description */}
          <div style={{ background: "#1A2235", borderRadius: 8, padding: 14, border: "1px solid #1E2D45" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Full Detail</div>
            <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.7 }}>{finding.description || finding.detail}</div>
          </div>

          {/* Sources */}
          {(finding.sources || [finding.source]).filter(Boolean).length > 0 && (
            <div style={{ background: "rgba(59,130,246,0.05)", borderRadius: 8, padding: 14, border: "1px solid rgba(59,130,246,0.15)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#3B82F6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Evidence Sources</div>
              {(finding.sources || [finding.source]).filter(Boolean).map((src, i) => (
                <div key={i} style={{ marginBottom: i < (finding.sources || []).length - 1 ? 10 : 0 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: "#64748B", marginBottom: 3 }}>
                    {src.source_type || src.type} — {src.source_ref || src.ref}
                  </div>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic", lineHeight: 1.5 }}>
                    "{src.excerpt || src.quote}"
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LOI Clause */}
          {(finding.loi_clause?.recommended || finding.loi_clause?.clause_type) && (
            <div style={{ background: "rgba(139,92,246,0.06)", borderRadius: 8, padding: 14, border: "1px solid rgba(139,92,246,0.2)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8B5CF6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                LOI Clause → {(finding.loi_clause.clause_type || '').replace(/_/g, ' ').toUpperCase()}
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>{finding.loi_clause.clause_notes}</div>
            </div>
          )}

          {/* Buyer Actions */}
          {(finding.buyer_actions || []).length > 0 && (
            <div style={{ background: "rgba(16,185,129,0.05)", borderRadius: 8, padding: 14, border: "1px solid rgba(16,185,129,0.15)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Recommended Buyer Actions</div>
              {finding.buyer_actions.map((action, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: i < finding.buyer_actions.length - 1 ? 8 : 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(16,185,129,0.2)", color: "#10B981", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>{action}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportRenderer({ report }) {
  if (!report) return null;

  // Handle both direct report and wrapped in array
  // Handle array wrapper
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
    return (
      <div style={{ padding: 20, background: "#111827", borderRadius: 10, border: "1px solid #1E2D45" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B", marginBottom: 8 }}>⚠ Workflow completed — report saved to Google Drive</div>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>{parsed.message || "Check Google Drive for the full report."}</div>
      </div>
    );
  }

  const meta = parsed.report_metadata || { deal_id: parsed.deal_id, target_company: parsed.target_company, generated_at: parsed.generated_at };
  const summary = parsed.executive_summary || parsed.severity_summary || {};
  const findings = parsed.findings || [];
  const dqFlags = parsed.data_quality_flags || [];
  const postureDetail = parsed.deal_posture_detail || {};

  const counts = {
    critical: summary.critical_count ?? summary.critical ?? parsed.severity_summary?.critical ?? 0,
    high: summary.high_count ?? summary.high ?? parsed.severity_summary?.high ?? 0,
    medium: summary.medium_count ?? summary.medium ?? parsed.severity_summary?.medium ?? 0,
    low: summary.low_count ?? summary.low ?? parsed.severity_summary?.low ?? 0,
  };

  const posture = summary.deal_posture?.recommended_posture || parsed.overall_deal_posture || 'unknown';
  const postureConfig = {
    requires_retrading: { label: "Requires Retrading", color: "#EF4444", bg: "rgba(239,68,68,0.07)", border: "rgba(239,68,68,0.25)" },
    proceed_with_clauses: { label: "Proceed with Clauses", color: "#10B981", bg: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.25)" },
    escalate_to_analyst: { label: "Escalate to Analyst", color: "#F59E0B", bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.25)" },
    pause: { label: "Pause — Additional Data Required", color: "#F59E0B", bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.25)" },
    unknown: { label: "Review Required", color: "#64748B", bg: "rgba(100,116,139,0.07)", border: "rgba(100,116,139,0.25)" },
  };
  const pc = postureConfig[posture] || postureConfig.unknown;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#F1F5F9", marginBottom: 4 }}>{meta.target_company}</div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#64748B" }}>
            {meta.deal_id} · Generated {meta.generated_at ? new Date(meta.generated_at).toLocaleString() : new Date().toLocaleString()} · DealGuard Red-Flag Risk Report
          </div>
        </div>
        <button onClick={() => navigator.clipboard.writeText(JSON.stringify(parsed, null, 2))}
          style={{ padding: "8px 16px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "#1A2235", color: "#94A3B8", border: "1px solid #1E2D45" }}>
          Copy JSON
        </button>
      </div>

      {/* DEAL POSTURE BANNER */}
      <div style={{ borderRadius: 10, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: pc.bg, border: `1px solid ${pc.border}` }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748B", marginBottom: 3 }}>Deal Posture</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: pc.color }}>{pc.label}</div>
        </div>
        <div style={{ fontSize: 12, color: "#94A3B8", maxWidth: 420, textAlign: "right", lineHeight: 1.6 }}>
          {summary.deal_posture?.posture_rationale || parsed.escalation?.reason || ''}
        </div>
      </div>

      {/* SEVERITY SUMMARY */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Critical", val: counts.critical, color: "#EF4444", sub: "Requires retrading" },
          { label: "High", val: counts.high, color: "#F59E0B", sub: "LOI clause required" },
          { label: "Medium", val: counts.medium, color: "#3B82F6", sub: "Monitor closely" },
          { label: "Low", val: counts.low, color: "#64748B", sub: "Flag for review" },
        ].map(s => (
          <div key={s.label} style={{ background: "#111827", border: "1px solid #1E2D45", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748B", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: "monospace", fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* SEVERITY BAR */}
      <div style={{ background: "#111827", border: "1px solid #1E2D45", borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          Finding Distribution — {findings.length} total findings
        </div>
        <ReportSeverityBar counts={counts} />
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          {[["#EF4444", "Critical"], ["#F59E0B", "High"], ["#3B82F6", "Medium"], ["#64748B", "Low"]].map(([color, label]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              <span style={{ fontSize: 11, color: "#94A3B8" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FINDINGS */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748B", marginBottom: 12 }}>
          Findings — click to expand
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {findings.map(f => <FindingCard key={f.finding_id || f.id} finding={f} />)}
        </div>
      </div>

      {/* DATA QUALITY FLAGS */}
      {dqFlags.length > 0 && (
        <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚠</span> Data Quality Flags ({dqFlags.length})
          </div>
          {dqFlags.map((flag, i) => (
            <div key={flag.flag_id || i} style={{ padding: "12px 0", borderTop: i > 0 ? "1px solid rgba(245,158,11,0.1)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: "#F59E0B", fontWeight: 700 }}>{flag.flag_id}</div>
                <div style={{ fontSize: 10, color: "#64748B" }}>{flag.affected_category?.replace(/_/g, ' ')}</div>
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5, marginBottom: 6 }}>{flag.description}</div>
              <div style={{ fontSize: 11, color: "#10B981" }}>→ {flag.recommended_resolution}</div>
            </div>
          ))}
        </div>
      )}

      {/* CONDITIONS TO ADVANCE */}
      {(postureDetail.conditions_to_advance || []).length > 0 && (
        <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#10B981", marginBottom: 14 }}>✓ Conditions to Advance</div>
          {postureDetail.conditions_to_advance.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < postureDetail.conditions_to_advance.length - 1 ? 10 : 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", marginTop: 6, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>{c}</div>
            </div>
          ))}
        </div>
      )}

      {/* CONDITIONS TO REPRICE */}
      {(postureDetail.conditions_to_reprice || []).length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#EF4444", marginBottom: 14 }}>⬇ Conditions to Reprice</div>
          {postureDetail.conditions_to_reprice.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < postureDetail.conditions_to_reprice.length - 1 ? 10 : 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444", marginTop: 6, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>{c}</div>
            </div>
          ))}
        </div>
      )}

      {/* ANALYST NOTES */}
      {parsed.analyst_notes && (
        <div style={{ background: "#111827", border: "1px solid #1E2D45", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Analyst Notes — Non-Scored</div>
          <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.7, fontStyle: "italic" }}>{parsed.analyst_notes}</div>
        </div>
      )}

    </div>
  );
}

// ── LIVE VIEW ─────────────────────────────────────────────────────────────────
function LiveView({ analystName }) {
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
    } catch (e) {
      clearInterval(interval);
      setErrorMsg(`Error: ${e.message}. Make sure your n8n workflow is in test mode and listening.`);
      setStatus("error");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setJsonInput(ev.target.result);
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
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, cursor: "pointer", background: active ? "rgba(59,130,246,0.07)" : COLORS.card2, border: `1px solid ${active ? COLORS.blue : COLORS.border}`, transition: "all 0.15s" }}>
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
          }  ⚠ Partial analysis — {4 - activeCount} categor{4 - activeCount === 1 ? "y" : "ies"} skipped. Missing categories will be marked incomplete in the report.
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
        <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 10, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${COLORS.blue}`, borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.blue }}>Workflow running — {elapsed}s elapsed</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Intake", "Normalize", "Route", "Parse", "Classify", "Audit", "Merge", "Validate", "Generate", "Deliver"].map((step, i) => (
              <div key={step} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: elapsed > i * 4 ? "rgba(16,185,129,0.15)" : "rgba(30,45,69,0.5)", color: elapsed > i * 4 ? COLORS.green : COLORS.muted, border: `1px solid ${elapsed > i * 4 ? "rgba(16,185,129,0.3)" : COLORS.border}`, fontWeight: 600, transition: "all 0.5s" }}>
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
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 12 }}>Common fixes: make sure your n8n workflow is active and the webhook node is in "Listen for Test Event" mode.</div>
        </div>
      )}

      {status === "success" && result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 10, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 20 }}>✅</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#10B981", marginBottom: 2 }}>Workflow completed successfully</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>Report generated · Saved to Google Drive · Email sent to {analystName}</div>
            </div>
          </div>
          <ReportRenderer report={result} />
        </div>
      )}
    </div>
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

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("demo"); // demo | live
  const [view, setView] = useState("deals"); // deals | monitor
  const [selectedDeal, setSelectedDeal] = useState(mockDeals[0]);
  const [analystName, setAnalystName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  if (!loggedIn) {
    return (
      <div style={{ background: COLORS.bg, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 40, width: 340 }}>
          <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: COLORS.blue, marginBottom: 4 }}>DealGuard</div>
          <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 28 }}>Operational Due Diligence Agent · Post-LOI Risk Analysis</div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 6, fontWeight: 600 }}>Your Name</div>
          <input placeholder="e.g. S. Jaganathan" value={nameInput} onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && nameInput.trim()) { setAnalystName(nameInput.trim()); setLoggedIn(true); } }}
            style={{ width: "100%", background: COLORS.card2, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "9px 12px", color: COLORS.text, fontSize: 13, outline: "none", fontFamily: "inherit", marginBottom: 16 }} />
          <button onClick={() => { if (nameInput.trim()) { setAnalystName(nameInput.trim()); setLoggedIn(true); } }}
            style={{ width: "100%", padding: "11px", borderRadius: 6, background: COLORS.blue, color: "white", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Enter Dashboard →
          </button>
          <div style={{ marginTop: 20, fontSize: 10, color: COLORS.muted, textAlign: "center" }}>DealGuard · MergeWorks AI Fellowship 2026</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, height: "100vh", display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden" }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1E2D45; border-radius: 2px; }
        input:focus, textarea:focus { border-color: #3B82F6 !important; }
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
          <div style={{ fontSize: 12, color: COLORS.sub, fontWeight: 500 }}>{analystName}</div>
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
        {mode === "live" && <LiveView analystName={analystName} />}
      </div>
    </div>
  );
}