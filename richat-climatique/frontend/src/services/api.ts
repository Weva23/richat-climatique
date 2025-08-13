// =============================================================================
// CLIENT API DE BASE POUR CONNECTER LE FRONTEND AU BACKEND DJANGO
// =============================================================================

const API_BASE_URL = 'http://localhost:8000/api';

interface ApiError {
  message: string;
  status: number;
  detail?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Token ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // Si on ne peut pas parser le JSON, garder le message par défaut
      }

      const error: ApiError = {
        message: errorMessage,
        status: response.status,
      };
      
      throw error;
    }

    // Gérer les réponses vides (204, etc.)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    try {
      return await response.json();
    } catch {
      return {} as T;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  // Méthode spéciale pour l'upload de fichiers
  async uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return this.handleResponse<T>(response);
  }

  // Méthode pour vérifier la connexion au backend
  async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${this.baseURL}/`, {
        method: 'GET',
      });
      
      if (response.ok) {
        return { status: 'ok', message: 'Backend accessible' };
      } else {
        return { status: 'error', message: `Backend inaccessible (${response.status})` };
      }
    } catch (error) {
      return { 
        status: 'error', 
        message: `Impossible de joindre le backend: ${error instanceof Error ? error.message : 'Erreur inconnue'}` 
      };
    }
  }
}

export const apiClient = new ApiClient();

// Types d'erreur exportés
export type { ApiError };

// Fonction utilitaire pour gérer les erreurs API
export const handleApiError = (error: any): string => {
  if (error && typeof error === 'object') {
    if ('message' in error) {
      return error.message;
    }
    if ('detail' in error) {
      return error.detail;
    }
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Une erreur inattendue s\'est produite';
};