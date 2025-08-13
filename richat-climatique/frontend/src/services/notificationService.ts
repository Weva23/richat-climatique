// =============================================================================
// SERVICE POUR LES NOTIFICATIONS
// =============================================================================
import { apiClient } from './api';

export interface Notification {
  id: number;
  type: 'document' | 'project' | 'deadline' | 'assignment' | 'approval' | 'warning' | 'info' | 'success' | 'scraping';
  title: string;
  message: string;
  project_name?: string;
  read: boolean;
  created_at: string;
  time_ago: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}

class NotificationService {
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
}

export const notificationService = new NotificationService();
export default notificationService;