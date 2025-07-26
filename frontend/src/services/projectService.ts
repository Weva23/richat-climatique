import api from './api';

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
  documents: Document[];
  missing_documents: string[];
  submitted_documents: Document[];
  progress_percentage: number;
}

export interface Document {
  id: number;
  name: string;
  file: string;
  status: string;
  date_soumission: string;
  date_expiration?: string;
  document_type: number;
  document_type_name: string;
  notes?: string;
}

export interface ProjectFilters {
  status?: string;
  type_project?: string;
  fund?: string;
  consultant?: number;
  search?: string;
}

class ProjectService {
  async getProjects(filters?: ProjectFilters): Promise<Project[]> {
    const response = await api.get('/projects/', { params: filters });
    return response.data.results || response.data;
  }

  async getProject(id: number): Promise<Project> {
    const response = await api.get(`/projects/${id}/`);
    return response.data;
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    const response = await api.post('/projects/', projectData);
    return response.data;
  }

  async updateProject(id: number, projectData: Partial<Project>): Promise<Project> {
    const response = await api.put(`/projects/${id}/`, projectData);
    return response.data;
  }

  async deleteProject(id: number): Promise<void> {
    await api.delete(`/projects/${id}/`);
  }

  async getDashboardStats(): Promise<any> {
    const response = await api.get('/projects/dashboard_stats/');
    return response.data;
  }

  async getProjectsByStatus(): Promise<any> {
    const response = await api.get('/projects/by_status/');
    return response.data;
  }

  async assignConsultant(projectId: number, consultantId: number): Promise<void> {
    await api.post(`/projects/${projectId}/assign_consultant/`, {
      consultant_id: consultantId
    });
  }
}

export default new ProjectService();