// =============================================================================
// SERVICE API CORRIGÉ AVEC AUTHENTIFICATION AUTOMATIQUE
// =============================================================================

export interface ApiResponse<T = any> {
  results?: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
  [key: string]: any;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = 'http://127.0.0.1:8000/api') {
    this.baseURL = baseURL;
  }

  // Récupérer le token d'authentification
  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  // Headers par défaut avec authentification
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }

    return headers;
  }

  // Méthode générique pour les requêtes
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Gestion des erreurs d'authentification
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        throw new Error('Session expirée, veuillez vous reconnecter');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Erreur API ${endpoint}:`, error);
      throw error;
    }
  }

  // Méthodes HTTP
  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T = any>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Méthodes spéciales sans authentification (pour login/register)
  async postPublic<T = any>(endpoint: string, data: any): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }
}

export const apiClient = new ApiClient();
export default apiClient;

// =============================================================================
// SERVICE DE NOTIFICATIONS CORRIGÉ
// =============================================================================

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
}

export interface ProjectRequest {
  id: number;
  client: number;
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

export interface ScrapedProject {
  id: number;
  title: string;
  source: 'GEF' | 'GCF' | 'OTHER';
  source_display: string;
  source_url: string;
  description: string;
  organization: string;
  project_type: string;
  status: string;
  total_funding: string;
  funding_amount: number | null;
  currency: string;
  country: string;
  region: string;
  scraped_at: string;
  data_completeness_score: number;
  is_relevant_for_mauritania: boolean;
  can_create_project: boolean;
  linked_project: number | null;
}

class NotificationService {
  // ========== NOTIFICATIONS ==========
  async getNotifications(): Promise<Notification[]> {
    const response = await apiClient.get<{ results: Notification[] }>('/notifications/');
    return response.results || [];
  }

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ unread_count: number }>('/notifications/unread_count/');
    return response.unread_count;
  }

  async markAsRead(id: number): Promise<void> {
    await apiClient.post(`/notifications/${id}/mark_read/`);
  }

  async markAllAsRead(): Promise<void> {
    await apiClient.post('/notifications/mark_all_read/');
  }

  // ========== DEMANDES DE PROJETS ==========
  async getProjectRequests(status?: string): Promise<ProjectRequest[]> {
    const url = status && status !== 'all' 
      ? `/project-requests/?status=${status}`
      : '/project-requests/';
    
    const response = await apiClient.get<{ results: ProjectRequest[] }>(url);
    return response.results || [];
  }

  async approveProjectRequest(id: number, responseMessage: string = ''): Promise<ProjectRequest> {
    const response = await apiClient.post<{ request: ProjectRequest }>(`/project-requests/${id}/approve/`, {
      response_message: responseMessage
    });
    return response.request;
  }

  async rejectProjectRequest(id: number, responseMessage: string): Promise<ProjectRequest> {
    const response = await apiClient.post<{ request: ProjectRequest }>(`/project-requests/${id}/reject/`, {
      response_message: responseMessage
    });
    return response.request;
  }

  // ========== CLIENT SIDE ==========
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
    return await apiClient.post<ProjectRequest>('/project-requests/', data);
  }

  async getMyProjectRequests(clientId: number): Promise<ProjectRequest[]> {
    const response = await apiClient.get<{ results: ProjectRequest[] }>(`/project-requests/?client=${clientId}`);
    return response.results || [];
  }

  // ========== PROJETS SCRAPÉS ==========
  async getScrapedProjects(params?: {
    search?: string;
    source?: string;
    page?: number;
    page_size?: number;
  }): Promise<{
    results: ScrapedProject[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    const queryParams = new URLSearchParams();
    
    if (params?.search) queryParams.append('search', params.search);
    if (params?.source && params.source !== 'all') queryParams.append('source', params.source);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    const url = `/scraped-projects/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return await apiClient.get(url);
  }

  // ========== STATISTIQUES ==========
  async getProjectRequestStats(): Promise<{
    total_requests: number;
    pending_requests: number;
    approved_requests: number;
    rejected_requests: number;
    high_priority_pending: number;
    avg_processing_time: string;
  }> {
    try {
      return await apiClient.get('/project-requests/stats/');
    } catch (error) {
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
          active_clients: 0,
          total_requests_this_month: projectRequestStats.total_requests,
        }
      };
    } catch (error) {
      return {
        notifications: { total_unread: 0, pending_requests: 0, high_priority_requests: 0 },
        projects: { total_scraped: 0, available_for_clients: 0, total_funding: 0 },
        clients: { active_clients: 0, total_requests_this_month: 0 }
      };
    }
  }
}

export const notificationService = new NotificationService();
export { NotificationService };