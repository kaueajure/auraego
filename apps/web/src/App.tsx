import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth-context";

const AuthPage = lazy(() => import("./pages/AuthPage").then(m => ({ default: m.AuthPage })));
const VerifyPage = lazy(() => import("./pages/TokenPages").then(m => ({ default: m.VerifyPage })));
const ResetPage = lazy(() => import("./pages/TokenPages").then(m => ({ default: m.ResetPage })));
const LobbyPage = lazy(() => import("./pages/LobbyPage").then(m => ({ default: m.LobbyPage })));
const PersonalizePage = lazy(() => import("./pages/PersonalizePage").then(m => ({ default: m.PersonalizePage })));
const RankingPage = lazy(() => import("./pages/RankingPage").then(m => ({ default: m.RankingPage })));
const AdminPage = lazy(() => import("./pages/AdminPage").then(m => ({ default: m.AdminPage })));
const GamePage = lazy(() => import("./pages/GamePage").then(m => ({ default: m.GamePage })));

const Protected = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot"><span className="brand-mark">A&E</span><p>Preparando a quadra…</p></div>;
  return user ? children : <Navigate to="/entrar" replace />;
};
export function App() {
  return <AuthProvider><Suspense fallback={<div className="boot"><span className="brand-mark">A&E</span><p>Preparando a quadra…</p></div>}><Routes>
    <Route path="/entrar" element={<AuthPage />} />
    <Route path="/verificar-email" element={<VerifyPage />} />
    <Route path="/redefinir-senha" element={<ResetPage />} />
    <Route path="/" element={<Protected><LobbyPage /></Protected>} />
    <Route path="/personalizar" element={<Protected><PersonalizePage /></Protected>} />
    <Route path="/ranking" element={<Protected><RankingPage /></Protected>} />
    <Route path="/admin" element={<Protected><AdminPage /></Protected>} />
    <Route path="/partida" element={<Protected><GamePage /></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense></AuthProvider>;
}
