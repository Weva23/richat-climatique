// =============================================================================
// HOOKS POUR LES PROJETS DJANGO - MISE À JOUR COMPLÈTE
// =============================================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { toast } from 'sonner';

export interface Project {
  id: number;
  name: string;
  description: string;
  type_project: string;
  type_display: string;
  status: string;
  status_display: string;
  fund: string;
  fund_display: string;
  score_viabilite: number;
  rating_stars: number;
  montant_demande: number;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  date_creation: string;
  date_echeance?: string;
  consultant_details?: {
    id: number;
    full_name: string;
    initials: string;
    level: string;
  };
  documents: any[];
  missing_documents: Array<{ id: number; name: string }>;
  submitted_documents: any[];
  progress_percentage: number;
  is_from_scraping: boolean;
  original_source?: string;
  source_reference?: string;
  has_scraped_source: boolean;
}

export interface DashboardStats {
  total_projects: number;
  ready_projects: number;
  pending_projects: number;
  avg_score: number;
  total_amount: number;
  // Statistiques des projets scrapés
  total_scraped?: number;
  scraped_by_source?: Record<string, number>;
  ready_for_conversion?: number;
  recent_scraping_sessions?: any[];
}

export interface ProjectFilters {
  status?: string;
  type_project?: string;
  fund?: string;
  consultant?: number;
  is_from_scraping?: boolean;
  original_source?: string;
  search?: string;
  ordering?: string;
}

export interface Consultant {
  id: number;
  username: string;
  full_name: string;
  initials: string;
  level: string;
  department: string;
  active_projects_count: number;
}

// Hook principal pour les projets
export const useProjects = (filters: ProjectFilters = {}) => {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: async (): Promise<Project[]> => {
      try {
        const response = await apiClient.get<{ results: Project[] }>('/projects/', filters);
        return response.results || [];
      } catch (error) {
        console.error('Erreur lors du chargement des projets:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook pour les statistiques du dashboard
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      try {
        return await apiClient.get<DashboardStats>('/projects/dashboard_stats/');
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook pour un projet spécifique
export const useProject = (id: number) => {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async (): Promise<Project> => {
      try {
        return await apiClient.get<Project>(`/projects/${id}/`);
      } catch (error) {
        console.error('Erreur lors du chargement du projet:', error);
        throw error;
      }
    },
    enabled: !!id,
  });
};

// Hook pour les consultants
export const useConsultants = () => {
  return useQuery({
    queryKey: ['consultants'],
    queryFn: async (): Promise<Consultant[]> => {
      try {
        const response = await apiClient.get<{ results: Consultant[] }>('/consultants/');
        return response.results || [];
      } catch (error) {
        console.error('Erreur lors du chargement des consultants:', error);
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook pour créer un projet
export const useCreateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (projectData: Partial<Project>): Promise<Project> => {
      try {
        return await apiClient.post<Project>('/projects/', projectData);
      } catch (error) {
        console.error('Erreur lors de la création du projet:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast.success(`Projet "${data.name}" créé avec succès !`);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: any) => {
      const message = error.message || 'Erreur lors de la création du projet';
      toast.error(message);
    },
  });
};

// Hook pour mettre à jour un projet
export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Project> }): Promise<Project> => {
      try {
        return await apiClient.patch<Project>(`/projects/${id}/`, data);
      } catch (error) {
        console.error('Erreur lors de la mise à jour du projet:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast.success(`Projet "${data.name}" mis à jour !`);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: any) => {
      const message = error.message || 'Erreur lors de la mise à jour du projet';
      toast.error(message);
    },
  });
};

// Hook pour supprimer un projet
export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      try {
        await apiClient.delete(`/projects/${id}/`);
      } catch (error) {
        console.error('Erreur lors de la suppression du projet:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Projet supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: any) => {
      const message = error.message || 'Erreur lors de la suppression du projet';
      toast.error(message);
    },
  });
};

// Hook pour assigner un consultant
export const useAssignConsultant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ projectId, consultantId }: { projectId: number; consultantId: number }) => {
      try {
        return await apiClient.post(`/projects/${projectId}/assign_consultant/`, {
          consultant_id: consultantId
        });
      } catch (error) {
        console.error('Erreur lors de l\'assignation du consultant:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Consultant assigné avec succès');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error: any) => {
      const message = error.message || 'Erreur lors de l\'assignation du consultant';
      toast.error(message);
    },
  });
};

// Hook pour les projets groupés par statut
export const useProjectsByStatus = () => {
  return useQuery({
    queryKey: ['projects-by-status'],
    queryFn: async (): Promise<Record<string, Project[]>> => {
      try {
        return await apiClient.get<Record<string, Project[]>>('/projects/by_status/');
      } catch (error) {
        console.error('Erreur lors du chargement des projets par statut:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};