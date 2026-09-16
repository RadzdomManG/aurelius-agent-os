import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import AppLayout from '@/components/AppLayout';
import PortalProvider from '@/lib/PortalContext';
import PortalRoute from '@/components/PortalRoute';
import OwnerRoute from '@/components/OwnerRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';
import Aurelius from '@/pages/Aurelius';
import Onboarding from '@/pages/Onboarding';
import Settings from '@/pages/Settings';
import Leads from '@/pages/Leads';
import Jobs from '@/pages/Jobs';
import ModulePage from '@/pages/ModulePage';
import AccessCodeLogin from '@/pages/AccessCodeLogin';
import AccessCodes from '@/pages/AccessCodes';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return <Navigate to="/access" replace />;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/access" element={<AccessCodeLogin />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<PortalRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/aurelius" element={<Aurelius />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/jobs" element={<Jobs />} />
        </Route>
      </Route>
      <Route element={<OwnerRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/access-codes" element={<AccessCodes />} />
          <Route path="/inbox" element={<ModulePage module="inbox" />} />
          <Route path="/crm" element={<ModulePage module="crm" />} />
          <Route path="/tasks" element={<ModulePage module="tasks" />} />
          <Route path="/calendar" element={<ModulePage module="calendar" />} />
          <Route path="/memory" element={<ModulePage module="memory" />} />
          <Route path="/approvals" element={<ModulePage module="approvals" />} />
          <Route path="/activity" element={<ModulePage module="activity" />} />
          <Route path="/integrations" element={<ModulePage module="integrations" />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <PortalProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </PortalProvider>
    </AuthProvider>
  )
}

export default App