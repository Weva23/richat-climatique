// =============================================================================
// CONTEXTE D'AUTHENTIFICATION CORRIGÉ POUR LES ERREURS 400/403
// =============================================================================
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  level: string;
  department: string;
  phone?: string;
  date_embauche?: string;
  actif: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  backendConnected: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = 'http://localhost:8000/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);

  // Vérifier la connexion au backend au démarrage
  useEffect(() => {
    checkBackendConnection();
  }, []);

  // Initialiser l'authentification au démarrage
  useEffect(() => {
    if (backendConnected) {
      initAuth();
    } else {
      setLoading(false);
    }
  }, [backendConnected]);

  const checkBackendConnection = async () => {
    try {
      console.log('🔍 Vérification connexion backend...');
      
      const response = await fetch(`${API_BASE_URL}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        console.log('✅ Backend accessible');
        setBackendConnected(true);
      } else {
        console.warn(`⚠️ Backend répond mais erreur: ${response.status}`);
        setBackendConnected(false);
        toast.error(`Backend inaccessible (${response.status})`);
      }
    } catch (error) {
      console.error('❌ Impossible de joindre le backend:', error);
      setBackendConnected(false);
      toast.error('Backend non accessible. Vérifiez que Django est démarré sur le port 8000.');
    }
  };

  const initAuth = async () => {
    const token = localStorage.getItem('authToken');
    
    if (token) {
      try {
        console.log('🔑 Vérification token existant...');
        
        const response = await fetch(`${API_BASE_URL}/auth/profile/`, {
          method: 'GET',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const profile = await response.json();
          console.log('✅ Token valide, utilisateur connecté:', profile.full_name);
          setUser(profile);
        } else {
          console.warn('⚠️ Token invalide, suppression');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('❌ Erreur vérification token:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  };

  const login = async (username: string, password: string) => {
    if (!backendConnected) {
      throw new Error('Backend non accessible. Vérifiez que le serveur Django est démarré.');
    }

    try {
      console.log('🔐 Tentative de connexion pour:', username);
      
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password
        }),
      });

      console.log('📡 Réponse serveur:', response.status);

      if (!response.ok) {
        let errorMessage = 'Erreur de connexion';
        
        try {
          const errorData = await response.json();
          console.error('❌ Erreur détaillée:', errorData);
          errorMessage = errorData.error || errorData.detail || errorMessage;
        } catch {
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const data: LoginResponse = await response.json();
      console.log('✅ Connexion réussie pour:', data.user.full_name);

      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      
      toast.success(`Bienvenue ${data.user.full_name || data.user.username} !`);
      
    } catch (error: any) {
      console.error('❌ Erreur de connexion:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('👋 Déconnexion utilisateur');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    toast.info('Vous avez été déconnecté');
  };

  const updateProfile = async (profileData: Partial<User>) => {
    if (!backendConnected) {
      throw new Error('Backend non accessible');
    }

    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/auth/profile/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour du profil');
      }

      const updatedProfile = await response.json();
      setUser(updatedProfile);
      localStorage.setItem('user', JSON.stringify(updatedProfile));
      toast.success('Profil mis à jour avec succès');
      
    } catch (error: any) {
      console.error('❌ Erreur mise à jour profil:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      updateProfile,
      isAuthenticated: !!user,
      loading,
      backendConnected,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Hook pour vérifier les permissions
export const usePermissions = () => {
  const { user } = useAuth();
  
  const isAdmin = user?.level === 'N4' || false;
  const isSeniorConsultant = user?.level === 'N3' || user?.level === 'N4' || false;
  const canManageProjects = isSeniorConsultant;
  const canViewReports = true; // Tous les utilisateurs connectés
  const canManageUsers = isAdmin;
  
  return {
    isAdmin,
    isSeniorConsultant,
    canManageProjects,
    canViewReports,
    canManageUsers,
  };
};