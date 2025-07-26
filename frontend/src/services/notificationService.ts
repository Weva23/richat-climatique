import api from './api';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  project_name?: string;
  read: boolean;
  created_at: string;
  time_ago: string;
}

class NotificationService {
  async getNotifications(): Promise<Notification[]> {
    const response = await api.get('/notifications/');
    return response.data.results || response.data;
  }

  async markAsRead(id: number): Promise<void> {
    await api.post(`/notifications/${id}/mark_read/`);
  }

  async markAllAsRead(): Promise<void> {
    await api.post('/notifications/mark_all_read/');
  }

  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread_count/');
    return response.data.unread_count;
  }
}

export default new NotificationService();