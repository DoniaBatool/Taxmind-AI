import { Navigate } from "react-router-dom";

/**
 * Wrap any route that requires login.
 * If no token in localStorage → redirect to /login
 */
export default function PrivateRoute({ children }) {
  const token = localStorage.getItem("taxmind_token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
