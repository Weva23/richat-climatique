import { 
  FolderOpen, 
  BarChart3, 
  AlertCircle, 
  Bell, 
  CheckCircle, 
  Users, 
  Calendar,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar = ({ activeSection, onSectionChange }: SidebarProps) => {
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
  ];

  return (
    <aside className="w-80 bg-background border-r border-border p-6">
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-2">Espace de travail</h2>
        <p className="text-sm text-muted-foreground">Tableau de bord consultante</p>
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
                "w-full justify-start p-4 h-auto flex-col items-start gap-1",
                isActive && "bg-primary-light text-primary border border-primary/20"
              )}
            >
              <div className="flex items-center gap-3 w-full">
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-left">{item.label}</span>
              </div>
              <p className="text-xs text-muted-foreground text-left pl-8">
                {item.description}
              </p>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;