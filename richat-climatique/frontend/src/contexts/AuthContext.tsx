// =============================================================================
// AUTHCONTEXT.TSX - VERSION MINIMALE SANS BOUCLE
// =============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface User {
  last_login: string | number | Date;
  date_joined: string | number | Date;
  initials: string;
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  level: string;
  department: string;
  phone?: string;
  company_name?: string;
  date_embauche?: string;
  actif: boolean;
  role: 'admin' | 'client';
  role_display: string;
  is_admin: boolean;
  is_client: boolean;
  email_verified?: boolean;
  profile_picture?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  redirect_url?: string;
  message?: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  phone?: string;
  company_name: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<LoginResponse>;
  register: (data: RegisterData) => Promise<LoginResponse>;
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
  const [backendConnected, setBackendConnected] = useState(true); // Assumé connecté par défaut

  // 🎯 FONCTION DE REDIRECTION SELON LE RÔLE
  const getRedirectUrl = (user: User): string => {
    if (user.is_admin || user.role === 'admin' || user.level === 'N4') {
      return '/';
    }
    return '/client-dashboard';
  };

  // 🔄 REDIRECTION SIMPLE
  const performRedirect = (url: string, delay: number = 1000) => {
    console.log(`🚀 Redirection vers ${url}`);
    setTimeout(() => {
      window.location.href = url;
    }, delay);
  };

  // 🔑 INITIALISATION SIMPLE (UNE SEULE FOIS AU MONTAGE)
  useEffect(() => {
    const initAuth = () => {
      console.log('🔑 Initialisation auth...');
      const token = localStorage.getItem('authToken');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          console.log('✅ Utilisateur trouvé en localStorage:', parsedUser.full_name);
          
          // Adapter l'utilisateur
          const adaptedUser = {
            ...parsedUser,
            role: parsedUser.role || (parsedUser.level === 'N4' ? 'admin' : 'client'),
            role_display: parsedUser.role_display || (parsedUser.level === 'N4' ? 'Administrateur' : 'Client'),
            is_admin: parsedUser.is_admin !== undefined ? parsedUser.is_admin : parsedUser.level === 'N4',
            is_client: parsedUser.is_client !== undefined ? parsedUser.is_client : parsedUser.level !== 'N4',
          };
          
          setUser(adaptedUser);
          
          // Redirection si sur page login
          const currentPath = window.location.pathname;
          if (currentPath === '/login') {
            const redirectUrl = getRedirectUrl(adaptedUser);
            performRedirect(redirectUrl, 500);
          }
          
        } catch (error) {
          console.error('❌ Erreur parsing user:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        }
      } else {
        console.log('ℹ️ Aucun utilisateur en localStorage');
      }
      
      setLoading(false);
    };

    initAuth();
  }, []); // EXÉCUTION UNE SEULE FOIS

  const login = async (username: string, password: string): Promise<LoginResponse> => {
    try {
      console.log('🔐 Tentative de connexion:', username);
      
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Identifiants incorrects');
      }

      const data = await response.json();
      console.log('✅ Connexion réussie:', data.user?.full_name);

      // Adapter l'utilisateur
      const adaptedUser = {
        ...data.user,
        role: data.user.role || (data.user.level === 'N4' ? 'admin' : 'client'),
        role_display: data.user.role_display || (data.user.level === 'N4' ? 'Administrateur' : 'Client'),
        is_admin: data.user.is_admin !== undefined ? data.user.is_admin : data.user.level === 'N4',
        is_client: data.user.is_client !== undefined ? data.user.is_client : data.user.level !== 'N4',
      };

      const redirect_url = getRedirectUrl(adaptedUser);

      const result: LoginResponse = {
        token: data.token,
        user: adaptedUser,
        redirect_url: redirect_url,
        message: data.message || `Bienvenue ${adaptedUser.full_name}!`
      };

      // Sauvegarder
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      setUser(result.user);
      setBackendConnected(true);
      
      toast.success(result.message);
      
      // Redirection
      console.log(`🎯 Redirection: ${redirect_url}`);
      performRedirect(redirect_url, 1500);
      
      return result;
      
    } catch (error: any) {
      console.error('❌ Erreur connexion:', error);
      setBackendConnected(false);
      throw error;
    }
  };

  const register = async (data: RegisterData): Promise<LoginResponse> => {
    try {
      console.log('🔐 Inscription:', data.username);
      
      // Validations
      if (!data.company_name?.trim()) {
        throw new Error('Le nom de l\'entreprise est obligatoire');
      }
      if (data.password !== data.password_confirm) {
        throw new Error('Les mots de passe ne correspondent pas');
      }
      if (data.password.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères');
      }
      
      const response = await fetch(`${API_BASE_URL}/auth/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = 'Erreur lors de l\'inscription';
        
        if (errorData.details) {
          const errors = Object.entries(errorData.details)
            .map(([field, messages]: [string, any]) => 
              `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`
            ).join('\n');
          errorMessage = errors;
        } else {
          errorMessage = errorData.error || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Inscription réussie:', result.user.full_name);

      // Toujours client pour inscription
      const adaptedUser = {
        ...result.user,
        role: 'client' as const,
        role_display: 'Client',
        is_admin: false,
        is_client: true,
      };

      const finalResult: LoginResponse = {
        token: result.token,
        user: adaptedUser,
        redirect_url: '/client-dashboard',
        message: result.message || `Bienvenue ${adaptedUser.full_name}!`
      };

      // Sauvegarder
      localStorage.setItem('authToken', finalResult.token);
      localStorage.setItem('user', JSON.stringify(finalResult.user));
      setUser(finalResult.user);
      setBackendConnected(true);
      
      toast.success(finalResult.message);
      
      // Redirection client
      console.log('🎯 Redirection: /client-dashboard');
      performRedirect('/client-dashboard', 1500);
      
      return finalResult;
      
    } catch (error: any) {
      console.error('❌ Erreur inscription:', error);
      setBackendConnected(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        // Tentative de logout côté serveur (sans bloquer si ça échoue)
        fetch(`${API_BASE_URL}/auth/logout/`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(() => {}); // Ignorer les erreurs
      }
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    } finally {
      console.log('👋 Déconnexion');
      
      // Nettoyage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setUser(null);
      toast.info('Vous avez été déconnecté');
      
      // Redirection login
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    }
  };

  // MISE À JOUR de la fonction updateProfile dans AuthContext.tsx

const updateProfile = async (profileData: Partial<User>) => {
  try {
    const token = localStorage.getItem('authToken');
    
    // Filtrer seulement les champs autorisés par le backend
    const allowedFields = {
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      email: profileData.email,
      phone: profileData.phone,
      company_name: profileData.company_name
    };

    // Supprimer les champs undefined
    const cleanedData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );

    console.log('🔄 Mise à jour profil avec:', cleanedData);

    const response = await fetch(`${API_BASE_URL}/auth/profile/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanedData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Erreur backend:', errorData);
      
      // Messages d'erreur spécifiques
      if (errorData.details) {
        const errorMessages = Object.entries(errorData.details)
          .map(([field, messages]: [string, any]) => 
            `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`
          ).join('\n');
        throw new Error(errorMessages);
      }
      
      throw new Error(errorData.error || 'Erreur mise à jour profil');
    }

    const updatedData = await response.json();
    
    // Mettre à jour l'utilisateur avec les nouvelles données
    const updatedUser = {
      ...user,
      ...updatedData.user || updatedData,
      full_name: `${(updatedData.user || updatedData).first_name} ${(updatedData.user || updatedData).last_name}`
    };

    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    console.log('✅ Profil mis à jour:', updatedUser.full_name);
    
  } catch (error: any) {
    console.error('❌ Erreur updateProfile:', error);
    throw error;
  }
};

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      updateProfile,
      isAuthenticated: !!user,
      loading,
      backendConnected, // Sera mis à jour lors des appels API
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

export const usePermissions = () => {
  const { user } = useAuth();
  
  const isAdmin = user?.is_admin || user?.level === 'N4' || false;
  const isClient = user?.is_client || user?.role === 'client' || false;
  const isSeniorConsultant = user?.level === 'N3' || user?.level === 'N4' || false;
  const canManageProjects = isAdmin || isSeniorConsultant;
  const canViewReports = true;
  const canManageUsers = isAdmin;
  
  return {
    isAdmin,
    isClient,
    isSeniorConsultant,
    canManageProjects,
    canViewReports,
    canManageUsers,
  };
};