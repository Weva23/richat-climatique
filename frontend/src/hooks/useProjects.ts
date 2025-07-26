import { useQuery } from '@tanstack/react-query';

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
  };
  documents: any[];
  missing_documents: string[];
  submitted_documents: any[];
  progress_percentage: number;
}

const fetchProjects = async (): Promise<Project[]> => {
  const token = localStorage.getItem('authToken');
  const response = await fetch('http://localhost:8000/api/projects/', {
    headers: {
      'Authorization': `Token ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Erreur lors du chargement des projets');
  }

  const data = await response.json();
  return data.results || data || [];
};

const fetchDashboardStats = async () => {
  const token = localStorage.getItem('authToken');
  const response = await fetch('http://localhost:8000/api/projects/dashboard_stats/', {
    headers: {
      'Authorization': `Token ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Erreur lors du chargement des statistiques');
  }

  return response.json();
};

export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });
};
