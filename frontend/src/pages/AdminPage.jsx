import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminGetFirms, adminGetStats, adminSetRole, adminDeleteFirm } from "../api";

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel, confirmColor = "#DC2626", onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 14, padding: "28px 28px 24px",
        maxWidth: 420, width: "90%",
        boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
        border: "1px solid #E2E8F0",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "#FEF2F2", border: "1px solid #FECACA",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 14, fontSize: 20,
        }}>⚠️</div>
        <h3 style={{ color: "#0F172A", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
        <p style={{ color: "#64748B", fontSize: 14, lineHeight: 1.6, marginBottom: 22 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            padding: "8px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600,
            background: "#F8FAFC", color: "#64748B",
            border: "1px solid #E2E8F0", cursor: "pointer",
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: "8px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600,
            background: confirmColor, color: "#fff", border: "none", cursor: "pointer",
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [firms, setFirms]       = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [actionId, setActionId] = useState(null);
  const [confirmData, setConfirmData] = useState(null); // { firm, type: 'delete' | 'role' }

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [firmsRes, statsRes] = await Promise.all([adminGetFirms(), adminGetStats()]);
      setFirms(firmsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      setError(err.response?.status === 403
        ? "Access denied. Admin privileges required."
        : err.response?.data?.detail || "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleConfirm = async () => {
    if (!confirmData) return;
    const { firm, type } = confirmData;
    setConfirmData(null);
    setActionId(firm.id);
    try {
      if (type === "delete") {
        await adminDeleteFirm(firm.id);
        setFirms(prev => prev.filter(f => f.id !== firm.id));
      } else {
        await adminSetRole(firm.id, !firm.is_admin);
        await load();
      }
    } catch (err) {
      alert(err.response?.data?.detail || "Action failed.");
    } finally {
      setActionId(null);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 36, height: 36, border: "3px solid #E2E8F0", borderTopColor: "#1a56db", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: "#64748B", fontSize: 14 }}>Loading admin panel...</p>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: 32 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ color: "#DC2626", marginBottom: 8, fontSize: 20 }}>Access Denied</h2>
      <p style={{ color: "#64748B", marginBottom: 24, fontSize: 14 }}>{error}</p>
      <button onClick={() => navigate("/")} style={{
        padding: "10px 24px", background: "#1a56db", color: "#fff",
        border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600,
      }}>← Back to Dashboard</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      {confirmData && (
        <ConfirmDialog
          title={confirmData.type === "delete" ? "Delete Firm" : (confirmData.firm.is_admin ? "Revoke Admin" : "Grant Admin")}
          message={confirmData.type === "delete"
            ? `Permanently delete "${confirmData.firm.firm_name}" and all their clients, documents, and analysis data? This cannot be undone.`
            : confirmData.firm.is_admin
              ? `Remove admin privileges from "${confirmData.firm.firm_name}"?`
              : `Grant admin access to "${confirmData.firm.firm_name}"? They will be able to manage all firms.`
          }
          confirmLabel={confirmData.type === "delete" ? "Delete Permanently" : (confirmData.firm.is_admin ? "Revoke Admin" : "Grant Admin")}
          confirmColor={confirmData.type === "delete" ? "#DC2626" : (confirmData.firm.is_admin ? "#DC2626" : "#1a56db")}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmData(null)}
        />
      )}

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <button onClick={() => navigate("/")} style={{
          background: "none", border: "none", color: "#64748B", cursor: "pointer",
          fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 16,
          display: "flex", alignItems: "center", gap: 6,
        }}>← Dashboard</button>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: "#EEF2FF", border: "1px solid #C7D2FE",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
          }}>⚙</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Admin Panel</h1>
            <p style={{ color: "#64748B", fontSize: 13 }}>Manage registered firms and platform access</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { label: "Total Firms",   value: stats.total_firms,   color: "#1a56db", icon: "🏢" },
            { label: "Total Clients", value: stats.total_clients, color: "#059669", icon: "👥" },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, minWidth: 140,
              background: "#fff", border: "1px solid #E2E8F0",
              borderRadius: 10, padding: "14px 18px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              borderTop: `3px solid ${s.color}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{
        background: "#fff", border: "1px solid #E2E8F0",
        borderRadius: 12, overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 2fr 80px 90px 200px",
          padding: "11px 20px", borderBottom: "1px solid #F1F5F9",
          background: "#F8FAFC",
        }}>
          {["Firm Name", "Email", "Clients", "Role", "Actions"].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {h}
            </div>
          ))}
        </div>

        {firms.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
            No firms registered yet.
          </div>
        ) : (
          firms.map((firm, idx) => (
            <div key={firm.id} style={{
              display: "grid", gridTemplateColumns: "2fr 2fr 80px 90px 200px",
              padding: "14px 20px", alignItems: "center",
              borderBottom: idx < firms.length - 1 ? "1px solid #F1F5F9" : "none",
              opacity: actionId === firm.id ? 0.5 : 1,
              transition: "opacity 0.2s",
            }}>
              {/* Firm name */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: "#F1F5F9", border: "1px solid #E2E8F0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, flexShrink: 0,
                }}>🏢</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{firm.firm_name}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>
                    Joined {firm.created_at ? new Date(firm.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </div>
                </div>
              </div>

              {/* Email */}
              <div style={{ fontSize: 13, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>
                {firm.email}
              </div>

              {/* Client count */}
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{firm.client_count}</div>

              {/* Role badge */}
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                  background: firm.is_admin ? "#EEF2FF" : "#F1F5F9",
                  color: firm.is_admin ? "#1a56db" : "#64748B",
                  border: `1px solid ${firm.is_admin ? "#C7D2FE" : "#E2E8F0"}`,
                }}>
                  {firm.is_admin ? "Admin" : "Firm"}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setConfirmData({ firm, type: "role" })}
                  disabled={actionId === firm.id}
                  style={{
                    padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: firm.is_admin ? "#FEF2F2" : "#EEF2FF",
                    color: firm.is_admin ? "#DC2626" : "#1a56db",
                    border: `1px solid ${firm.is_admin ? "#FECACA" : "#C7D2FE"}`,
                    cursor: actionId === firm.id ? "not-allowed" : "pointer",
                  }}
                >
                  {firm.is_admin ? "Revoke Admin" : "Make Admin"}
                </button>
                <button
                  onClick={() => setConfirmData({ firm, type: "delete" })}
                  disabled={actionId === firm.id}
                  style={{
                    padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: "#FEF2F2", color: "#DC2626",
                    border: "1px solid #FECACA",
                    cursor: actionId === firm.id ? "not-allowed" : "pointer",
                  }}
                >Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      <p style={{ marginTop: 14, fontSize: 12, color: "#94A3B8", textAlign: "center" }}>
        Deleting a firm permanently removes all their clients, documents, and analysis reports.
      </p>
    </div>
  );
}
