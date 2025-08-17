import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Clock, CheckCircle, XCircle, User, Building, Calendar,
  Mail, Phone, FileText, AlertCircle, Star, RefreshCw
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

const AdminProjectRequests = () => {
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ProjectRequest | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

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

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get('/project-requests/?status=pending');
      setRequests(data.results || data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de charger les demandes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    try {
      setIsProcessing(true);
      await apiClient.post(`/project-requests/${requestId}/approve/`, {
        response_message: responseMessage
      });
      
      toast.success('Demande approuvée avec succès');
      setSelectedRequest(null);
      setResponseMessage("");
      loadRequests();
    } catch (error) {
      console.error('Erreur:', error);
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
      await apiClient.post(`/project-requests/${requestId}/reject/`, {
        response_message: responseMessage
      });
      
      toast.success('Demande rejetée');
      setSelectedRequest(null);
      setResponseMessage("");
      loadRequests();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du rejet');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return "bg-orange-100 text-orange-800 border-orange-200";
      case 'approved':
        return "bg-green-100 text-green-800 border-green-200";
      case 'rejected':
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 80) return "text-red-600 bg-red-50";
    if (score >= 60) return "text-orange-600 bg-orange-50";
    if (score >= 40) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Demandes Clients</h2>
          <p className="text-gray-600">Gérer les demandes d'accompagnement de projets</p>
        </div>
        
        <Button onClick={loadRequests} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">En attente</p>
                <p className="text-xl font-bold">{requests.filter(r => r.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Haute priorité</p>
                <p className="text-xl font-bold">{requests.filter(r => r.priority_score >= 70).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total projets</p>
                <p className="text-xl font-bold">{requests.reduce((sum, r) => sum + r.projects_count, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Clients actifs</p>
                <p className="text-xl font-bold">{new Set(requests.map(r => r.client_name)).size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
            <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Aucune demande en attente
            </h3>
            <p className="text-gray-500">
              Toutes les demandes ont été traitées !
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.client_name}
                      </h3>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status_display}
                      </Badge>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(request.priority_score)}`}>
                        Priorité: {request.priority_score}/100
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Building className="w-4 h-4" />
                        {request.client_company}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {request.time_since_request}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {request.projects_count} projet(s)
                      </div>
                    </div>
                    
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {request.message.length > 150 
                        ? `${request.message.substring(0, 150)}...` 
                        : request.message}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                        >
                          Voir détails
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Demande de {request.client_name}</DialogTitle>
                        </DialogHeader>
                        
                        {selectedRequest && (
                          <div className="space-y-6">
                            {/* Informations client */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-medium mb-3">Informations client</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">Nom :</span> {selectedRequest.client_info.name}
                                </div>
                                <div>
                                  <span className="font-medium">Entreprise :</span> {selectedRequest.client_info.company}
                                </div>
                                <div>
                                  <span className="font-medium">Email :</span> {selectedRequest.client_info.email}
                                </div>
                                <div>
                                  <span className="font-medium">Téléphone :</span> {selectedRequest.client_info.phone}
                                </div>
                              </div>
                            </div>

                            {/* Message */}
                            <div>
                              <h4 className="font-medium mb-2">Message du client</h4>
                              <p className="text-gray-700 bg-white p-4 rounded border">
                                {selectedRequest.message}
                              </p>
                            </div>

                            {/* Projets sélectionnés */}
                            <div>
                              <h4 className="font-medium mb-3">
                                Projets sélectionnés ({selectedRequest.projects_count})
                              </h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {selectedRequest.projects_details.map((project) => (
                                  <div key={project.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <div>
                                      <p className="font-medium text-sm">{project.title}</p>
                                      <p className="text-xs text-gray-600">Source: {project.source}</p>
                                    </div>
                                    <div className="text-right text-xs">
                                      <p className="font-medium">{project.funding_amount?.toLocaleString() || 'N/A'} USD</p>
                                      <p className="text-gray-600">Qualité: {project.data_completeness_score}%</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Actions admin */}
                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-3">Réponse administrateur</h4>
                              <Textarea
                                placeholder="Rédigez votre réponse au client..."
                                value={responseMessage}
                                onChange={(e) => setResponseMessage(e.target.value)}
                                rows={4}
                                className="mb-4"
                              />
                              
                              <div className="flex gap-3">
                                <Button
                                  onClick={() => handleApprove(selectedRequest.id)}
                                  disabled={isProcessing}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approuver
                                </Button>
                                <Button
                                  onClick={() => handleReject(selectedRequest.id)}
                                  disabled={isProcessing || !responseMessage.trim()}
                                  variant="destructive"
                                  className="flex-1"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Rejeter
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminProjectRequests;