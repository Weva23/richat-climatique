import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Bell, CheckCircle, XCircle, Clock, AlertTriangle, 
  User, Building, Mail, Phone, FileText, Star,
  Calendar, TrendingUp, Eye, Send, MessageSquare,
  Users, RefreshCw, Filter, Download, ExternalLink,
  Upload, Search, Settings
} from "lucide-react";

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

  useEffect(() => {
    loadDocuments();
  }, []);

  // FIX: Amélioration du système de toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 5000); // Masquer après 5 secondes
  };

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
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
    } finally {
      setIsLoading(false);
    }
  };

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
      return;
    }

    try {
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
    } finally {
      setIsProcessing(false);
    }
  };

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
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
  };

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
          <h1 className="text-2xl font-semibold text-foreground">Gestion des Documents</h1>
          <p className="text-muted-foreground">Documents soumis par les clients</p>
        </div>
        <Button variant="outline" onClick={loadDocuments} className="gap-2" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

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
          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-orange-600 font-medium">En attente</p>
                  <p className="text-2xl font-bold text-orange-700">{stats.pending_documents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Approuvés</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved_documents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Rejetés</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected_documents}</p>
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
                  <p className="text-2xl font-bold text-blue-600">{stats.total_documents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Clients</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.active_clients}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des clients */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Chargement des documents...</p>
          </CardContent>
        </Card>
      ) : filteredSubmissions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">Aucun document trouvé</h3>
            <p className="text-gray-500">Aucun document ne correspond aux critères de recherche</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Modal de détails du projet */}
      <ProjectDetailModal />
    </div>
  );
};

export default DocumentsAdminView;