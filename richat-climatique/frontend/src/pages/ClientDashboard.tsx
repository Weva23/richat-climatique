import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Search, Globe, Database, CheckCircle, Clock, Euro, TrendingUp,
  FileText, Star, ExternalLink, Calendar, AlertCircle, Send,
  Building, User, LogOut, Bell, Settings, Filter, RefreshCw,
  ChevronRight, MapPin, Banknote, Award, Users, Upload, X, AlertTriangle,
  ChevronLeft, ChevronRightIcon
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ScrapedProject {
  id: number;
  title: string;
  source: 'GEF' | 'GCF' | 'OTHER';
  description: string;
  organization: string;
  project_type: string;
  status: string;
  total_funding: string;
  funding_amount: number | null;
  currency: string;
  country: string;
  scraped_at: string;
  data_completeness_score: number;
  source_url: string;
  additional_links?: string;
}

interface Document {
  id: number;
  file: string;
  name: string;
  description: string;
  status: string;
  uploaded_at: string;
  project_title?: string;
  scraped_project_title?: string;
}

// FIX: Client API amélioré avec gestion d'erreurs et debug
// FIX: Correction de la construction de l'URL
const apiClient = {
  get: async (url: string) => {
    const token = localStorage.getItem('authToken');
    try {
      // FIX: N'ajoutez pas le préfixe api si l'URL commence déjà par /api/
      const fullUrl = url.startsWith('http') 
        ? url 
        : `http://127.0.0.1:8000${url.startsWith('/api') ? url : `/api${url}`}`;
      
      console.log(`🚀 API GET: ${fullUrl}`); // Debug log
      
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': token ? `Token ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`📊 Response status: ${response.status}`); // Debug log
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || errorData.detail || `Erreur HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ API Response for ${url}:`, data); // Debug log
      return data;
      
    } catch (error) {
      console.error(`❌ API Error for ${url}:`, error);
      throw error;
    }
  },
  
  post: async (url: string, data: any, isFormData = false) => {
    const token = localStorage.getItem('authToken');
    
    // FIX: Même correction pour POST
    const fullUrl = url.startsWith('http') 
      ? url 
      : `http://127.0.0.1:8000${url.startsWith('/api') ? url : `/api${url}`}`;
    
    const headers: any = {
      'Authorization': token ? `Token ${token}` : '',
    };
    
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      console.log(`🚀 API POST: ${fullUrl}`, { data: isFormData ? 'FormData' : data, isFormData }); // Debug log
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers,
        body: isFormData ? data : JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || errorData.detail || `Erreur HTTP ${response.status}`);
      }
      
      return response.json();
      
    } catch (error) {
      console.error(`❌ API POST Error for ${url}:`, error);
      throw error;
    }
  },
};

const ClientProjectSelection = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ScrapedProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<ScrapedProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);
  const [descriptions, setDescriptions] = useState<string[]>([]);
  const [myDocuments, setMyDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // État pour la pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    next: null as string | null,
    previous: null as string | null,
  });

  // FIX: Ajouter un état pour les statistiques
  const [stats, setStats] = useState({
    total_projects: 0,
    submitted_docs: 0,
    approved_docs: 0,
    rejected_docs: 0, // FIX: Ajouter rejected_docs
    pending_docs: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter(file => {
        // Vérifier le type de fichier
        const allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif'];
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (!fileExtension || !allowedTypes.includes(fileExtension)) {
          toast.error(`Type de fichier non autorisé: ${file.name}`);
          return false;
        }
        
        // Vérifier la taille (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Fichier trop volumineux: ${file.name} (max 10MB)`);
          return false;
        }
        
        return true;
      });

      if (validFiles.length > 0) {
        setDocuments(prev => [...prev, ...validFiles]);
        setDescriptions(prev => [...prev, ...Array(validFiles.length).fill('')]);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    console.log('🎯 Component mounted, loading data...');
    loadData();
  }, []);

  // FIX: Fonction de chargement centralisée
  const loadData = async () => {
    await Promise.all([
      loadScrapedProjects(),
      loadMyDocuments()
    ]);
  };

  // FIX: Fonction de chargement des projets scrapés avec pagination
  const loadScrapedProjects = async (url?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📂 Début chargement projets scrapés...');
      
      // Utiliser l'URL fournie ou l'URL par défaut
      const apiUrl = url || '/scraped-projects/';
      const data = await apiClient.get(apiUrl);
      
      console.log('📋 Données reçues:', data);
      
      // FIX: Gérer différents formats de réponse
      let projectsData = [];
      let paginationInfo = {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        next: null as string | null,
        previous: null as string | null,
      };
      
      if (data.results && Array.isArray(data.results)) {
        // Format paginé
        projectsData = data.results;
        console.log('📄 Format paginé détecté');
        
        // Extraire les informations de pagination
        paginationInfo = {
          currentPage: Math.floor((data.offset || 0) / (data.limit || 10)) + 1 || 1,
          totalPages: Math.ceil((data.count || 0) / (data.limit || 10)) || 1,
          totalCount: data.count || 0,
          next: data.next,
          previous: data.previous,
        };
      } else if (Array.isArray(data)) {
        // Format array direct
        projectsData = data;
        paginationInfo.totalCount = data.length;
        console.log('📋 Format array direct détecté');
      } else {
        console.warn('⚠️ Format de données inattendu:', data);
        projectsData = [];
      }
      
      setProjects(projectsData);
      setPagination(paginationInfo);
      
      console.log(`✅ ${projectsData.length} projets chargés (page ${paginationInfo.currentPage}/${paginationInfo.totalPages})`);
      
      // FIX: Mettre à jour les stats
      setStats(prev => ({
        ...prev,
        total_projects: paginationInfo.totalCount
      }));
      
      if (projectsData.length === 0) {
        setError('Aucun projet disponible pour le moment');
        toast.warning('Aucun projet trouvé dans la base de données');
      }
      
    } catch (error: any) {
      console.error('❌ Erreur chargement projets:', error);
      setError(`Impossible de charger les projets: ${error.message}`);
      toast.error('Erreur lors du chargement des projets');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyDocuments = async () => {
    try {
      console.log('📄 Chargement documents utilisateur...');
      
      // FIX: Vérifier l'authentification avant de charger
      if (!user) {
        console.log('👤 Utilisateur non connecté, skip chargement documents');
        return;
      }
      
      const data = await apiClient.get('/documents/my_documents/');
      const documentsData = data.results || data || [];
      
      console.log(`📊 ${documentsData.length} documents utilisateur chargés`);
      setMyDocuments(documentsData);
      
      // FIX: Calculer les statistiques des documents avec rejected inclus
      const submitted = documentsData.filter(d => d.status === 'submitted').length;
      const approved = documentsData.filter(d => d.status === 'approved').length;
      const rejected = documentsData.filter(d => d.status === 'rejected').length; // FIX: Ajouter rejected
      const pending = documentsData.filter(d => d.status === 'pending' || d.status === 'submitted').length;
      
      setStats(prev => ({
        ...prev,
        submitted_docs: documentsData.length,
        approved_docs: approved,
        rejected_docs: rejected, // FIX: Inclure rejected
        pending_docs: pending
      }));
      
    } catch (error: any) {
      console.error('❌ Erreur chargement documents:', error);
      // Ne pas afficher d'erreur toast ici car ce n'est pas critique
      setMyDocuments([]);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSource = sourceFilter === "all" || project.source === sourceFilter;
    
    return matchesSearch && matchesSource;
  });

  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
    setDescriptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleDescriptionChange = (index: number, value: string) => {
    const newDescriptions = [...descriptions];
    newDescriptions[index] = value;
    setDescriptions(newDescriptions);
  };

  const handleSubmitDocuments = async () => {
    if (!selectedProject) {
      toast.error('Aucun projet sélectionné');
      return;
    }

    if (documents.length === 0) {
      toast.error('Veuillez ajouter au moins un document');
      return;
    }

    if (!requestMessage.trim()) {
      toast.error('Veuillez ajouter un message d\'accompagnement');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const formData = new FormData();
      formData.append('project_id', selectedProject.id.toString());
      formData.append('message', requestMessage.trim());
      
      // Ajouter les fichiers
      documents.forEach((file) => {
        formData.append('files', file);
      });
      
      // Ajouter les descriptions
      descriptions.forEach((description) => {
        formData.append('descriptions', description);
      });

      console.log('📤 Envoi des données:', {
        project_id: selectedProject.id,
        message: requestMessage,
        files_count: documents.length,
        descriptions_count: descriptions.length
      });

      const response = await apiClient.post(
        '/documents/submit_project_documents/',
        formData,
        true  // Indique que c'est FormData
      );
      
      toast.success(response.message || 'Documents soumis avec succès !');
      
      // Réinitialiser le formulaire
      setSelectedProject(null);
      setRequestMessage("");
      setDocuments([]);
      setDescriptions([]);
      setDialogOpen(false);
      
      // Recharger les documents
      loadMyDocuments();
      
    } catch (error: any) {
      console.error('❌ Erreur soumission:', error);
      toast.error(error.message || 'Erreur lors de la soumission des documents');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'GEF': return "bg-green-100 text-green-800 border-green-200";
      case 'GCF': return "bg-blue-100 text-blue-800 border-blue-200";
      case 'OTHER': return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
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
    if (!dateString) return 'Date inconnue';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return <FileText className="w-4 h-4 text-red-500" />;
      case 'doc':
      case 'docx': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'xls':
      case 'xlsx': return <FileText className="w-4 h-4 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png': return <FileText className="w-4 h-4 text-purple-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return "bg-green-100 text-green-800";
      case 'rejected': return "bg-red-100 text-red-800";
      case 'submitted': return "bg-blue-100 text-blue-800";
      case 'pending': return "bg-orange-100 text-orange-800"; // FIX: Ajouter pending
      case 'draft': return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approuvé';
      case 'rejected': return 'Rejeté';
      case 'submitted': return 'En attente';
      case 'pending': return 'En attente';
      case 'draft': return 'Brouillon';
      default: return status;
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
             
              <div>
                <h1 className="text-2xl font-bold text-blue-600">
                  RICHAT
                </h1>
                <p className="text-blue-600">
                  Funding Tracker
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
             
              
              <Button 
                variant="outline" 
                onClick={() => navigate('/documents-client')}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Mes Documents
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/profile-client')}
                className="gap-2"
              >
                <User className="w-4 h-4" />
                Profile
              </Button>
              
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
        {/* Message d'accueil */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-4">
            <Database className="w-8 h-8 text-blue-600 mt-1" />
            <div>
              <h2 className="text-xl font-semibold text-blue-900 mb-2">
                🎯 Sélectionnez un Projet et Soumettez vos Documents
              </h2>
              <p className="text-blue-800 mb-4">
                Bienvenue <strong>{user?.full_name}</strong> ! Explorez notre base de données de projets de financement climatique 
                et sélectionnez un projet pour soumettre votre candidature avec les documents nécessaires.
              </p>
            </div>
          </div>
        </div>

        {/* FIX: Message d'erreur si problème de chargement */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-start space-x-4">
              <AlertCircle className="w-8 h-8 text-red-600 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Erreur de chargement
                </h3>
                <p className="text-red-800 mb-4">{error}</p>
                <Button onClick={() => loadScrapedProjects()} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réessayer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* FIX: Statistiques avec rejected inclus */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Projets disponibles</p>
                  <p className="text-2xl font-bold">{stats.total_projects}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50">
                  <Database className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Documents soumis</p>
                  <p className="text-2xl font-bold">{stats.submitted_docs}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Docs approuvés</p>
                  <p className="text-2xl font-bold">{stats.approved_docs}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* FIX: Ajouter la card pour les documents rejetés */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Docs rejetés</p>
                  <p className="text-2xl font-bold">{stats.rejected_docs}</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">En attente</p>
                  <p className="text-2xl font-bold">{stats.pending_docs}</p>
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
                    <SelectItem value="OTHER">Autres sources</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => loadScrapedProjects()}
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

        {/* Liste des Projets */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Chargement des projets...</p>
            </CardContent>
          </Card>
        ) : filteredProjects.length === 0 && !error ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                Aucun projet trouvé
              </h3>
              <p className="text-gray-500">
                {projects.length === 0 
                  ? "Aucun projet disponible pour le moment"
                  : "Essayez de modifier vos critères de recherche"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {filteredProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className={`hover:shadow-lg transition-all duration-200 border-l-4 ${
                    selectedProject?.id === project.id 
                      ? 'border-l-blue-500 bg-blue-50/30' 
                      : 'border-l-gray-200'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        <Checkbox
                          checked={selectedProject?.id === project.id}
                          onCheckedChange={() => setSelectedProject(project)}
                        />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                                {project.title || 'Titre non disponible'}
                              </h3>
                              <Badge className={getSourceColor(project.source)}>
                                {project.source}
                              </Badge>
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
                                value={project.data_completeness_score || 0} 
                                className="w-16 h-2"
                              />
                              <span className="font-bold text-blue-600">
                                {project.data_completeness_score || 0}%
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-gray-500 font-medium">Date collecte</p>
                            <p className="font-semibold">
                              {formatDate(project.scraped_at)}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-4">
                          {(project.source_url || project.additional_links) && (
                            <Button variant="outline" size="sm" asChild>
                              <a 
                                href={project.additional_links || project.source_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Voir la source
                              </a>
                            </Button>
                          )}
                          
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => {
                              setSelectedProject(project);
                              setDialogOpen(true);
                            }}
                            disabled={!selectedProject || selectedProject.id !== project.id}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Soumettre des documents
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center mt-8 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadScrapedProjects(pagination.previous || undefined)}
                  disabled={!pagination.previous}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Précédent
                </Button>
                
               
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadScrapedProjects(pagination.next || undefined)}
                  disabled={!pagination.next}
                >
                  Suivant
                  <ChevronRightIcon className="w-4 h-4 ml-1" />
                </Button>
                
                <span className="text-sm text-gray-500 ml-2">
                  {pagination.totalCount} projets au total
                </span>
              </div>
            )}
          </>
        )}

        {/* Dialog de soumission */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Soumettre des documents pour le projet</DialogTitle>
              {selectedProject && (
                <p className="text-sm font-medium text-gray-600">
                  {selectedProject.title}
                </p>
              )}
            </DialogHeader>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Message d'accompagnement *
                </label>
                <Textarea
                  placeholder="Expliquez votre intérêt pour ce projet, votre expérience et vos qualifications..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Décrivez pourquoi ce projet vous intéresse et comment vous comptez contribuer
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Documents à soumettre (1-10) *
                </label>
                
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={triggerFileInput}
                >
                  <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    Cliquez pour sélectionner des fichiers
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Formats acceptés: PDF, Word, Excel, Images (max 10MB par fichier)
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
                    className="hidden"
                  />
                </div>
             
                
                {/* Liste des documents sélectionnés */}
                {documents.length > 0 && (
                  <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
                    <h4 className="text-sm font-medium">Documents sélectionnés ({documents.length})</h4>
                    {documents.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
                        <div className="flex-shrink-0">
                          {getFileIcon(file.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Input
                          type="text"
                          placeholder="Description (optionnelle)"
                          value={descriptions[index] || ''}
                          onChange={(e) => handleDescriptionChange(index, e.target.value)}
                          className="flex-1 max-w-xs text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDocument(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Informations utilisateur */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Vos informations de contact :</h4>
                <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                  <div><span className="font-medium">Nom :</span> {user?.full_name}</div>
                  <div><span className="font-medium">Email :</span> {user?.email}</div>
                  <div><span className="font-medium">Entreprise :</span> {user?.company_name || 'Non renseigné'}</div>
                  <div><span className="font-medium">Téléphone :</span> {user?.phone || 'Non renseigné'}</div>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmitDocuments}
                  disabled={isSubmitting || documents.length === 0 || !requestMessage.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Soumettre ({documents.length} document{documents.length > 1 ? 's' : ''})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Footer informatif */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6 text-center">
            <div className="mt-6 p-4 bg-white rounded border border-blue-200">
              <p className="text-xs text-blue-600">
                📧 Contact : <strong>oumar.parhe-sow@richat-partners.com</strong> | 
                📞 Support : <strong>+222 36 84 24 46</strong> | 
                🌐 Bureau : Nouakchott, Mauritanie
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ClientProjectSelection;