import { useState } from "react";
import { Bell, Circle, CheckCircle, AlertCircle, FileText, Calendar } from "lucide-react";
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

interface Notification {
  id: string;
  type: "success" | "warning" | "info" | "document";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "success",
      title: "Dossier approuvé",
      message: "Le projet 'Énergie Solaire Maroc' a été approuvé",
      time: "Il y a 2h",
      read: false
    },
    {
      id: "2",
      type: "warning",
      title: "Document manquant",
      message: "Rapport financier requis pour 'Parc Éolien Tunisie'",
      time: "Il y a 3h",
      read: false
    },
    {
      id: "3",
      type: "info",
      title: "Nouveau consultant",
      message: "Marie Dubois a rejoint votre équipe",
      time: "Il y a 5h",
      read: true
    },
    {
      id: "4",
      type: "document",
      title: "Document soumis",
      message: "Nouveau document pour 'Irrigation Sénégal'",
      time: "Il y a 1j",
      read: true
    },
    {
      id: "5",
      type: "warning",
      title: "Échéance proche",
      message: "Date limite dans 3 jours pour 'Transport Vert'",
      time: "Il y a 1j",
      read: false
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case "document":
        return <FileText className="w-4 h-4 text-info" />;
      default:
        return <Circle className="w-4 h-4 text-primary" />;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-1 text-xs"
              onClick={markAllAsRead}
            >
              Tout marquer comme lu
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-3 cursor-pointer"
                onClick={() => markAsRead(notification.id)}
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
                    <p className="text-xs text-muted-foreground">
                      {notification.time}
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