// C:\Users\Lenovo2\Downloads\Projets-Verst\richat-climatique\richat-climatique\frontend\src\hooks\useProjectAlerts.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notificationService, { ProjectAlert } from '../services/notificationService';

interface UseProjectAlertsParams {
  status?: 'active' | 'read' | 'archived' | 'dismissed' | 'all';
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  source?: 'GEF' | 'GCF' | 'CLIMATE_FUND' | 'OTHER';
  is_featured?: boolean;
  is_read?: boolean;
  page?: number;
  page_size?: number;
  days_limit?: number; // Nouveau paramètre pour limiter par jours
}

export const useProjectAlerts = (params?: UseProjectAlertsParams) => {
  return useQuery({
    queryKey: ['project-alerts', params],
    queryFn: async () => {
      const result = await notificationService.getProjectAlerts(params);
      
      // Filtrer les alertes de plus de 3 jours si demandé
      if (params?.days_limit) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - params.days_limit);
        
        result.results = result.results.filter(alert => {
          const alertDate = new Date(alert.alert_created_at);
          return alertDate >= cutoffDate;
        });
        result.count = result.results.length;
      }
      
      return result;
    },
    refetchInterval: 30000, // Actualiser toutes les 30 secondes
  });
};

export const useProjectAlertsStats = () => {
  return useQuery({
    queryKey: ['project-alerts-stats'],
    queryFn: () => notificationService.getProjectAlertsStats(),
    refetchInterval: 60000, // Actualiser toutes les minutes
  });
};

export const useNewProjectAlerts = () => {
  return useQuery({
    queryKey: ['new-project-alerts'],
    queryFn: async () => {
      // Récupérer les alertes des 3 derniers jours uniquement
      const result = await notificationService.getProjectAlerts({
        status: 'active',
        page_size: 100
      });
      
      // Filtrer pour ne garder que les alertes des 3 derniers jours
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const recentAlerts = result.results.filter(alert => {
        const alertDate = new Date(alert.alert_created_at);
        return alertDate >= threeDaysAgo;
      });
      
      return {
        ...result,
        results: recentAlerts,
        count: recentAlerts.length
      };
    },
    refetchInterval: 30000,
  });
};

export const useMarkAlertAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => notificationService.markAlertAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['new-project-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['project-alerts-stats'] });
    },
  });
};

export const useDismissAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => notificationService.dismissAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['new-project-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['project-alerts-stats'] });
    },
  });
};

export const useArchiveAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => notificationService.archiveAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['new-project-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['project-alerts-stats'] });
    },
  });
};