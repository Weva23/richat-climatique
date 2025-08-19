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
      id: "notifications",
      label: "Notifications récentes",
      description: "Dernières activités",
      icon: Bell,
    }
  ];
};

export default Sidebar;