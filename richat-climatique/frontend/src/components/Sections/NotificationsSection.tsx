import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Search, Clock, CheckCircle, AlertTriangle, User, Building, 
  Mail, Phone, Calendar, RefreshCw, Eye, ThumbsUp, ThumbsDown,
  Package, Euro, FileText, MessageSquare, TrendingUp, XCircle,
  Users, ExternalLink
} from "lucide-react";
import { toast } from "sonner";

// Types corrigés selon les modèles Django et commandes de scraping
interface ClientRequest {
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
  processed_by?: number;
  processed_by_name?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
  priority_score: number;
  projects_count: number;
  total_funding_requested: number;
  time_since_request: string;
  projects_details: Array<{
    id: number;
    title: string;
    source: 'GEF' | 'GCF' | 'OTHER' | 'CLIMATE_FUND'; // Sources selon collection.py
    source_display: string;
    funding_amount: number;
    data_completeness_score: number;
    document_url?: string;
    additional_links?: string;
    source_url?: string;
    organization?: string;
    project_type?: string;
    total_funding?: string;
    gef_project_id?: string;
    gcf_document_type?: string;
    cover_date?: string;
    scraping_source?: string;
    is_relevant_for_mauritania?: boolean;
    needs_review?: boolean;
  }>;
}

interface RequestStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  high_priority_pending: number;
  avg_processing_time: string;
}

const AdminClientRequests = () => {
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [stats, setStats] = useState<RequestStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  // API Service corrigé
  const apiService = {
    async get(endpoint: string) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },

    async post(endpoint: string, data: any) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorData}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    }
  };

  // Charger les données
  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Construire l'URL avec filtres
      let url = '/project-requests/';
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      // Charger demandes et statistiques en parallèle
      const [requestsData, statsData] = await Promise.all([
        apiService.get(url),
        apiService.get('/project-requests/stats/')
      ]);

      // Gérer la réponse de l'API (avec ou sans pagination)
      const requestsList = requestsData.results || requestsData;
      setRequests(Array.isArray(requestsList) ? requestsList : []);
      setStats(statsData);
      
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement des données');
      
      // Données de fallback pour éviter les erreurs
      setRequests([]);
      setStats({
        total_requests: 0,
        pending_requests: 0,
        approved_requests: 0,
        rejected_requests: 0,
        high_priority_pending: 0,
        avg_processing_time: "N/A"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Actions sur les demandes
  const handleApprove = async (requestId: number) => {
    try {
      setIsProcessing(true);
      
      await apiService.post(`/project-requests/${requestId}/approve/`, {
        response_message: responseMessage
      });
      
      toast.success('Demande approuvée avec succès');
      setSelectedRequest(null);
      setResponseMessage("");
      loadData();
      
    } catch (error) {
      console.error('Erreur approbation:', error);
      toast.error('Erreur lors de l\'approbation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (requestId: number) => {
    if (!responseMessage.trim()) {
      toast.error('Un message de rejet est requis');
      return;
    }

    try {
      setIsProcessing(true);
      
      await apiService.post(`/project-requests/${requestId}/reject/`, {
        response_message: responseMessage
      });
      
      toast.success('Demande rejetée');
      setSelectedRequest(null);
      setResponseMessage("");
      loadData();
      
    } catch (error) {
      console.error('Erreur rejet:', error);
      toast.error('Erreur lors du rejet');
    } finally {
      setIsProcessing(false);
    }
  };

  // Utilitaires
  const getPriorityColor = (score: number) => {
    if (score >= 80) return "text-red-600 bg-red-50 border-red-200";
    if (score >= 60) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-blue-600 bg-blue-50 border-blue-200";
  };

  const getPriorityLabel = (score: number) => {
    if (score >= 80) return "Haute";
    if (score >= 60) return "Moyenne";
    return "Normale";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'approved':
        return "bg-green-100 text-green-800 border-green-200";
      case 'rejected':
        return "bg-red-100 text-red-800 border-red-200";
      case 'in_progress':
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number) => {
    if (!amount) return "Non spécifié";
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filtrer les demandes
  const filteredRequests = requests.filter(request => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return request.client_name?.toLowerCase().includes(term) ||
             request.client_company?.toLowerCase().includes(term) ||
             request.message?.toLowerCase().includes(term);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Gestion des Demandes Clients
          </h1>
          <p className="text-muted-foreground">
            Traitement des demandes d'accompagnement et de conseil
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={loadData}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-orange-600 font-medium">En attente</p>
                  <p className="text-3xl font-bold text-orange-700">{stats.pending_requests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Haute priorité</p>
                  <p className="text-2xl font-bold text-red-600">{stats.high_priority_pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Approuvées</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved_requests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Rejetées</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected_requests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.total_requests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Temps moyen</p>
                  <p className="text-lg font-bold text-purple-600">{stats.avg_processing_time}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom, entreprise ou message..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "pending", label: "En attente", count: stats?.pending_requests },
                { key: "approved", label: "Approuvées", count: stats?.approved_requests },
                { key: "rejected", label: "Rejetées", count: stats?.rejected_requests },
                { key: "all", label: "Toutes", count: stats?.total_requests }
              ].map(filter => (
                <Button
                  key={filter.key}
                  variant={statusFilter === filter.key ? "default" : "outline"}
                  onClick={() => setStatusFilter(filter.key)}
                  size="sm"
                >
                  {filter.label} ({filter.count || 0})
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des demandes */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Chargement des demandes...</p>
          </CardContent>
        </Card>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Aucune demande {statusFilter !== 'all' ? 'dans cette catégorie' : ''}
            </h3>
            <p className="text-gray-500">
              {statusFilter === 'pending' ? 'Aucune demande en attente de traitement' : 'Aucune demande trouvée'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.client_name || 'Client anonyme'}
                        </h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          {request.client_company || request.client_info?.company || 'Entreprise non spécifiée'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {request.message.length > 150 
                          ? `${request.message.slice(0, 150)}...` 
                          : request.message || 'Aucun message disponible'
                        }
                      </p>
                      {request.message.length > 150 && (
                        <Button
                          variant="link"
                          size="sm"
                          className="text-blue-600 p-0 h-auto text-xs mt-1"
                          onClick={() => setSelectedRequest(request)}
                        >
                          Lire la suite →
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 font-medium">Projets demandés</p>
                        <p className="font-semibold text-blue-600">{request.projects_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">Financement total</p>
                        <p className="font-semibold text-green-600">
                          {formatAmount(request.total_funding_requested)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">Sources</p>
                        <div className="flex gap-1 flex-wrap">
                          {request.projects_details && [...new Set(request.projects_details.map(p => p.source))].map(source => {
                            // Trouver un projet de cette source pour récupérer le lien
                            const projectOfSource = request.projects_details.find(p => p.source === source);
                            const projectUrl = projectOfSource?.source_url || projectOfSource?.additional_links;
                            
                            // Mapping des noms d'affichage selon collection.py
                            const sourceDisplayNames = {
                              'GCF': 'GCF',
                              'GEF': 'GEF', 
                              'OTHER': 'OECD',
                              'CLIMATE_FUND': 'Climate Funds',
                              'CLIMATE_FU': 'Climate Funds', // Support de la variante tronquée
                              'World Bank': 'World Bank',
                              'UNDP': 'UNDP',
                              'EU': 'EU',
                              'AfDB': 'AfDB',
                              'USAID': 'USAID'
                            };
                            
                            const displayName = sourceDisplayNames[source as keyof typeof sourceDisplayNames] || source;
                            
                            return (
                              <Button
                                key={source}
                                variant="link"
                                size="sm"
                                className="h-auto p-1 text-xs font-medium"
                                style={{
                                  backgroundColor: source === 'GCF' ? '#dbeafe' : 
                                                source === 'GEF' ? '#dcfce7' : 
                                                source === 'CLIMATE_FUND' ? '#fef3c7' : '#f3f4f6',
                                  color: source === 'GCF' ? '#1e40af' : 
                                        source === 'GEF' ? '#166534' : 
                                        source === 'CLIMATE_FUND' ? '#d97706' : '#374151',
                                  borderRadius: '0.375rem',
                                  textDecoration: 'none'
                                }}
                                onClick={() => {
                                  if (projectUrl) {
                                    window.open(projectUrl, '_blank');
                                  } else {
                                    // Fallback vers le site principal si pas de lien direct
                                    const fallbackUrls = {
                                      'GCF': 'https://www.greenclimate.fund/projects',
                                      'GEF': 'https://www.thegef.org/projects-operations/projects',
                                      'OTHER': 'https://www.oecd.org/en/topics/development/',
                                      'CLIMATE_FUND': 'https://climatefundsupdate.org'
                                    };
                                    const url = fallbackUrls[source as keyof typeof fallbackUrls] || `https://www.google.com/search?q=${source}+funding+projects`;
                                    window.open(url, '_blank');
                                  }
                                }}
                                title={projectUrl ? `Voir le projet sur ${displayName}` : `Visiter le site ${displayName}`}
                              >
                                {displayName} ({request.projects_details.filter(p => p.source === source).length})
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">Demandé il y a</p>
                        <p className="font-semibold">{request.time_since_request || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">Contact</p>
                        <div className="flex items-center gap-1 text-blue-600">
                          <Mail className="w-3 h-3" />
                          <span className="truncate text-xs">
                            {request.client_info?.email || 'Non spécifié'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-3 ml-6">
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getStatusColor(request.status)}>
                        {request.status_display}
                      </Badge>
                      <Badge className={getPriorityColor(request.priority_score)}>
                        Priorité: {getPriorityLabel(request.priority_score)}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Examiner
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>
                              Demande #{request.id} - {request.client_name}
                            </DialogTitle>
                          </DialogHeader>
                          
                          {selectedRequest && (
                            <div className="space-y-6">
                              {/* Informations client */}
                              <div className="bg-blue-50 p-4 rounded-lg">
                                <h4 className="font-semibold text-blue-900 mb-3">👤 Informations Client</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium text-blue-800">Nom :</span> {selectedRequest.client_info?.name || selectedRequest.client_name || 'N/A'}
                                  </div>
                                  <div>
                                    <span className="font-medium text-blue-800">Entreprise :</span> {selectedRequest.client_info?.company || selectedRequest.client_company || 'N/A'}
                                  </div>
                                  <div>
                                    <span className="font-medium text-blue-800">Email :</span> {selectedRequest.client_info?.email || 'N/A'}
                                  </div>
                                  <div>
                                    <span className="font-medium text-blue-800">Téléphone :</span> {selectedRequest.client_info?.phone || 'N/A'}
                                  </div>
                                </div>
                              </div>

                              {/* Message du client */}
                              <div>
                                <h4 className="font-semibold mb-2">💬 Message du client</h4>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                  <p className="text-sm leading-relaxed">{selectedRequest.message}</p>
                                </div>
                              </div>

                              {/* Projets demandés */}
                              {selectedRequest.projects_details && selectedRequest.projects_details.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-3">📋 Projets demandés ({selectedRequest.projects_count})</h4>
                                  <div className="space-y-3 max-h-60 overflow-y-auto">
                                    {selectedRequest.projects_details.map(project => (
                                      <div key={project.id} className="bg-gray-50 p-4 rounded-lg border">
                                        <div className="space-y-3">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <h5 className="font-semibold text-base text-gray-900 mb-2">
                                                {project.title}
                                              </h5>
                                              <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                  <span className="font-medium text-gray-600">Source :</span>
                                                  <Button
                                                    variant="link"
                                                    size="sm"
                                                    className="h-auto p-0 ml-2 text-blue-600 hover:text-blue-800"
                                                    onClick={() => {
                                                      // Utiliser d'abord source_url, puis additional_links, puis fallback
                                                      const projectUrl = project.source_url || project.additional_links;
                                                      
                                                      if (projectUrl) {
                                                        window.open(projectUrl, '_blank');
                                                      } else {
                                                        // Fallback vers site principal
                                                        const fallbackUrls = {
                                                          'GCF': 'https://www.greenclimate.fund/projects',
                                                          'GEF': 'https://www.thegef.org/projects-operations/projects',
                                                          'OTHER': 'https://www.oecd.org/en/topics/development/',
                                                          'CLIMATE_FUND': 'https://climatefundsupdate.org'
                                                        };
                                                        const url = fallbackUrls[project.source as keyof typeof fallbackUrls] || `https://www.google.com/search?q=${project.source}+funding+projects`;
                                                        window.open(url, '_blank');
                                                      }
                                                    }}
                                                    title={project.source_url || project.additional_links ? "Voir le projet sur le site source" : "Visiter le site de la source"}
                                                  >
                                                    {project.source_display || project.source}
                                                    {(project.source_url || project.additional_links) && " 🔗"}
                                                  </Button>
                                                </div>
                                                <div>
                                                  <span className="font-medium text-gray-600">Financement :</span>
                                                  <span className="ml-2 font-bold text-green-600">{formatAmount(project.funding_amount)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium text-gray-600">Qualité des données :</span>
                                                  <Progress value={project.data_completeness_score} className="w-16 h-2" />
                                                  <span className="text-xs font-medium">{project.data_completeness_score}%</span>
                                                </div>
                                                <div>
                                                  <span className="font-medium text-gray-600">ID Projet :</span>
                                                  <span className="ml-2 text-gray-800">#{project.id}</span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Liens du projet */}
                                          <div className="pt-2 border-t border-gray-200">
                                            <div className="flex gap-2 flex-wrap">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 text-xs"
                                                onClick={() => {
                                                  navigator.clipboard.writeText(`Projet #${project.id}: ${project.title}`);
                                                  toast.success('Informations du projet copiées !');
                                                }}
                                              >
                                                <FileText className="w-3 h-3" />
                                                Copier infos
                                              </Button>
                                              
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 text-xs"
                                                onClick={() => {
                                                  const searchQuery = encodeURIComponent(project.title);
                                                  const url = `/scraped-projects?search=${searchQuery}`;
                                                  window.open(url, '_blank');
                                                }}
                                              >
                                                <Eye className="w-3 h-3" />
                                                Voir en BD
                                              </Button>
                                              
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 text-xs"
                                                onClick={() => {
                                                  const searchQuery = `"${project.title}" ${project.source} funding project`;
                                                  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
                                                  window.open(searchUrl, '_blank');
                                                }}
                                              >
                                                <Search className="w-3 h-3" />
                                                Rechercher
                                              </Button>
                                            </div>
                                            
                                            {/* Liens documents si disponibles */}
                                            {(project.document_url || project.additional_links || project.source_url) && (
                                              <div className="mt-2 pt-2 border-t border-gray-300">
                                                <p className="text-xs font-medium text-gray-600 mb-2">Documents du projet :</p>
                                                <div className="flex gap-2 flex-wrap">
                                                  {project.source_url && (
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="gap-2 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                                                      onClick={() => window.open(project.source_url, '_blank')}
                                                    >
                                                      <ExternalLink className="w-3 h-3" />
                                                      Page source
                                                    </Button>
                                                  )}
                                                  
                                                  {project.document_url && (
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="gap-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                                      onClick={() => window.open(project.document_url, '_blank')}
                                                    >
                                                      <FileText className="w-3 h-3" />
                                                      Document principal
                                                    </Button>
                                                  )}
                                                  
                                                  {project.additional_links && (
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="gap-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                                      onClick={() => window.open(project.additional_links, '_blank')}
                                                    >
                                                      <ExternalLink className="w-3 h-3" />
                                                      Liens additionnels
                                                    </Button>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Actions admin */}
                              {request.status === 'pending' && (
                                <div>
                                  <h4 className="font-semibold mb-3">⚡ Actions administrateur</h4>
                                  <div className="space-y-4">
                                    <div>
                                      <label className="block text-sm font-medium mb-2">
                                        Message de réponse
                                      </label>
                                      <Textarea
                                        placeholder="Ajoutez votre réponse au client..."
                                        value={responseMessage}
                                        onChange={(e) => setResponseMessage(e.target.value)}
                                        rows={4}
                                      />
                                    </div>
                                    
                                    <div className="flex gap-3">
                                      <Button
                                        onClick={() => handleApprove(request.id)}
                                        disabled={isProcessing}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        {isProcessing ? (
                                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                        )}
                                        Approuver
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => handleReject(request.id)}
                                        disabled={isProcessing || !responseMessage.trim()}
                                      >
                                        {isProcessing ? (
                                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                          <XCircle className="w-4 h-4 mr-2" />
                                        )}
                                        Rejeter
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Réponse existante */}
                              {request.status !== 'pending' && request.admin_response && (
                                <div>
                                  <h4 className="font-semibold mb-3">✅ Réponse envoyée</h4>
                                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                                    <p className="text-sm text-gray-600 mb-2">
                                      Par {request.processed_by_name || 'Administrateur'} le {formatDate(request.processed_at || '')}
                                    </p>
                                    <p className="text-sm leading-relaxed">{request.admin_response}</p>
                                  </div>
                                </div>
                              )}

                              {/* Informations techniques enrichies */}
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-semibold mb-3">🔧 Informations techniques</h4>
                                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                                  <div>
                                    <span className="font-medium">ID Demande :</span> #{request.id}
                                  </div>
                                  <div>
                                    <span className="font-medium">ID Client :</span> #{request.client}
                                  </div>
                                  <div>
                                    <span className="font-medium">Créée le :</span> {formatDate(request.created_at)}
                                  </div>
                                  <div>
                                    <span className="font-medium">Mise à jour :</span> {formatDate(request.updated_at)}
                                  </div>
                                  <div>
                                    <span className="font-medium">Score priorité :</span> {request.priority_score}/100
                                  </div>
                                  <div>
                                    <span className="font-medium">Statut :</span> {request.status}
                                  </div>
                                  <div className="col-span-2">
                                    <span className="font-medium">Sources projets :</span> {request.projects_details ? [...new Set(request.projects_details.map(p => p.source))].join(', ') : 'N/A'}
                                  </div>
                                  <div className="col-span-2">
                                    <span className="font-medium">Compatibilité scraping :</span> 
                                    <span className="ml-1 text-green-600">✅ Compatible GEF-GCF-OECD-Climate Funds</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Résumé en bas de page */}
      {filteredRequests.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{filteredRequests.length}</p>
                <p className="text-sm text-muted-foreground">Demandes affichées</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredRequests.filter(r => r.status === 'pending').length}
                </p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {filteredRequests.filter(r => r.priority_score >= 80).length}
                </p>
                <p className="text-sm text-muted-foreground">Haute priorité</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {filteredRequests.reduce((sum, r) => sum + (r.total_funding_requested || 0), 0) > 1000000 ? 
                    Math.round(filteredRequests.reduce((sum, r) => sum + (r.total_funding_requested || 0), 0) / 1000000) + 'M' :
                    Math.round(filteredRequests.reduce((sum, r) => sum + (r.total_funding_requested || 0), 0) / 1000) + 'K'
                  } USD
                </p>
                <p className="text-sm text-muted-foreground">Financement total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminClientRequests;