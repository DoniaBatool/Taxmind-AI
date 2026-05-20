import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Header() {
  const location = useLocation();
  const navigate  = useNavigate();

  // Hide header on login/signup pages
  if (["/login", "/signup"].includes(location.pathname)) return null;

  const userRaw  = localStorage.getItem("taxmind_user");
  const user     = userRaw ? JSON.parse(userRaw) : null;

  const handleLogout = () => {
    localStorage.removeItem("taxmind_token");
    localStorage.removeItem("taxmind_user");
    navigate("/login");
  };

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(10,12,16,0.85)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      padding: "0 32px", height: 64,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: "none" }}>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "#e8eaf0", letterSpacing: "-0.5px" }}>
          Tax<span style={{ color: "#14b8a6" }}>Mind</span> <span style={{ color: "#8b5cf6" }}>AI</span>
        </span>
      </Link>

      {/* Nav */}
      <nav style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Link to="/" style={{
          padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          textDecoration: "none",
          background: location.pathname === "/" ? "rgba(20,184,166,0.15)" : "transparent",
          color: location.pathname === "/" ? "#14b8a6" : "#6b7280",
          border: location.pathname === "/" ? "1px solid rgba(20,184,166,0.3)" : "1px solid transparent",
          transition: "all 0.2s",
        }}>Dashboard</Link>

        <Link to="/add-client" style={{
          padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          textDecoration: "none",
          background: "rgba(20,184,166,0.1)", color: "#14b8a6",
          border: "1px solid rgba(20,184,166,0.3)",
        }}>+ Add Client</Link>

        {user?.is_admin && (
          <Link to="/admin" style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            textDecoration: "none",
            background: location.pathname === "/admin" ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.08)",
            color: "#8b5cf6",
            border: "1px solid rgba(139,92,246,0.3)",
          }}>⚙ Admin</Link>
        )}

        {/* Firm name + Logout */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 8, paddingLeft: 12, borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e8eaf0" }}>{user.firm_name}</div>
              <div style={{ fontSize: 10, color: "#6b7280" }}>{user.email}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: "rgba(239,68,68,0.1)", color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
