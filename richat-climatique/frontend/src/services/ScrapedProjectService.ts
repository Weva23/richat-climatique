// =============================================================================
// SERVICE POUR LES PROJETS SCRAPÉS
// =============================================================================

export interface ScrapedProject {
  id: number;
  title: string;
  source: 'GEF' | 'GCF' | 'OTHER';
  source_display: string;
  source_url: string;
  source_id: string;
  description: string;
  organization: string;
  project_type: string;
  status: string;
  total_funding: string;
  funding_amount: number | null;
  currency: string;
  country: string;
  region: string;
  focal_areas: string;
  gef_project_id: string;
  gcf_document_type: string;
  cover_date: string;
  document_url: string;
  additional_links: string;
  scraped_at: string;
  last_updated: string;
  scraping_source: string;
  linked_project: number | null;
  linked_project_name: string | null;
  data_completeness_score: number;
  is_relevant_for_mauritania: boolean;
  needs_review: boolean;
  can_create_project: boolean;
}

export interface ScrapedProjectStats {
  total_scraped: number;
  by_source: Record<string, number>;
  by_completeness_score: Record<string, number>;
  ready_projects: number;
  linked_projects: number;
  needs_review: number;
  avg_completeness_score: number;
  recent_sessions: ScrapingSession[];
}

export interface ScrapingSession {
  id: number;
  source: string;
  source_display: string;
  started_at: string;
  completed_at: string | null;
  projects_found: number;
  projects_saved: number;
  projects_updated: number;
  success: boolean;
  error_message: string;
  max_pages: number | null;
  headless_mode: boolean;
  duration: string | null;
}

export interface ScrapedProjectFilters {
  source?: string;
  is_relevant_for_mauritania?: boolean;
  needs_review?: boolean;
  linked_project?: boolean;
  search?: string;
  ordering?: string;
}

const API_BASE_URL = 'http://localhost:8000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Authorization': `Token ${token}`,
    'Content-Type': 'application/json',
  };
};

class ScrapedProjectService {
  async getScrapedProjects(filters: ScrapedProjectFilters = {}): Promise<ScrapedProject[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const url = `${API_BASE_URL}/scraped-projects/?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des projets scrapés');
    }

    const data = await response.json();
    return data.results || data || [];
  }

  async getScrapedProjectById(id: number): Promise<ScrapedProject> {
    const response = await fetch(`${API_BASE_URL}/scraped-projects/${id}/`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement du projet scrapé');
    }

    return response.json();
  }

  async getStats(): Promise<ScrapedProjectStats> {
    const response = await fetch(`${API_BASE_URL}/scraped-projects/stats/`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des statistiques');
    }

    return response.json();
  }

  async getReadyForCreation(): Promise<ScrapedProject[]> {
    const response = await fetch(`${API_BASE_URL}/scraped-projects/ready_for_creation/`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des projets prêts');
    }

    return response.json();
  }

  async createDjangoProject(scrapedProjectId: number, consultantId: number): Promise<{ success: boolean; project_id: number; project_name: string }> {
    const response = await fetch(`${API_BASE_URL}/scraped-projects/${scrapedProjectId}/create_django_project/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ consultant_id: consultantId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la création du projet');
    }

    return response.json();
  }

  async triggerScraping(params: {
    source?: string;
    max_pages?: number;
    headless?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/scraped-projects/trigger_scraping/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors du lancement du scraping');
    }

    return response.json();
  }

  async getScrapingSessions(): Promise<ScrapingSession[]> {
    const response = await fetch(`${API_BASE_URL}/scraping-sessions/`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des sessions de scraping');
    }

    const data = await response.json();
    return data.results || data || [];
  }
}

export const scrapedProjectService = new ScrapedProjectService();