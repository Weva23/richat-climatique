import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
<<<<<<< HEAD
import { Progress } from "@/components/ui/progress";
import { 
  Search, Clock, CheckCircle, AlertTriangle, User, Building, 
  Mail, Phone, Calendar, RefreshCw, Eye, ThumbsUp, ThumbsDown,
  Package, Euro, FileText, MessageSquare, TrendingUp, XCircle,
  Users, ExternalLink
=======
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Bell, CheckCircle, XCircle, Clock, AlertTriangle, 
  User, Building, Mail, Phone, FileText, Star,
  Calendar, TrendingUp, Eye, Send, MessageSquare,
  Users, RefreshCw, Filter, Download, ExternalLink,
  Upload, Search, Settings
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
} from "lucide-react";

<<<<<<< HEAD
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
=======
// Interfaces TypeScript
interface Client {
  id: number;
  full_name: string;
  email: string;
  company_name: string;
}

interface Project {
  id: number;
  title: string;
  name?: string;
  description?: string;
  organization?: string;
  status?: string;
  total_funding?: string;
  funding_amount?: number;
  currency?: string;
  country?: string;
  source?: string;
  project_type?: string;
  source_url?: string;
  additional_links?: string;
}

interface Document {
  id: number;
  name: string;
  file: string;
  description: string;
  status: 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'expired';
  notes: string;
  notes_admin: string;
  motif_rejet: string;
  rejection_reason: string;
  message_accompagnement: string;
  uploaded_at: string;
  date_soumission: string;
  reviewed_at: string | null;
  document_type: { id: number; name: string } | null;
  project: Project | null;
  scraped_project: Project | null;
  uploaded_by: Client;
  file_size: number;
}

interface ClientSubmission {
  client: Client;
  documents: Document[];
  total_documents: number;
  pending_documents: number;
  approved_documents: number;
  rejected_documents: number;
  latest_submission: string;
  projects_involved: string[];
}

interface Stats {
  total_documents: number;
  pending_documents: number;
  approved_documents: number;
  rejected_documents: number;
  active_clients: number;
}

// FIX: Amélioration du client API avec gestion d'erreurs
const apiClient = {
  get: async (url: string) => {
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`http://127.0.0.1:8000/api${url}`, {
        headers: {
          'Authorization': token ? `Token ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Erreur HTTP ${response.status}` }));
        throw new Error(errorData.error || errorData.details || `Erreur ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('API GET Error:', error);
      throw error;
    }
  },
  
  post: async (url: string, data: any) => {
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`http://127.0.0.1:8000/api${url}`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Token ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Erreur HTTP ${response.status}` }));
        throw new Error(errorData.error || errorData.details || `Erreur ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  },
};

const DocumentsAdminView = () => {
  const [clientSubmissions, setClientSubmissions] = useState<ClientSubmission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientSubmission | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  
  // FIX: Nouveau state pour les erreurs
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491

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
<<<<<<< HEAD
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
=======
    loadDocuments();
  }, []);

  // FIX: Amélioration du système de toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 5000); // Masquer après 5 secondes
  };

  const loadDocuments = async () => {
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
    try {
      setIsLoading(true);
      setError(null);
      
<<<<<<< HEAD
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
=======
      // Charger les données d'aperçu admin
      const overviewResponse = await apiClient.get('/documents/admin_overview/');
      
      // Charger tous les documents avec l'endpoint spécifique admin
      const documentsResponse = await apiClient.get('/documents/all_documents_admin/');
      const allDocuments = documentsResponse.results || documentsResponse;

      console.log('Documents chargés:', allDocuments);
      console.log('Clients overview:', overviewResponse.clients);

      // Formater les données clients avec leurs documents
      const clientsData = overviewResponse.clients.map((clientData: any) => {
        const client: Client = {
          id: clientData.id,
          full_name: clientData.full_name,
          email: clientData.email,
          company_name: clientData.company_name
        };
        
        // Filtrer les documents pour ce client
        const clientDocuments = allDocuments.filter((doc: Document) => {
          let uploadedById;
          if (typeof doc.uploaded_by === 'object' && doc.uploaded_by !== null) {
            uploadedById = doc.uploaded_by.id;
          } else {
            uploadedById = doc.uploaded_by;
          }
          return uploadedById === client.id;
        });
        
        // Extraire les projets impliqués
        const projects = new Set<string>();
        clientDocuments.forEach((doc: Document) => {
          if (doc.project?.title) projects.add(doc.project.title);
          if (doc.scraped_project?.title) projects.add(doc.scraped_project.title);
        });

        return {
          client,
          documents: clientDocuments,
          total_documents: clientData.total_documents,
          pending_documents: clientData.pending_documents,
          approved_documents: clientData.approved_documents,
          rejected_documents: clientData.rejected_documents,
          latest_submission: clientData.latest_submission,
          projects_involved: Array.from(projects)
        };
      });

      setClientSubmissions(clientsData);
      setStats(overviewResponse.stats);
      
    } catch (error) {
      console.error('Erreur:', error);
      setError(`Erreur lors du chargement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      showToast('Erreur lors du chargement des documents', 'error');
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
    } finally {
      setIsLoading(false);
    }
  };

<<<<<<< HEAD
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
=======
  const handleDownloadDocument = async (document: Document) => {
    try {
      showToast(`Démarrage du téléchargement de "${document.name}"...`);
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://127.0.0.1:8000${document.file}`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Token ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const blob = await response.blob();
      const fileName = document.name || document.file.split('/').pop() || 'document';
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = window.document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.style.display = 'none';
      
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      showToast(`Document "${fileName}" téléchargé avec succès`);
    } catch (error) {
      console.error("Erreur de téléchargement:", error);
      showToast("Échec du téléchargement du document", 'error');
      
      try {
        window.open(`http://127.0.0.1:8000${document.file}`, '_blank');
        showToast("Ouverture du document dans un nouvel onglet");
      } catch (fallbackError) {
        console.error("Erreur fallback:", fallbackError);
      }
    }
  };

  const handleViewDocument = (document: Document) => {
    try {
      const viewUrl = `http://127.0.0.1:8000${document.file}`;
      const newWindow = window.open(viewUrl, '_blank', 'noopener,noreferrer');
      
      if (newWindow) {
        showToast(`Ouverture du document "${document.name}"`);
      } else {
        showToast("Veuillez autoriser les pop-ups pour voir le document", 'error');
      }
    } catch (error) {
      console.error("Erreur d'ouverture:", error);
      showToast("Échec de l'ouverture du document", 'error');
    }
  };

  const handleViewProject = (project: Project, source: 'project' | 'scraped_project') => {
    const projectWithSource = { ...project, source };
    setSelectedProject(projectWithSource);
    setIsProjectModalOpen(true);
  };

  const handleOpenProjectSource = (project: Project) => {
    const sourceUrl = project.additional_links;
    
    if (!sourceUrl) {
      showToast("Aucune URL source disponible pour ce projet", 'error');
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
      return;
    }

    try {
<<<<<<< HEAD
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
=======
      const cleanUrl = sourceUrl.trim();
      const newWindow = window.open(cleanUrl, '_blank', 'noopener,noreferrer');
      
      if (newWindow) {
        showToast("Redirection vers la source du projet...");
      } else {
        showToast("Veuillez autoriser les pop-ups pour accéder à la source", 'error');
        navigator.clipboard?.writeText(cleanUrl).then(() => {
          showToast("URL copiée dans le presse-papiers");
        }).catch(() => {
          console.log("URL source:", cleanUrl);
        });
      }
    } catch (error) {
      console.error("Erreur ouverture source:", error);
      showToast("Erreur lors de l'ouverture de la source", 'error');
    }
  };

  // FIX: Amélioration des fonctions d'approbation/rejet avec gestion d'erreurs
  const handleApproveDocument = async (documentId: number) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      // FIX: Utiliser la nouvelle API avec les bons champs
      const response = await apiClient.post(`/documents/${documentId}/approve/`, { 
        notes_admin: adminNotes 
      });
      
      showToast('Document approuvé avec succès');
      setSelectedDocument(null);
      setAdminNotes("");
      await loadDocuments(); // Recharger les données
      
    } catch (error) {
      console.error('Erreur approbation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'approbation';
      showToast(errorMessage, 'error');
      setError(errorMessage);
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
    } finally {
      setIsProcessing(false);
    }
  };

<<<<<<< HEAD
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
=======
  const handleRejectDocument = async (documentId: number) => {
    if (!rejectionReason.trim()) {
      showToast('Veuillez spécifier une raison pour le rejet', 'error');
      return;
    }
    
    try {
      setIsProcessing(true);
      setError(null);
      
      // FIX: Utiliser la nouvelle API avec les bons champs
      const response = await apiClient.post(`/documents/${documentId}/reject/`, {
        motif_rejet: rejectionReason,
        notes_admin: adminNotes
      });
      
      showToast('Document rejeté');
      setSelectedDocument(null);
      setRejectionReason("");
      setAdminNotes("");
      await loadDocuments(); // Recharger les données
      
    } catch (error) {
      console.error('Erreur rejet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du rejet';
      showToast(errorMessage, 'error');
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'approved': return "bg-green-100 text-green-800 border-green-200";
      case 'rejected': return "bg-red-100 text-red-800 border-red-200";
      case 'reviewed': return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

<<<<<<< HEAD
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
=======
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'draft': 'Brouillon',
      'submitted': 'En attente',
      'reviewed': 'En révision',
      'approved': 'Approuvé',
      'rejected': 'Rejeté',
      'expired': 'Expiré'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
      hour: '2-digit',
      minute: '2-digit'
    });
  };

<<<<<<< HEAD
  const formatAmount = (amount: number) => {
    if (!amount) return "Non spécifié";
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
=======
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredSubmissions = clientSubmissions.filter(client => {
    const matchesSearch = 
      client.client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.projects_involved.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    switch (statusFilter) {
      case 'pending': return client.pending_documents > 0;
      case 'approved': return client.approved_documents > 0;
      case 'rejected': return client.rejected_documents > 0;
      default: return true;
    }
  });

  // Modal de détails du projet
  const ProjectDetailModal = () => {
    if (!selectedProject) return null;

    return (
      <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-6 h-6 text-blue-600" />
              Détails du projet
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[75vh] pr-4">
            <div className="space-y-6">
              {/* En-tête du projet */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 pr-4">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
                      {selectedProject.title || selectedProject.name || 'Titre non disponible'}
                    </h3>
                    
                    <div className="space-y-2">
                      {selectedProject.organization && (
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600 font-medium">
                            {selectedProject.organization}
                          </span>
                        </div>
                      )}
                      
                      {selectedProject.country && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            📍 {selectedProject.country}
                          </span>
                        </div>
                      )}
                      
                      {selectedProject.project_type && (
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {selectedProject.project_type}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                      {selectedProject.source === 'scraped_project' ? 'Projet Scrapé' : 'Projet Django'}
                    </Badge>
                    {selectedProject.status && (
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        {selectedProject.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedProject.description && (
                <div className="bg-white border rounded-lg p-5">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    Description du projet
                  </h4>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {selectedProject.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Lien source */}
              {selectedProject.additional_links && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-5 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-yellow-600" />
                    Source externe
                  </h4>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-yellow-700 text-sm mb-2">
                        Consultez les détails complets sur le site officiel
                      </p>
                      <p className="text-xs text-yellow-600 break-all">
                        {selectedProject.additional_links}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenProjectSource(selectedProject)}
                      className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 gap-2 ml-4"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Ouvrir
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
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
    <div className="space-y-6 p-6">
      {/* FIX: Toast de notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50">
          <Alert className={`${toastMessage.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'} w-96`}>
            <AlertDescription className={toastMessage.type === 'error' ? 'text-red-700' : 'text-green-700'}>
              {toastMessage.message}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
<<<<<<< HEAD
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
=======
          <h1 className="text-2xl font-semibold text-foreground">Gestion des Documents</h1>
          <p className="text-muted-foreground">Documents soumis par les clients</p>
        </div>
        <Button variant="outline" onClick={loadDocuments} className="gap-2" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
          Actualiser
        </Button>
      </div>

<<<<<<< HEAD
      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
=======
      {/* FIX: Affichage des erreurs */}
      {error && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-orange-600 font-medium">En attente</p>
<<<<<<< HEAD
                  <p className="text-3xl font-bold text-orange-700">{stats.pending_requests}</p>
=======
                  <p className="text-2xl font-bold text-orange-700">{stats.pending_documents}</p>
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
<<<<<<< HEAD
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
=======
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Approuvés</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved_documents}</p>
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-600" />
                <div>
<<<<<<< HEAD
                  <p className="text-sm text-gray-600">Rejetées</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected_requests}</p>
=======
                  <p className="text-sm text-gray-600">Rejetés</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected_documents}</p>
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
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
<<<<<<< HEAD
                  <p className="text-2xl font-bold text-blue-600">{stats.total_requests}</p>
=======
                  <p className="text-2xl font-bold text-blue-600">{stats.total_documents}</p>
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
<<<<<<< HEAD
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Temps moyen</p>
                  <p className="text-lg font-bold text-purple-600">{stats.avg_processing_time}</p>
=======
                <Users className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Clients</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.active_clients}</p>
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
<<<<<<< HEAD
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
=======
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 min-w-[250px] w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Rechercher client, projet..." 
                className="pl-10" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={statusFilter === "all" ? "default" : "outline"} 
                onClick={() => setStatusFilter("all")}
                size="sm"
              >
                Tous ({stats?.total_documents || 0})
              </Button>
              
              <Button 
                variant={statusFilter === "pending" ? "default" : "outline"} 
                onClick={() => setStatusFilter("pending")}
                size="sm"
                className="border-orange-200 text-orange-600 hover:text-orange-700"
              >
                En attente ({stats?.pending_documents || 0})
              </Button>
              
              <Button 
                variant={statusFilter === "approved" ? "default" : "outline"} 
                onClick={() => setStatusFilter("approved")}
                size="sm"
                className="border-green-200 text-green-600 hover:text-green-700"
              >
                Approuvés ({stats?.approved_documents || 0})
              </Button>
              
              <Button 
                variant={statusFilter === "rejected" ? "default" : "outline"} 
                onClick={() => setStatusFilter("rejected")}
                size="sm"
                className="border-red-200 text-red-600 hover:text-red-700"
              >
                Rejetés ({stats?.rejected_documents || 0})
              </Button>
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
            </div>
          </div>
        </CardContent>
      </Card>

<<<<<<< HEAD
      {/* Liste des demandes */}
=======
      {/* Liste des clients */}
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
<<<<<<< HEAD
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
=======
            <p className="text-gray-600">Chargement des documents...</p>
          </CardContent>
        </Card>
      ) : filteredSubmissions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">Aucun document trouvé</h3>
            <p className="text-gray-500">Aucun document ne correspond aux critères de recherche</p>
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
<<<<<<< HEAD
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
=======
          {filteredSubmissions.map((submission) => (
            <Card key={submission.client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Informations client */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{submission.client.full_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {submission.client.company_name || 'Aucune entreprise'}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3" /> {submission.client.email}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      Dernière soumission: {formatDate(submission.latest_submission)}
                    </p>
                  </div>

                  {/* Bouton voir documents */}
                  <div className="flex md:items-center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSelectedClient(submission)}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Voir documents ({submission.documents.length})
                        </Button>
                      </DialogTrigger>
                      
                      {/* Modal des documents */}
                      <DialogContent className="max-w-6xl max-h-[90vh]">
                        <DialogHeader>
                          <DialogTitle>
                            Documents de {submission.client.full_name}
                          </DialogTitle>
                        </DialogHeader>
                        
                        <ScrollArea className="max-h-[75vh] pr-4">
                          <div className="space-y-4">
                            {submission.documents.length === 0 ? (
                              <div className="text-center py-8">
                                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500">Aucun document disponible</p>
                              </div>
                            ) : (
                              submission.documents.map((document) => (
                                <Card key={document.id} className="border">
                                  <CardContent className="p-4">
                                    <div className="flex flex-col lg:flex-row gap-4 justify-between">
                                      {/* Infos document */}
                                      <div className="flex-1">
                                        <div className="flex items-start gap-3 mb-2">
                                          <FileText className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                                          <div className="flex-1">
                                            <h4 className="font-medium mb-1">{document.name}</h4>
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                              <Badge className={getStatusColor(document.status)}>
                                                {getStatusLabel(document.status)}
                                              </Badge>
                                              <span className="text-xs text-muted-foreground">
                                                {formatFileSize(document.file_size)}
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                {formatDate(document.uploaded_at)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {document.description && (
                                          <p className="text-sm text-muted-foreground mb-2 pl-8">
                                            <strong>Description:</strong> {document.description}
                                          </p>
                                        )}

                                        {/* FIX: Affichage du message d'accompagnement */}
                                        {document.message_accompagnement && (
                                          <div className="bg-blue-50 p-3 rounded ml-8 mb-3 border border-blue-200">
                                            <p className="text-xs font-medium text-blue-700 mb-1">Message du client:</p>
                                            <p className="text-sm text-blue-600">{document.message_accompagnement}</p>
                                          </div>
                                        )}
                                        
                                        {/* Projet associé */}
                                        {(document.project || document.scraped_project) && (
                                          <div className="mb-3 pl-8">
                                            <p className="text-sm text-muted-foreground mb-2 font-medium">
                                              Projet associé:
                                            </p>
                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                      const project = document.project || document.scraped_project;
                                                      const source = document.project ? 'project' : 'scraped_project';
                                                      if (project) handleViewProject(project, source);
                                                    }}
                                                    className="p-0 h-auto text-blue-700 hover:text-blue-900 hover:bg-transparent font-medium text-left justify-start"
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      <FileText className="w-4 h-4" />
                                                      <span className="truncate max-w-[300px]">
                                                        {document.project?.title || document.scraped_project?.title}
                                                      </span>
                                                      <ExternalLink className="w-3 h-3 text-blue-500" />
                                                    </div>
                                                  </Button>
                                                  {(document.project?.organization || document.scraped_project?.organization) && (
                                                    <p className="text-xs text-blue-600 mt-1 ml-6">
                                                      {document.project?.organization || document.scraped_project?.organization}
                                                    </p>
                                                  )}
                                                </div>
                                                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300 flex-shrink-0">
                                                  {document.project ? 'Projet Django' : 'Projet Scrapé'}
                                                </Badge>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* FIX: Notes admin avec nouveau champ */}
                                        {(document.notes_admin || document.notes) && (
                                          <div className="bg-blue-50 p-3 rounded ml-8 mb-2">
                                            <p className="text-xs font-medium text-blue-700 mb-1">Notes administrateur:</p>
                                            <p className="text-sm text-blue-600">{document.notes_admin || document.notes}</p>
                                          </div>
                                        )}
                                        
                                        {/* FIX: Raison rejet avec nouveau champ */}
                                        {(document.motif_rejet || document.rejection_reason) && (
                                          <div className="bg-red-50 p-3 rounded ml-8 mb-2">
                                            <p className="text-xs font-medium text-red-700 mb-1">Raison du rejet:</p>
                                            <p className="text-sm text-red-600">{document.motif_rejet || document.rejection_reason}</p>
                                          </div>
                                        )}

                                        {document.reviewed_at && (
                                          <p className="text-xs text-muted-foreground ml-8">
                                            Traité le: {formatDate(document.reviewed_at)}
                                          </p>
                                        )}
                                      </div>
                                      
                                      {/* Actions */}
                                      <div className="flex flex-col gap-2 min-w-[200px]">
                                        {/* Bouton Voir le document */}
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={() => handleViewDocument(document)}
                                          className="gap-2 w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                                        >
                                          <Eye className="w-4 h-4" />
                                          Voir le document
                                        </Button>

                                        {/* Bouton Télécharger */}
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={() => handleDownloadDocument(document)}
                                          className="gap-2 w-full border-gray-200 text-gray-600 hover:bg-gray-50"
                                        >
                                          <Download className="w-4 h-4" />
                                          Télécharger
                                        </Button>
                                        
                                        {/* Bouton Traiter (pour documents en attente) */}
                                        {document.status === 'submitted' && (
                                          <Dialog>
                                            <DialogTrigger asChild>
                                              <Button 
                                                variant="default" 
                                                size="sm"
                                                onClick={() => {
                                                  setSelectedDocument(document);
                                                  setAdminNotes(document.notes_admin || document.notes || "");
                                                  setRejectionReason(document.motif_rejet || document.rejection_reason || "");
                                                }}
                                                className="gap-2 w-full bg-orange-600 hover:bg-orange-700"
                                              >
                                                <Settings className="w-4 h-4" />
                                                Traiter le document
                                              </Button>
                                            </DialogTrigger>
                                            
                                            <DialogContent className="max-w-2xl">
                                              <DialogHeader>
                                                <DialogTitle>Traiter le document</DialogTitle>
                                              </DialogHeader>
                                              
                                              <div className="space-y-4">
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                  <h4 className="font-medium text-lg">{selectedDocument?.name}</h4>
                                                  {selectedDocument?.description && (
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                      {selectedDocument.description}
                                                    </p>
                                                  )}
                                                  
                                                  {/* FIX: Affichage du message d'accompagnement dans le modal */}
                                                  {selectedDocument?.message_accompagnement && (
                                                    <div className="bg-blue-50 p-3 rounded mt-3 border border-blue-200">
                                                      <p className="text-xs font-medium text-blue-700 mb-1">Message du client:</p>
                                                      <p className="text-sm text-blue-600">{selectedDocument.message_accompagnement}</p>
                                                    </div>
                                                  )}
                                                  
                                                  <div className="flex items-center gap-2 mt-2">
                                                    <Badge className={getStatusColor(selectedDocument?.status || '')}>
                                                      {getStatusLabel(selectedDocument?.status || '')}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                      {selectedDocument && formatFileSize(selectedDocument.file_size)}
                                                    </span>
                                                  </div>
                                                  
                                                  {/* Boutons de vue et téléchargement dans le modal */}
                                                  <div className="flex gap-2 mt-3">
                                                    <Button 
                                                      variant="outline" 
                                                      size="sm"
                                                      onClick={() => selectedDocument && handleViewDocument(selectedDocument)}
                                                      className="gap-1"
                                                    >
                                                      <Eye className="w-3 h-3" />
                                                      Voir
                                                    </Button>
                                                    <Button 
                                                      variant="outline" 
                                                      size="sm"
                                                      onClick={() => selectedDocument && handleDownloadDocument(selectedDocument)}
                                                      className="gap-1"
                                                    >
                                                      <Download className="w-3 h-3" />
                                                      Télécharger
                                                    </Button>
                                                  </div>
                                                </div>
                                                
                                                <div>
                                                  <label className="block text-sm font-medium mb-2">
                                                    Notes administrateur (optionnel)
                                                  </label>
                                                  <Textarea 
                                                    placeholder="Ajoutez vos notes pour le client..." 
                                                    value={adminNotes}
                                                    onChange={(e) => setAdminNotes(e.target.value)}
                                                    rows={3}
                                                  />
                                                </div>
                                                
                                                <div>
                                                  <label className="block text-sm font-medium mb-2">
                                                    Raison du rejet (requis pour rejeter)
                                                  </label>
                                                  <Textarea 
                                                    placeholder="Expliquez pourquoi le document est rejeté..."
                                                    value={rejectionReason}
                                                    onChange={(e) => setRejectionReason(e.target.value)}
                                                    rows={3}
                                                  />
                                                </div>
                                                
                                                <div className="flex gap-3 justify-end pt-4 border-t">
                                                  <Button 
                                                    variant="destructive"
                                                    onClick={() => selectedDocument && handleRejectDocument(selectedDocument.id)}
                                                    disabled={isProcessing || !rejectionReason.trim()}
                                                    className="gap-2"
                                                  >
                                                    {isProcessing ? (
                                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                      <XCircle className="w-4 h-4" />
                                                    )}
                                                    Rejeter
                                                  </Button>
                                                  
                                                  <Button 
                                                    onClick={() => selectedDocument && handleApproveDocument(selectedDocument.id)}
                                                    disabled={isProcessing}
                                                    className="gap-2 bg-green-600 hover:bg-green-700"
                                                  >
                                                    {isProcessing ? (
                                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                      <CheckCircle className="w-4 h-4" />
                                                    )}
                                                    Approuver
                                                  </Button>
                                                </div>
                                              </div>
                                            </DialogContent>
                                          </Dialog>
                                        )}

                                        {/* États pour documents traités */}
                                        {document.status === 'approved' && (
                                          <div className="flex items-center justify-center gap-2 text-green-600 text-sm bg-green-50 p-2 rounded border border-green-200">
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="font-medium">Document approuvé</span>
                                          </div>
                                        )}

                                        {document.status === 'rejected' && (
                                          <div className="flex items-center justify-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
                                            <XCircle className="w-4 h-4" />
                                            <span className="font-medium">Document rejeté</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
<<<<<<< HEAD

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
=======
      
      {/* Modal de détails du projet */}
      <ProjectDetailModal />
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
    </div>
  );
};

<<<<<<< HEAD
export default AdminClientRequests;
=======
export default DocumentsAdminView;
>>>>>>> 3ba2d6bde43880a9fc36ede2f6988e2bfd295491
