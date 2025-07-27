// =============================================================================
// SIDEBAR.TSX - MISE À JOUR DE VOTRE VERSION EXISTANTE AVEC DONNÉES SCRAPÉES
// =============================================================================
import { 
  FolderOpen, 
  BarChart3, 
  AlertCircle, 
  Bell, 
  CheckCircle, 
  Users, 
  Calendar,
  FileText,
  Database,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useScrapedProjectStats } from "../../hooks/useScrapedProjects";
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar = ({ activeSection, onSectionChange }: SidebarProps) => {
  const { backendConnected } = useAuth();
  const { data: scrapedStats } = useScrapedProjectStats();

  const menuItems = [
    {
      id: "overview",
      label: "Aperçu des dossiers",
      description: "Vue d'ensemble des projets clients",
      icon: FolderOpen,
    },
    {
      id: "analysis",
      label: "Analyse financière",
      description: "Scores et viabilité des projets",
      icon: BarChart3,
    },
    {
      id: "documents",
      label: "Documents manquants",
      description: "Pièces non soumises",
      icon: AlertCircle,
    },
    {
      id: "notifications",
      label: "Notifications récentes",
      description: "Dernières activités",
      icon: Bell,
    },
    {
      id: "ready",
      label: "Projets prêts",
      description: "Dossiers à 100% complétés",
      icon: CheckCircle,
    },
    {
      id: "consultants",
      label: "Consultants actifs",
      description: "Assignations en cours",
      icon: Users,
    },
    {
      id: "calendar",
      label: "Calendrier",
      description: "Deadlines à venir",
      icon: Calendar,
    },
    // NOUVELLE SECTION - Données Scrapées
    {
      id: "scraped",
      label: "Données Scrapées",
      description: "Projets collectés automatiquement",
      icon: Database,
      isNew: true,
      badge: scrapedStats?.total_scraped || 0
    },
    {
      id: "settings",
      label: "Paramètres",
      description: "Configuration et préférences",
      icon: Settings,
    }
  ];

  return (
    <aside className="w-80 bg-background border-r border-border p-6">
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-2">Espace de travail</h2>
        <p className="text-sm text-muted-foreground">
          Tableau de bord consultante
          {!backendConnected && (
            <Badge variant="outline" className="ml-2 text-xs">
              Mode hors ligne
            </Badge>
          )}
        </p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full justify-start p-4 h-auto flex-col items-start gap-1 relative",
                isActive && "bg-primary-light text-primary border border-primary/20",
                item.isNew && !isActive && "bg-blue-50 border border-blue-200"
              )}
            >
              <div className="flex items-center gap-3 w-full">
                <Icon className={cn(
                  "w-5 h-5 flex-shrink-0",
                  item.isNew && !isActive && "text-blue-600"
                )} />
                <span className={cn(
                  "font-medium text-left",
                  item.isNew && !isActive && "text-blue-800"
                )}>
                  {item.label}
                </span>
                
                {/* Badge pour indiquer une nouvelle fonctionnalité */}
                {item.isNew && (
                  <Badge variant="secondary" className="ml-auto text-xs bg-blue-100 text-blue-800">
                    Nouveau
                  </Badge>
                )}
                
                {/* Badge pour afficher le nombre d'éléments */}
                {item.badge && item.badge > 0 && !item.isNew && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    {item.badge > 999 ? '999+' : item.badge}
                  </Badge>
                )}
              </div>
              <p className={cn(
                "text-xs text-muted-foreground text-left pl-8",
                item.isNew && !isActive && "text-blue-600"
              )}>
                {item.description}
              </p>
              
              {/* Indicateur spécial pour les données scrapées */}
              {item.id === "scraped" && scrapedStats && (
                <div className="text-xs text-left pl-8 mt-1 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium">{scrapedStats.total_scraped}</span>
                  </div>
                  {scrapedStats.ready_projects > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prêts:</span>
                      <span className="font-medium text-green-600">{scrapedStats.ready_projects}</span>
                    </div>
                  )}
                </div>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Section d'information sur les données scrapées */}
      {scrapedStats && scrapedStats.total_scraped > 0 && activeSection !== "scraped" && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Collecte automatique</span>
          </div>
          <p className="text-xs text-blue-700 mb-3">
            {scrapedStats.total_scraped} projets collectés depuis GEF et GCF
          </p>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/50 p-2 rounded">
              <div className="font-medium text-green-600">{scrapedStats.by_source?.GEF || 0}</div>
              <div className="text-green-700">GEF</div>
            </div>
            <div className="bg-white/50 p-2 rounded">
              <div className="font-medium text-blue-600">{scrapedStats.by_source?.GCF || 0}</div>
              <div className="text-blue-700">GCF</div>
            </div>
          </div>
          
          {scrapedStats.ready_projects > 0 && (
            <div className="mt-2 text-xs text-center bg-white/70 p-2 rounded">
              <span className="text-green-600 font-medium">{scrapedStats.ready_projects}</span>
              <span className="text-green-700"> prêts à convertir</span>
            </div>
          )}
          
          <Button 
            size="sm" 
            className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
            onClick={() => onSectionChange("scraped")}
          >
            Découvrir
          </Button>
        </div>
      )}

      {/* Information sur la connexion */}
      {!backendConnected && (
        <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Mode hors ligne</span>
          </div>
          <p className="text-xs text-yellow-700">
            Certaines fonctionnalités nécessitent une connexion au backend Django.
          </p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;