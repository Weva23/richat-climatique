// =============================================================================
// SERVICE POUR LES NOTIFICATIONS AMÉLIORÉ AVEC ALERTES PROJETS
// =============================================================================
import { apiClient } from './api';

export interface ProjectAlert {
  time_until_expiry: ReactNode;
  id: number;
  scraped_project: number;
  title: string;
  source: 'GEF' | 'GCF' | 'OTHER' | 'CLIMATE_FUND';
  source_display: string;
  source_url: string;
  description: string;
  organization: string;
  project_type: string;
  total_funding: string;
  funding_amount: number | null;
  country: string;
  data_completeness_score: number;
  alert_created_at: string;
  is_new_this_week: boolean;
  is_featured: boolean;
  priority_level: 'low' | 'medium' | 'high' | 'urgent';
  priority_level_display: string;
  status: 'active' | 'read' | 'archived' | 'dismissed';
  email_sent: boolean;
  email_sent_at: string | null;
  time_since_alert: string;
  alert_icon: string;
  priority_color: string;
}

export interface Notification {
  id: number;
  type: 'document' | 'project' | 'deadline' | 'assignment' | 'approval' | 'warning' | 'info' | 'success' | 'scraping' | 'request' | 'request_approved' | 'request_rejected';
  title: string;
  message: string;
  project_name?: string;
  read: boolean;
  created_at: string;
  time_ago: string;
  project_request_id?: number;
  project_alert_id?: number; // NOUVEAU
  project_alert?: ProjectAlert; // NOUVEAU
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

export interface AlertsStats {
  total_alerts: number;
  active_alerts: number;
  high_priority_alerts: number;
  new_this_week: number;
  by_source: {
    GEF: number;
    GCF: number;
    CLIMATE_FUND: number;
    OTHER: number;
  };
  by_priority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface UnreadCountResponse {
  unread_count: number;
  alerts_count: number; // NOUVEAU
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

  async getUnreadCount(): Promise<{ notifications: number; alerts: number }> {
    try {
      const response = await apiClient.get<UnreadCountResponse>('/notifications/unread_count/');
      return {
        notifications: response.unread_count,
        alerts: response.alerts_count || 0
      };
    } catch (error) {
      console.error('Erreur lors du chargement du nombre de notifications non lues:', error);
      return { notifications: 0, alerts: 0 };
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

  // ========== ALERTES PROJETS ==========

  async getProjectAlerts(params?: {
    status?: 'active' | 'read' | 'archived' | 'dismissed' | 'all';
    priority?: 'urgent' | 'high' | 'medium' | 'low';
    source?: 'GEF' | 'GCF' | 'CLIMATE_FUND' | 'OTHER';
    is_featured?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{
    results: ProjectAlert[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.status && params.status !== 'all') queryParams.append('status', params.status);
      if (params?.priority) queryParams.append('priority_level', params.priority);
      if (params?.source) queryParams.append('source', params.source);
      if (params?.is_featured !== undefined) queryParams.append('is_featured', params.is_featured.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

      const url = `/project-alerts/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await apiClient.get(url);
      
      return response;
    } catch (error) {
      console.error('Erreur lors du chargement des alertes:', error);
      throw error;
    }
  }

  async getActiveProjectAlerts(): Promise<ProjectAlert[]> {
    try {
      const response = await this.getProjectAlerts({ 
        status: 'active', 
        page_size: 50 
      });
      return response.results;
    } catch (error) {
      console.error('Erreur lors du chargement des alertes actives:', error);
      return [];
    }
  }

  async getFeaturedProjectAlerts(): Promise<ProjectAlert[]> {
    try {
      const response = await this.getProjectAlerts({ 
        status: 'active',
        is_featured: true,
        page_size: 10 
      });
      return response.results;
    } catch (error) {
      console.error('Erreur lors du chargement des alertes mises en avant:', error);
      return [];
    }
  }

  async getProjectAlertsStats(): Promise<AlertsStats> {
    try {
      const response = await apiClient.get<AlertsStats>('/project-alerts/stats/');
      return response;
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques d\'alertes:', error);
      // Données par défaut en cas d'erreur
      return {
        total_alerts: 0,
        active_alerts: 0,
        high_priority_alerts: 0,
        new_this_week: 0,
        by_source: {
          GEF: 0,
          GCF: 0,
          CLIMATE_FUND: 0,
          OTHER: 0
        },
        by_priority: {
          urgent: 0,
          high: 0,
          medium: 0,
          low: 0
        }
      };
    }
  }

  async markAlertAsRead(id: number): Promise<void> {
    try {
      await apiClient.post(`/project-alerts/${id}/mark_read/`);
    } catch (error) {
      console.error('Erreur lors du marquage de l\'alerte comme lue:', error);
      throw error;
    }
  }

  async dismissAlert(id: number): Promise<void> {
    try {
      await apiClient.post(`/project-alerts/${id}/dismiss/`);
    } catch (error) {
      console.error('Erreur lors de l\'ignorance de l\'alerte:', error);
      throw error;
    }
  }

  async archiveAlert(id: number): Promise<void> {
    try {
      await apiClient.post(`/project-alerts/${id}/archive/`);
    } catch (error) {
      console.error('Erreur lors de l\'archivage de l\'alerte:', error);
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

  async getProjectRequestStats(): Promise<{
    total_requests: number;
    pending_requests: number;
    approved_requests: number;
    rejected_requests: number;
    high_priority_pending: number;
    avg_processing_time: string;
  }> {
    try {
      const response = await apiClient.get('/project-requests/stats/');
      return response;
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
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
      has_alert?: boolean; // NOUVEAU
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
    alerts: {
      active_alerts: number;
      high_priority_alerts: number;
      new_this_week: number;
    };
    clients: {
      active_clients: number;
      total_requests_this_month: number;
    };
  }> {
    try {
      // Charger les stats en parallèle
      const [notificationStats, projectRequestStats, scrapedProjectsStats, alertsStats] = await Promise.all([
        this.getUnreadCount(),
        this.getProjectRequestStats(),
        apiClient.get('/scraped-projects/stats/'),
        this.getProjectAlertsStats()
      ]);

      return {
        notifications: {
          total_unread: notificationStats.notifications,
          pending_requests: projectRequestStats.pending_requests,
          high_priority_requests: projectRequestStats.high_priority_pending,
        },
        projects: {
          total_scraped: scrapedProjectsStats.total_scraped || 0,
          available_for_clients: scrapedProjectsStats.ready_projects || 0,
          total_funding: scrapedProjectsStats.total_funding || 0,
        },
        alerts: {
          active_alerts: alertsStats.active_alerts,
          high_priority_alerts: alertsStats.high_priority_alerts,
          new_this_week: alertsStats.new_this_week,
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
        alerts: {
          active_alerts: 0,
          high_priority_alerts: 0,
          new_this_week: 0,
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