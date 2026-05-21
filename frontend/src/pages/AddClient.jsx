import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "../api";

const ENTITY_TYPES = ["S-Corp", "LLC", "Sole-Prop", "Partnership"];
const INDUSTRIES = ["Construction", "Technology", "Healthcare", "Retail", "Food & Beverage", "Real Estate", "Consulting", "Other"];

export default function AddClient() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ name: "", entity_type: "LLC", industry: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Client name is required."); return; }
    setLoading(true); setError("");
    try {
      const res = await createClient(form);
      navigate(`/client/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create client. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "36px 24px" }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "none", border: "none", color: "#64748B", cursor: "pointer",
            fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 16,
            display: "flex", alignItems: "center", gap: 6,
          }}
        >← Back to Dashboard</button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>Add New Client</h1>
        <p style={{ color: "#64748B", fontSize: 14 }}>Enter basic information — you can upload documents after saving.</p>
      </div>

      {/* Form card */}
      <div style={{
        background: "#fff", border: "1px solid #E2E8F0",
        borderRadius: 14, padding: 32,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Name */}
          <div>
            <label style={labelSt}>Client / Business Name <span style={{ color: "#DC2626" }}>*</span></label>
            <input
              style={inputSt}
              placeholder="e.g. Rivera Construction Ltd."
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              onFocus={e => e.target.style.borderColor = "#1a56db"}
              onBlur={e => e.target.style.borderColor = "#CBD5E1"}
            />
          </div>

          {/* Row: Entity + Industry */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelSt}>Entity Type <span style={{ color: "#DC2626" }}>*</span></label>
              <select
                style={{ ...inputSt, cursor: "pointer" }}
                value={form.entity_type}
                onChange={e => setForm({ ...form, entity_type: e.target.value })}
                onFocus={e => e.target.style.borderColor = "#1a56db"}
                onBlur={e => e.target.style.borderColor = "#CBD5E1"}
              >
                {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelSt}>Industry</label>
              <select
                style={{ ...inputSt, cursor: "pointer" }}
                value={form.industry}
                onChange={e => setForm({ ...form, industry: e.target.value })}
                onFocus={e => e.target.style.borderColor = "#1a56db"}
                onBlur={e => e.target.style.borderColor = "#CBD5E1"}
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={labelSt}>Contact Email <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span></label>
            <input
              style={inputSt}
              type="email"
              placeholder="client@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              onFocus={e => e.target.style.borderColor = "#1a56db"}
              onBlur={e => e.target.style.borderColor = "#CBD5E1"}
            />
          </div>

          {error && (
            <div style={{
              padding: "10px 14px", background: "#FEF2F2",
              border: "1px solid #FECACA", borderRadius: 8,
              color: "#DC2626", fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => navigate("/")}
              style={{
                flex: 1, padding: "11px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: "#F8FAFC", color: "#64748B",
                border: "1px solid #E2E8F0", cursor: "pointer",
              }}
            >Cancel</button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2, padding: "11px", borderRadius: 8, fontSize: 14, fontWeight: 700,
                background: loading ? "#93C5FD" : "#1a56db",
                color: "#fff", border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 2px 8px rgba(26,86,219,0.25)",
                transition: "all 0.2s",
              }}
            >{loading ? "Creating..." : "Create Client →"}</button>
          </div>
        </form>
      </div>

      {/* Info note */}
      <div style={{
        marginTop: 16, padding: "12px 16px",
        background: "#EFF6FF", border: "1px solid #BFDBFE",
        borderRadius: 8, display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <span style={{ fontSize: 16, marginTop: 1 }}>💡</span>
        <p style={{ fontSize: 13, color: "#1E40AF", lineHeight: 1.6 }}>
          After creating the client, you'll be able to upload a tax return (PDF) and financial statement (CSV) to run the AI analysis.
        </p>
      </div>
    </div>
  );
}

const labelSt = {
  display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6,
};
const inputSt = {
  width: "100%", padding: "10px 13px", borderRadius: 8, fontSize: 14,
  background: "#fff", border: "1.5px solid #CBD5E1", color: "#0F172A",
  outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
  fontFamily: "inherit",
};
