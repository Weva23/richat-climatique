//            

// HEADER.TSX - MISE Ã€ JOUR DE VOTRE VERSION EXISTANTE AVEC BACKEND

// HEADER.TSX - VERSION AVEC NOTIFICATION UNIQUE POUR NOUVEAUX PROJETS

//            
import { Search, User, Database, Wifi, WifiOff, Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import NotificationDropdown from "./NotificationDropdown";
import { useEffect, useState, useRef } from "react";

interface HeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Header = ({ activeSection, onSectionChange }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, backendConnected } = useAuth();
  const [newScrapedProjects, setNewScrapedProjects] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [hasShownNotification, setHasShownNotification] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialiser l'audio
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.volume = 0.3;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Vérification des nouveaux projets après connexion ou actualisation
  useEffect(() => {
    if (!backendConnected) return;

    const checkForNewProjects = async () => {
      try {
        // Simulation - remplacer par un vrai appel API
        // const response = await fetch('/api/scraped-projects/check');
        // const data = await response.json();
        const mockData = { hasNewProjects: Math.random() > 0.7 }; // 30% chance
        
        if (mockData.hasNewProjects && !hasShownNotification) {
          setNewScrapedProjects(true);
          setShowNotification(true);
          setHasShownNotification(true);
          
          // Jouer le son seulement si l'utilisateur est connecté
          if (user && audioRef.current) {
            audioRef.current.play().catch(e => console.log("Lecture audio bloquée:", e));
          }
          
          // Masquer automatiquement après 8 secondes
          setTimeout(() => setShowNotification(false), 8000);
        }
      } catch (error) {
        console.error("Erreur lors de la vérification des projets:", error);
      }
    };

    // Vérifier immédiatement après connexion
    checkForNewProjects();

    // Puis vérifier toutes les 2 minutes (120000 ms)
    const interval = setInterval(checkForNewProjects, 120000);

    return () => clearInterval(interval);
  }, [backendConnected, user, hasShownNotification]);

  const handleNotificationClick = () => {
    setShowNotification(false);
    navigate("/scraped-projects");
  };

  return (
    <header className="bg-background border-b border-border px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-primary">Richat Funding Tracker</h1>
            
            {/* Indicateur de connexion backend */}
            <div className="flex items-center gap-1 ml-2">
              {backendConnected ? (
                <>
                  
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-red-500" />
                  <span className="text-xs text-red-600">DÃ©connectÃ©</span>
                </>
              )}
            </div>
          </div>
          
          <nav className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className={location.pathname === "/suivez-appels" ? "bg-primary-light text-primary" : "text-muted-foreground"}
              onClick={() => navigate("/suivez-appels")}
            >
              Notifications
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={location.pathname === "/" ? "bg-primary-light text-primary" : "text-muted-foreground"}
              onClick={() => navigate("/")}
            >
              Financements
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
<<<<<<< HEAD
              className={location.pathname === "/dossiers-candidature" ? "bg-primary-light text-primary" : "text-muted-foreground"}
              onClick={() => navigate("/dossiers-candidature")}
            >
              Dossiers
            </Button>
 
            {/* Nouveau bouton pour les donnÃ©es scrapÃ©es */}
 
 
            <Button 
              variant="ghost" 
              size="sm" 
=======
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
              className={location.pathname === "/scraped-projects" ? "bg-primary-light text-primary" : "text-muted-foreground"}
              onClick={() => navigate("/scraped-projects")}
            >
              <Database className="w-4 h-4 mr-1" />
 
              DonnÃ©es ScrapÃ©es
 
              Données Scrapées
              {newScrapedProjects && (
                <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
 
            </Button>
            {/* <Button 
              variant="ghost" 
              size="sm" 
              className={location.pathname === "/project-requests" ? "bg-primary-light text-primary" : "text-muted-foreground"}
              onClick={() => navigate("/project-requests")}
            >
              <Database className="w-4 h-4 mr-1" />
              Gestion des Demandes 
            </Button> */}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          
 
          {/* Votre NotificationDropdown existant - maintenant connectÃ© au backend */}
          <NotificationDropdown />
 
          <div className="relative">
            <NotificationDropdown />
            {newScrapedProjects && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
            )}
          </div>
 
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/profile")}
            title={user ? `${user.full_name || user.username} (${user.level})` : 'Profil'}
          >
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Notification Toast */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50">
          <div 
            className="bg-green-600 text-white px-4 py-3 rounded-md shadow-lg flex items-center cursor-pointer"
            onClick={handleNotificationClick}
          >
            <div className="animate-bell-ring mr-3">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">Nouveaux projets scrapés disponibles!</p>
              <p className="text-sm opacity-80">Cliquez pour voir les nouveaux éléments</p>
            </div>
            <button 
              className="ml-4 p-1 rounded-full hover:bg-green-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowNotification(false);
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;