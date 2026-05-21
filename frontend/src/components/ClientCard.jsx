import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { deleteClient } from "../api";

const PRIORITY = {
  urgent:     { color: "#DC2626", bg: "#FEF2F2",  border: "#FECACA",  label: "Urgent",   dot: "#DC2626" },
  review:     { color: "#D97706", bg: "#FFFBEB",  border: "#FDE68A",  label: "Review",   dot: "#D97706" },
  "on-track": { color: "#059669", bg: "#ECFDF5",  border: "#A7F3D0",  label: "On Track", dot: "#059669" },
};

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ title = "Delete Client", message, confirmLabel = "Delete", onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 14, padding: "28px 28px 24px",
        maxWidth: 420, width: "90%",
        boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        border: "1px solid #E2E8F0",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "#FEF2F2", border: "1px solid #FECACA",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 14, fontSize: 20,
        }}>⚠️</div>
        <h3 style={{ color: "#0F172A", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
        <p style={{ color: "#334155", fontSize: 14, lineHeight: 1.6, marginBottom: 22 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            padding: "8px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600,
            background: "#F8FAFC", color: "#475569",
            border: "1px solid #E2E8F0", cursor: "pointer",
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: "8px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600,
            background: "#DC2626", color: "#fff",
            border: "none", cursor: "pointer",
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Client Card ───────────────────────────────────────────────────────────────
export default function ClientCard({ client, onDeleted }) {
  const navigate  = useNavigate();
  const p         = PRIORITY[client.priority_level] || PRIORITY["on-track"];
  const [menuOpen, setMenuOpen]       = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [hovered, setHovered]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleDeleteConfirmed = async () => {
    setShowConfirm(false);
    setDeleting(true);
    try {
      await deleteClient(client.id);
      onDeleted?.();
    } catch (err) {
      alert(err.response?.data?.detail || "Delete failed. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <>
      {showConfirm && (
        <ConfirmDialog
          message={`Delete "${client.name}"? This will permanently remove the client, all uploaded documents, and analysis reports.`}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div
        onClick={() => { if (!menuOpen && !deleting) navigate(`/client/${client.id}`); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 12,
          padding: "0",
          cursor: deleting ? "not-allowed" : "pointer",
          transition: "all 0.18s",
          position: "relative",
          overflow: "hidden",
          opacity: deleting ? 0.5 : 1,
          boxShadow: hovered && !deleting
            ? "0 4px 12px rgba(0,0,0,0.08)"
            : "0 1px 3px rgba(0,0,0,0.05)",
          transform: hovered && !deleting ? "translateY(-1px)" : "none",
        }}
      >
        {/* Priority color bar — top */}
        <div style={{
          height: 3,
          background: p.color,
          borderRadius: "12px 12px 0 0",
        }} />

        <div style={{ padding: "16px 18px 18px" }}>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
              {/* Entity badge */}
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                color: "#475569", textTransform: "uppercase",
                background: "#F1F5F9", border: "1px solid #E2E8F0",
                padding: "2px 7px", borderRadius: 4,
                display: "inline-block", marginBottom: 6,
              }}>{client.entity_type}</span>
              <h3 style={{
                fontSize: 15, fontWeight: 700, color: "#0F172A",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{client.name}</h3>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {/* Priority badge */}
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20,
                background: p.bg, color: p.color, border: `1px solid ${p.border}`,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: p.dot, display: "inline-block",
                }}/>
                {p.label}
              </span>

              {/* 3-dot menu */}
              <div ref={menuRef} style={{ position: "relative" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
                  style={{
                    background: menuOpen ? "#F1F5F9" : "transparent",
                    border: "1px solid",
                    borderColor: menuOpen ? "#E2E8F0" : "transparent",
                    borderRadius: 6, color: "#94A3B8",
                    cursor: "pointer", fontSize: 16, lineHeight: 1,
                    padding: "3px 7px",
                    opacity: hovered || menuOpen ? 1 : 0,
                    transition: "all 0.15s",
                  }}
                >⋯</button>

                {menuOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 200,
                    background: "#fff", border: "1px solid #E2E8F0",
                    borderRadius: 9, padding: "4px",
                    minWidth: 160,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                  }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); navigate(`/client/${client.id}`); }}
                      style={menuItemSt}
                    >View Details</button>
                    <div style={{ height: 1, background: "#F1F5F9", margin: "3px 0" }} />
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setShowConfirm(true); }}
                      style={{ ...menuItemSt, color: "#DC2626" }}
                    >Delete Client</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          <p style={{
            fontSize: 13, color: "#334155", lineHeight: 1.6,
            marginBottom: 14, minHeight: 38,
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {client.one_line_summary || "No analysis yet — upload documents to begin AI analysis."}
          </p>

          {/* Footer */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingTop: 12, borderTop: "1px solid #F1F5F9",
          }}>
            <span style={{
              fontSize: 12, color: "#475569", fontWeight: 500,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <span style={{ fontSize: 13 }}>🏭</span>
              {client.industry || "General"}
            </span>
            <span style={{ fontSize: 12, color: "#1a56db", fontWeight: 600 }}>
              View Details →
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

const menuItemSt = {
  display: "block", width: "100%", textAlign: "left",
  padding: "8px 12px", borderRadius: 6,
  background: "none", border: "none",
  fontSize: 13, fontWeight: 500, color: "#334155",
  cursor: "pointer",
};
