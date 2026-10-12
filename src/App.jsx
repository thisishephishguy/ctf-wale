import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider, useGame } from './contexts/GameContext';

// Pages
import HomePage from './pages/HomePage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import TeamLogin from './pages/TeamLogin';
import BridgeLogin from './pages/BridgeLogin';
import TeamOS from './pages/TeamOS';
import BreachOS from './pages/BreachOS';

// Protected Route Component for Admin Dashboard
const ProtectedAdminRoute = ({ children }) => {
  const { currentUser } = useGame();

  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

// Main Route Configurations
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Home Portal */}
      <Route path="/" element={<HomePage />} />

      {/* Authentication Portals */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/team-login" element={<TeamLogin />} />
      <Route path="/bridge-login" element={<BridgeLogin />} />
      
      {/* Route Aliases */}
      <Route path="/login/team" element={<TeamLogin />} />
      <Route path="/login/bridge" element={<BridgeLogin />} />
      <Route path="/breach-login" element={<BridgeLogin />} />
      <Route path="/team" element={<TeamLogin />} />
      <Route path="/breach" element={<BridgeLogin />} />

      {/* Protected Admin Console */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedAdminRoute>
            <AdminDashboard />
          </ProtectedAdminRoute>
        }
      />

      {/* Team WebOS (Own System Defense) */}
      <Route path="/team/:teamId" element={<TeamOS />} />

      {/* Breach WebOS (Attacking Opponent System) */}
      <Route path="/breach/:teamId" element={<BreachOS />} />

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <GameProvider>
      <AppRoutes />
    </GameProvider>
  );
}
