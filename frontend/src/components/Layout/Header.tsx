import { Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useLocation } from "react-router-dom";
import NotificationDropdown from "./NotificationDropdown";

interface HeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Header = ({ activeSection, onSectionChange }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <header className="bg-background border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold text-primary">Richat Funding Tracker</h1>
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
              className={location.pathname === "/dossiers-candidature" ? "bg-primary-light text-primary" : "text-muted-foreground"}
              onClick={() => navigate("/dossiers-candidature")}
            >
              À définir
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              className="pl-10 w-64"
            />
          </div>
          
          <NotificationDropdown />
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/profile")}
          >
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;