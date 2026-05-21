import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClientCard from "../components/ClientCard";
import { getDashboardBriefing, adminGetFirms, adminGetFirmClients, adminDeleteFirm } from "../api";

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel = "Delete", onConfirm, onCancel }) {
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
            background: "#DC2626", color: "#fff", border: "none", cursor: "pointer",
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ label = "Loading..." }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 36, height: 36, border: "3px solid #E2E8F0", borderTopColor: "#1a56db", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: "#64748B", fontSize: 14 }}>{label}</p>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon }) {
  return (
    <div style={{
      flex: 1, minWidth: 120,
      background: "#fff", border: "1px solid #E2E8F0",
      borderRadius: 10, padding: "16px 20px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#64748B" }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard() {
  const [firms, setFirms]               = useState([]);
  const [stats, setStats]               = useState({ total_firms: 0, total_clients: 0 });
  const [loading, setLoading]           = useState(true);
  const [selectedFirm, setSelectedFirm] = useState(null);
  const [firmClients, setFirmClients]   = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [confirmFirm, setConfirmFirm]   = useState(null);
  const [refreshFirms, setRefreshFirms] = useState(0);

  useEffect(() => {
    setLoading(true);
    adminGetFirms()
      .then(res => {
        const list = res.data;
        setFirms(list);
        setStats({ total_firms: list.length, total_clients: list.reduce((s, f) => s + f.client_count, 0) });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refreshFirms]);

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

  if (loading) return <Spinner label="Loading firms..." />;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      {confirmFirm && (
        <ConfirmDialog
          title="Delete Firm"
          message={`Delete "${confirmFirm.firm_name}"? This permanently removes the firm, all clients, documents, and analysis data.`}
          confirmLabel="Delete Firm"
          onConfirm={handleDeleteFirm}
          onCancel={() => setConfirmFirm(null)}
        />
      )}

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        {selectedFirm ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => setSelectedFirm(null)} style={{
              padding: "7px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600,
              background: "#fff", color: "#334155",
              border: "1px solid #E2E8F0", cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>← All Firms</button>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>{selectedFirm.firm_name}</h1>
              <p style={{ color: "#64748B", fontSize: 13 }}>{selectedFirm.email}</p>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#EEF2FF", border: "1px solid #C7D2FE",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
              }}>⚙</div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>Admin — Platform Overview</h1>
            </div>
            <p style={{ color: "#64748B", fontSize: 13, marginLeft: 42 }}>Click a firm to view and manage their clients</p>
          </div>
        )}
      </div>

      {/* Stats */}
      {!selectedFirm && (
        <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
          <StatCard label="Total Firms"   value={stats.total_firms}   color="#1a56db" icon="🏢" />
          <StatCard label="Total Clients" value={stats.total_clients} color="#059669" icon="👥" />
        </div>
      )}

      {/* Firms list */}
      {!selectedFirm && (
        <div style={{
          background: "#fff", border: "1px solid #E2E8F0",
          borderRadius: 12, overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 90px 120px",
            padding: "11px 20px", borderBottom: "1px solid #F1F5F9",
            background: "#F8FAFC",
          }}>
            {["Firm Name", "Email", "Clients", "Actions"].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
            ))}
          </div>

          {firms.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#94A3B8" }}>No firms registered yet.</div>
          ) : (
            firms.map((firm, idx) => (
              <div
                key={firm.id}
                onClick={() => setSelectedFirm(firm)}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 90px 120px",
                  padding: "14px 20px", alignItems: "center",
                  borderBottom: idx < firms.length - 1 ? "1px solid #F1F5F9" : "none",
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {/* Firm info */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: "#EEF2FF", border: "1px solid #C7D2FE",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, flexShrink: 0,
                  }}>🏢</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                      {firm.firm_name}
                      {firm.is_admin && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                          background: "#EEF2FF", color: "#1a56db", border: "1px solid #C7D2FE",
                        }}>ADMIN</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>
                      Joined {firm.created_at ? new Date(firm.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div style={{ fontSize: 13, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 16 }}>
                  {firm.email}
                </div>

                {/* Count */}
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{firm.client_count}</div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmFirm(firm); }}
                    title="Delete firm"
                    style={{
                      padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: "#FEF2F2", color: "#DC2626",
                      border: "1px solid #FECACA", cursor: "pointer",
                    }}
                  >Delete</button>
                  <span style={{ color: "#CBD5E1", fontSize: 18 }}>›</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Firm clients drill-down */}
      {selectedFirm && (
        loadingClients ? <Spinner label="Loading clients..." /> :
        firmClients.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 32px",
            border: "2px dashed #E2E8F0", borderRadius: 12,
            background: "#fff",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
            <h3 style={{ color: "#0F172A", marginBottom: 8 }}>No Clients Yet</h3>
            <p style={{ color: "#64748B", fontSize: 14 }}>This firm hasn't added any clients yet.</p>
          </div>
        ) : (
          <>
            <p style={{ color: "#64748B", fontSize: 13, marginBottom: 18 }}>
              {firmClients.length} client{firmClients.length !== 1 ? "s" : ""}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 14 }}>
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
        )
      )}
    </div>
  );
}

// ── Firm Dashboard ────────────────────────────────────────────────────────────
function FirmDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [refresh, setRefresh] = useState(0);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("taxmind_user") || "{}");

  useEffect(() => {
    setLoading(true);
    getDashboardBriefing()
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [refresh]);

  if (loading) return <Spinner label="Loading dashboard..." />;

  if (error) return (
    <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: 32 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <h2 style={{ color: "#DC2626", marginBottom: 8 }}>Could Not Connect</h2>
      <p style={{ color: "#64748B", marginBottom: 24 }}>Make sure the backend server is running.</p>
      <button onClick={() => window.location.reload()} style={{
        padding: "10px 24px", background: "#1a56db", color: "#fff",
        border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600,
      }}>Try Again</button>
    </div>
  );

  const { clients = [], urgent_count = 0, review_count = 0, on_track_count = 0 } = data || {};

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>
            Good {getGreeting()}, {user.firm_name?.split(" ")[0] || "there"}
          </h1>
          <p style={{ color: "#64748B", fontSize: 14 }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => navigate("/add-client")}
          style={{
            padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "#1a56db", color: "#fff", border: "none", cursor: "pointer",
            boxShadow: "0 2px 8px rgba(26,86,219,0.25)",
          }}
        >+ New Client</button>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
        <StatCard label="Total Clients" value={clients.length}  color="#1a56db" icon="👥" />
        <StatCard label="Urgent"        value={urgent_count}    color="#DC2626" icon="🔴" />
        <StatCard label="Needs Review"  value={review_count}    color="#D97706" icon="⚠️" />
        <StatCard label="On Track"      value={on_track_count}  color="#059669" icon="✅" />
      </div>

      {/* Clients */}
      {clients.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "80px 32px",
          border: "2px dashed #E2E8F0", borderRadius: 14,
          background: "#fff",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
          <h2 style={{ color: "#0F172A", marginBottom: 8, fontSize: 20, fontWeight: 700 }}>No Clients Yet</h2>
          <p style={{ color: "#64748B", marginBottom: 24, fontSize: 14 }}>Add your first client to start AI-powered tax analysis</p>
          <button
            onClick={() => navigate("/add-client")}
            style={{
              padding: "11px 28px", borderRadius: 8, fontSize: 14, fontWeight: 700,
              background: "#1a56db", color: "#fff", border: "none", cursor: "pointer",
              boxShadow: "0 2px 8px rgba(26,86,219,0.25)",
            }}
          >+ Add Your First Client</button>
        </div>
      ) : (
        <>
          {/* Urgent section */}
          {urgent_count > 0 && (
            <div style={{ marginBottom: 22 }}>
              <SectionLabel color="#DC2626" label="🔴 Requires Immediate Attention" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 12 }}>
                {clients.filter(c => c.priority_level === "urgent").map(client => (
                  <ClientCard key={client.id} client={client} onDeleted={() => setRefresh(n => n + 1)} />
                ))}
              </div>
            </div>
          )}

          {/* Review section */}
          {review_count > 0 && (
            <div style={{ marginBottom: 22 }}>
              <SectionLabel color="#D97706" label="⚠️ Needs Review" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 12 }}>
                {clients.filter(c => c.priority_level === "review").map(client => (
                  <ClientCard key={client.id} client={client} onDeleted={() => setRefresh(n => n + 1)} />
                ))}
              </div>
            </div>
          )}

          {/* On Track section */}
          {on_track_count > 0 && (
            <div style={{ marginBottom: 22 }}>
              <SectionLabel color="#059669" label="✅ On Track" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 12 }}>
                {clients.filter(c => c.priority_level === "on-track" || !c.priority_level).map(client => (
                  <ClientCard key={client.id} client={client} onDeleted={() => setRefresh(n => n + 1)} />
                ))}
              </div>
            </div>
          )}

          {/* No analysis yet */}
          {urgent_count === 0 && review_count === 0 && on_track_count === 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 12 }}>
              {clients.map(client => (
                <ClientCard key={client.id} client={client} onDeleted={() => setRefresh(n => n + 1)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SectionLabel({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
      <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const user    = JSON.parse(localStorage.getItem("taxmind_user") || "{}");
  const isAdmin = !!user?.is_admin;
  return isAdmin ? <AdminDashboard /> : <FirmDashboard />;
}
