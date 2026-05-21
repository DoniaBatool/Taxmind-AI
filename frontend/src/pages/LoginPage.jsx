import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api";

const EyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm]         = useState({ email: "", password: "" });
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [slowMsg, setSlowMsg]   = useState("");
  const timerRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSlowMsg("");
    setLoading(true);

    // After 5s show "waking up" message, after 20s show longer wait message
    timerRef.current = setTimeout(() => setSlowMsg("Waking up server… this takes ~30s on free hosting."), 5000);
    const timer2 = setTimeout(() => setSlowMsg("Almost there — server is starting up, please wait…"), 20000);

    try {
      const res = await login({ email: form.email, password: form.password });
      const { access_token, firm_name, email, user_id, is_admin } = res.data;
      localStorage.setItem("taxmind_token", access_token);
      localStorage.setItem("taxmind_user", JSON.stringify({ firm_name, email, user_id, is_admin }));
      navigate("/");
    } catch (err) {
      if (!err.response) {
        setError("Cannot connect to server. Please try again.");
      } else {
        setError(err.response?.data?.detail || "Invalid email or password.");
      }
    } finally {
      clearTimeout(timerRef.current);
      clearTimeout(timer2);
      setLoading(false);
      setSlowMsg("");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      background: "#F1F5F9",
    }}>
      {/* Left panel — brand */}
      <div style={{
        width: 420, flexShrink: 0,
        background: "#0F2744",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "48px 40px",
      }}>
        {/* Logo */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 64 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: "linear-gradient(135deg, #1a56db, #0891b2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 800, color: "white",
            }}>T</div>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>
              TaxMind <span style={{ color: "#60A5FA", fontWeight: 400 }}>AI</span>
            </span>
          </div>

          <h2 style={{ fontSize: 28, fontWeight: 700, color: "#fff", lineHeight: 1.3, marginBottom: 16 }}>
            Enterprise Tax Intelligence for CA Firms
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
            AI-powered analysis, red flag detection, and tax planning — all in one secure platform.
          </p>
        </div>

        {/* Feature list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { icon: "🔍", text: "Multi-agent AI analysis of tax returns" },
            { icon: "🚨", text: "Automated red flag detection" },
            { icon: "💡", text: "Tax planning with estimated savings" },
            { icon: "📊", text: "Priority-ranked client dashboard" },
          ].map(f => (
            <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 16 }}>{f.icon}</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{f.text}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
          © 2026 TaxMind AI — Secure & Encrypted
        </p>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 40px",
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>
              Sign in to your account
            </h1>
            <p style={{ fontSize: 14, color: "#64748B" }}>
              New to TaxMind?{" "}
              <Link to="/signup" style={{ color: "#1a56db", fontWeight: 600, textDecoration: "none" }}>
                Create a free account
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={labelSt}>Email address</label>
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@yourfirm.com"
                style={inputSt}
                onFocus={e => e.target.style.borderColor = "#1a56db"}
                onBlur={e => e.target.style.borderColor = "#CBD5E1"}
              />
            </div>

            <div>
              <label style={labelSt}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"} required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  style={{ ...inputSt, paddingRight: 42 }}
                  onFocus={e => e.target.style.borderColor = "#1a56db"}
                  onBlur={e => e.target.style.borderColor = "#CBD5E1"}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1} style={eyeBtnSt}>
                  {showPw ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, fontSize: 13,
                background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626",
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={btnSt(loading)}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>

            {slowMsg && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: 8, fontSize: 13,
                background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E40AF",
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                  border: "2px solid #BFDBFE", borderTopColor: "#1a56db",
                  animation: "spin 0.8s linear infinite",
                }} />
                {slowMsg}
              </div>
            )}
          </form>
        </div>
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
const eyeBtnSt = {
  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
  background: "none", border: "none", cursor: "pointer",
  color: "#94A3B8", display: "flex", alignItems: "center", padding: "4px",
  borderRadius: 4,
};
const btnSt = (loading) => ({
  width: "100%", padding: "11px", borderRadius: 8, border: "none",
  background: loading ? "#93C5FD" : "#1a56db",
  color: "#fff", fontSize: 14, fontWeight: 700,
  cursor: loading ? "not-allowed" : "pointer",
  transition: "all 0.2s", fontFamily: "inherit",
  boxShadow: loading ? "none" : "0 2px 8px rgba(26,86,219,0.3)",
});
