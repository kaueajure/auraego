import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth-context";
import { AuthPage } from "./pages/AuthPage";
import { VerifyPage, ResetPage } from "./pages/TokenPages";
import { LobbyPage } from "./pages/LobbyPage";
import { GamePage } from "./pages/GamePage";

const Protected = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot"><span className="brand-mark">A&E</span><p>Preparando a quadra…</p></div>;
  return user ? children : <Navigate to="/entrar" replace />;
};
export function App() {
  return <AuthProvider><Routes>
    <Route path="/entrar" element={<AuthPage />} />
    <Route path="/verificar-email" element={<VerifyPage />} />
    <Route path="/redefinir-senha" element={<ResetPage />} />
    <Route path="/" element={<Protected><LobbyPage /></Protected>} />
    <Route path="/partida" element={<Protected><GamePage /></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider>;
}
