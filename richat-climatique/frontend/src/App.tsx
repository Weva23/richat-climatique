// =============================================================================
// APP.TSX MISE À JOUR AVEC LA ROUTE SCRAPED PROJECTS
// =============================================================================
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Import des pages existantes
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SuivezAppels from "./pages/SuivezAppels";
import DossiersCandidature from "./pages/DossiersCandidature";
import Login from "./pages/Login";
import Profile from "./pages/Profile";

// Import de la nouvelle page pour les projets scrapés
import ScrapedProjects from "./pages/ScrapedProjects";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Composant de protection des routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

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

  return <>{children}</>;
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
            
            {/* Routes protégées avec l'interface complète */}
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            
            <Route path="/suivez-appels" element={
              <ProtectedRoute>
                <SuivezAppels />
              </ProtectedRoute>
            } />
            
            <Route path="/dossiers-candidature" element={
              <ProtectedRoute>
                <DossiersCandidature />
              </ProtectedRoute>
            } />
            
            {/* NOUVELLE ROUTE pour les projets scrapés */}
            <Route path="/scraped-projects" element={
              <ProtectedRoute>
                <ScrapedProjects />
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
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