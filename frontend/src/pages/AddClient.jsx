import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "../api";

const ENTITY_TYPES = ["S-Corp", "LLC", "Sole-Prop", "Partnership"];
const INDUSTRIES = ["Construction", "Technology", "Healthcare", "Retail", "Food & Beverage", "Real Estate", "Consulting", "Other"];

export default function AddClient() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", entity_type: "LLC", industry: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Client ka naam zaroori hai"); return; }
    setLoading(true); setError("");
    try {
      const res = await createClient(form);
      navigate(`/client/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Client create nahi hua");
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 14,
    background: "var(--surface2)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#e8eaf0", outline: "none", fontFamily: "inherit"
  };
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#9ca3af", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" };

  return (
    <div style={{ maxWidth: 560, margin: "48px auto", padding: "0 24px" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: "#e8eaf0", marginBottom: 8 }}>
          New Client Add Karo
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Basic info enter karo — documents baad mein upload honge</p>
      </div>

      <form onSubmit={handleSubmit} style={{
        background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16, padding: 32, display: "flex", flexDirection: "column", gap: 20
      }}>
        {/* Name */}
        <div>
          <label style={labelStyle}>Client / Business Name *</label>
          <input style={inputStyle} placeholder="e.g. Rivera Construction" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>

        {/* Entity Type */}
        <div>
          <label style={labelStyle}>Entity Type *</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={form.entity_type}
            onChange={e => setForm({ ...form, entity_type: e.target.value })}>
            {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Industry */}
        <div>
          <label style={labelStyle}>Industry</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={form.industry}
            onChange={e => setForm({ ...form, industry: e.target.value })}>
            <option value="">Select industry...</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        {/* Email */}
        <div>
          <label style={labelStyle}>Email (Optional)</label>
          <input style={inputStyle} type="email" placeholder="client@example.com"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#ef4444", fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button type="button" onClick={() => navigate("/")} style={{
            flex: 1, padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 600,
            background: "transparent", color: "#6b7280", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer"
          }}>Cancel</button>
          <button type="submit" disabled={loading} style={{
            flex: 2, padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: loading ? "rgba(20,184,166,0.3)" : "linear-gradient(135deg, #14b8a6, #8b5cf6)",
            color: "white", border: "none", cursor: loading ? "not-allowed" : "pointer"
          }}>
            {loading ? "Creating..." : "Client Create Karo →"}
          </button>
        </div>
      </form>
    </div>
  );
}
