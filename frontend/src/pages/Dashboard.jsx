import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClientCard from "../components/ClientCard";
import { getDashboardBriefing, adminGetFirms, adminGetFirmClients, adminDeleteFirm, deleteClient } from "../api";

// ── Dark Confirm Dialog ───────────────────────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel = "Delete", onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#13151c",
        border: "1px solid rgba(239,68,68,0.3)",
        borderRadius: 16, padding: "32px 28px",
        maxWidth: 420, width: "90%",
        boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16, fontSize: 22,
        }}>🗑</div>
        <h3 style={{ color: "#e8eaf0", fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{title}</h3>
        <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "rgba(255,255,255,0.05)", color: "#9ca3af",
            border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "rgba(239,68,68,0.15)", color: "#ef4444",
            border: "1px solid rgba(239,68,68,0.4)", cursor: "pointer",
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard() {
  const [firms, setFirms]                     = useState([]);
  const [stats, setStats]                     = useState({ total_firms: 0, total_clients: 0 });
  const [loading, setLoading]                 = useState(true);
  const [selectedFirm, setSelectedFirm]       = useState(null);   // { id, firm_name, email }
  const [firmClients, setFirmClients]         = useState([]);
  const [loadingClients, setLoadingClients]   = useState(false);
  const [confirmFirm, setConfirmFirm]         = useState(null);   // firm to delete
  const [refreshFirms, setRefreshFirms]       = useState(0);
  const navigate = useNavigate();

  // Load all firms
  useEffect(() => {
    setLoading(true);
    adminGetFirms()
      .then(res => {
        const list = res.data;
        setFirms(list);
        setStats({
          total_firms: list.length,
          total_clients: list.reduce((s, f) => s + f.client_count, 0),
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refreshFirms]);

  // Load clients when a firm is selected
  useEffect(() => {
    if (!selectedFirm) return;
    setLoadingClients(true);
    adminGetFirmClients(selectedFirm.id)
      .then(res => { setFirmClients(res.data); setLoadingClients(false); })
      .catch(() => setLoadingClients(false));
  }, [selectedFirm]);

  const handleDeleteFirm = async () => {
    if (!confirmFirm) return;
    try {
      await adminDeleteFirm(confirmFirm.id);
      setConfirmFirm(null);
      if (selectedFirm?.id === confirmFirm.id) setSelectedFirm(null);
      setRefreshFirms(n => n + 1);
    } catch (err) {
      alert(err.response?.data?.detail || "Delete failed.");
      setConfirmFirm(null);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid rgba(139,92,246,0.2)", borderTopColor: "#8b5cf6", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <p style={{ color: "#6b7280", fontSize: 14 }}>Loading firms...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      {confirmFirm && (
        <ConfirmDialog
          title="Delete Firm"
          message={`Delete "${confirmFirm.firm_name}"? This permanently removes the firm, all their clients, documents, and analysis reports.`}
          confirmLabel="Delete Firm"
          onConfirm={handleDeleteFirm}
          onCancel={() => setConfirmFirm(null)}
        />
      )}

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        {selectedFirm ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => setSelectedFirm(null)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: "rgba(255,255,255,0.05)", color: "#9ca3af",
                border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
              }}
            >← Back to Firms</button>
            <div>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: "#e8eaf0" }}>
                {selectedFirm.firm_name}
              </h1>
              <p style={{ color: "#6b7280", fontSize: 13 }}>{selectedFirm.email}</p>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>⚙</span>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: "#e8eaf0" }}>
                Admin — All Firms
              </h1>
            </div>
            <p style={{ color: "#6b7280", fontSize: 14 }}>Click a firm to view and manage its clients</p>
          </>
        )}
      </div>

      {/* Stats */}
      {!selectedFirm && (
        <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
          {[
            { label: "Total Firms", value: stats.total_firms, color: "#8b5cf6" },
            { label: "Total Clients", value: stats.total_clients, color: "#14b8a6" },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, minWidth: 150,
              background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "16px 20px"
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'DM Mono', monospace" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Firms list */}
      {!selectedFirm && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {firms.map(firm => (
            <div
              key={firm.id}
              onClick={() => setSelectedFirm(firm)}
              style={{
                background: "var(--surface)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14, padding: "18px 24px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
            >
              {/* Firm info */}
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0,
                }}>🏢</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e8eaf0" }}>
                    {firm.firm_name}
                    {firm.is_admin && (
                      <span style={{
                        marginLeft: 8, fontSize: 10, fontWeight: 700, padding: "2px 7px",
                        borderRadius: 6, background: "rgba(139,92,246,0.15)",
                        color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.3)",
                      }}>ADMIN</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{firm.email}</div>
                </div>
              </div>

              {/* Right side */}
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#14b8a6", fontFamily: "'DM Mono', monospace" }}>
                    {firm.client_count}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>clients</div>
                </div>

                {/* Delete firm button */}
                <button
                  onClick={e => { e.stopPropagation(); setConfirmFirm(firm); }}
                  title="Delete firm"
                  style={{
                    width: 34, height: 34, borderRadius: 8, fontSize: 15,
                    background: "rgba(239,68,68,0.08)", color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >🗑</button>

                <span style={{ color: "#8b5cf6", fontSize: 18 }}>›</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Firm clients drill-down */}
      {selectedFirm && (
        <>
          {loadingClients ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
              <div style={{ width: 36, height: 36, border: "3px solid rgba(20,184,166,0.2)", borderTopColor: "#14b8a6", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : firmClients.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "60px 32px",
              border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
              <h3 style={{ color: "#e8eaf0", marginBottom: 8 }}>No Clients Yet</h3>
              <p style={{ color: "#6b7280", fontSize: 14 }}>This firm hasn't added any clients yet.</p>
            </div>
          ) : (
            <>
              <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 20 }}>
                {firmClients.length} client{firmClients.length !== 1 ? "s" : ""} — click any card to view full details
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                {firmClients.map(client => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onDeleted={() => {
                      setFirmClients(prev => prev.filter(c => c.id !== client.id));
                      setFirms(prev => prev.map(f =>
                        f.id === selectedFirm.id ? { ...f, client_count: f.client_count - 1 } : f
                      ));
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Regular Firm Dashboard ────────────────────────────────────────────────────
function FirmDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [refresh, setRefresh] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getDashboardBriefing()
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [refresh]);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid rgba(20,184,166,0.2)", borderTopColor: "#14b8a6", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <p style={{ color: "#6b7280", fontSize: 14 }}>Loading briefing...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 500, margin: "80px auto", textAlign: "center", padding: 32 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <h2 style={{ color: "#ef4444", marginBottom: 8 }}>Could Not Connect to Backend</h2>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>Make sure the backend is running: <code style={{ color: "#14b8a6" }}>uvicorn main:app --reload</code></p>
      <button onClick={() => window.location.reload()} style={{
        padding: "10px 24px", background: "rgba(20,184,166,0.15)", color: "#14b8a6",
        border: "1px solid rgba(20,184,166,0.3)", borderRadius: 8, cursor: "pointer", fontSize: 14
      }}>Try Again</button>
    </div>
  );

  const { clients = [], urgent_count = 0, review_count = 0, on_track_count = 0 } = data || {};

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: "#e8eaf0", marginBottom: 8 }}>
          Briefing
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        {[
          { label: "Total Clients", value: clients.length, color: "#14b8a6" },
          { label: "🔴 Urgent",     value: urgent_count,   color: "#ef4444" },
          { label: "⚠️ Review",     value: review_count,   color: "#f59e0b" },
          { label: "✅ On Track",   value: on_track_count, color: "#10b981" },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, minWidth: 120,
            background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12, padding: "16px 20px"
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'DM Mono', monospace" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {clients.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "80px 32px",
          border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
          <h2 style={{ color: "#e8eaf0", marginBottom: 8, fontFamily: "'DM Serif Display', serif" }}>No Clients Yet</h2>
          <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 14 }}>Add your first client to start AI-powered tax analysis</p>
          <button
            onClick={() => navigate("/add-client")}
            style={{
              padding: "12px 28px", borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: "linear-gradient(135deg, #14b8a6, #8b5cf6)",
              color: "white", border: "none", cursor: "pointer"
            }}
          >+ Add Your First Client</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {clients.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              onDeleted={() => setRefresh(n => n + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Root Dashboard — picks view based on role ─────────────────────────────────
export default function Dashboard() {
  const user    = JSON.parse(localStorage.getItem("taxmind_user") || "{}");
  const isAdmin = !!user?.is_admin;
  return isAdmin ? <AdminDashboard /> : <FirmDashboard />;
}
