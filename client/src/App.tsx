import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleGuard from '@/components/RoleGuard';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import InventaireMateriels from '@/pages/InventaireMateriels';
import GestionLocalisations from '@/pages/GestionLocalisations';
import Affectations from '@/pages/Affectations';
import DeclarationsPannes from '@/pages/DeclarationsPannes';
import Interventions from '@/pages/Interventions';
import StockPieces from '@/pages/StockPieces';
import AuditLogs from '@/pages/AuditLogs';
import GestionUtilisateurs from '@/pages/GestionUtilisateurs';
import MonProfil from '@/pages/MonProfil';

export default function App() {
  const { loading } = useAuth();
  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-500">Chargement...</div>;
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/materiels" element={<InventaireMateriels />} />
        <Route path="/localisations" element={<GestionLocalisations />} />
        <Route path="/affectations" element={<Affectations />} />
        <Route path="/pannes" element={<DeclarationsPannes />} />
        <Route path="/interventions" element={<Interventions />} />
        <Route path="/stock" element={<StockPieces />} />
        <Route path="/mon-profil" element={<MonProfil />} />
        <Route path="/utilisateurs" element={<RoleGuard role="ADMINISTRATEUR"><GestionUtilisateurs /></RoleGuard>} />
        <Route path="/audit" element={<RoleGuard role="ADMINISTRATEUR"><AuditLogs /></RoleGuard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}