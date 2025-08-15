// =============================================================================
// SERVICE POUR LES NOTIFICATIONS - ÉTENDU AVEC DEMANDES CLIENTS
// =============================================================================
import { apiClient } from './api';

export interface Notification {
  id: number;
  type: 'document' | 'project' | 'deadline' | 'assignment' | 'approval' | 'warning' | 'info' | 'success' | 'scraping' | 'request' | 'request_approved' | 'request_rejected';
  title: string;
  message: string;
  project_name?: string;
  read: boolean;
  created_at: string;
  time_ago: string;
  project_request_id?: number; // NOUVEAU
}

export interface ProjectRequest {
  id: number;
  client_name: string;
  client_company: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress';
  status_display: string;
  client_info: {
    name: string;
    company: string;
    email: string;
    phone: string;
  };
  admin_response: string;
  processed_by_name: string;
  processed_at: string;
  created_at: string;
  priority_score: number;
  projects_count: number;
  total_funding_requested: number;
  time_since_request: string;
  projects_details: Array<{
    id: number;
    title: string;
    source: string;
    funding_amount: number;
    data_completeness_score: number;
  }>;
}

export interface ProjectRequestStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  high_priority_pending: number;
  avg_processing_time: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}

class NotificationService {
  // ========== NOTIFICATIONS CLASSIQUES ==========
  
  async getNotifications(): Promise<Notification[]> {
    try {
      const response = await apiClient.get<{ results: Notification[] }>('/notifications/');
      return response.results || [];
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
      throw error;
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get<UnreadCountResponse>('/notifications/unread_count/');
      return response.unread_count;
    } catch (error) {
      console.error('Erreur lors du chargement du nombre de notifications non lues:', error);
      return 0;
    }
  }

  async markAsRead(id: number): Promise<void> {
    try {
      await apiClient.post(`/notifications/${id}/mark_read/`);
    } catch (error) {
      console.error('Erreur lors du marquage de la notification comme lue:', error);
      throw error;
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.post('/notifications/mark_all_read/');
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications comme lues:', error);
      throw error;
    }
  }

  // ========== DEMANDES DE PROJETS CLIENTS ==========

  async getProjectRequests(status?: string): Promise<ProjectRequest[]> {
    try {
      const url = status && status !== 'all' 
        ? `/project-requests/?status=${status}`
        : '/project-requests/';
      
      const response = await apiClient.get<{ results: ProjectRequest[] }>(url);
      return response.results || [];
    } catch (error) {
      console.error('Erreur lors du chargement des demandes:', error);
      throw error;
    }
  }

  async getProjectRequestStats(): Promise<ProjectRequestStats> {
    try {
      const response = await apiClient.get<ProjectRequestStats>('/project-requests/stats/');
      return response;
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      // Données par défaut en cas d'erreur
      return {
        total_requests: 0,
        pending_requests: 0,
        approved_requests: 0,
        rejected_requests: 0,
        high_priority_pending: 0,
        avg_processing_time: "N/A"
      };
    }
  }

  async approveProjectRequest(id: number, responseMessage: string = ''): Promise<ProjectRequest> {
    try {
      const response = await apiClient.post<{ request: ProjectRequest }>(`/project-requests/${id}/approve/`, {
        response_message: responseMessage
      });
      return response.request;
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error);
      throw error;
    }
  }

  async rejectProjectRequest(id: number, responseMessage: string): Promise<ProjectRequest> {
    try {
      const response = await apiClient.post<{ request: ProjectRequest }>(`/project-requests/${id}/reject/`, {
        response_message: responseMessage
      });
      return response.request;
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
      throw error;
    }
  }

  // ========== CÔTÉ CLIENT - SOUMISSION DE DEMANDES ==========

  async submitProjectRequest(data: {
    client_id: number;
    project_ids: number[];
    message: string;
    client_info: {
      name: string;
      company: string;
      email: string;
      phone: string;
    };
  }): Promise<ProjectRequest> {
    try {
      const response = await apiClient.post<ProjectRequest>('/project-requests/', data);
      return response;
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      throw error;
    }
  }

  async getMyProjectRequests(clientId: number): Promise<ProjectRequest[]> {
    try {
      const response = await apiClient.get<{ results: ProjectRequest[] }>(`/project-requests/?client=${clientId}`);
      return response.results || [];
    } catch (error) {
      console.error('Erreur lors du chargement de mes demandes:', error);
      throw error;
    }
  }

  // ========== GESTION DES PROJETS SCRAPÉS ==========

  async getScrapedProjects(params?: {
    search?: string;
    source?: string;
    page?: number;
    page_size?: number;
  }): Promise<{
    results: Array<{
      id: number;
      title: string;
      source: string;
      source_display: string;
      source_url: string;
      description: string;
      organization: string;
      funding_amount: number | null;
      total_funding: string;
      data_completeness_score: number;
      is_relevant_for_mauritania: boolean;
      can_create_project: boolean;
      linked_project: number | null;
      scraped_at: string;
    }>;
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.search) queryParams.append('search', params.search);
      if (params?.source && params.source !== 'all') queryParams.append('source', params.source);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

      const url = `/scraped-projects/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await apiClient.get(url);
      
      return response;
    } catch (error) {
      console.error('Erreur lors du chargement des projets scrapés:', error);
      throw error;
    }
  }

  // ========== STATISTIQUES GLOBALES ==========

  async getDashboardStats(): Promise<{
    notifications: {
      total_unread: number;
      pending_requests: number;
      high_priority_requests: number;
    };
    projects: {
      total_scraped: number;
      available_for_clients: number;
      total_funding: number;
    };
    clients: {
      active_clients: number;
      total_requests_this_month: number;
    };
  }> {
    try {
      // Charger les stats en parallèle
      const [notificationStats, projectRequestStats, scrapedProjectsStats] = await Promise.all([
        this.getUnreadCount(),
        this.getProjectRequestStats(),
        apiClient.get('/scraped-projects/stats/')
      ]);

      return {
        notifications: {
          total_unread: notificationStats,
          pending_requests: projectRequestStats.pending_requests,
          high_priority_requests: projectRequestStats.high_priority_pending,
        },
        projects: {
          total_scraped: scrapedProjectsStats.total_scraped || 0,
          available_for_clients: scrapedProjectsStats.ready_projects || 0,
          total_funding: scrapedProjectsStats.total_funding || 0,
        },
        clients: {
          active_clients: 0, // À implémenter
          total_requests_this_month: projectRequestStats.total_requests,
        }
      };
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques globales:', error);
      // Retourner des valeurs par défaut
      return {
        notifications: {
          total_unread: 0,
          pending_requests: 0,
          high_priority_requests: 0,
        },
        projects: {
          total_scraped: 0,
          available_for_clients: 0,
          total_funding: 0,
        },
        clients: {
          active_clients: 0,
          total_requests_this_month: 0,
        }
      };
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;