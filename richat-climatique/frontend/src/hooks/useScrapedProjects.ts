// =============================================================================
// HOOKS POUR LES PROJETS SCRAPÉS
// =============================================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scrapedProjectService, ScrapedProjectFilters } from '../services/scrapedProjectService';
import { toast } from 'sonner';

export const useScrapedProjects = (filters: ScrapedProjectFilters = {}) => {
  return useQuery({
    queryKey: ['scraped-projects', filters],
    queryFn: () => scrapedProjectService.getScrapedProjects(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useScrapedProject = (id: number) => {
  return useQuery({
    queryKey: ['scraped-project', id],
    queryFn: () => scrapedProjectService.getScrapedProjectById(id),
    enabled: !!id,
  });
};

export const useScrapedProjectStats = () => {
  return useQuery({
    queryKey: ['scraped-projects-stats'],
    queryFn: () => scrapedProjectService.getStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useReadyForCreation = () => {
  return useQuery({
    queryKey: ['scraped-projects-ready'],
    queryFn: () => scrapedProjectService.getReadyForCreation(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useScrapingSessions = () => {
  return useQuery({
    queryKey: ['scraping-sessions'],
    queryFn: () => scrapedProjectService.getScrapingSessions(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useCreateProjectFromScraping = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ scrapedProjectId, consultantId }: { scrapedProjectId: number; consultantId: number }) =>
      scrapedProjectService.createDjangoProject(scrapedProjectId, consultantId),
    onSuccess: (data) => {
      toast.success(`Projet "${data.project_name}" créé avec succès !`);
      // Invalider les caches pour mettre à jour les données
      queryClient.invalidateQueries({ queryKey: ['scraped-projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
};

export const useTriggerScraping = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: { source?: string; max_pages?: number; headless?: boolean }) =>
      scrapedProjectService.triggerScraping(params),
    onSuccess: (data) => {
      toast.success(data.message);
      // Actualiser les données après le scraping
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['scraped-projects'] });
        queryClient.invalidateQueries({ queryKey: ['scraped-projects-stats'] });
        queryClient.invalidateQueries({ queryKey: ['scraping-sessions'] });
      }, 2000);
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors du scraping: ${error.message}`);
    },
  });
};