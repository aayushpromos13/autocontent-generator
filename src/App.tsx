import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/AppShell';
import { FullPageLoader } from '@/components/LoadingSpinner';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CreateVideoPage } from '@/pages/CreateVideoPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { AutomationPage } from '@/pages/AutomationPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { SettingsPage } from '@/pages/SettingsPage';

function ProtectedRoutes() {
  const { session, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!session) return <Navigate to="/auth" replace />;
  return <AppShell><Routes><Route path="/dashboard" element={<DashboardPage />} /><Route path="/create" element={<CreateVideoPage />} /><Route path="/projects" element={<ProjectsPage />} /><Route path="/projects/:id" element={<ProjectDetailPage />} /><Route path="/calendar" element={<CalendarPage />} /><Route path="/automation" element={<AutomationPage />} /><Route path="/templates" element={<TemplatesPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></AppShell>;
}

function App() { return <BrowserRouter><AuthProvider><Routes><Route path="/auth" element={<AuthRoute />} /><Route path="*" element={<ProtectedRoutes />} /></Routes></AuthProvider></BrowserRouter>; }
function AuthRoute() { const { session, loading } = useAuth(); if (loading) return <FullPageLoader />; return session ? <Navigate to="/dashboard" replace /> : <AuthPage />; }
export default App;
