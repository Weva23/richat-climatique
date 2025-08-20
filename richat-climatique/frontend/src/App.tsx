import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Import des pages existantes (ADMIN)
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SuivezAppels from "./pages/SuivezAppels";
import DossiersCandidature from "./pages/DossiersCandidature";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import ScrapedProjects from "./pages/ScrapedProjects";

import AdminClientRequests from "./pages/AdminClientRequests";

// Import de la nouvelle page CLIENT

import ClientDashboard from "./pages/ClientDashboard";
import ClientDocuments from "./pages/ClientDocuments";
// Import de la nouvelle page CLIENT


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Composant de protection des routes avec vÃ©rification de rÃ´le
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode;
  requiredRole?: 'admin' | 'client';
}> = ({ children, requiredRole }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // VÃ©rifier le rÃ´le si spÃ©cifiÃ©
  if (requiredRole && user?.role !== requiredRole) {
    // Rediriger vers le dashboard appropriÃ©
    const redirectPath = user?.is_admin ? '/' : '/client-dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

// Composant de redirection automatique depuis la racine
const DashboardRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admin vers dashboard existant, Client vers nouveau dashboard
  const redirectPath = user?.is_admin ? '/' : '/client-dashboard';
  return <Navigate to={redirectPath} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Route de connexion - publique */}
            <Route path="/login" element={<Login />} />
            
            {/* Routes ADMIN - utilisation de votre structure existante */}
            <Route path="/" element={
              <ProtectedRoute requiredRole="admin">
                <Index />
              </ProtectedRoute>
            } />
            
            <Route path="/suivez-appels" element={
              <ProtectedRoute requiredRole="admin">
                <SuivezAppels />
              </ProtectedRoute>
            } />
            
            <Route path="/dossiers-candidature" element={
              <ProtectedRoute requiredRole="admin">
                <DossiersCandidature />
              </ProtectedRoute>
            } />
            
            <Route path="/scraped-projects" element={
              <ProtectedRoute requiredRole="admin">
                <ScrapedProjects />
              </ProtectedRoute>
            } />
            <Route path="/project-requests" element={
              <ProtectedRoute requiredRole="admin">
                <AdminClientRequests />
              </ProtectedRoute>
            } />
            
            {/* Route CLIENT - nouveau dashboard */}
            <Route path="/client-dashboard" element={
              <ProtectedRoute requiredRole="client">
                <ClientDashboard />
              </ProtectedRoute>
            } />
            
            {/* Route profil - accessible aux deux rÃ´les */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/documents-client" element={
              <ProtectedRoute requiredRole="client">
                <ClientDocuments />
              </ProtectedRoute>
            } />
            
            {/* Route 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;