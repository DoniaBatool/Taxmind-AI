import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import PrivateRoute from "./components/PrivateRoute";
import Dashboard from "./pages/Dashboard";
import ClientDetail from "./pages/ClientDetail";
import AddClient from "./pages/AddClient";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AdminPage from "./pages/AdminPage";
import "./index.css";

function App() {
  return (
    <BrowserRouter>
      <div style={{ position: "relative", zIndex: 1 }}>
        <Header />
        <Routes>
          {/* Public routes */}
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected routes */}
          <Route path="/" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } />
          <Route path="/client/:id" element={
            <PrivateRoute><ClientDetail /></PrivateRoute>
          } />
          <Route path="/add-client" element={
            <PrivateRoute><AddClient /></PrivateRoute>
          } />
          <Route path="/admin" element={
            <PrivateRoute><AdminPage /></PrivateRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
