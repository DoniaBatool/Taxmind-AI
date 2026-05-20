import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api";

// Clean SVG eye icons
const EyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
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
  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login({ email: form.email, password: form.password });
      const { access_token, firm_name, email, user_id, is_admin } = res.data;
      localStorage.setItem("taxmind_token", access_token);
      localStorage.setItem("taxmind_user", JSON.stringify({ firm_name, email, user_id, is_admin }));
      navigate("/");
    } catch (err) {
      if (!err.response) {
        setError("Cannot connect to server. Make sure the backend is running on port 8000.");
      } else {
        setError(err.response?.data?.detail || "Login failed. Check your email and password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: "24px",
    }}>
      <div style={{
        width: "100%", maxWidth: 420,
        background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 20, padding: "40px 36px",
        boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, letterSpacing: "-0.5px", marginBottom: 6 }}>
            <span style={{ color: "#e8eaf0" }}>Tax</span><span style={{ color: "#14b8a6" }}>Mind</span> <span style={{ color: "#8b5cf6" }}>AI</span>
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Sign in to your firm account</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email" required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@yourfirm.com"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"} required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                style={{ ...inputStyle, paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                tabIndex={-1}
                title={showPw ? "Hide password" : "Show password"}
                style={eyeBtnStyle}
              >
                {showPw ? <EyeOff /> : <EyeOpen />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#ef4444" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={btnStyle(loading)}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#6b7280" }}>
          Don't have an account?{" "}
          <Link to="/signup" style={{ color: "#14b8a6", fontWeight: 600, textDecoration: "none" }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#9ca3af", marginBottom: 6,
};
const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#e8eaf0", fontSize: 14, outline: "none", boxSizing: "border-box",
};
const eyeBtnStyle = {
  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
  background: "none", border: "none", cursor: "pointer",
  color: "#6b7280", display: "flex", alignItems: "center", padding: "4px",
  borderRadius: 4, transition: "color 0.15s",
};
const btnStyle = (loading) => ({
  width: "100%", padding: "12px", borderRadius: 10, border: "none",
  background: loading ? "rgba(20,184,166,0.4)" : "#14b8a6",
  color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
  transition: "all 0.2s",
});
