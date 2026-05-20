import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { deleteClient } from "../api";

const PRIORITY = {
  urgent:     { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)",   label: "🔴 Urgent" },
  review:     { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.3)",  label: "⚠️ Review" },
  "on-track": { color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.3)",  label: "✅ On Track" },
};

// ── Dark-theme Confirm Dialog ─────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onCancel}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#13151c",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 16,
          padding: "32px 28px",
          maxWidth: 420, width: "90%",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16, fontSize: 22,
        }}>🗑</div>

        <h3 style={{ color: "#e8eaf0", fontSize: 17, fontWeight: 700, marginBottom: 10 }}>
          Delete Client
        </h3>
        <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          {message}
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: "rgba(255,255,255,0.05)", color: "#9ca3af",
              border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: "rgba(239,68,68,0.15)", color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.4)", cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Client Card ───────────────────────────────────────────────────────────────
export default function ClientCard({ client, onDeleted }) {
  const navigate  = useNavigate();
  const p         = PRIORITY[client.priority_level] || PRIORITY["on-track"];
  const [menuOpen, setMenuOpen]         = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [hovered, setHovered]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
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

  const handleCardClick = () => {
    if (!menuOpen) navigate(`/client/${client.id}`);
  };

  return (
    <>
      {showConfirm && (
        <ConfirmDialog
          message={`Delete "${client.name}"? This will permanently remove the client, all uploaded documents, and all analysis reports.`}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div
        onClick={handleCardClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "var(--surface)",
          border: `1px solid ${deleting ? "rgba(239,68,68,0.5)" : p.border}`,
          borderRadius: 16,
          padding: "20px 24px",
          cursor: deleting ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          position: "relative",
          overflow: "visible",
          opacity: deleting ? 0.5 : 1,
          transform: hovered && !deleting ? "translateY(-2px)" : "translateY(0)",
        }}
      >
        {/* Priority glow bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          borderRadius: "16px 16px 0 0",
          background: `linear-gradient(90deg, ${p.color}, transparent)`
        }} />

        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e8eaf0", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {client.name}
            </h3>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
              background: "rgba(255,255,255,0.05)", color: "#9ca3af",
              fontFamily: "'DM Mono', monospace"
            }}>
              {client.entity_type}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
              background: p.bg, color: p.color, border: `1px solid ${p.border}`
            }}>
              {p.label}
            </span>

            {/* 3-dot menu */}
            <div ref={menuRef} style={{ position: "relative" }}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
                title="Options"
                style={{
                  background: menuOpen ? "rgba(255,255,255,0.1)" : "transparent",
                  border: "1px solid transparent",
                  borderRadius: 6, color: "#6b7280",
                  cursor: "pointer", fontSize: 16, lineHeight: 1,
                  padding: "3px 6px", transition: "all 0.15s",
                  opacity: hovered || menuOpen ? 1 : 0,
                }}
              >⋯</button>

              {menuOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 200,
                  background: "#1a1d24", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10, padding: "4px", minWidth: 160,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); navigate(`/client/${client.id}`); }}
                    style={menuItemStyle}
                  >🔍 View Details</button>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "3px 0" }} />
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setShowConfirm(true); }}
                    style={{ ...menuItemStyle, color: "#ef4444" }}
                  >🗑 Delete Client</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.5, marginBottom: 16 }}>
          {client.one_line_summary || "Analysis pending — upload documents to begin"}
        </p>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>{client.industry || "General"}</span>
          <span style={{ fontSize: 12, color: "#14b8a6", fontWeight: 600 }}>View Details →</span>
        </div>
      </div>
    </>
  );
}

const menuItemStyle = {
  display: "block", width: "100%", textAlign: "left",
  padding: "8px 12px", borderRadius: 7,
  background: "none", border: "none",
  fontSize: 13, fontWeight: 500, color: "#e8eaf0",
  cursor: "pointer", transition: "background 0.15s",
};
