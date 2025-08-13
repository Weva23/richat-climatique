// =============================================================================
// NOTIFICATIONDROPDOWN.TSX - MISE À JOUR AVEC BACKEND DJANGO
// =============================================================================
import { Bell, Circle, CheckCircle, AlertCircle, FileText, Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from "../../hooks/useNotifications";
import { useAuth } from "../../contexts/AuthContext";

const NotificationDropdown = () => {
  const { backendConnected } = useAuth();
  
  // Hooks pour les données réelles du backend
  const { data: notifications = [], isLoading, error } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  // Données de fallback si pas de connexion backend
  const fallbackNotifications = [
    {
      id: "1",
      type: "success" as const,
      title: "Système démarré",
      message: "Interface utilisateur chargée avec succès",
      time: "À l'instant",
      read: false,
      time_ago: "À l'instant"
    },
    {
      id: "2",
      type: "warning" as const,
      title: "Backend déconnecté", 
      message: "Impossible de se connecter au serveur Django",
      time: "Il y a 1 min",
      read: false,
      time_ago: "Il y a 1 min"
    }
  ];

  // Utiliser les données du backend si disponible, sinon fallback
  const displayNotifications = backendConnected ? notifications : fallbackNotifications;
  const displayUnreadCount = backendConnected ? unreadCount : fallbackNotifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case "document":
        return <FileText className="w-4 h-4 text-info" />;
      case "scraping":
        return <Database className="w-4 h-4 text-blue-500" />;
      case "project":
        return <FileText className="w-4 h-4 text-primary" />;
      case "assignment":
        return <Circle className="w-4 h-4 text-purple-500" />;
      default:
        return <Circle className="w-4 h-4 text-primary" />;
    }
  };

  const handleMarkAsRead = (id: string | number) => {
    if (backendConnected && typeof id === 'number') {
      markAsRead.mutate(id);
    }
  };

  const handleMarkAllAsRead = () => {
    if (backendConnected) {
      markAllAsRead.mutate();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {displayUnreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {displayUnreadCount > 99 ? '99+' : displayUnreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex items-center gap-2">
            {!backendConnected && (
              <Badge variant="outline" className="text-xs">
                Mode hors ligne
              </Badge>
            )}
            {isLoading && backendConnected && (
              <RefreshCw className="w-3 h-3 animate-spin" />
            )}
            {displayUnreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-1 text-xs"
                onClick={handleMarkAllAsRead}
                disabled={!backendConnected || markAllAsRead.isPending}
              >
                Tout marquer comme lu
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Statut de connexion */}
        {!backendConnected && (
          <div className="p-3 bg-yellow-50 border-b">
            <div className="flex items-center gap-2 text-sm text-yellow-700">
              <AlertCircle className="w-4 h-4" />
              <span>Backend déconnecté - Affichage limité</span>
            </div>
          </div>
        )}
        
        <ScrollArea className="h-80">
          {isLoading && backendConnected ? (
            <div className="p-4 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          ) : error && backendConnected ? (
            <div className="p-4 text-center text-red-600">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm">Erreur de chargement</p>
            </div>
          ) : displayNotifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            displayNotifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-3 cursor-pointer"
                onClick={() => handleMarkAsRead(notification.id)}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <Circle className="w-2 h-2 fill-primary text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    {/* Afficher le nom du projet si disponible */}
                    {'project_name' in notification && notification.project_name && (
                      <p className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {notification.project_name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {notification.time_ago || notification.time}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-center justify-center">
          <Button variant="ghost" size="sm" className="w-full">
            Voir toutes les notifications
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;