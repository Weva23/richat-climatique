import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Search, Clock, CheckCircle, AlertTriangle, User, Building, 
  Mail, Phone, Calendar, RefreshCw, Eye, ThumbsUp, ThumbsDown,
  Package, Euro, FileText, MessageSquare
} from "lucide-react";
import { toast } from "sonner";

// Types
interface ClientRequest {
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
  const [statusFilter, setStatusFilter] = useState("all");

  // API Service
  const apiService = {
    async get(endpoint: string) {
      const token = localStorage.getItem('authToken');
      try {
        const response = await fetch(`http://127.0.0.1:8000/api${endpoint}`, {
          headers: {
            'Authorization': token ? `Token ${token}` : '',
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },

    async post(endpoint: string, data: any) {
      const token = localStorage.getItem('authToken');
      try {
        const response = await fetch(`http://127.0.0.1:8000/api${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': token ? `Token ${token}` : '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
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
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      // Charger demandes et statistiques en parallèle
      const [requestsData, statsData] = await Promise.all([
        apiService.get(url),
        apiService.get('/project-requests/stats/')
      ]);

      setRequests(requestsData.results || requestsData);
      setStats(statsData);
      
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement des données');
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
      toast.error('Erreur lors du rejet');
    } finally {
      setIsProcessing(false);
    }
  };

  // Utilitaires
  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { color: "bg-orange-100 text-orange-800", icon: Clock, label: "En attente" },
      approved: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Approuvée" },
      rejected: { color: "bg-red-100 text-red-800", icon: AlertTriangle, label: "Rejetée" },
      in_progress: { color: "bg-blue-100 text-blue-800", icon: RefreshCw, label: "En cours" }
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const getPriorityColor = (score: number) => {
    if (score >= 70) return "text-red-600 bg-red-50";
    if (score >= 40) return "text-orange-600 bg-orange-50";
    return "text-green-600 bg-green-50";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Filtrer les demandes
  const filteredRequests = requests.filter(request => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return request.client_name.toLowerCase().includes(term) ||
             request.client_company.toLowerCase().includes(term) ||
             request.message.toLowerCase().includes(term);
    }
    return true;
  });

  return (
    <div className="bg-gray-50 p-6 pt-24">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Gestion des Demandes Clients
              </h1>
              <p className="text-gray-600">
                Traitement des demandes d'accompagnement
              </p>
            </div>
            <Button onClick={loadData} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold">{stats.total_requests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">En attente</p>
                    <p className="text-2xl font-bold">{stats.pending_requests}</p>
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
                    <p className="text-2xl font-bold">{stats.approved_requests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Prioritaires</p>
                    <p className="text-2xl font-bold">{stats.high_priority_pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Temps moyen</p>
                    <p className="text-lg font-bold">{stats.avg_processing_time}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtres */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom, entreprise ou message..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="approved">Approuvées</SelectItem>
                  <SelectItem value="rejected">Rejetées</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Liste des demandes */}
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Chargement des demandes...</p>
              </CardContent>
            </Card>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucune demande trouvée
                </h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter !== 'all' 
                    ? "Essayez de modifier vos critères de recherche"
                    : "Les demandes clients apparaîtront ici"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => {
              const statusConfig = getStatusBadge(request.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                            {getInitials(request.client_name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {request.client_name}
                            </h3>
                            <Badge className={statusConfig.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(request.priority_score)}`}>
                              Priorité: {request.priority_score}/100
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                            <Building className="w-4 h-4" />
                            <span>{request.client_company}</span>
                            <span>•</span>
                            <Calendar className="w-4 h-4" />
                            <span>{request.time_since_request}</span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-500" />
                              <span>{request.projects_count} projet(s)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Euro className="w-4 h-4 text-green-500" />
                              <span>{formatAmount(request.total_funding_requested)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-500" />
                              <span className="truncate">{request.client_info.email}</span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {request.message}
                          </p>
                        </div>
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="gap-2"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="w-4 h-4" />
                            Voir détails
                          </Button>
                        </DialogTrigger>
                        
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                                  {getInitials(request.client_name)}
                                </AvatarFallback>
                              </Avatar>
                              Demande #{request.id} - {request.client_name}
                            </DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-6">
                            {/* Informations client */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <User className="w-5 h-5" />
                                  Informations client
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Nom</label>
                                  <p className="font-semibold">{request.client_info.name}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Entreprise</label>
                                  <p className="font-semibold">{request.client_info.company}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Email</label>
                                  <p className="font-semibold text-blue-600">{request.client_info.email}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Téléphone</label>
                                  <p className="font-semibold">{request.client_info.phone}</p>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Message */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <MessageSquare className="w-5 h-5" />
                                  Message du client
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                  <p className="leading-relaxed">{request.message}</p>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Projets */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <Package className="w-5 h-5" />
                                  Projets sélectionnés ({request.projects_count})
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  {request.projects_details.map((project) => (
                                    <div key={project.id} className="flex justify-between items-start p-3 bg-gray-50 rounded">
                                      <div className="flex-1">
                                        <h4 className="font-medium text-sm">{project.title}</h4>
                                        <p className="text-xs text-gray-600 mt-1">
                                          Source: {project.source} • Qualité: {project.data_completeness_score}%
                                        </p>
                                      </div>
                                      <div className="text-right ml-4">
                                        <p className="font-bold text-green-600">
                                          {formatAmount(project.funding_amount)}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>

                            {/* Actions admin */}
                            {request.status === 'pending' && (
                              <Card>
                                <CardHeader>
                                  <CardTitle>Réponse administrateur</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <Textarea
                                    placeholder="Rédigez votre réponse au client..."
                                    value={responseMessage}
                                    onChange={(e) => setResponseMessage(e.target.value)}
                                    rows={4}
                                  />
                                  
                                  <div className="flex gap-3">
                                    <Button
                                      onClick={() => handleApprove(request.id)}
                                      disabled={isProcessing}
                                      className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                                    >
                                      {isProcessing ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <ThumbsUp className="w-4 h-4" />
                                      )}
                                      Approuver
                                    </Button>
                                    <Button
                                      onClick={() => handleReject(request.id)}
                                      disabled={isProcessing || !responseMessage.trim()}
                                      variant="destructive"
                                      className="flex-1 gap-2"
                                    >
                                      {isProcessing ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <ThumbsDown className="w-4 h-4" />
                                      )}
                                      Rejeter
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* Réponse existante */}
                            {request.status !== 'pending' && request.admin_response && (
                              <Card>
                                <CardHeader>
                                  <CardTitle>Réponse envoyée</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                                    <p className="text-sm text-gray-600 mb-2">
                                      Par {request.processed_by_name} le {formatDate(request.processed_at)}
                                    </p>
                                    <p>{request.admin_response}</p>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Résumé */}
        {filteredRequests.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{filteredRequests.length} demande(s) affichée(s)</span>
                <span>
                  {filteredRequests.filter(r => r.status === 'pending').length} en attente de traitement
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminClientRequests;