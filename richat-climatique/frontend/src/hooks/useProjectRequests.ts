// =============================================================================
// HOOKS POUR LES DEMANDES DE PROJETS CLIENTS
// =============================================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notificationService, { ProjectRequest, ProjectRequestStats } from '../services/notificationService';
import { toast } from 'sonner';

// ========== HOOKS POUR ADMIN ==========

export const useProjectRequests = (status?: string) => {
  return useQuery({
    queryKey: ['project-requests', status],
    queryFn: () => notificationService.getProjectRequests(status),
    refetchInterval: 30000, // Actualiser toutes les 30 secondes
  });
};

export const useProjectRequestStats = () => {
  return useQuery({
    queryKey: ['project-request-stats'],
    queryFn: () => notificationService.getProjectRequestStats(),
    refetchInterval: 60000, // Actualiser toutes les minutes
  });
};

export const useApproveProjectRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, responseMessage }: { id: number; responseMessage: string }) => 
      notificationService.approveProjectRequest(id, responseMessage),
    onSuccess: (data) => {
      // Invalider les caches pour actualiser les données
      queryClient.invalidateQueries({ queryKey: ['project-requests'] });
      queryClient.invalidateQueries({ queryKey: ['project-request-stats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      
      toast.success('Demande approuvée avec succès');
    },
    onError: (error) => {
      console.error('Erreur lors de l\'approbation:', error);
      toast.error('Erreur lors de l\'approbation de la demande');
    },
  });
};

export const useRejectProjectRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, responseMessage }: { id: number; responseMessage: string }) => 
      notificationService.rejectProjectRequest(id, responseMessage),
    onSuccess: (data) => {
      // Invalider les caches pour actualiser les données
      queryClient.invalidateQueries({ queryKey: ['project-requests'] });
      queryClient.invalidateQueries({ queryKey: ['project-request-stats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      
      toast.success('Demande rejetée');
    },
    onError: (error) => {
      console.error('Erreur lors du rejet:', error);
      toast.error('Erreur lors du rejet de la demande');
    },
  });
};

// ========== HOOKS POUR CLIENT ==========

export const useSubmitProjectRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      client_id: number;
      project_ids: number[];
      message: string;
      client_info: {
        name: string;
        company: string;
        email: string;
        phone: string;
      };
    }) => notificationService.submitProjectRequest(data),
    onSuccess: (data) => {
      // Invalider le cache des demandes du client
      queryClient.invalidateQueries({ queryKey: ['my-project-requests'] });
      
      toast.success('Demande envoyée avec succès ! L\'administrateur va examiner votre sélection.');
    },
    onError: (error: any) => {
      console.error('Erreur lors de la soumission:', error);
      const errorMessage = error?.response?.data?.error || 'Erreur lors de l\'envoi de la demande';
      toast.error(errorMessage);
    },
  });
};

export const useMyProjectRequests = (clientId: number) => {
  return useQuery({
    queryKey: ['my-project-requests', clientId],
    queryFn: () => notificationService.getMyProjectRequests(clientId),
    enabled: !!clientId,
    refetchInterval: 60000, // Actualiser toutes les minutes
  });
};

// ========== HOOKS POUR PROJETS SCRAPÉS ==========

export const useScrapedProjects = (params?: {
  search?: string;
  source?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery({
    queryKey: ['scraped-projects', params],
    queryFn: () => notificationService.getScrapedProjects(params),
    keepPreviousData: true, // Garder les données précédentes pendant le chargement
  });
};

// ========== HOOKS POUR STATISTIQUES GLOBALES ==========

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => notificationService.getDashboardStats(),
    refetchInterval: 120000, // Actualiser toutes les 2 minutes
  });
};

// ========== HOOKS COMBINÉS ==========

export const useAdminDashboardData = () => {
  const projectRequests = useProjectRequests('pending');
  const projectRequestStats = useProjectRequestStats();
  const dashboardStats = useDashboardStats();
  
  return {
    projectRequests: projectRequests.data || [],
    projectRequestStats: projectRequestStats.data,
    dashboardStats: dashboardStats.data,
    isLoading: projectRequests.isLoading || projectRequestStats.isLoading || dashboardStats.isLoading,
    error: projectRequests.error || projectRequestStats.error || dashboardStats.error,
    refetch: () => {
      projectRequests.refetch();
      projectRequestStats.refetch();
      dashboardStats.refetch();
    }
  };
};

export const useClientDashboardData = (clientId: number) => {
  const scrapedProjects = useScrapedProjects({ page_size: 50 });
  const myRequests = useMyProjectRequests(clientId);
  
  return {
    scrapedProjects: scrapedProjects.data?.results || [],
    myRequests: myRequests.data || [],
    totalProjects: scrapedProjects.data?.count || 0,
    isLoading: scrapedProjects.isLoading || myRequests.isLoading,
    error: scrapedProjects.error || myRequests.error,
    refetch: () => {
      scrapedProjects.refetch();
      myRequests.refetch();
    }
  };
};

// ========== HOOKS UTILITAIRES ==========

export const useProjectRequestActions = () => {
  const approve = useApproveProjectRequest();
  const reject = useRejectProjectRequest();
  
  return {
    approve: approve.mutate,
    reject: reject.mutate,
    isApproving: approve.isPending,
    isRejecting: reject.isPending,
    isProcessing: approve.isPending || reject.isPending,
  };
};

export const useProjectSelection = () => {
  const submit = useSubmitProjectRequest();
  
  return {
    submit: submit.mutate,
    isSubmitting: submit.isPending,
    error: submit.error,
  };
};