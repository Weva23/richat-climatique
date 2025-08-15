import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Bell, CheckCircle, XCircle, Clock, AlertTriangle, 
  User, Building, Mail, Phone, FileText, Star,
  Calendar, TrendingUp, Eye, Send, MessageSquare,
  Users, RefreshCw, Filter
} from "lucide-react";
import { toast } from "sonner";

interface ProjectRequest {
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

interface NotificationStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  high_priority_pending: number;
  avg_processing_time: string;
}

// Notifications système classiques
const systemNotifications = [
  {
    id: 1,
    type: "document",
    title: "Nouveau document soumis",
    description: "EcoTech Mauritanie - Il y a 2 heures",
    icon: Bell,
    iconColor: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    id: 2,
    type: "ready",
    title: "Dossier prêt pour soumission",
    description: "Association Verte - Il y a 1 jour",
    icon: CheckCircle,
    iconColor: "text-success",
    bgColor: "bg-success/10"
  },
  {
    id: 3,
    type: "expired",
    title: "Document expiré",
    description: "Startup Solaire - Il y a 3 jours",
    icon: AlertTriangle,
    iconColor: "text-warning",
    bgColor: "bg-warning/10"
  }
];

const NotificationsSection = () => {
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ProjectRequest | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [activeTab, setActiveTab] = useState<'requests' | 'system'>('requests');

  useEffect(() => {
    loadRequests();
    loadStats();
  }, [filterStatus]);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      
      // Données de démonstration (à remplacer par vrai API)
      const demoRequests: ProjectRequest[] = [
        {
          id: 1,
          client_name: "Ahmed Ben Mohamed",
          client_company: "EcoTech Mauritanie",
          message: "Nous sommes une entreprise spécialisée dans les technologies vertes et souhaiterions développer un projet de panneaux solaires pour les zones rurales. Ces projets correspondent parfaitement à notre expertise technique et nous avons déjà une équipe qualifiée.",
          status: "pending",
          status_display: "En attente",
          client_info: {
            name: "Ahmed Ben Mohamed",
            company: "EcoTech Mauritanie",
            email: "ahmed@ecotech.mr",
            phone: "+222 45 67 89 01"
          },
          admin_response: "",
          processed_by_name: "",
          processed_at: "",
          created_at: "2025-08-14T10:30:00Z",
          priority_score: 85,
          projects_count: 3,
          total_funding_requested: 2500000,
          time_since_request: "2 heures",
          projects_details: [
            {
              id: 101,
              title: "Solar Energy Access Project for Rural Communities",
              source: "GCF",
              funding_amount: 1000000,
              data_completeness_score: 90
            },
            {
              id: 102,
              title: "Renewable Energy Infrastructure Development",
              source: "GEF",
              funding_amount: 800000,
              data_completeness_score: 85
            },
            {
              id: 103,
              title: "Clean Energy for Agricultural Sector",
              source: "GCF",
              funding_amount: 700000,
              data_completeness_score: 88
            }
          ]
        },
        {
          id: 2,
          client_name: "Fatima Mint Sidi",
          client_company: "Association Verte Mauritanie",
          message: "Notre association travaille depuis 10 ans sur des projets environnementaux. Nous cherchons des financements pour des projets de reforestation et de conservation des ressources en eau dans la région du Trarza.",
          status: "pending",
          status_display: "En attente",
          client_info: {
            name: "Fatima Mint Sidi",
            company: "Association Verte Mauritanie",
            email: "fatima@assovert.mr",
            phone: "+222 46 78 90 12"
          },
          admin_response: "",
          processed_by_name: "",
          processed_at: "",
          created_at: "2025-08-14T08:15:00Z",
          priority_score: 75,
          projects_count: 2,
          total_funding_requested: 1200000,
          time_since_request: "4 heures",
          projects_details: [
            {
              id: 201,
              title: "Forest Landscape Restoration Initiative",
              source: "GEF",
              funding_amount: 600000,
              data_completeness_score: 82
            },
            {
              id: 202,
              title: "Water Resource Conservation Project",
              source: "GCF",
              funding_amount: 600000,
              data_completeness_score: 79
            }
          ]
        }
      ];

      // Filtrer selon le statut
      const filteredRequests = filterStatus === "all" 
        ? demoRequests 
        : demoRequests.filter(r => r.status === filterStatus);
      
      setRequests(filteredRequests);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    // Données de démonstration
    setStats({
      total_requests: 12,
      pending_requests: 5,
      approved_requests: 6,
      rejected_requests: 1,
      high_priority_pending: 2,
      avg_processing_time: "2.5 jours"
    });
  };

  const handleApprove = async (requestId: number) => {
    try {
      setIsProcessing(true);
      // Simuler l'approbation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Demande approuvée avec succès');
      setSelectedRequest(null);
      setResponseMessage("");
      loadRequests();
    } catch (error) {
      toast.error('Erreur lors de l\'approbation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (requestId: number) => {
    if (!responseMessage.trim()) {
      toast.error('Veuillez ajouter un message expliquant le rejet');
      return;
    }

    try {
      setIsProcessing(true);
      // Simuler le rejet
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Demande rejetée');
      setSelectedRequest(null);
      setResponseMessage("");
      loadRequests();
    } catch (error) {
      toast.error('Erreur lors du rejet');
    } finally {
      setIsProcessing(false);
    }
  };

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

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Notifications & Demandes
          </h1>
          <p className="text-muted-foreground">
            Gestion des demandes clients et notifications système
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={loadRequests}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>

      {/* Onglets */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'requests' ? "default" : "outline"}
          onClick={() => setActiveTab('requests')}
          className="gap-2"
        >
          <Users className="w-4 h-4" />
          Demandes Clients
          {stats && stats.pending_requests > 0 && (
            <Badge variant="destructive" className="ml-2">
              {stats.pending_requests}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'system' ? "default" : "outline"}
          onClick={() => setActiveTab('system')}
          className="gap-2"
        >
          <Bell className="w-4 h-4" />
          Notifications Système
        </Button>
      </div>

      {activeTab === 'requests' ? (
        <div className="space-y-6">
          {/* Statistiques des demandes */}
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
              <div className="flex gap-2">
                {[
                  { key: "pending", label: "En attente", count: stats?.pending_requests },
                  { key: "approved", label: "Approuvées", count: stats?.approved_requests },
                  { key: "rejected", label: "Rejetées", count: stats?.rejected_requests },
                  { key: "all", label: "Toutes", count: stats?.total_requests }
                ].map(filter => (
                  <Button
                    key={filter.key}
                    variant={filterStatus === filter.key ? "default" : "outline"}
                    onClick={() => setFilterStatus(filter.key)}
                    size="sm"
                  >
                    {filter.label} ({filter.count || 0})
                  </Button>
                ))}
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
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Aucune demande {filterStatus !== 'all' ? 'dans cette catégorie' : ''}
                </h3>
                <p className="text-gray-500">
                  {filterStatus === 'pending' ? 'Aucune demande en attente de traitement' : 'Aucune demande trouvée'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
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
                              {request.client_name}
                            </h3>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Building className="w-4 h-4" />
                              {request.client_company}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {request.message}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 font-medium">Projets demandés</p>
                            <p className="font-semibold text-blue-600">{request.projects_count}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-medium">Financement total</p>
                            <p className="font-semibold text-green-600">
                              {formatAmount(request.total_funding_requested)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-medium">Demandé il y a</p>
                            <p className="font-semibold">{request.time_since_request}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-medium">Contact</p>
                            <div className="flex items-center gap-1 text-blue-600">
                              <Mail className="w-3 h-3" />
                              <span className="truncate text-xs">{request.client_info.email}</span>
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
                                        <span className="font-medium text-blue-800">Nom :</span> {selectedRequest.client_info.name}
                                      </div>
                                      <div>
                                        <span className="font-medium text-blue-800">Entreprise :</span> {selectedRequest.client_info.company}
                                      </div>
                                      <div>
                                        <span className="font-medium text-blue-800">Email :</span> {selectedRequest.client_info.email}
                                      </div>
                                      <div>
                                        <span className="font-medium text-blue-800">Téléphone :</span> {selectedRequest.client_info.phone}
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
                                  <div>
                                    <h4 className="font-semibold mb-3">📋 Projets demandés ({selectedRequest.projects_count})</h4>
                                    <div className="space-y-3 max-h-60 overflow-y-auto">
                                      {selectedRequest.projects_details.map(project => (
                                        <div key={project.id} className="bg-gray-50 p-3 rounded border">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <p className="font-medium text-sm">{project.title}</p>
                                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                                                <span>Source: {project.source}</span>
                                                <span>Financement: {formatAmount(project.funding_amount)}</span>
                                                <div className="flex items-center gap-1">
                                                  <span>Qualité:</span>
                                                  <Progress value={project.data_completeness_score} className="w-12 h-1" />
                                                  <span>{project.data_completeness_score}%</span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

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
        </div>
      ) : (
        /* Notifications système classiques */
        <div className="space-y-4">
          {systemNotifications.map((notification) => {
            const Icon = notification.icon;
            return (
              <Card key={notification.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${notification.bgColor}`}>
                      <Icon className={`w-5 h-5 ${notification.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{notification.title}</h3>
                      <p className="text-sm text-muted-foreground">{notification.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsSection;