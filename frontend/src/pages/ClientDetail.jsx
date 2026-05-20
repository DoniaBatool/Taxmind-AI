import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  getClient, getAnalysis, triggerAnalysis,
  uploadTaxReturn, uploadFinancials,
  listDocuments, deleteTaxReturn, deleteFinancials,
  listAnalyses, deleteAnalysis,
  updateClient, chatWithClient,
} from "../api";

const SEV_COLOR    = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" };
const PRIO_COLOR   = { urgent: "#ef4444", review: "#f59e0b", "on-track": "#10b981" };
const PRIO_LABEL   = { urgent: "🔴 Urgent", review: "⚠️ Review", "on-track": "✅ On Track" };
const API_BASE     = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function fmtShortDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ── Edit Client Modal ────────────────────────────────────────────────────────

const ENTITY_TYPES = ["S-Corp", "LLC", "Sole-Prop", "Partnership", "C-Corp"];

function EditClientModal({ client, onClose, onSaved }) {
  const [form, setForm]     = useState({
    name:        client.name        || "",
    entity_type: client.entity_type || "LLC",
    industry:    client.industry    || "",
    email:       client.email       || "",
    phone:       client.phone       || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Client name is required");
    setSaving(true);
    setError("");
    try {
      const res = await updateClient(client.id, {
        name:        form.name.trim(),
        entity_type: form.entity_type,
        industry:    form.industry.trim() || null,
        email:       form.email.trim()    || null,
        phone:       form.phone.trim()    || null,
      });
      onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Save failed. Please try again.");
      setSaving(false);
    }
  };

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{
        width: "100%", maxWidth: 480,
        background: "#13151a", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20, padding: "32px 28px",
        boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8eaf0", fontFamily: "'DM Serif Display', serif" }}>
            Edit Client
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        <form onSubmit={handleSave}>
          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={modalLabel}>Client / Business Name</label>
            <input
              type="text" required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Rivera Construction LLC"
              style={modalInput}
            />
          </div>

          {/* Entity Type */}
          <div style={{ marginBottom: 16 }}>
            <label style={modalLabel}>Entity Type</label>
            <select
              value={form.entity_type}
              onChange={e => setForm(f => ({ ...f, entity_type: e.target.value }))}
              style={{ ...modalInput, cursor: "pointer" }}
            >
              {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Industry */}
          <div style={{ marginBottom: 16 }}>
            <label style={modalLabel}>Industry <span style={{ color: "#4b5563" }}>(optional)</span></label>
            <input
              type="text"
              value={form.industry}
              onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
              placeholder="e.g. Construction, Healthcare, Retail"
              style={modalInput}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={modalLabel}>Contact Email <span style={{ color: "#4b5563" }}>(optional)</span></label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="client@company.com"
              style={modalInput}
            />
          </div>

          {/* Phone */}
          <div style={{ marginBottom: 24 }}>
            <label style={modalLabel}>Phone <span style={{ color: "#4b5563" }}>(optional)</span></label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+1 (555) 000-0000"
              style={modalInput}
            />
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#ef4444" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button" onClick={onClose}
              style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#9ca3af", fontSize: 14, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: saving ? "rgba(20,184,166,0.4)" : "#14b8a6", color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const modalLabel = { display: "block", fontSize: 12, fontWeight: 600, color: "#9ca3af", marginBottom: 6 };
const modalInput = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#e8eaf0", fontSize: 14, outline: "none", boxSizing: "border-box",
};

// ── Drag & Drop Zone ─────────────────────────────────────────────────────────

function DropZone({ label, accept, color, icon, onFile, uploading }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      onClick={() => !uploading && inputRef.current.click()}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      style={{
        border: `2px dashed ${dragging ? color : `${color}55`}`,
        borderRadius: 12, padding: "18px 14px", textAlign: "center",
        cursor: uploading ? "not-allowed" : "pointer",
        background: dragging ? `${color}10` : "transparent",
        transition: "all 0.2s", flex: 1, minWidth: 180,
        opacity: uploading ? 0.6 : 1,
      }}
    >
      <div style={{ fontSize: 26, marginBottom: 5 }}>{uploading ? "⏳" : icon}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 11, color: "#6b7280" }}>
        {uploading ? "Uploading..." : "Drop file here or click to browse"}
      </div>
      <input ref={inputRef} type="file" accept={accept} onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} style={{ display: "none" }} />
    </div>
  );
}

// ── Uploaded Documents List ───────────────────────────────────────────────────

function DocumentsList({ clientId, refreshKey, onDeleted, highlightedDocIds = [] }) {
  const [docs, setDocs]         = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    listDocuments(clientId)
      .then(r => setDocs(r.data))
      .catch(() => setDocs({ tax_returns: [], financials: [] }));
  }, [clientId, refreshKey]);

  const handleDelete = async (type, docId) => {
    if (!window.confirm("Delete this document?")) return;
    setDeleting(docId);
    try {
      if (type === "tax") await deleteTaxReturn(clientId, docId);
      else await deleteFinancials(clientId, docId);
      setDocs(prev => ({
        tax_returns: type === "tax" ? prev.tax_returns.filter(d => d.id !== docId) : prev.tax_returns,
        financials:  type === "fin" ? prev.financials.filter(d => d.id !== docId)  : prev.financials,
      }));
      onDeleted?.();
    } catch { alert("Delete failed"); }
    finally { setDeleting(null); }
  };

  if (!docs) return null;
  const hasAny = docs.tax_returns.length > 0 || docs.financials.length > 0;
  if (!hasAny) return null;

  const isHighlighted = (docId) => highlightedDocIds.includes(docId);

  const DocRow = ({ label, icon, color, items, type }) => items.map(doc => {
    const highlighted = isHighlighted(doc.id);
    return (
    <div key={doc.id} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px", borderRadius: 8,
      background: highlighted ? "rgba(20,184,166,0.08)" : "rgba(255,255,255,0.03)",
      border: highlighted ? "1px solid rgba(20,184,166,0.4)" : "1px solid rgba(255,255,255,0.06)",
      marginBottom: 6,
      transition: "all 0.3s",
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: highlighted ? "#14b8a6" : "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {doc.filename}
        </div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>
          {type === "tax" ? `Tax Year ${doc.tax_year}` : `Fiscal Year ${doc.fiscal_year}`} · {fmtShortDate(doc.uploaded_at)}
        </div>
      </div>
      {highlighted && (
        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "rgba(20,184,166,0.15)", color: "#14b8a6", fontWeight: 700, whiteSpace: "nowrap" }}>
          ✦ Used in analysis
        </span>
      )}
      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: `${color}15`, color }}>
        {type === "tax" ? `${doc.text_length > 0 ? "✓ Parsed" : "Pending"}` : `${doc.rows} rows`}
      </span>
      <a
        href={`${API_BASE}/api/clients/${clientId}/${type === "tax" ? "tax-return" : "financials"}/${doc.id}/view`}
        target="_blank"
        rel="noreferrer"
        title="View document"
        onClick={e => e.stopPropagation()}
        style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af", cursor: "pointer", fontSize: 11, padding: "3px 8px", borderRadius: 5, textDecoration: "none", fontWeight: 600 }}
      >View</a>
      <button
        onClick={() => handleDelete(type, doc.id)}
        disabled={deleting === doc.id}
        title="Delete document"
        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14, padding: "2px 4px", opacity: deleting === doc.id ? 0.4 : 0.7 }}
      >🗑</button>
    </div>
    );
  });

  return (
    <div style={{ marginTop: 14, padding: "12px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
        Uploaded Documents
      </div>
      <DocRow label="Tax Returns" icon="📄" color="#3b82f6" items={docs.tax_returns} type="tax" />
      <DocRow label="P&L Statements" icon="📊" color="#8b5cf6" items={docs.financials} type="fin" />
    </div>
  );
}

// ── Agent Progress Panel ─────────────────────────────────────────────────────

const AGENT_ORDER = ["pdf_analyzer", "comparator", "anomaly_detector", "tax_planner", "report_generator"];
const AGENT_META  = {
  pdf_analyzer:      { label: "PDF Analyzer",      icon: "📄", desc: "Extracting data from tax return PDF" },
  comparator:        { label: "Comparator",         icon: "📊", desc: "Running year-over-year comparison" },
  anomaly_detector:  { label: "Anomaly Detector",   icon: "🔍", desc: "Scanning for red flags and risks" },
  tax_planner:       { label: "Tax Planner",        icon: "💡", desc: "Generating tax saving opportunities" },
  report_generator:  { label: "Report Generator",   icon: "📝", desc: "Compiling final analysis report" },
};

function AgentProgressPanel({ steps, visible }) {
  if (!visible) return null;

  // Build map: agentKey → latest step received
  const agentStatus = {};
  steps.forEach(s => { agentStatus[s.agent] = s; });

  // Determine which agent is currently running (first "running" in order)
  const runningIndex = AGENT_ORDER.findIndex(k => agentStatus[k]?.status === "running");

  return (
    <div style={{
      background: "rgba(0,0,0,0.4)", border: "1px solid rgba(20,184,166,0.3)",
      borderRadius: 14, padding: "16px 18px", marginBottom: 20,
      backdropFilter: "blur(8px)",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#14b8a6", marginBottom: 12 }}>
        🧠 AI Agents — Live Progress
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {AGENT_ORDER.map((key, idx) => {
          const step   = agentStatus[key];
          const status = step?.status || "pending";
          const meta   = AGENT_META[key];

          // Visual state: done | running | next | queued
          const isDone    = status === "done";
          const isRunning = status === "running";
          const isError   = status === "error";
          // "next" = the agent right after the running one (about to start)
          const isNext    = !isDone && !isRunning && runningIndex >= 0 && idx === runningIndex + 1;
          const isQueued  = !isDone && !isRunning && !isNext && !isError;

          const bg    = isRunning ? "rgba(245,158,11,0.10)"
                      : isDone    ? "rgba(16,185,129,0.08)"
                      : isError   ? "rgba(239,68,68,0.08)"
                      : "rgba(255,255,255,0.02)";
          const bdr   = isRunning ? "rgba(245,158,11,0.35)"
                      : isDone    ? "rgba(16,185,129,0.25)"
                      : isError   ? "rgba(239,68,68,0.25)"
                      : "rgba(255,255,255,0.05)";
          const statusIcon = isDone ? "✅" : isRunning ? "⏳" : isError ? "❌" : isNext ? "⏩" : "○";
          const labelColor = isDone ? "#10b981" : isRunning ? "#f59e0b" : isError ? "#ef4444" : "#4b5563";
          const msgColor   = isRunning ? "#d97706" : isDone ? "#6b7280" : "#374151";
          const msg        = step?.message
                           || (isRunning ? "Working..." : isDone ? "Complete" : isNext ? "Up next" : "Queued");

          return (
            <div key={key} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 9,
              background: bg, border: `1px solid ${bdr}`,
              transition: "all 0.4s",
              opacity: isQueued && runningIndex >= 0 && idx > runningIndex + 1 ? 0.45 : 1,
            }}>
              <span style={{ fontSize: 15, minWidth: 18, textAlign: "center" }}>{statusIcon}</span>
              <span style={{ fontSize: 15 }}>{meta.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: labelColor }}>{step?.label || meta.label}</div>
                <div style={{ fontSize: 11, color: msgColor, marginTop: 1 }}>{msg}</div>
              </div>
              {isRunning && (
                <div style={{ display: "flex", gap: 3 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 5, height: 5, borderRadius: "50%", background: "#f59e0b",
                      animation: `bounce 1s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Analysis History Sidebar ─────────────────────────────────────────────────

function AnalysisHistory({ clientId, currentAnalysisId, onSelect, refreshKey }) {
  const [history, setHistory]     = useState([]);
  const [openMenu, setOpenMenu]   = useState(null);
  const [deleting, setDeleting]   = useState(null);

  const load = useCallback(() => {
    listAnalyses(clientId)
      .then(r => setHistory(r.data))
      .catch(() => setHistory([]));
  }, [clientId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  // Close menu on outside click
  useEffect(() => {
    const handler = () => setOpenMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleDelete = async (e, aId) => {
    e.stopPropagation();
    setOpenMenu(null);
    if (!window.confirm("Delete this analysis? This cannot be undone.")) return;
    setDeleting(aId);
    try {
      await deleteAnalysis(clientId, aId);
      setHistory(prev => prev.filter(a => a.id !== aId));
    } catch { alert("Delete failed"); }
    finally { setDeleting(null); }
  };

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14, padding: "16px 14px", height: "fit-content",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#e8eaf0", marginBottom: 12 }}>
        📋 Analysis History
      </div>

      {history.length === 0 ? (
        <div style={{ fontSize: 12, color: "#4b5563", textAlign: "center", padding: "20px 0" }}>
          No analyses yet.<br />Run your first analysis to get started.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {history.map(a => {
            const isActive = a.id === currentAnalysisId;
            const pc = PRIO_COLOR[a.priority_level] || "#6b7280";
            return (
              <div
                key={a.id}
                onClick={() => onSelect(a)}
                style={{
                  position: "relative",
                  padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                  background: isActive ? "rgba(20,184,166,0.10)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isActive ? "rgba(20,184,166,0.3)" : "rgba(255,255,255,0.06)"}`,
                  transition: "all 0.2s",
                }}
              >
                {/* Status + Year */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? "#14b8a6" : "#e8eaf0" }}>
                    Tax Year {a.analysis_year}
                  </div>
                  {/* 3-dot menu */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === a.id ? null : a.id); }}
                    style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 16, padding: "0 2px", lineHeight: 1 }}
                  >⋯</button>
                </div>

                {/* Priority badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 5,
                    background: `${pc}20`, color: pc, textTransform: "uppercase",
                  }}>
                    {a.priority_level || "—"}
                  </span>
                  {a.status === "running" && (
                    <span style={{ fontSize: 10, color: "#f59e0b" }}>● Running</span>
                  )}
                  {a.status === "error" && (
                    <span style={{ fontSize: 10, color: "#ef4444" }}>✕ Error</span>
                  )}
                </div>

                {/* Date */}
                <div style={{ fontSize: 11, color: "#4b5563" }}>
                  {fmtShortDate(a.completed_at || a.created_at)}
                </div>

                {/* Summary snippet */}
                {a.one_line_summary && (
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {a.one_line_summary}
                  </div>
                )}

                {/* Source documents used */}
                {a.document_refs && (
                  <div style={{ marginTop: 6, padding: "5px 7px", background: "rgba(0,0,0,0.2)", borderRadius: 6, borderLeft: "2px solid rgba(20,184,166,0.4)" }}>
                    <div style={{ fontSize: 10, color: "#4b5563", fontWeight: 700, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Source Docs
                    </div>
                    {a.document_refs.tax_return && (
                      <div style={{ fontSize: 10, color: "#6b7280", display: "flex", gap: 4, alignItems: "center" }}>
                        <span>📄</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.document_refs.tax_return.filename} <span style={{ color: "#4b5563" }}>({a.document_refs.tax_return.tax_year})</span>
                        </span>
                      </div>
                    )}
                    {a.document_refs.financials && (
                      <div style={{ fontSize: 10, color: "#6b7280", display: "flex", gap: 4, alignItems: "center", marginTop: 2 }}>
                        <span>📊</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.document_refs.financials.filename} <span style={{ color: "#4b5563" }}>({a.document_refs.financials.fiscal_year})</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Dropdown menu */}
                {openMenu === a.id && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: "absolute", right: 8, top: 36, zIndex: 100,
                      background: "#1a1d23", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                      minWidth: 140, overflow: "hidden",
                    }}
                  >
                    <button
                      onClick={e => handleDelete(e, a.id)}
                      disabled={deleting === a.id}
                      style={{
                        display: "block", width: "100%", padding: "10px 14px",
                        background: "none", border: "none", color: "#ef4444",
                        cursor: "pointer", fontSize: 12, fontWeight: 600, textAlign: "left",
                      }}
                    >
                      {deleting === a.id ? "Deleting..." : "🗑 Delete Analysis"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient]           = useState(null);
  const [analysis, setAnalysis]       = useState(null);
  const [tab, setTab]                 = useState("overview");
  const [loading, setLoading]         = useState(true);
  const [notFound, setNotFound]       = useState(false);
  const [showEdit, setShowEdit]       = useState(false);
  const [showChat, setShowChat]       = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]     = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [analyzing, setAnalyzing]     = useState(false);
  const chatEndRef = useRef(null);
  const [uploadStatus, setUploadStatus] = useState({ pdf: null, csv: null, msg: "" });
  const [progressSteps, setProgressSteps] = useState([]);
  const [showProgress, setShowProgress]   = useState(false);
  const [docsRefresh, setDocsRefresh]         = useState(0);
  const [historyRefresh, setHistoryRefresh]   = useState(0);
  const [highlightedDocIds, setHighlightedDocIds] = useState([]);
  const wsRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const cRes = await getClient(id);
      setClient(cRes.data);
      try {
        const aRes = await getAnalysis(id);
        setAnalysis(aRes.data);
        // Auto-highlight docs used in the latest analysis
        const refs = aRes.data?.document_refs;
        if (refs) {
          setHighlightedDocIds([refs.tax_return?.id, refs.financials?.id].filter(Boolean));
        }
      } catch { /* no analysis yet */ }
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 403) {
        setNotFound(true);
      } else {
        navigate("/");
      }
    }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => () => wsRef.current?.close(), []);

  // Scroll chat to bottom whenever messages change
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    const userMsg = { role: "user", content: msg };
    const updatedHistory = [...chatMessages, userMsg];
    setChatMessages(updatedHistory);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await chatWithClient(id, msg, chatMessages);
      setChatMessages(prev => [...prev, { role: "assistant", content: res.data.reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't connect to the AI. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const connectProgressWS = (analysisId) => {
    // Small delay so WS is established before first agent step fires
    setTimeout(() => {
      const wsBase = (process.env.REACT_APP_API_URL || "http://localhost:8000")
        .replace("https://", "wss://").replace("http://", "ws://");
      const ws = new WebSocket(`${wsBase}/api/clients/${id}/analyze/${analysisId}/progress`);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        const step = JSON.parse(e.data);
        if (step.type === "ping") return;
        setProgressSteps(prev => {
          const idx = prev.findIndex(s => s.agent === step.agent);
          if (idx >= 0) { const u = [...prev]; u[idx] = step; return u; }
          return [...prev, step];
        });
        if (step.agent === "orchestrator" && ["done", "error"].includes(step.status)) {
          setTimeout(() => {
            fetchData();
            setHistoryRefresh(n => n + 1);
            setAnalyzing(false);
          }, 1200);
        }
      };
      ws.onerror = () => setAnalyzing(false);
    }, 300);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setProgressSteps([]);
    setShowProgress(true);
    try {
      const res = await triggerAnalysis(id, 2024);
      connectProgressWS(res.data.analysis_id);
      setHistoryRefresh(n => n + 1);
    } catch (e) {
      setUploadStatus(s => ({ ...s, msg: "❌ Analysis failed: " + (e.response?.data?.detail || e.message) }));
      setAnalyzing(false);
      setShowProgress(false);
    }
  };

  const handleTaxDrop = async (file) => {
    setUploadStatus(s => ({ ...s, pdf: "uploading", msg: "" }));
    try {
      await uploadTaxReturn(id, 2023, file);
      setUploadStatus(s => ({ ...s, pdf: "done", msg: "✅ Tax return uploaded!" }));
      setDocsRefresh(n => n + 1);
      setTimeout(() => setUploadStatus(s => ({ ...s, pdf: null, msg: "" })), 3000);
    } catch {
      setUploadStatus(s => ({ ...s, pdf: "error", msg: "❌ Tax return upload failed" }));
    }
  };

  const handleCsvDrop = async (file) => {
    setUploadStatus(s => ({ ...s, csv: "uploading", msg: "" }));
    try {
      await uploadFinancials(id, 2024, file);
      setUploadStatus(s => ({ ...s, csv: "done", msg: "✅ P&L CSV uploaded!" }));
      setDocsRefresh(n => n + 1);
      setTimeout(() => setUploadStatus(s => ({ ...s, csv: null, msg: "" })), 3000);
    } catch {
      setUploadStatus(s => ({ ...s, csv: "error", msg: "❌ P&L upload failed" }));
    }
  };

  const handleDownloadReport = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/clients/${id}/report/download`);
      if (!res.ok) throw new Error("Not found");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `TaxMind_Report_${client?.name?.replace(/ /g, "_") || "client"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("No report available yet — run AI analysis first."); }
  };

  const handleSelectHistory = (a) => {
    setAnalysis(a);
    setTab("overview");
    setShowProgress(false);
    // Highlight the documents that were used for this analysis
    const refs = a.document_refs;
    if (refs) {
      const ids = [refs.tax_return?.id, refs.financials?.id].filter(Boolean);
      setHighlightedDocIds(ids);
    } else {
      setHighlightedDocIds([]);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
      <div style={{ width: 40, height: 40, border: "3px solid rgba(20,184,166,0.2)", borderTopColor: "#14b8a6", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (notFound) return (
    <div style={{ maxWidth: 500, margin: "80px auto", textAlign: "center", padding: 32 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ color: "#e8eaf0", marginBottom: 8, fontFamily: "'DM Serif Display', serif" }}>Client Not Found</h2>
      <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 14 }}>
        This client doesn't exist or doesn't belong to your firm account. It may have been created before you signed up.
      </p>
      <button
        onClick={() => navigate("/")}
        style={{ padding: "10px 24px", background: "rgba(20,184,166,0.15)", color: "#14b8a6", border: "1px solid rgba(20,184,166,0.3)", borderRadius: 8, cursor: "pointer", fontSize: 14, marginRight: 10 }}
      >
        ← Back to Dashboard
      </button>
      <button
        onClick={() => navigate("/add-client")}
        style={{ padding: "10px 24px", background: "#14b8a6", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700 }}
      >
        + Add New Client
      </button>
    </div>
  );

  const pc = PRIO_COLOR[client?.priority_level] || "#10b981";

  const chartData = analysis?.comparison_data ? [
    { name: "Revenue",      prior: analysis.comparison_data.revenue_comparison?.prior || 0,      current: analysis.comparison_data.revenue_comparison?.current || 0 },
    { name: "Gross Profit", prior: analysis.comparison_data.gross_profit_comparison?.prior || 0, current: analysis.comparison_data.gross_profit_comparison?.current || 0 },
    { name: "Net Income",   prior: analysis.comparison_data.net_income_comparison?.prior || 0,   current: analysis.comparison_data.net_income_comparison?.current || 0 },
  ] : [];

  const tabStyle = (t) => ({
    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", border: "none",
    background: tab === t ? "rgba(20,184,166,0.15)" : "transparent",
    color: tab === t ? "#14b8a6" : "#6b7280",
    borderBottom: tab === t ? "2px solid #14b8a6" : "2px solid transparent",
    transition: "all 0.2s",
  });

  const handleSaved = (updatedClient) => {
    setClient(updatedClient);
    setShowEdit(false);
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
      {/* Edit Modal */}
      {showEdit && client && (
        <EditClientModal
          client={client}
          onClose={() => setShowEdit(false)}
          onSaved={handleSaved}
        />
      )}
      {/* Back */}
      <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}>
        ← Dashboard
      </button>

      {/* Client Header */}
      <div style={{ background: "var(--surface)", border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 16, padding: "22px 26px", marginBottom: 20, borderTop: `3px solid ${pc}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: "#e8eaf0", marginBottom: 6 }}>{client?.name}</h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, background: "rgba(255,255,255,0.05)", color: "#9ca3af" }}>{client?.entity_type}</span>
              {client?.industry && <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, background: "rgba(255,255,255,0.05)", color: "#9ca3af" }}>{client?.industry}</span>}
              <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, background: `${pc}15`, color: pc, border: `1px solid ${pc}40` }}>
                {PRIO_LABEL[client?.priority_level] || "✅ On Track"}
              </span>
            </div>
            {client?.one_line_summary && <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 8, maxWidth: 500 }}>{client.one_line_summary}</p>}
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={() => setShowEdit(true)}
              style={{ padding: "9px 18px", borderRadius: 9, fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.05)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}
            >
              ✏️ Edit
            </button>
            <button onClick={handleAnalyze} disabled={analyzing} style={{ padding: "9px 18px", borderRadius: 9, fontSize: 12, fontWeight: 700, background: analyzing ? "rgba(20,184,166,0.06)" : "rgba(20,184,166,0.15)", color: "#14b8a6", border: "1px solid rgba(20,184,166,0.3)", cursor: analyzing ? "not-allowed" : "pointer" }}>
              {analyzing ? "⏳ Analyzing..." : "🧠 Run AI Analysis"}
            </button>
            {analysis?.status === "done" && (
              <button onClick={handleDownloadReport} style={{ padding: "9px 18px", borderRadius: 9, fontSize: 12, fontWeight: 700, background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", cursor: "pointer" }}>
                ⬇️ Download Report
              </button>
            )}
            <button
              onClick={() => setShowChat(v => !v)}
              style={{
                padding: "9px 18px", borderRadius: 9, fontSize: 12, fontWeight: 700,
                background: showChat ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.12)",
                color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.35)", cursor: "pointer",
              }}
            >
              💬 Ask AI
            </button>
          </div>
        </div>

        {uploadStatus.msg && (
          <div style={{ marginTop: 10, padding: "8px 14px", background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)", borderRadius: 8, fontSize: 13, color: "#14b8a6" }}>
            {uploadStatus.msg}
          </div>
        )}

        {/* Upload Zones */}
        <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
          <DropZone label="Prior-Year Tax Return (PDF)" accept=".pdf,.txt" color="#3b82f6" icon="📄" onFile={handleTaxDrop} uploading={uploadStatus.pdf === "uploading"} />
          <DropZone label="Current-Year P&L (CSV)"     accept=".csv"      color="#8b5cf6" icon="📊" onFile={handleCsvDrop} uploading={uploadStatus.csv === "uploading"} />
        </div>

        {/* Uploaded Documents */}
        <DocumentsList clientId={id} refreshKey={docsRefresh} onDeleted={() => setDocsRefresh(n => n + 1)} highlightedDocIds={highlightedDocIds} />
      </div>

      {/* Two-column layout: main content + history sidebar */}
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>

        {/* ── Main Content ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Agent Progress Panel */}
          <AgentProgressPanel steps={progressSteps} visible={showProgress} />

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            {["overview", "red-flags", "tax-plan", "questions"].map(t => (
              <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
                {t === "overview" ? "📊 Overview" : t === "red-flags" ? "🚨 Red Flags" : t === "tax-plan" ? "💡 Tax Plan" : "❓ Questions"}
              </button>
            ))}
          </div>

          {/* No Analysis State */}
          {!analysis && !showProgress && (
            <div style={{ textAlign: "center", padding: "50px 24px", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 16 }}>
              <div style={{ fontSize: 38, marginBottom: 10 }}>🧠</div>
              <h3 style={{ color: "#e8eaf0", marginBottom: 8 }}>No Analysis Yet</h3>
              <p style={{ color: "#6b7280", fontSize: 13 }}>
                Drop your tax return PDF and P&L CSV above, then click <strong style={{ color: "#14b8a6" }}>Run AI Analysis</strong>
              </p>
            </div>
          )}

          {/* Overview Tab */}
          {analysis && tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {chartData.length > 0 && (
                <div style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 22 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#e8eaf0", marginBottom: 18 }}>Year-over-Year Comparison</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} barGap={4}>
                      <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => [`$${v.toLocaleString()}`, ""]} contentStyle={{ background: "#111318", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8eaf0" }} />
                      <Bar dataKey="prior"   name="Prior Year"   fill="#374151" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="current" name="Current Year" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {analysis.comparison_data?.key_observations && (
                <div style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 22 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#e8eaf0", marginBottom: 14 }}>Key Observations</h3>
                  {analysis.comparison_data.key_observations.map((obs, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: "#9ca3af" }}>
                      <span style={{ color: "#14b8a6" }}>→</span> {obs}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Red Flags Tab */}
          {analysis && tab === "red-flags" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(analysis.red_flags || []).length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#10b981" }}>✅ No red flags found!</div>
              ) : (analysis.red_flags || []).map((flag, i) => (
                <div key={i} style={{ background: "var(--surface)", border: `1px solid ${SEV_COLOR[flag.severity] || "#6b7280"}35`, borderLeft: `3px solid ${SEV_COLOR[flag.severity] || "#6b7280"}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: "#e8eaf0" }}>{flag.title}</h4>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: `${SEV_COLOR[flag.severity]}20`, color: SEV_COLOR[flag.severity], textTransform: "uppercase", whiteSpace: "nowrap", marginLeft: 8 }}>{flag.severity}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>{flag.description}</p>
                  {flag.recommendation && <p style={{ fontSize: 11, color: "#14b8a6", fontStyle: "italic" }}>💡 {flag.recommendation}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Tax Plan Tab */}
          {analysis && tab === "tax-plan" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(analysis.tax_opportunities || []).map((opp, i) => (
                <div key={i} style={{ background: "var(--surface)", border: "1px solid rgba(139,92,246,0.2)", borderLeft: "3px solid #8b5cf6", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: "#e8eaf0" }}>{opp.opportunity}</h4>
                    {opp.estimated_savings > 0 && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700, whiteSpace: "nowrap", marginLeft: 8 }}>~${opp.estimated_savings.toLocaleString()} savings</span>}
                  </div>
                  <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>{opp.description}</p>
                  {opp.action_required && <p style={{ fontSize: 11, color: "#8b5cf6" }}>✅ {opp.action_required}</p>}
                  {opp.deadline && <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>📅 Deadline: {opp.deadline}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Questions Tab */}
          {analysis && tab === "questions" && (
            <div style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 22 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#e8eaf0", marginBottom: 18 }}>Questions for Client Meeting</h3>
              {(analysis.smart_questions || []).map((q, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, padding: "11px 14px", background: "var(--surface2)", borderRadius: 10 }}>
                  <span style={{ color: "#14b8a6", fontWeight: 700, minWidth: 22 }}>{i + 1}.</span>
                  <span style={{ fontSize: 13, color: "#e8eaf0" }}>{q}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── History Sidebar ── */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <AnalysisHistory
            clientId={id}
            currentAnalysisId={analysis?.id}
            onSelect={handleSelectHistory}
            refreshKey={historyRefresh}
          />
        </div>
      </div>

      {/* ── AI Chat Panel ── */}
      {showChat && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 500,
          width: 380, height: 520,
          background: "#13151c",
          border: "1px solid rgba(139,92,246,0.35)",
          borderRadius: 18,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 18px",
            background: "rgba(139,92,246,0.1)",
            borderBottom: "1px solid rgba(139,92,246,0.2)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
              }}>🧠</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e8eaf0" }}>TaxMind AI</div>
                <div style={{ fontSize: 11, color: "#8b5cf6" }}>Ask about {client?.name}</div>
              </div>
            </div>
            <button
              onClick={() => setShowChat(false)}
              style={{ background: "none", border: "none", color: "#6b7280", fontSize: 18, cursor: "pointer", lineHeight: 1 }}
            >✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {chatMessages.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 16px" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
                <p style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.5 }}>
                  Ask me anything about <strong style={{ color: "#9ca3af" }}>{client?.name}</strong> — red flags, tax strategies, financial ratios, or meeting prep questions.
                </p>
                {/* Suggestions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 16 }}>
                  {[
                    "What are the biggest red flags?",
                    "How can we reduce their tax liability?",
                    "What questions should I ask the client?",
                  ].map(s => (
                    <button
                      key={s}
                      onClick={() => { setChatInput(s); }}
                      style={{
                        padding: "8px 12px", borderRadius: 8, fontSize: 12,
                        background: "rgba(139,92,246,0.08)", color: "#8b5cf6",
                        border: "1px solid rgba(139,92,246,0.2)", cursor: "pointer",
                        textAlign: "left",
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: msg.role === "user"
                    ? "rgba(139,92,246,0.2)"
                    : "rgba(255,255,255,0.06)",
                  border: msg.role === "user"
                    ? "1px solid rgba(139,92,246,0.3)"
                    : "1px solid rgba(255,255,255,0.08)",
                  fontSize: 13, color: "#e8eaf0", lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  padding: "10px 16px", borderRadius: "14px 14px 14px 4px",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {[0,1,2].map(d => (
                    <div key={d} style={{
                      width: 7, height: 7, borderRadius: "50%", background: "#8b5cf6",
                      animation: "bounce 1.2s infinite",
                      animationDelay: `${d * 0.2}s`,
                    }} />
                  ))}
                  <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)} }`}</style>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: "12px 14px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              display: "flex", gap: 8,
            }}
          >
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask about this client..."
              disabled={chatLoading}
              style={{
                flex: 1, padding: "9px 14px", borderRadius: 10, fontSize: 13,
                background: "rgba(255,255,255,0.06)", color: "#e8eaf0",
                border: "1px solid rgba(255,255,255,0.1)", outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              style={{
                padding: "9px 14px", borderRadius: 10, fontSize: 14, fontWeight: 700,
                background: chatInput.trim() && !chatLoading ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.08)",
                color: chatInput.trim() && !chatLoading ? "#8b5cf6" : "#4b5563",
                border: "1px solid rgba(139,92,246,0.3)", cursor: chatInput.trim() && !chatLoading ? "pointer" : "not-allowed",
              }}
            >↑</button>
          </form>
        </div>
      )}
    </div>
  );
}
