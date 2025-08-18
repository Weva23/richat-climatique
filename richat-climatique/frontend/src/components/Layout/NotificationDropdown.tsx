// frontend/src/components/Layout/NotificationDropdown.tsx
import React, { useState } from "react";
import { Bell, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import notificationService from "@/services/notificationService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProjectAlert {
  id: number;
  title: string;
  source: string;
  source_display: string;
  organization: string;
  total_funding: string;
  alert_created_at: string;
  time_since_alert: string;
  alert_icon: string;
  priority_level: string;
  is_featured: boolean;
  data_completeness_score: number;
  status: string;
}

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const { backendConnected } = useAuth();
  
  // Mutation pour marquer une alerte comme lue
  const markAsReadMutation = useMutation({
    mutationFn: (alertId: number) => 
      notificationService.markAlertAsRead(alertId),
    onSuccess: () => {
      refetchAlerts();
      refetchStats();
    }
  });

  // Charger les alertes
  const { 
    data: alertsData, 
    isLoading, 
    refetch: refetchAlerts 
  } = useQuery({
    queryKey: ['project-alerts-dropdown'],
    queryFn: () => notificationService.getProjectAlerts({
      status: 'active',
      page_size: 50
    }),
    refetchInterval: 10000,
    enabled: backendConnected,
  });

  // Charger les statistiques
  const { 
    data: stats, 
    refetch: refetchStats 
  } = useQuery({
    queryKey: ['project-alerts-stats-dropdown'],
    queryFn: () => notificationService.getProjectAlertsStats(),
    refetchInterval: 30000,
    enabled: backendConnected,
  });

  const alerts = alertsData?.results || [];
  const unreadCount = stats?.active_alerts || 0;

  const handleAlertClick = (alert: ProjectAlert) => {
    if (alert.status !== 'read') {
      markAsReadMutation.mutate(alert.id);
    }
    navigate('/suivez-appels');
  };

  const handleViewAll = () => {
    navigate('/suivez-appels');
  };

  // Fonctions utilitaires
  const getAlertIcon = (source: string) => {
    switch (source) {
      case "GEF": return "🌍";
      case "GCF": return "💚";
      case "CLIMATE_FUND": return "🌱";
      default: return "📋";
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: "bg-red-100 text-red-800",
      high: "bg-orange-100 text-orange-800",
      medium: "bg-blue-100 text-blue-800",
      low: "bg-gray-100 text-gray-800"
    };
    return colors[priority as keyof typeof colors] || colors.medium;
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
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-[420px] max-h-[80vh] overflow-hidden">
        <DropdownMenuLabel className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="font-semibold">Projets de financement</span>
          </div>
        </DropdownMenuLabel>
        
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-pulse flex items-center justify-center">
              <Bell className="w-5 h-5 mr-2 text-blue-600" />
              <span className="text-sm text-muted-foreground">Chargement des projets...</span>
            </div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium mb-1">Aucun projet actif</p>
            <p className="text-xs">Les nouveaux projets apparaîtront ici</p>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto max-h-[60vh]">
              {alerts.map((alert) => (
                <DropdownMenuItem 
                  key={alert.id}
                  className={`flex flex-col items-start p-4 border-b hover:bg-accent/50 cursor-pointer ${
                    alert.status === 'read' ? 'opacity-80' : ''
                  }`}
                  onClick={() => handleAlertClick(alert)}
                >
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getAlertIcon(alert.source)}</span>
                        <Badge variant="secondary" className="text-xs">
                          {alert.source_display}
                        </Badge>
                      </div>
                      <Badge className={`text-xs ${getPriorityColor(alert.priority_level)}`}>
                        {alert.priority_level}
                      </Badge>
                    </div>

                    <h4 className="text-sm font-medium line-clamp-2">
                      {alert.title}
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span>🏢</span>
                        <span className="truncate">{alert.organization}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span>💰</span>
                        <span className="truncate font-medium text-green-600">
                          {alert.total_funding}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        ⏰ {alert.time_since_alert}
                      </span>
                      {alert.status !== 'read' && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem className="justify-center p-0">
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleViewAll}
                className="w-full m-2"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Voir tous les projets
              </Button>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;