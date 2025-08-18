import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Search, Globe, Database, CheckCircle, Clock, Euro, TrendingUp,
  FileText, Star, ExternalLink, Calendar, AlertCircle, Send,
  Building, User, LogOut, Bell, Settings, Filter, RefreshCw,
  ChevronRight, MapPin, Banknote, Award, Users, Eye, Target,
  BarChart3, Info, Zap, CheckCheck, ThumbsUp, ThumbsDown,
  MessageSquare, Mail, Phone, Package
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

// Interfaces TypeScript
interface ScrapedProject {
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

interface ProjectRequest {
  id: number;
  client: number;
  projects: number[];
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface User {
  id: number;
  full_name: string;
  email: string;
  company_name?: string;
  phone?: string;
}

interface NotificationData {
  id: number;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  request_id?: number;
  admin_response?: string;
  processed_by?: string;
  processed_at?: string;
  status_decision?: 'approved' | 'rejected';
  projects_summary?: {
    count: number;
    total_funding: number;
    titles: string[];
  };
}

// Service API
const apiClient = {
  get: async (url: string) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`http://127.0.0.1:8000/api${url}`, {
      headers: {
        'Authorization': token ? `Token ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Erreur réseau');
    return response.json();
  },
  
  post: async (url: string, data: any) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`http://127.0.0.1:8000/api${url}`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Token ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Erreur réseau');
    return response.json();
  },
};

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<ScrapedProject[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<ProjectRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationData | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  
  // États simplifiés pour la pagination
  const [totalCount, setTotalCount] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);

  // Fonction pour créer une notification à partir d'une demande
  const createNotificationFromRequest = useCallback((request: ProjectRequest): NotificationData => {
    const projectTitles = request.projects.map(id => {
      const project = projects.find(p => p.id === id);
      return project?.title || `Projet #${id}`;
    });

    const totalFunding = request.projects.reduce((acc, id) => {
      const project = projects.find(p => p.id === id);
      return acc + (project?.funding_amount || 0);
    }, 0);

    return {
      id: request.id,
      title: "Détails de votre demande",
      message: request.message,
      created_at: request.created_at,
      is_read: false,
      type: 'info',
      request_id: request.id,
      projects_summary: {
        count: request.projects.length,
        total_funding: totalFunding,
        titles: projectTitles
      }
    };
  }, [projects]);

  // Calcul sécurisé des pays disponibles
  const availableCountries = useMemo(() => {
    if (!projects || projects.length === 0) return [];
    
    return Array.from(new Set(
      projects.map(p => p.country).filter(Boolean)
    )).sort();
  }, [projects]);

  // Statistiques protégées contre les valeurs nulles
  const stats = useMemo(() => {
    const availableProjects = projects.filter(p => p?.can_create_project && !p?.linked_project);
    const pendingRequests = myRequests.filter(r => r?.status === 'pending');
    const approvedRequests = myRequests.filter(r => r?.status === 'approved');
    
    return [
      {
        title: "Projets Disponibles",
        value: availableProjects.length,
        icon: FileText,
        color: "text-blue-600",
        bgColor: "bg-blue-50"
      },
      {
        title: "Mes Sélections",
        value: selectedProjects.length,
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-50"
      },
      {
        title: "Demandes Envoyées",
        value: pendingRequests.length,
        icon: Clock,
        color: "text-orange-600",
        bgColor: "bg-orange-50"
      },
      {
        title: "Projets Approuvés",
        value: approvedRequests.length,
        icon: Award,
        color: "text-purple-600",
        bgColor: "bg-purple-50"
      }
    ];
  }, [projects, myRequests, selectedProjects]);

  // Unread notifications count
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n?.is_read).length;
  }, [notifications]);

  // Fonction de chargement des projets SIMPLIFIÉE
  const loadScrapedProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadingError(null);
      
      const data = await apiClient.get('/scraped-projects/?page_size=100');
      setProjects(data.results || []);
      setTotalCount(data.count || 0);
      setInitialLoad(false);
      
    } catch (error: any) {
      console.error('Erreur:', error);
      setLoadingError('Erreur lors du chargement des projets');
    } finally {
      setIsLoading(false);
    }
  }, []); // Pas de dépendances pour éviter les rechargements

  // Fonction de chargement des demandes
  const loadMyRequests = useCallback(async () => {
    try {
      if (!user?.id) return;
      const data = await apiClient.get(`/project-requests/?client=${user.id}`);
      setMyRequests(data.results || []);
    } catch (error: any) {
      console.error('Erreur chargement demandes:', error);
      toast.error('Erreur lors du chargement de vos demandes');
    }
  }, [user?.id]);

  // Fonction de chargement des notifications
  const loadNotifications = useCallback(async () => {
    try {
      const data = await apiClient.get('/notifications/');
      setNotifications(data.results || []);
    } catch (error: any) {
      console.error('Erreur chargement notifications:', error);
      toast.error('Erreur lors du chargement des notifications');
    }
  }, []);

  // Effect initial - UNE SEULE FOIS
  useEffect(() => {
    let mounted = true;
    
    const loadInitialData = async () => {
      if (!mounted) return;
      
      try {
        setIsLoading(true);
        setLoadingError(null);
        
        await Promise.all([
          loadScrapedProjects(),
          loadMyRequests(),
          loadNotifications()
        ]);
      } catch (error: any) {
        console.error('Erreur chargement global:', error);
        if (mounted) {
          setLoadingError('Erreur lors du chargement des données');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialData();
    
    // Cleanup function
    return () => {
      mounted = false;
    };
  }, []); // Aucune dépendance !

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      await apiClient.post(`/notifications/${notificationId}/mark-read/`, {});
      setNotifications(prev => 
        prev.map(n => n?.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error: any) {
      console.error('Erreur marquage notification:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      setIsLoadingNotifications(true);
      await apiClient.post('/notifications/mark-all-read/', {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch (error: any) {
      console.error('Erreur marquage notifications:', error);
      toast.error('Erreur lors du marquage des notifications');
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const getNotificationIcon = (notification: NotificationData) => {
    if (!notification) return <Bell className="w-5 h-5 text-blue-600" />;
    
    if (notification.status_decision === 'approved') return <ThumbsUp className="w-5 h-5 text-green-600" />;
    if (notification.status_decision === 'rejected') return <ThumbsDown className="w-5 h-5 text-red-600" />;
    if (notification.type === 'success') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (notification.type === 'error') return <AlertCircle className="w-5 h-5 text-red-600" />;
    if (notification.type === 'warning') return <AlertCircle className="w-5 h-5 text-orange-600" />;
    return <Bell className="w-5 h-5 text-blue-600" />;
  };

  const getNotificationBgColor = (notification: NotificationData) => {
    if (!notification) return 'bg-gray-50';
    
    if (notification.status_decision === 'approved') return 'bg-green-50 border-green-200';
    if (notification.status_decision === 'rejected') return 'bg-red-50 border-red-200';
    if (notification.type === 'success') return 'bg-green-50 border-green-200';
    if (notification.type === 'error') return 'bg-red-50 border-red-200';
    if (notification.type === 'warning') return 'bg-orange-50 border-orange-200';
    return notification.is_read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200';
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Calcul des projets filtrés avec vérifications
  const filteredProjects = useMemo(() => {
    if (!projects || projects.length === 0) return [];
    
    return projects.filter(project => {
      if (!project || project.linked_project) return false;
      
      // Filtre de recherche
      const matchesSearch = project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtre par source
      const matchesSource = sourceFilter === "all" || project.source === sourceFilter;
      
      // Filtre par pays
      const matchesCountry = countryFilter === "all" || project.country === countryFilter;
      
      // Filtre par score
      const matchesScore = scoreFilter === "all" || 
        (scoreFilter === "high" && project.data_completeness_score >= 80) ||
        (scoreFilter === "medium" && project.data_completeness_score >= 60 && project.data_completeness_score < 80) ||
        (scoreFilter === "low" && project.data_completeness_score < 60);
      
      // Filtre par statut
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "available" && project.can_create_project) ||
        (statusFilter === "mauritania" && project.is_relevant_for_mauritania);
      
      return matchesSearch && matchesSource && matchesCountry && matchesScore && matchesStatus;
    });
  }, [projects, searchTerm, sourceFilter, countryFilter, scoreFilter, statusFilter]);

  // Available project IDs for selection
  const availableProjectIds = useMemo(() => {
    return filteredProjects
      .filter(p => p?.can_create_project && !p?.linked_project)
      .map(p => p.id);
  }, [filteredProjects]);

  // Project sources summary
  const sourceSummary = useMemo(() => {
    return filteredProjects.reduce((acc: Record<string, number>, p) => {
      if (!p || !p.source) return acc;
      
      acc[p.source] = (acc[p.source] || 0) + 1;
      return acc;
    }, {});
  }, [filteredProjects]);

  // Total funding calculation
  const totalFunding = useMemo(() => {
    return filteredProjects.reduce((acc, project) => {
      return acc + (project?.funding_amount || 0);
    }, 0);
  }, [filteredProjects]);

  const handleProjectToggle = (projectId: number) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProjects.length === availableProjectIds.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects([...availableProjectIds]);
    }
  };

  const handleSubmitRequest = async () => {
    if (selectedProjects.length === 0) {
      toast.error('Veuillez sélectionner au moins un projet');
      return;
    }

    if (!requestMessage.trim()) {
      toast.error('Veuillez ajouter un message expliquant votre demande');
      return;
    }

    if (!user?.id) {
      toast.error('Erreur d\'authentification');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const requestData = {
        client_id: user.id,
        project_ids: selectedProjects,
        message: requestMessage,
        client_info: {
          name: user.full_name,
          company: user.company_name || '',
          email: user.email,
          phone: user.phone || ''
        }
      };

      await apiClient.post('/project-requests/', requestData);
      
      toast.success('Demande envoyée avec succès ! L\'administrateur va examiner votre sélection.');
      setSelectedProjects([]);
      setRequestMessage("");
      setConfirmDialogOpen(false);
      loadMyRequests();
    } catch (error: any) {
      console.error('Erreur:', error);
      const errorMessage = error.message || 'Erreur lors de l\'envoi de la demande';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'GEF':
        return "bg-green-100 text-green-800 border-green-200";
      case 'GCF':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'OTHER':
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSourceName = (source: string) => {
    return source === 'OTHER' ? 'OECD' : source;
  };

  const formatAmount = (amount: string | number | null) => {
    if (!amount) return "Non spécifié";
    if (typeof amount === 'number') {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }
    return amount;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Date inconnue";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "À l'instant";
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Affichage du loader initial
  if (initialLoad) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin w-12 h-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  // Affichage de l'erreur
  if (loadingError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Erreur de chargement</h3>
            <p className="text-gray-600 mb-4">{loadingError}</p>
            <Button 
              onClick={() => {
                setInitialLoad(true);
                setLoadingError(null);
                loadScrapedProjects();
              }} 
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dialog de toutes les notifications et demandes */}
      <Dialog open={notificationPanelOpen} onOpenChange={setNotificationPanelOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications et Mes Demandes
              {/* {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )} */}
            </DialogTitle>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllNotificationsAsRead}
                disabled={isLoadingNotifications}
              >
                {isLoadingNotifications ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4 mr-2" />
                )}
                Marquer tout comme lu
              </Button>
            )}
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-96 overflow-y-auto">
            {/* Colonne Notifications */}
            <div>
              {/* <h3 className="font-medium mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications ({notifications.length})
              </h3> */}
              {/* <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-4">
                    <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Aucune notification</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${getNotificationBgColor(notification)}`}
                      onClick={() => {
                        setSelectedNotification(notification);
                        if (!notification.is_read) {
                          markNotificationAsRead(notification.id);
                        }
                      }}
                    >
                      <div className="flex items-start gap-2">
                        {getNotificationIcon(notification)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium text-xs truncate">{notification.title}</h5>
                            {!notification.is_read && (
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-1 line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-gray-400">{formatDate(notification.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div> */}
            </div>

            {/* Colonne Mes Demandes */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Mes Demandes ({myRequests.length})
              </h3>
              <div className="space-y-3">
                {myRequests.length === 0 ? (
                  <div className="text-center py-4">
                    <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Aucune demande envoyée</p>
                  </div>
                ) : (
                  myRequests.map((request) => {
                    if (!request) return null;
                    
                    return (
                      <div 
                        key={request.id} 
                        className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${
                          request.status === 'approved' 
                            ? 'bg-green-50 border-green-200' 
                            : request.status === 'rejected'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                        onClick={() => {
                          const notification = createNotificationFromRequest(request);
                          setSelectedNotification(notification);
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0 flex-1">
                            <h5 className="font-medium text-xs">Demande #{request.id}</h5>
                            <p className="text-xs text-gray-600">
                              {(request.projects || []).length} projet(s)
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            {request.status === 'approved' && (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                <CheckCircle className="w-2 h-2 mr-1" />
                                Approuvé
                              </Badge>
                            )}
                            {request.status === 'rejected' && (
                              <Badge className="bg-red-100 text-red-800 text-xs">
                                <AlertCircle className="w-2 h-2 mr-1" />
                                Rejeté
                              </Badge>
                            )}
                            {request.status === 'pending' && (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                <Clock className="w-2 h-2 mr-1" />
                                En attente
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="bg-white p-2 rounded border">
                          <p className="text-xs text-gray-600 line-clamp-2 italic">
                            "{request.message}"
                          </p>
                        </div>
                        
                        <p className="text-xs text-gray-400 mt-2">{formatDate(request.created_at)}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Detail Dialog - RESTE IDENTIQUE */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedNotification && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getNotificationIcon(selectedNotification)}
                  {selectedNotification.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Informations générales */}
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Date:</span>
                        <p>{formatDate(selectedNotification.created_at)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Statut:</span>
                        <p>
                          <Badge className={
                            selectedNotification.status_decision === 'approved' 
                              ? "bg-green-100 text-green-800"
                              : selectedNotification.status_decision === 'rejected'
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }>
                            {selectedNotification.status_decision === 'approved' && '✅ Approuvé'}
                            {selectedNotification.status_decision === 'rejected' && '❌ Rejeté'}
                            {!selectedNotification.status_decision && 'ℹ️ Information'}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <span className="font-medium text-gray-600">Message:</span>
                      <p className="mt-1">{selectedNotification.message}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Résumé des projets */}
                {selectedNotification.projects_summary && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Projets Concernés
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {selectedNotification.projects_summary.count}
                          </p>
                          <p className="text-sm text-blue-700">Projet(s)</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {formatAmount(selectedNotification.projects_summary.total_funding)}
                          </p>
                          <p className="text-sm text-green-700">Financement Total</p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Projets sélectionnés:</h4>
                        <ul className="space-y-1 text-sm">
                          {selectedNotification.projects_summary.titles.map((title, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              {title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Réponse de l'administrateur */}
                {selectedNotification.admin_response && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Réponse de l'Administrateur
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`p-4 rounded-lg border-l-4 ${
                        selectedNotification.status_decision === 'approved' 
                          ? 'bg-green-50 border-green-500' 
                          : selectedNotification.status_decision === 'rejected'
                          ? 'bg-red-50 border-red-500'
                          : 'bg-blue-50 border-blue-500'
                      }`}>
                        {selectedNotification.processed_by && selectedNotification.processed_at && (
                          <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                {getInitials(selectedNotification.processed_by)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{selectedNotification.processed_by}</span>
                            <span>•</span>
                            <span>{formatDate(selectedNotification.processed_at)}</span>
                          </div>
                        )}
                        
                        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                          {selectedNotification.admin_response}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions rapides */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedNotification(null)}
                    className="flex-1"
                  >
                    Fermer
                  </Button>
                  
                  {selectedNotification.status_decision === 'approved' && (
                    <Button className="flex-1">
                      Voir mes projets approuvés
                    </Button>
                  )}
                  
                  {selectedNotification.status_decision === 'rejected' && (
                    <Button 
                      className="flex-1"
                      onClick={() => {
                        setSelectedNotification(null);
                        setNotificationPanelOpen(false);
                      }}
                    >
                      Explorer d'autres projets
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Header Client */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Building className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Sélection de Projets
                </h1>
                {/* <p className="text-gray-600">
                  {user?.company_name || user?.full_name}
                </p> */}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Client connecté
              </Badge>
              
              {/* Bouton Notifications et Demandes */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setNotificationPanelOpen(true)}
                className="relative"
              >
                <Bell className="w-4 h-4 mr-2" />
                Notifications & Demandes
                {(unreadCount > 0 || myRequests.length > 0) && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs min-w-[1.25rem] h-5">
                    {unreadCount + myRequests.filter(r => r.status === 'pending').length}
                  </Badge>
                )}
              </Button>
              
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Paramètres
              </Button>
              
              <Button onClick={logout} variant="destructive" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message d'accueil */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-4">
            <Database className="w-8 h-8 text-blue-600 mt-1" />
            <div>
              <h2 className="text-xl font-semibold text-blue-900 mb-2">
                🎯 Sélectionnez vos Projets de Financement Climatique
              </h2>
              <p className="text-blue-800 mb-4">
                Bienvenue <strong>{user?.full_name}</strong> ! Explorez notre base de données de projets de financement climatique 
                et sélectionnez ceux qui correspondent à votre domaine d'activité. Une fois confirmés, notre équipe vous accompagnera 
                dans le processus de soumission.
              </p>
              <div className="bg-white p-4 rounded border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2">📋 Comment ça marche :</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">1</span>
                    <span>Parcourez les projets disponibles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">2</span>
                    <span>Sélectionnez ceux qui vous intéressent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">3</span>
                    <span>Confirmez votre demande d'accompagnement</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Mes Demandes de Projets - Version Simplifiée */}
        {myRequests.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Mes Demandes Récentes
                <Badge variant="outline">{myRequests.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myRequests.slice(0, 3).map((request) => {
                  if (!request) return null;
                  
                  return (
                    <div 
                      key={request.id} 
                      className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                        request.status === 'approved' 
                          ? 'bg-green-50 border-green-200' 
                          : request.status === 'rejected'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                      onClick={() => {
                        const notification = createNotificationFromRequest(request);
                        setSelectedNotification(notification);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          Demande #{request.id}
                        </h4>
                        {request.status === 'approved' && (
                          <Badge className="bg-green-100 text-green-800 border-green-300">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approuvé
                          </Badge>
                        )}
                        {request.status === 'rejected' && (
                          <Badge className="bg-red-100 text-red-800 border-red-300">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Rejeté
                          </Badge>
                        )}
                        {request.status === 'pending' && (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            <Clock className="w-3 h-3 mr-1" />
                            En attente
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {(request.projects || []).length} projet(s) sélectionné(s)
                      </p>
                      
                      <p className="text-xs text-gray-500">
                        {formatDate(request.created_at)}
                      </p>
                      
                      <div className="mt-2 text-xs text-blue-600 hover:text-blue-800">
                        Cliquer pour voir les détails →
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {myRequests.length > 3 && (
                <div className="mt-4 text-center">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setNotificationPanelOpen(true)}
                  >
                    Voir toutes mes demandes ({myRequests.length})
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Filtres et Actions */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher des projets..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les sources</SelectItem>
                    <SelectItem value="GEF">GEF uniquement</SelectItem>
                    <SelectItem value="GCF">GCF uniquement</SelectItem>
                    <SelectItem value="OTHER">OECD/Autres</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Pays" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les pays</SelectItem>
                    {availableCountries.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={scoreFilter} onValueChange={setScoreFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Qualité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes qualités</SelectItem>
                    <SelectItem value="high">Haute (&gt;80%)</SelectItem>
                    <SelectItem value="medium">Moyenne (60-80%)</SelectItem>
                    <SelectItem value="low">Faible (&lt;60%)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    <SelectItem value="available">Disponibles</SelectItem>
                    <SelectItem value="mauritania">Mauritanie</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={handleSelectAll}
                  className="gap-2"
                  disabled={availableProjectIds.length === 0}
                >
                  <CheckCircle className="w-4 h-4" />
                  {selectedProjects.length === availableProjectIds.length ? 'Désélectionner tout' : 'Sélectionner tout'}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={loadScrapedProjects}
                  disabled={isLoading}
                  className="gap-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Actualiser
                </Button>

                <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      disabled={selectedProjects.length === 0}
                      className="gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Confirmer ma sélection ({selectedProjects.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Confirmer votre demande d'accompagnement</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-4">
                          Vous avez sélectionné <strong>{selectedProjects.length} projet(s)</strong>. 
                          Veuillez expliquer pourquoi ces projets vous intéressent et comment ils s'alignent 
                          avec votre activité.
                        </p>
                        
                        <div className="bg-gray-50 p-4 rounded-lg mb-4">
                          <h4 className="font-medium mb-2">Projets sélectionnés :</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {selectedProjects.map(projectId => {
                              const project = projects.find(p => p.id === projectId);
                              return (
                                <div key={projectId} className="flex items-center gap-2 text-sm">
                                  <Badge className={getSourceColor(project?.source || '')}>
                                    {getSourceName(project?.source || '')}
                                  </Badge>
                                  <span className="truncate">{project?.title || `Projet #${projectId}`}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Message de demande *
                        </label>
                        <Textarea
                          placeholder="Décrivez votre intérêt pour ces projets, votre domaine d'activité, et comment vous comptez les utiliser..."
                          value={requestMessage}
                          onChange={(e) => setRequestMessage(e.target.value)}
                          rows={6}
                          className="resize-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Ce message sera envoyé à notre équipe pour évaluer votre demande
                        </p>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Vos informations :</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                          <div>
                            <span className="font-medium">Nom :</span> {user?.full_name}
                          </div>
                          <div>
                            <span className="font-medium">Email :</span> {user?.email}
                          </div>
                          <div>
                            <span className="font-medium">Entreprise :</span> {user?.company_name || 'Non renseigné'}
                          </div>
                          <div>
                            <span className="font-medium">Téléphone :</span> {user?.phone || 'Non renseigné'}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setConfirmDialogOpen(false)}
                          disabled={isSubmitting}
                        >
                          Annuler
                        </Button>
                        <Button
                          onClick={handleSubmitRequest}
                          disabled={isSubmitting || !requestMessage.trim()}
                          className="flex-1"
                        >
                          {isSubmitting ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Envoi en cours...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Envoyer la demande
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des Projets */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Chargement des projets...</p>
            </CardContent>
          </Card>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                Aucun projet trouvé
              </h3>
              <p className="text-gray-500 mb-4">
                Essayez de modifier vos critères de recherche ou actualisez la page
              </p>
              <Button 
                onClick={() => {
                  setSearchTerm("");
                  setSourceFilter("all");
                  setCountryFilter("all");
                  setScoreFilter("all");
                  setStatusFilter("all");
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Réinitialiser les filtres
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id} 
                className={`hover:shadow-lg transition-all duration-200 border-l-4 ${
                  selectedProjects.includes(project.id) 
                    ? 'border-l-green-500 bg-green-50/30' 
                    : 'border-l-gray-200'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      <Checkbox
                        checked={selectedProjects.includes(project.id)}
                        onCheckedChange={() => handleProjectToggle(project.id)}
                        disabled={!project.can_create_project}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                              {project.title}
                            </h3>
                            <Badge className={getSourceColor(project.source)}>
                              {getSourceName(project.source)}
                            </Badge>
                            {project.is_relevant_for_mauritania && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                🇲🇷 Mauritanie
                              </Badge>
                            )}
                            {!project.can_create_project && (
                              <Badge variant="outline" className="bg-gray-100 text-gray-600">
                                Non disponible
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-gray-600 text-sm leading-relaxed mb-4">
                            {project.description || "Aucune description disponible"}
                          </p>
                        </div>
                      </div>
                      
                      {/* Informations détaillées */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                        <div>
                          <p className="text-gray-500 font-medium">Organisation</p>
                          <p className="font-semibold truncate" title={project.organization}>
                            {project.organization || "Non spécifiée"}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-gray-500 font-medium">Financement</p>
                          <p className="font-semibold text-green-600">
                            {formatAmount(project.funding_amount || project.total_funding)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-gray-500 font-medium">Qualité données</p>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={project.data_completeness_score} 
                              className="w-16 h-2"
                            />
                            <span className="font-bold text-blue-600">
                              {project.data_completeness_score}%
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-gray-500 font-medium">Pays</p>
                          <p className="font-semibold">
                            {project.country || "Non spécifié"}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        {project.source_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={project.source_url} target="_blank" rel="noopener noreferrer">
                              <Globe className="w-4 h-4 mr-2" />
                              Voir la source
                            </a>
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-2" />
                          Détails
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Documentation
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Résumé des statistiques */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <Eye className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <h4 className="font-medium mb-1">Projets Affichés</h4>
                <p className="text-2xl font-bold text-blue-600">{filteredProjects.length}</p>
                <p className="text-sm text-gray-500">sur {projects.length} au total</p>
              </div>
              
              <div className="text-center">
                <Filter className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <h4 className="font-medium mb-1">Critères Actifs</h4>
                <p className="text-2xl font-bold text-green-600">
                  {[sourceFilter, countryFilter, scoreFilter, statusFilter].filter(f => f !== 'all').length}
                </p>
                <p className="text-sm text-gray-500">filtres appliqués</p>
              </div>
              
              <div className="text-center">
                <Target className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <h4 className="font-medium mb-1">Sélection</h4>
                <p className="text-2xl font-bold text-purple-600">{selectedProjects.length}</p>
                <p className="text-sm text-gray-500">projets sélectionnés</p>
              </div>
            </div>
            
            {Object.keys(sourceSummary).length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-3 text-center">Répartition par source :</h4>
                <div className="flex justify-center gap-4 flex-wrap">
                  {Object.entries(sourceSummary).map(([sourceName, count]) => (
                    <div key={sourceName} className="text-center">
                      <Badge className={getSourceColor(sourceName)}>{getSourceName(sourceName)}</Badge>
                      <p className="text-sm font-medium mt-1">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {totalFunding > 0 && (
              <div className="mt-6 pt-6 border-t text-center">
                <h4 className="font-medium mb-2">Financement Total Disponible</h4>
                <p className="text-3xl font-bold text-green-600">
                  {formatAmount(totalFunding)}
                </p>
                <p className="text-sm text-gray-500">pour les projets affichés</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer informatif */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6 text-center">
            <h4 className="font-semibold text-lg mb-4 text-blue-900">
              🤝 Accompagnement Personnalisé
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-blue-800">
              <div>
                <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <h5 className="font-medium mb-2">Conseil Expert</h5>
                <p>Notre équipe vous accompagne dans l'analyse de faisabilité et la préparation de votre dossier</p>
              </div>
              <div>
                <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <h5 className="font-medium mb-2">Dossier Complet</h5>
                <p>Nous vous aidons à constituer un dossier solide avec tous les documents requis</p>
              </div>
              <div>
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <h5 className="font-medium mb-2">Suivi Personnalisé</h5>
                <p>Accompagnement jusqu'à la soumission et le suivi de votre demande de financement</p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-white rounded border border-blue-200">
              <p className="text-xs text-blue-600">
                📧 Contact : <strong>contact@richat-funding.mr</strong> | 
                📞 Téléphone : <strong>+222 XX XX XX XX</strong> | 
                🌐 Bureau : Nouakchott, Mauritanie
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ClientDashboard;