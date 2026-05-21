import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  if (["/login", "/signup"].includes(location.pathname)) return null;

  const userRaw = localStorage.getItem("taxmind_user");
  const user    = userRaw ? JSON.parse(userRaw) : null;

  const handleLogout = () => {
    localStorage.removeItem("taxmind_token");
    localStorage.removeItem("taxmind_user");
    navigate("/login");
  };

  const navLink = (to, label) => {
    const active = location.pathname === to;
    return (
      <Link to={to} style={{
        padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500,
        textDecoration: "none", transition: "all 0.15s",
        background: active ? "rgba(255,255,255,0.15)" : "transparent",
        color: active ? "#FFFFFF" : "rgba(255,255,255,0.7)",
        border: active ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
      }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.background = "transparent"; } }}
      >{label}</Link>
    );
  };

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "#0F2744",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      padding: "0 24px", height: 60,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
        {/* Icon mark */}
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "linear-gradient(135deg, #1a56db, #0891b2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 800, color: "white",
          boxShadow: "0 2px 8px rgba(26,86,219,0.4)",
        }}>T</div>
        <span style={{ fontSize: 17, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.3px" }}>
          TaxMind <span style={{ color: "#60A5FA", fontWeight: 400 }}>AI</span>
        </span>
      </Link>

      {/* Nav + User */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {navLink("/", "Dashboard")}

        <Link to="/add-client" style={{
          padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600,
          textDecoration: "none", transition: "all 0.15s",
          background: "#1a56db", color: "#fff",
          border: "1px solid rgba(255,255,255,0.15)",
        }}>+ New Client</Link>

        {user?.is_admin && navLink("/admin", "⚙ Admin")}

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.15)", margin: "0 8px" }} />

        {/* User info */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#1a56db", border: "2px solid rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: "white", flexShrink: 0,
            }}>
              {(user.firm_name || "?")[0].toUpperCase()}
            </div>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{user.firm_name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{user.email}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer",
                transition: "all 0.15s", marginLeft: 4,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; e.currentTarget.style.color = "#FCA5A5"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
            >Sign Out</button>
          </div>
        )}
      </div>
    </header>
  );
}
