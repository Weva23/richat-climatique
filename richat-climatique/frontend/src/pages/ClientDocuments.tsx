import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, ExternalLink, Calendar, Database, 
  Building, User, LogOut, CheckCircle, AlertCircle, Clock,
  Download, Filter, Search, ChevronLeft,
  Upload,
  RefreshCw
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import apiClient from '@/services/api';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Document {
  id: number;
  file: string;
  name: string;
  description: string;
  status: string;
  uploaded_at: string;
  project_title?: string;
  scraped_project_title?: string;
  message?: string;
  reviewed_at?: string;
  review_notes?: string;
}

const ClientDocuments = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadMyDocuments();
  }, []);

  const loadMyDocuments = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get('/documents/my_documents/');
      const documentsData = data.results || data || [];
      setDocuments(documentsData);
    } catch (error: any) {
      console.error('❌ Erreur chargement documents:', error);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    const matchesSearch = 
      doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.project_title || doc.scraped_project_title || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return "bg-green-100 text-green-800";
      case 'rejected': return "bg-red-100 text-red-800";
      case 'submitted': return "bg-blue-100 text-blue-800";
      case 'pending': return "bg-orange-100 text-orange-800";
      case 'draft': return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approuvé';
      case 'rejected': return 'Rejeté';
      case 'submitted': return 'Soumis';
      case 'pending': return 'En attente';
      case 'draft': return 'Brouillon';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date inconnue';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000${fileUrl}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast.error('Erreur lors du téléchargement du fichier');
    }
  };

  const getStats = () => {
    const total = documents.length;
    const approved = documents.filter(d => d.status === 'approved').length;
    const rejected = documents.filter(d => d.status === 'rejected').length;
    const pending = documents.filter(d => d.status === 'pending' || d.status === 'submitted').length;
    
    return { total, approved, rejected, pending };
  };

  const stats = getStats();

  // Fonction pour construire l'URL complète de l'image
  const getProfilePictureUrl = (profilePicture: string | null | undefined) => {
    if (!profilePicture) return "";
    
    if (profilePicture.startsWith('http')) {
      return profilePicture;
    } else {
      // Construire l'URL complète depuis le chemin relatif
      return `http://localhost:8000${profilePicture.startsWith('/') ? '' : '/'}${profilePicture}`;
    }
  };

  // Déterminer le rôle affiché
  const roleDisplay = user?.role_display || (user?.is_admin ? "Administrateur" : "Client");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Client */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/client-dashboard')}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Retour aux projets
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Mes Documents
                </h1>
                <p className="text-gray-600">
                  {user?.company_name || user?.full_name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Client connecté
              </Badge>
              
              <Button onClick={logout} variant="destructive" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
               {/* Photo de profil en haut à droite */}
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage 
                    src={getProfilePictureUrl(user?.profile_picture)} 
                    alt={user?.full_name || "Profile"} 
                    onError={(e) => {
                      // En cas d'erreur de chargement de l'image, on cache l'élément image
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <AvatarFallback className="bg-blue-100 text-blue-800">
                    {user?.initials || (user?.first_name?.[0] || "") + (user?.last_name?.[0] || "")}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">{user?.full_name || user?.username}</p>
                  <p className="text-xs text-gray-500">{user?.company_name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total documents</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Approuvés</p>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Rejetés</p>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">En attente</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-50">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher des documents..."
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
                    <SelectItem value="submitted">Soumis</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="approved">Approuvé</SelectItem>
                    <SelectItem value="rejected">Rejeté</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={loadMyDocuments}
                  className="gap-2"
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des documents */}
        <Card>
          <CardHeader>
            <CardTitle>
              Documents ({filteredDocuments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Chargement des documents...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 mb-2">Aucun document trouvé</p>
                <p className="text-xs text-gray-400">
                  {documents.length === 0 
                    ? "Vous n'avez pas encore soumis de documents" 
                    : "Essayez de modifier vos critères de recherche"
                  }
                </p>
                {documents.length === 0 && (
                  <Button 
                    onClick={() => navigate('/client/projects')}
                    className="mt-4"
                  >
                    Soumettre des documents
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDocuments.map(doc => (
                  <Card key={doc.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-lg">
                                  {doc.name || (doc.file ? doc.file.split('/').pop() : 'Document sans nom')}
                                </h3>
                                <Badge className={`capitalize ${getStatusColor(doc.status)}`}>
                                  {getStatusLabel(doc.status)}
                                </Badge>
                              </div>
                              
                              <p className="text-gray-600 mb-4">
                                {doc.description || 'Aucune description'}
                              </p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>Soumis le: {formatDate(doc.uploaded_at)}</span>
                                </div>
                                
                                {doc.reviewed_at && (
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Traîté le: {formatDate(doc.reviewed_at)}</span>
                                  </div>
                                )}
                                
                                {doc.project_title && (
                                  <div className="flex items-center gap-2">
                                    <Database className="w-4 h-4" />
                                    <span>Projet: {doc.project_title}</span>
                                  </div>
                                )}
                                
                                {doc.scraped_project_title && (
                                  <div className="flex items-center gap-2">
                                    <Database className="w-4 h-4" />
                                    <span>Projet: {doc.scraped_project_title}</span>
                                  </div>
                                )}
                              </div>
                              
                              {doc.message && (
                                <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                                  <p className="text-sm font-medium text-blue-800 mb-1">Votre message:</p>
                                  <p className="text-sm text-blue-700">{doc.message}</p>
                                </div>
                              )}
                              
                              {doc.review_notes && (
                                <div className={`mt-4 p-3 rounded border ${
                                  doc.status === 'approved' 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-red-50 border-red-200'
                                }`}>
                                  <p className="text-sm font-medium mb-1">
                                    {doc.status === 'approved' ? 'Notes d\'approbation:' : 'Raison du rejet:'}
                                  </p>
                                  <p className="text-sm">
                                    {doc.review_notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 p-6 flex flex-col justify-center gap-2 md:w-48">
                          {doc.file && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadFile(doc.file, doc.name || 'document')}
                                className="w-full gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Télécharger
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <a href={`http://127.0.0.1:8000${doc.file}`} target="_blank" rel="noopener noreferrer" className="gap-2">
                                  <ExternalLink className="w-4 h-4" />
                                  Ouvrir
                                </a>
                              </Button>
                            </>
                          )}
                          
                          
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ClientDocuments;