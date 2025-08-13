// =============================================================================
// SERVICE COMPLET POUR LES PROJETS DJANGO
// =============================================================================

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
  documents: Document[];
  missing_documents: Array<{ id: number; name: string }>;
  submitted_documents: Document[];
  progress_percentage: number;
  is_from_scraping: boolean;
  original_source?: string;
  source_reference?: string;
  has_scraped_source: boolean;
}

export interface Document {
  id: number;
  name: string;
  file: string;
  status: string;
  date_soumission: string;
  date_expiration?: string;
  notes: string;
  document_type: number;
  document_type_name: string;
  project: number;
  project_name: string;
  uploaded_by_name: string;
}

export interface DashboardStats {
  total_projects: number;
  ready_projects: number;
  pending_projects: number;
  avg_score: number;
  total_amount: number;
  // Nouvelles statistiques pour les projets scrapés
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

const API_BASE_URL = 'http://localhost:8000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Authorization': `Token ${token}`,
    'Content-Type': 'application/json',
  };
};

class ProjectService {
  async getProjects(filters: ProjectFilters = {}): Promise<Project[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const url = `${API_BASE_URL}/projects/?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des projets');
    }

    const data = await response.json();
    return data.results || data || [];
  }

  async getProjectById(id: number): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects/${id}/`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement du projet');
    }

    return response.json();
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erreur lors de la création du projet');
    }

    return response.json();
  }

  async updateProject(id: number, projectData: Partial<Project>): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects/${id}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erreur lors de la mise à jour du projet');
    }

    return response.json();
  }

  async deleteProject(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/projects/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la suppression du projet');
    }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await fetch(`${API_BASE_URL}/projects/dashboard_stats/`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des statistiques');
    }

    return response.json();
  }

  async getProjectsByStatus(): Promise<Record<string, Project[]>> {
    const response = await fetch(`${API_BASE_URL}/projects/by_status/`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des projets par statut');
    }

    return response.json();
  }

  async assignConsultant(projectId: number, consultantId: number): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/assign_consultant/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ consultant_id: consultantId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de l\'assignation du consultant');
    }

    return response.json();
  }

  // Méthodes pour les documents
  async getDocuments(projectId?: number): Promise<Document[]> {
    const params = projectId ? `?project=${projectId}` : '';
    const response = await fetch(`${API_BASE_URL}/documents/${params}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des documents');
    }

    const data = await response.json();
    return data.results || data || [];
  }

  async uploadDocument(formData: FormData): Promise<Document> {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/documents/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        // Ne pas définir Content-Type pour FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erreur lors de l\'upload du document');
    }

    return response.json();
  }

  async getMissingDocumentsByProject(): Promise<Array<{
    project_id: number;
    project_name: string;
    missing_documents: string[];
  }>> {
    const response = await fetch(`${API_BASE_URL}/documents/missing_by_project/`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des documents manquants');
    }

    return response.json();
  }

  // Méthodes pour les consultants
  async getConsultants(): Promise<Array<{
    id: number;
    username: string;
    full_name: string;
    initials: string;
    level: string;
    department: string;
    active_projects_count: number;
  }>> {
    const response = await fetch(`${API_BASE_URL}/consultants/`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des consultants');
    }

    const data = await response.json();
    return data.results || data || [];
  }
}

export const projectService = new ProjectService();