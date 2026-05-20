import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminGetFirms, adminGetStats, adminSetRole, adminDeleteFirm } from "../api";

export default function AdminPage() {
  const navigate = useNavigate();
  const [firms, setFirms]         = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [actionId, setActionId]   = useState(null); // which row is loading

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [firmsRes, statsRes] = await Promise.all([adminGetFirms(), adminGetStats()]);
      setFirms(firmsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setError("Access denied. You do not have admin privileges.");
      } else {
        setError(err.response?.data?.detail || "Failed to load admin data.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleToggleAdmin = async (firm) => {
    if (!window.confirm(`${firm.is_admin ? "Remove admin from" : "Grant admin to"} "${firm.firm_name}"?`)) return;
    setActionId(firm.id);
    try {
      await adminSetRole(firm.id, !firm.is_admin);
      await load();
    } catch (err) {
      alert(err.response?.data?.detail || "Action failed.");
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (firm) => {
    if (!window.confirm(`Permanently delete firm "${firm.firm_name}" and all their clients and data? This cannot be undone.`)) return;
    setActionId(firm.id);
    try {
      await adminDeleteFirm(firm.id);
      setFirms(prev => prev.filter(f => f.id !== firm.id));
    } catch (err) {
      alert(err.response?.data?.detail || "Delete failed.");
    } finally {
      setActionId(null);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
      <div style={{ width: 36, height: 36, border: "3px solid rgba(20,184,166,0.2)", borderTopColor: "#14b8a6", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 500, margin: "80px auto", textAlign: "center", padding: 32 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ color: "#ef4444", marginBottom: 8 }}>Access Denied</h2>
      <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 14 }}>{error}</p>
      <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: "rgba(20,184,166,0.15)", color: "#14b8a6", border: "1px solid rgba(20,184,166,0.3)", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
        ← Back to Dashboard
      </button>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 13, marginBottom: 16, padding: 0 }}>
          ← Dashboard
        </button>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: "#e8eaf0", marginBottom: 4 }}>
          Admin Panel
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Manage all registered firms and platform access</p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Total Firms", value: stats.total_firms, color: "#14b8a6" },
            { label: "Total Clients", value: stats.total_clients, color: "#8b5cf6" },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "16px 20px",
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'DM Mono', monospace" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Firms Table */}
      <div style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
        {/* Table Header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 80px 80px 160px", gap: 0, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          {["Firm Name", "Email", "Clients", "Role", "Actions"].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
          ))}
        </div>

        {firms.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#6b7280", fontSize: 14 }}>No firms registered yet.</div>
        ) : (
          firms.map((firm, idx) => (
            <div key={firm.id} style={{
              display: "grid", gridTemplateColumns: "2fr 2fr 80px 80px 160px",
              gap: 0, padding: "14px 20px", alignItems: "center",
              borderBottom: idx < firms.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              background: actionId === firm.id ? "rgba(255,255,255,0.02)" : "transparent",
              transition: "background 0.2s",
            }}>
              {/* Firm Name */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e8eaf0" }}>{firm.firm_name}</div>
                <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>
                  Joined {firm.created_at ? new Date(firm.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                </div>
              </div>

              {/* Email */}
              <div style={{ fontSize: 13, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {firm.email}
              </div>

              {/* Client Count */}
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e8eaf0", fontFamily: "'DM Mono', monospace" }}>
                {firm.client_count}
              </div>

              {/* Role badge */}
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                  background: firm.is_admin ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)",
                  color: firm.is_admin ? "#8b5cf6" : "#4b5563",
                  border: `1px solid ${firm.is_admin ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)"}`,
                }}>
                  {firm.is_admin ? "Admin" : "Firm"}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => handleToggleAdmin(firm)}
                  disabled={actionId === firm.id}
                  title={firm.is_admin ? "Remove admin" : "Grant admin"}
                  style={{
                    padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: firm.is_admin ? "rgba(239,68,68,0.08)" : "rgba(139,92,246,0.1)",
                    color: firm.is_admin ? "#ef4444" : "#8b5cf6",
                    border: `1px solid ${firm.is_admin ? "rgba(239,68,68,0.2)" : "rgba(139,92,246,0.25)"}`,
                    cursor: actionId === firm.id ? "not-allowed" : "pointer",
                    opacity: actionId === firm.id ? 0.5 : 1,
                  }}
                >
                  {firm.is_admin ? "Revoke Admin" : "Make Admin"}
                </button>
                <button
                  onClick={() => handleDelete(firm)}
                  disabled={actionId === firm.id}
                  title="Delete firm"
                  style={{
                    padding: "5px 8px", borderRadius: 6, fontSize: 12,
                    background: "rgba(239,68,68,0.08)", color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.2)",
                    cursor: actionId === firm.id ? "not-allowed" : "pointer",
                    opacity: actionId === firm.id ? 0.5 : 1,
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <p style={{ marginTop: 16, fontSize: 12, color: "#374151", textAlign: "center" }}>
        Deleting a firm permanently removes all their clients, documents, and analysis reports.
      </p>
    </div>
  );
}
