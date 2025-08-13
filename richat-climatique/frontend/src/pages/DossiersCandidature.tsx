import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { 
  Search, FileText, Folder, Upload, Download, Eye, MoreHorizontal,
  Calendar, Clock, CheckCircle, AlertCircle, Filter, Plus,
  FolderOpen, FileSpreadsheet, Image, Video, Presentation,
  File, Archive, RefreshCw, Users, Building2, Database,
  TrendingUp, Target, Bell, XCircle, AlertTriangle,
  CheckSquare, FileX, ClipboardList, ExternalLink,
  ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Wifi, WifiOff
} from "lucide-react";

// Import de votre Header existant
import Header from "../components/Layout/Header";

// Types étendus pour les nouvelles fonctionnalités
interface Document {
  id: number;
  nom: string;
  type: string;
  statut: 'pending' | 'submitted' | 'approved' | 'rejected' | 'expired' | 'missing';
  date_soumission: string;
  date_expiration: string | null;
  id_projet: number;
  chemin_fichier: string;
  taille?: number;
  extension?: string;
  required?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

interface Project {
  id: number | string;
  name: string;
  status: string;
  consultant_details?: {
    full_name: string;
  };
  documents_count: number;
  fund_display: string;
  description?: string;
  completion_percentage?: number;
  missing_documents?: string[];
  expired_documents?: number;
  scraped_title?: string;
  source?: string;
  source_url?: string;
  type?: 'project' | 'scraped';
  scraped_data?: {
    organization?: string;
    funding_amount?: number;
    total_funding?: string;
    region?: string;
    focal_areas?: string;
    data_completeness_score?: number;
    is_relevant_for_mauritania?: boolean;
    can_create_project?: boolean;
    scraped_at?: string;
  };
}

const DocumentsInterface = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | string | null>(null);
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('overview');
  
  // Pagination et filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  
  // Upload
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    nom: '',
    type: '',
    id_projet: 0,
    date_expiration: '',
    fichier: null as File | null
  });

  // Charger les types de documents au démarrage
  useEffect(() => {
    loadDocumentTypes();
  }, []);

  useEffect(() => {
    loadAllData();
  }, [currentPage, searchTerm]);

  const buildApiUrl = (endpoint: string, page: number = 1) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    
    if (searchTerm.trim() && endpoint === 'scraped-projects') {
      params.append('search', searchTerm.trim());
    }
    
    return `http://127.0.0.1:8000/api/${endpoint}/?${params.toString()}`;
  };

  const loadAllProjectsPages = async (endpoint: string) => {
    const allResults = [];
    let currentPageNum = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const url = buildApiUrl(endpoint, currentPageNum);
        console.log(`Chargement ${endpoint} page ${currentPageNum}:`, url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const results = data.results || data;
        
        if (Array.isArray(results)) {
          allResults.push(...results);
        } else if (results) {
          allResults.push(results);
        }

        hasMore = data.next !== null && data.next !== undefined;
        currentPageNum++;

        if (currentPageNum > 100) {
          console.warn(`Arrêt après 100 pages pour ${endpoint}`);
          break;
        }

      } catch (err) {
        console.error(`Erreur lors du chargement de ${endpoint} page ${currentPageNum}:`, err);
        hasMore = false;
      }
    }

    console.log(`Total ${endpoint} chargés:`, allResults.length);
    return allResults;
  };

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Début du chargement optimisé...');

      // Charger d'abord une page de chaque endpoint pour affichage rapide
      const [firstProjectsPage, firstDocumentsPage, firstScrapedPage] = await Promise.all([
        loadSinglePage('projects', 1),
        loadSinglePage('documents', 1), 
        loadSinglePage('scraped-projects', 1)
      ]);

      console.log('✅ Première page chargée rapidement');

      // Traiter et afficher immédiatement les premières données
      const quickProjects = processProjectsData(
        firstProjectsPage.results || [],
        firstDocumentsPage.results || [],
        firstScrapedPage.results || []
      );

      setProjects(quickProjects);
      setDocuments(firstDocumentsPage.results || []);
      
      if (quickProjects.length > 0) {
        setSelectedProject(quickProjects[0].id);
        setCurrentProjectIndex(0);
      }

      // Marquer comme non-loading pour l'affichage initial
      setIsLoading(false);

      // Charger le reste en arrière-plan si nécessaire
      if (firstProjectsPage.next || firstDocumentsPage.next || firstScrapedPage.next) {
        console.log('🔄 Chargement du reste en arrière-plan...');
        loadRemainingDataInBackground(quickProjects);
      }

    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setIsLoading(false);
    }
  };

  const loadSinglePage = async (endpoint: string, page: number = 1) => {
    const url = buildApiUrl(endpoint, page);
    console.log(`Chargement page ${page} de ${endpoint}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  };

  const loadRemainingDataInBackground = async (initialProjects: Project[]) => {
    try {
      // Charger toutes les pages restantes en arrière-plan
      const [allProjects, allDocuments, allScrapedProjects] = await Promise.all([
        loadAllProjectsPages('projects'),
        loadAllProjectsPages('documents'),
        loadAllProjectsPages('scraped-projects')
      ]);

      console.log('🎯 Toutes les données chargées en arrière-plan');

      // Traiter toutes les données
      const completeProjects = processProjectsData(allProjects, allDocuments, allScrapedProjects);
      
      // Mettre à jour avec toutes les données
      setProjects(completeProjects);
      setDocuments(allDocuments);

      console.log('✅ Interface mise à jour avec toutes les données');
    } catch (err) {
      console.error('⚠️ Erreur chargement arrière-plan:', err);
      // Ne pas afficher d'erreur car l'interface fonctionne déjà avec les premières données
    }
  };

  const processProjectsData = (projectsList: any[], documentsList: any[], scrapedProjectsList: any[]) => {
    const allProjects = [];

    // 1. Traiter les projets existants
    projectsList.forEach((project: any) => {
      const projectDocuments = documentsList.filter((doc: any) => 
        doc.project === project.id || doc.id_projet === project.id
      );

      const linkedScrapedProject = scrapedProjectsList.find((scraped: any) => 
        scraped.linked_project === project.id
      );

      allProjects.push({
        id: project.id,
        name: project.name || project.title,
        status: project.status,
        fund_display: project.fund_display || linkedScrapedProject?.source_display || "Non spécifié",
        documents_count: projectDocuments.length,
        completion_percentage: project.completion_percentage || Math.round((projectDocuments.filter((doc: any) => doc.statut === 'approved' || doc.status === 'approved').length / Math.max(projectDocuments.length, 1)) * 100),
        missing_documents: project.missing_documents || [],
        expired_documents: projectDocuments.filter((doc: any) => doc.statut === 'expired' || doc.status === 'expired').length,
        consultant_details: project.consultant_details || { full_name: project.consultant?.full_name || "Non assigné" },
        scraped_title: linkedScrapedProject?.title,
        source: linkedScrapedProject?.source,
        source_url: linkedScrapedProject?.source_url,
        description: project.description || linkedScrapedProject?.description,
        type: 'project'
      });
    });

    // 2. Traiter les projets scrapés non convertis
    scrapedProjectsList.forEach((scrapedProject: any) => {
      if (!scrapedProject.linked_project) {
        allProjects.push({
          id: `scraped_${scrapedProject.id}`,
          name: scrapedProject.title,
          status: 'scraped',
          fund_display: scrapedProject.source_display || `${scrapedProject.source} - Non converti`,
          documents_count: 0,
          completion_percentage: 0,
          missing_documents: ['Conversion en projet requis'],
          expired_documents: 0,
          consultant_details: { full_name: "Non assigné" },
          scraped_title: scrapedProject.title,
          source: scrapedProject.source,
          source_url: scrapedProject.source_url,
          description: scrapedProject.description,
          type: 'scraped',
          scraped_data: {
            organization: scrapedProject.organization,
            funding_amount: scrapedProject.funding_amount,
            total_funding: scrapedProject.total_funding,
            region: scrapedProject.region,
            focal_areas: scrapedProject.focal_areas,
            data_completeness_score: scrapedProject.data_completeness_score,
            is_relevant_for_mauritania: scrapedProject.is_relevant_for_mauritania,
            can_create_project: scrapedProject.can_create_project,
            scraped_at: scrapedProject.scraped_at
          }
        });
      }
    });

    // Filtrer selon la recherche
    let filteredProjects = allProjects;
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filteredProjects = allProjects.filter(project => 
        project.name.toLowerCase().includes(searchLower) ||
        (project.scraped_title && project.scraped_title.toLowerCase().includes(searchLower)) ||
        (project.description && project.description.toLowerCase().includes(searchLower))
      );
    }

    return filteredProjects;
  };
  
  // Données calculées pour la sidebar
  const totalDocuments = documents.length;
  const missingDocuments = documents.filter(d => d.statut === 'missing').length;
  const expiredDocuments = documents.filter(d => d.statut === 'expired').length;
  const pendingDocuments = documents.filter(d => d.statut === 'pending').length;
  const approvedDocuments = documents.filter(d => d.statut === 'approved').length;
  const recentSubmissions = documents.filter(d => {
    if (!d.date_soumission) return false;
    const submitDate = new Date(d.date_soumission);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return submitDate >= weekAgo;
  }).length;

  const sidebarItems = [
    {
      id: 'overview',
      icon: <Database className="w-4 h-4" />,
      title: "Vue d'ensemble",
      subtitle: "Tableau de bord principal",
      count: totalDocuments,
      active: activeView === 'overview'
    },
    {
      id: 'missing',
      icon: <FileX className="w-4 h-4" />,
      title: "Documents manquants",
      subtitle: "Pièces non soumises par projet",
      count: missingDocuments,
      active: activeView === 'missing',
      urgent: missingDocuments > 0
    },
    {
      id: 'submissions',
      icon: <TrendingUp className="w-4 h-4" />,
      title: "Suivi des soumissions",
      subtitle: "Historique et statuts",
      count: recentSubmissions,
      active: activeView === 'submissions'
    },
    {
      id: 'expired',
      icon: <AlertTriangle className="w-4 h-4" />,
      title: "Alertes documents expirés",
      subtitle: "Échéances dépassées",
      count: expiredDocuments,
      active: activeView === 'expired',
      urgent: expiredDocuments > 0
    },
    {
      id: 'checklist',
      icon: <ClipboardList className="w-4 h-4" />,
      title: "Checklist des pièces",
      subtitle: "Documents requis par projet",
      count: projects.length,
      active: activeView === 'checklist'
    },
    {
      id: 'notifications',
      icon: <Bell className="w-4 h-4" />,
      title: "Notifications récentes",
      subtitle: "Dernières activités",
      count: 5,
      active: activeView === 'notifications'
    }
  ];

  const getProjectDocuments = (projectId: number | string) => {
    if (typeof projectId === 'string' && projectId.startsWith('scraped_')) {
      return [];
    }
    return documents.filter(doc => 
      doc.id_projet === projectId || (doc as any).project === projectId
    );
  };

  const navigateToProject = (direction: 'next' | 'prev') => {
    const totalProjects = projects.length;
    if (totalProjects === 0) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = currentProjectIndex + 1 >= totalProjects ? 0 : currentProjectIndex + 1;
    } else {
      newIndex = currentProjectIndex - 1 < 0 ? totalProjects - 1 : currentProjectIndex - 1;
    }

    setCurrentProjectIndex(newIndex);
    setSelectedProject(projects[newIndex].id);
  };

  const goToProject = (projectId: number | string) => {
    const index = projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
      setCurrentProjectIndex(index);
      setSelectedProject(projectId);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return "bg-green-100 text-green-800 border-green-200";
      case 'submitted': return "bg-blue-100 text-blue-800 border-blue-200";
      case 'pending': return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'rejected': return "bg-red-100 text-red-800 border-red-200";
      case 'expired': return "bg-orange-100 text-orange-800 border-orange-200";
      case 'missing': return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return <File className="w-5 h-5 text-red-600" />;
      case 'doc':
      case 'docx': return <FileText className="w-5 h-5 text-blue-600" />;
      case 'xls':
      case 'xlsx': return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      default: return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  // État pour stocker les types de documents disponibles
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);

  // Charger les types de documents au démarrage
  useEffect(() => {
    loadDocumentTypes();
  }, []);

  const loadDocumentTypes = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/document-types/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const types = data.results || data;
        setDocumentTypes(Array.isArray(types) ? types : []);
        console.log('✅ Types de documents chargés:', types);
      } else {
        console.warn('⚠️ Impossible de charger les types de documents');
        // Créer des types par défaut s'ils n'existent pas
        await createDefaultDocumentTypes();
      }
    } catch (err) {
      console.error('❌ Erreur chargement types:', err);
      await createDefaultDocumentTypes();
    }
  };

  const createDefaultDocumentTypes = async () => {
    const defaultTypes = [
      { name: 'Proposal', description: 'Proposition de projet' },
      { name: 'Technical', description: 'Document technique' },
      { name: 'Financial', description: 'Document financier' },
      { name: 'Environmental', description: 'Évaluation environnementale' },
      { name: 'Legal', description: 'Document juridique' },
      { name: 'Report', description: 'Rapport' },
      { name: 'Other', description: 'Autre type' }
    ];

    const createdTypes = [];
    for (const type of defaultTypes) {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/document-types/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...type,
            obligatoire: true
          })
        });

        if (response.ok) {
          const newType = await response.json();
          createdTypes.push(newType);
          console.log('✅ Type créé:', newType);
        }
      } catch (err) {
        console.error('❌ Erreur création type:', type.name, err);
      }
    }

    setDocumentTypes(createdTypes);
  };

  const handleUploadDocument = async () => {
    try {
      // Validation des champs
      if (!uploadData.nom.trim()) {
        alert("Veuillez saisir un nom pour le document");
        return;
      }
      
      if (!uploadData.type.trim()) {
        alert("Veuillez sélectionner un type de document");
        return;
      }
      
      if (!uploadData.id_projet || uploadData.id_projet === 0) {
        alert("Veuillez sélectionner un projet");
        return;
      }

      if (!uploadData.fichier) {
        alert("Veuillez sélectionner un fichier à importer");
        return;
      }

      // Vérifier la taille du fichier (max 10MB)
      if (uploadData.fichier.size > 10 * 1024 * 1024) {
        alert("Le fichier est trop volumineux. Taille maximum : 10MB");
        return;
      }

      console.log('📤 Envoi du document:', {
        nom: uploadData.nom,
        type: uploadData.type,
        projet: uploadData.id_projet,
        fichier: uploadData.fichier.name,
        taille: `${(uploadData.fichier.size / 1024 / 1024).toFixed(2)} MB`
      });

      // Trouver l'ID du type de document
      const selectedType = documentTypes.find(type => type.name === uploadData.type);
      if (!selectedType) {
        alert(`Type de document "${uploadData.type}" non trouvé. Veuillez rafraîchir la page et réessayer.`);
        return;
      }

      console.log('✅ Type trouvé:', selectedType);

      // Créer le FormData avec l'ID du type
      const formData = new FormData();
      formData.append('name', uploadData.nom.trim());
      formData.append('document_type', selectedType.id.toString()); // Utiliser l'ID, pas le nom
      formData.append('project', uploadData.id_projet.toString());
      formData.append('status', 'submitted');
      
      if (uploadData.date_expiration) {
        formData.append('date_expiration', uploadData.date_expiration);
      }
      
      formData.append('file', uploadData.fichier);

      // Log pour debug
      console.log('📤 Données envoyées avec document_type ID:', selectedType.id);

      const response = await fetch('http://127.0.0.1:8000/api/documents/', {
        method: 'POST',
        body: formData,
      });

      console.log('📥 Réponse serveur:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Document ajouté avec succès:', result);
        
        alert("Document ajouté avec succès !");
        
        // Réinitialiser le formulaire
        setUploadDialogOpen(false);
        setUploadData({
          nom: '',
          type: '',
          id_projet: 0,
          date_expiration: '',
          fichier: null
        });
        
        // Recharger les données
        loadAllData();
      } else {
        // Gérer les erreurs HTTP
        let errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          console.error('❌ Erreur détaillée:', errorData);
          
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else {
            // Formater les erreurs de champs
            const fieldErrors = [];
            for (const [field, errors] of Object.entries(errorData)) {
              if (Array.isArray(errors)) {
                fieldErrors.push(`${field}: ${errors.join(', ')}`);
              } else if (typeof errors === 'string') {
                fieldErrors.push(`${field}: ${errors}`);
              }
            }
            if (fieldErrors.length > 0) {
              errorMessage = `Erreurs de validation:\n${fieldErrors.join('\n')}`;
            }
          }
        } catch (parseError) {
          console.error('❌ Impossible de parser la réponse d\'erreur');
        }
        
        alert(`Erreur lors de l'ajout du document:\n\n${errorMessage}`);
      }
    } catch (err) {
      console.error('❌ Erreur réseau ou autre:', err);
      
      if (err instanceof TypeError && err.message.includes('fetch')) {
        alert("Erreur de connexion - Vérifiez que l'API Django est démarrée sur http://127.0.0.1:8000/");
      } else {
        alert("Erreur lors de l'upload du document: " + (err instanceof Error ? err.message : 'Erreur inconnue'));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setUploadData(prev => ({
      ...prev,
      fichier: file,
      nom: prev.nom || (file ? file.name.split('.')[0] : '')
    }));
  };

  const renderContent = () => {
    switch (activeView) {
      case 'missing':
        return renderMissingDocuments();
      case 'submissions':
        return renderSubmissionsTracking();
      case 'expired':
        return renderExpiredAlerts();
      case 'checklist':
        return renderChecklist();
      case 'notifications':
        return renderNotifications();
      default:
        return renderOverview();
    }
  };

  const renderMissingDocuments = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Documents Manquants</h1>
        <p className="text-muted-foreground">Liste des documents manquants par projet</p>
      </div>

      <div className="grid gap-6">
        {projects.map(project => {
          const missingDocs = documents.filter(d => 
            d.id_projet === project.id && d.statut === 'missing'
          );
          
          if (missingDocs.length === 0) return null;
          
          return (
            <Card key={project.id} className="border-red-200 bg-red-50/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
                    
                    {project.scraped_title && project.scraped_title !== project.name && (
                      <div className="bg-blue-50 p-2 rounded mb-2 border border-blue-200">
                        <p className="text-xs font-medium text-blue-800">📄 Titre original ({project.source}):</p>
                        <p className="text-sm text-blue-700">{project.scraped_title}</p>
                      </div>
                    )}
                    
                    <Badge variant="outline" className="mb-2">{project.fund_display}</Badge>
                    {project.source && (
                      <Badge className="ml-2 bg-blue-100 text-blue-800">
                        {project.source}
                      </Badge>
                    )}
                  </div>
                  <Badge className="bg-red-100 text-red-800 border-red-200">
                    {missingDocs.length} manquant{missingDocs.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {missingDocs.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-red-200">
                      <FileX className="w-5 h-5 text-red-600" />
                      <div className="flex-1">
                        <p className="font-medium">{doc.nom}</p>
                        <p className="text-sm text-muted-foreground">Type: {doc.type}</p>
                        {doc.date_expiration && (
                          <p className="text-sm text-red-600">
                            Échéance: {new Date(doc.date_expiration).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button size="sm" className="gap-2">
                        <Upload className="w-4 h-4" />
                        Soumettre
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderSubmissionsTracking = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Suivi des Soumissions</h1>
        <p className="text-muted-foreground">Historique et statuts des documents soumis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <p className="text-lg font-bold">{approvedDocuments}</p>
            <p className="text-sm text-muted-foreground">Approuvés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <p className="text-lg font-bold">{pendingDocuments}</p>
            <p className="text-sm text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="w-6 h-6 mx-auto mb-2 text-red-600" />
            <p className="text-lg font-bold">{documents.filter(d => d.statut === 'rejected').length}</p>
            <p className="text-sm text-muted-foreground">Rejetés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <p className="text-lg font-bold">{recentSubmissions}</p>
            <p className="text-sm text-muted-foreground">Cette semaine</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Soumissions récentes</h3>
          <div className="space-y-3">
            {documents.filter(d => d.date_soumission).slice(0, 10).map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                {getFileIcon(doc.nom)}
                <div className="flex-1">
                  <p className="font-medium">{doc.nom}</p>
                  <p className="text-sm text-muted-foreground">
                    Soumis le {new Date(doc.date_soumission).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={getStatusColor(doc.statut)}>
                  {doc.statut}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderExpiredAlerts = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Alertes Documents Expirés</h1>
        <p className="text-muted-foreground">Documents ayant dépassé leur échéance</p>
      </div>

      {expiredDocuments === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
            <h3 className="text-lg font-semibold mb-2">Aucun document expiré</h3>
            <p className="text-muted-foreground">Tous vos documents sont à jour</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.filter(d => d.statut === 'expired').map(doc => {
            const project = projects.find(p => p.id === doc.id_projet);
            return (
              <Card key={doc.id} className="border-orange-200 bg-orange-50/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-orange-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{doc.nom}</h3>
                      <p className="text-muted-foreground mb-2">Projet: {project?.name}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span>Type: {doc.type}</span>
                        <span className="text-orange-600">
                          Expiré le: {doc.date_expiration ? new Date(doc.date_expiration).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Renouveler
                      </Button>
                      <Button size="sm" className="gap-2">
                        <Upload className="w-4 h-4" />
                        Remplacer
                      </Button>
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

  const renderChecklist = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Checklist des Pièces Requises</h1>
        <p className="text-muted-foreground">Documents requis par projet</p>
      </div>

      <div className="grid gap-6">
        {projects.map(project => {
          const projectDocs = documents.filter(d => d.id_projet === project.id);
          const requiredDocs = [
            "Project Proposal",
            "Environmental Impact Assessment", 
            "Budget Plan",
            "Risk Assessment",
            "Technical Specifications",
            "Monitoring Plan",
            "Final Report"
          ];
          
          return (
            <Card key={project.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
                    
                    {project.scraped_title && project.scraped_title !== project.name && (
                      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-3 rounded-lg border border-blue-200 mb-3">
                        <p className="text-xs font-medium text-blue-800 mb-1">
                          📄 Titre original du projet scrapé ({project.source}):
                        </p>
                        <p className="text-sm font-medium text-blue-700 leading-relaxed">
                          {project.scraped_title}
                        </p>
                        {project.source_url && (
                          <a 
                            href={project.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 mt-1"
                          >
                            Voir sur {project.source} <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{project.fund_display}</Badge>
                      {project.source && (
                        <Badge className={`${project.source === 'GEF' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                          Source: {project.source}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {Math.round((projectDocs.filter(d => d.statut === 'approved').length / requiredDocs.length) * 100)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Complété</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {requiredDocs.map(docName => {
                    const existingDoc = projectDocs.find(d => d.nom.includes(docName) || d.type.includes(docName));
                    const status = existingDoc ? existingDoc.statut : 'missing';
                    
                    return (
                      <div key={docName} className="flex items-center gap-3 p-2 rounded border">
                        {status === 'approved' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : status === 'missing' ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        )}
                        <span className="flex-1">{docName}</span>
                        <Badge className={getStatusColor(status)} variant="outline">
                          {status === 'missing' ? 'Manquant' : status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Notifications Récentes</h1>
        <p className="text-muted-foreground">Dernières activités et alertes</p>
      </div>

      <div className="space-y-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Nouveau document soumis</p>
                <p className="text-sm text-muted-foreground">
                  "Technical Specifications" pour le projet Wetlands - Il y a 2 heures
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium">Document bientôt expiré</p>
                <p className="text-sm text-muted-foreground">
                  "Budget Plan 2024" expire dans 3 jours
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Document approuvé</p>
                <p className="text-sm text-muted-foreground">
                  "Environmental Assessment" validé par l'équipe
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Gestion des Documents</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de TOUS les projets de la base de données ({projects.length} projets total)
        </p>
        {searchTerm && (
          <p className="text-sm text-blue-600 mt-1">
            🔍 Résultats pour: "{searchTerm}" • {projects.length} projet{projects.length > 1 ? 's' : ''} trouvé{projects.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
            <h3 className="text-sm text-muted-foreground mb-1">Total documents</h3>
            <p className="text-2xl font-bold">{totalDocuments}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <h3 className="text-sm text-muted-foreground mb-1">Documents approuvés</h3>
            <p className="text-2xl font-bold">{approvedDocuments}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <h3 className="text-sm text-muted-foreground mb-1">En attente</h3>
            <p className="text-2xl font-bold">{pendingDocuments}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Building2 className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <h3 className="text-sm text-muted-foreground mb-1">Projets actifs</h3>
            <p className="text-2xl font-bold">{projects.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Projets avec progression et navigation */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Projets et Documents</h2>
          
          {/* Navigation entre projets */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Projet {currentProjectIndex + 1} sur {projects.length}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateToProject('prev')}
                disabled={projects.length <= 1}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Précédent
              </Button>
              
              <Button
                variant="outline" 
                size="sm"
                onClick={() => navigateToProject('next')}
                disabled={projects.length <= 1}
                className="gap-2"
              >
                Suivant
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Affichage du projet actuel */}
        {projects.length > 0 && selectedProject && (
          <div className="mb-6">
            {(() => {
              const currentProject = projects.find(p => p.id === selectedProject);
              if (!currentProject) return null;
              
              const projectDocs = getProjectDocuments(currentProject.id);
              return (
                <Card className={`${
                  currentProject.type === 'scraped' 
                    ? 'border-l-4 border-l-orange-400 bg-orange-50/30' 
                    : 'border-l-4 border-l-blue-400'
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-xl">{currentProject.name}</h3>
                            {currentProject.type === 'scraped' && (
                              <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                                📥 Projet Scrapé (Non converti)
                              </Badge>
                            )}
                            {currentProject.type === 'project' && (
                              <Badge className="bg-green-100 text-green-800 border-green-300">
                                ✅ Projet Actif
                              </Badge>
                            )}
                          </div>
                          
                          {/* Titre du projet scrapé si différent */}
                          {currentProject.scraped_title && currentProject.scraped_title !== currentProject.name && (
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-3">
                              <p className="text-xs font-medium text-blue-800 mb-1">📄 Titre original (source {currentProject.source}):</p>
                              <p className="text-sm text-blue-700 font-medium">{currentProject.scraped_title}</p>
                              {currentProject.source_url && (
                                <a 
                                  href={currentProject.source_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  Voir source {currentProject.source} →
                                </a>
                              )}
                            </div>
                          )}

                          {/* Informations supplémentaires pour les projets scrapés */}
                          {currentProject.type === 'scraped' && currentProject.scraped_data && (
                            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg border border-orange-200 mb-3">
                              <h4 className="text-sm font-semibold text-orange-800 mb-2">📊 Données du scraping</h4>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                {currentProject.scraped_data.organization && (
                                  <div>
                                    <span className="font-medium text-orange-700">Organisation:</span>
                                    <p className="text-orange-600">{currentProject.scraped_data.organization}</p>
                                  </div>
                                )}
                                {currentProject.scraped_data.funding_amount && (
                                  <div>
                                    <span className="font-medium text-orange-700">Financement:</span>
                                    <p className="text-green-600 font-semibold">
                                      ${currentProject.scraped_data.funding_amount.toLocaleString()}
                                    </p>
                                  </div>
                                )}
                                {currentProject.scraped_data.region && (
                                  <div>
                                    <span className="font-medium text-orange-700">Région:</span>
                                    <p className="text-orange-600">{currentProject.scraped_data.region}</p>
                                  </div>
                                )}
                                {currentProject.scraped_data.data_completeness_score && (
                                  <div>
                                    <span className="font-medium text-orange-700">Score complétude:</span>
                                    <p className="text-blue-600 font-semibold">{currentProject.scraped_data.data_completeness_score}%</p>
                                  </div>
                                )}
                              </div>
                              {currentProject.scraped_data.focal_areas && (
                                <div className="mt-2">
                                  <span className="font-medium text-orange-700 text-sm">Domaines focaux:</span>
                                  <p className="text-xs text-orange-600 mt-1">{currentProject.scraped_data.focal_areas}</p>
                                </div>
                              )}
                              {currentProject.scraped_data.is_relevant_for_mauritania && (
                                <Badge className="mt-2 bg-green-100 text-green-800 border-green-300">
                                  🇲🇷 Pertinent pour la Mauritanie
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <Badge variant="outline" className="mb-2">{currentProject.fund_display}</Badge>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{currentProject.documents_count} documents</span>
                          <span>•</span>
                          <span>{currentProject.completion_percentage}% complété</span>
                          {currentProject.source && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600 font-medium">Source: {currentProject.source}</span>
                            </>
                          )}
                          {currentProject.type === 'scraped' && currentProject.scraped_data?.scraped_at && (
                            <>
                              <span>•</span>
                              <span className="text-orange-600">
                                Scrapé: {new Date(currentProject.scraped_data.scraped_at).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        {currentProject.missing_documents && currentProject.missing_documents.length > 0 && (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            {currentProject.missing_documents.length} manquant{currentProject.missing_documents.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {currentProject.expired_documents && currentProject.expired_documents > 0 && (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                            {currentProject.expired_documents} expiré{currentProject.expired_documents > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {currentProject.type === 'scraped' && currentProject.scraped_data?.can_create_project && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            🚀 Prêt à convertir
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Barre de progression */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div 
                        className={`h-2 rounded-full ${
                          currentProject.type === 'scraped' ? 'bg-orange-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${currentProject.completion_percentage}%` }}
                      ></div>
                    </div>
                    
                    {/* Documents récents ou actions pour projets scrapés */}
                    {currentProject.type === 'scraped' ? (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-orange-800">
                              🔄 Ce projet a été scrapé mais pas encore converti
                            </p>
                            <p className="text-xs text-orange-600 mt-1">
                              Convertissez-le en projet actif pour commencer la gestion des documents
                            </p>
                          </div>
                          {currentProject.scraped_data?.can_create_project && (
                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                              Convertir en Projet
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {projectDocs.slice(0, 5).map(doc => (
                          <div key={doc.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            {getFileIcon(doc.nom)}
                            <span className="flex-1 font-medium">{doc.nom}</span>
                            <Badge className={getStatusColor(doc.statut)} variant="outline">
                              {doc.statut}
                            </Badge>
                          </div>
                        ))}
                        {projectDocs.length > 5 && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            +{projectDocs.length - 5} autres documents
                          </p>
                        )}
                        {projectDocs.length === 0 && (
                          <div className="text-center py-6 text-muted-foreground">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Aucun document pour ce projet</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )}

        {/* Liste compacte de tous les projets */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Tous les projets ({projects.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, index) => (
              <Card 
                key={project.id} 
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  project.id === selectedProject 
                    ? 'ring-2 ring-blue-500 bg-blue-50/50' 
                    : 'hover:bg-muted/30'
                } ${
                  project.type === 'scraped' 
                    ? 'border-l-2 border-l-orange-400' 
                    : 'border-l-2 border-l-blue-400'
                }`}
                onClick={() => goToProject(project.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate mb-1">{project.name}</h4>
                      <div className="flex items-center gap-1 mb-2">
                        {project.type === 'scraped' ? (
                          <Badge className="bg-orange-100 text-orange-700 text-xs">
                            📥 Scrapé
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            ✅ Actif
                          </Badge>
                        )}
                        {project.source && (
                          <Badge variant="outline" className="text-xs">
                            {project.source}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {project.completion_percentage}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {project.documents_count} docs
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        project.type === 'scraped' ? 'bg-orange-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${project.completion_percentage}%` }}
                    ></div>
                  </div>
                  
                  {project.id === selectedProject && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      📍 Projet sélectionné
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header activeSection="dossiers" onSectionChange={() => {}} />
        <div className="p-8 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Chargement des projets...</p>
            <p className="text-sm text-muted-foreground">
              📊 Chargement optimisé - Affichage rapide
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-8">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium text-destructive mb-2">Erreur de connexion API</h3>
              <p className="text-sm text-destructive/80 mb-4">{error}</p>
              <p className="text-xs text-muted-foreground mb-4">
                Vérifiez que l'API Django est démarrée sur http://127.0.0.1:8000/
              </p>
              <Button onClick={loadAllData} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header activeSection="dossiers" onSectionChange={() => {}} />
      
      <div className="flex">
        {/* Sidebar Professionnelle FIXE */}
        <div className="w-80 min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 border-r border-slate-200 shadow-lg fixed left-0 top-[73px] z-10">
          <div className="p-6 border-b border-slate-200 bg-white">
            <h2 className="text-xl font-bold text-slate-800 mb-1">Espace de travail</h2>
            <p className="text-sm text-slate-600">Gestion des documents</p>
          </div>
          
          <ScrollArea className="h-[calc(100vh-137px)]">
            <div className="p-4 space-y-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-all duration-200 ${
                    item.active 
                      ? 'bg-white shadow-md border border-blue-200 text-blue-700' 
                      : 'hover:bg-white/70 text-slate-700 hover:shadow-sm'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    item.active 
                      ? 'bg-blue-100' 
                      : item.urgent 
                        ? 'bg-red-100' 
                        : 'bg-slate-100'
                  }`}>
                    <div className={item.active ? 'text-blue-600' : item.urgent ? 'text-red-600' : 'text-slate-600'}>
                      {item.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.title}</div>
                    <div className="text-xs text-slate-500 truncate">{item.subtitle}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${
                      item.urgent ? 'text-red-600' : item.active ? 'text-blue-600' : 'text-slate-600'
                    }`}>
                      {item.count}
                    </div>
                    {item.urgent && (
                      <div className="w-2 h-2 bg-red-500 rounded-full ml-auto"></div>
                    )}
                  </div>
                </button>
              ))}
              
              {/* Section séparée pour actions rapides */}
              <div className="pt-6 mt-6 border-t border-slate-200">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">
                  Actions rapides
                </h3>
                
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl hover:bg-white/70 text-slate-700 hover:shadow-sm transition-all duration-200">
                      <div className="p-2 rounded-lg bg-green-100">
                        <Upload className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Importer document</div>
                        <div className="text-xs text-slate-500">Ajouter un nouveau fichier</div>
                      </div>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Ajouter un document</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Upload de fichier */}
                      <div className="space-y-2">
                        <Label htmlFor="upload_fichier">Fichier à importer *</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                          <input
                            id="upload_fichier"
                            type="file"
                            onChange={handleFileChange}
                            className="w-full"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                          />
                          {uploadData.fichier && (
                            <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                              <p className="font-medium text-blue-800">
                                📎 {uploadData.fichier.name}
                              </p>
                              <p className="text-blue-600">
                                Taille: {(uploadData.fichier.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          )}
                          {!uploadData.fichier && (
                            <div className="text-center text-gray-500">
                              <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">Cliquez pour sélectionner un fichier</p>
                              <p className="text-xs">PDF, Word, Excel, Images acceptés</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="upload_nom">Nom du document *</Label>
                        <Input
                          id="upload_nom"
                          value={uploadData.nom}
                          onChange={(e) => setUploadData({...uploadData, nom: e.target.value})}
                          placeholder="Nom du document (auto-rempli depuis le fichier)"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="upload_type">Type *</Label>
                        <select
                          id="upload_type"
                          value={uploadData.type}
                          onChange={(e) => setUploadData({...uploadData, type: e.target.value})}
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="">Sélectionner un type</option>
                          {documentTypes.map(type => (
                            <option key={type.id} value={type.name}>
                              {type.name} - {type.description}
                            </option>
                          ))}
                        </select>
                        {documentTypes.length === 0 && (
                          <p className="text-sm text-orange-600">
                            ⚠️ Chargement des types de documents...
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="upload_projet">Projet *</Label>
                        <select
                          id="upload_projet"
                          value={uploadData.id_projet}
                          onChange={(e) => setUploadData({...uploadData, id_projet: parseInt(e.target.value) || 0})}
                          className="w-full p-2 border rounded-md focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value={0}>Sélectionner un projet</option>
                          {projects
                            .filter(p => p.type === 'project')
                            .map(project => (
                              <option key={project.id} value={project.id}>
                                {project.name} ({project.source || 'Projet local'})
                              </option>
                            ))
                          }
                        </select>
                        {projects.filter(p => p.type === 'project').length === 0 && (
                          <p className="text-sm text-orange-600">
                            ⚠️ Aucun projet actif disponible. Les projets scrapés doivent être convertis avant d'ajouter des documents.
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="upload_expiration">Date d'expiration (optionnel)</Label>
                        <Input
                          id="upload_expiration"
                          type="date"
                          value={uploadData.date_expiration}
                          onChange={(e) => setUploadData({...uploadData, date_expiration: e.target.value})}
                        />
                      </div>
                      
                      <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                          Annuler
                        </Button>
                        <Button 
                          onClick={handleUploadDocument}
                          disabled={!uploadData.nom || !uploadData.type || !uploadData.id_projet}
                          className="gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Importer le document
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl hover:bg-white/70 text-slate-700 hover:shadow-sm transition-all duration-200">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Search className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Recherche locale</div>
                    <Input
                      placeholder="Filtrer les projets..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="mt-1 h-7 text-xs"
                    />
                  </div>
                </button>
                
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl hover:bg-white/70 text-slate-700 hover:shadow-sm transition-all duration-200">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Database className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Données Scrapées</div>
                    <div className="text-xs text-slate-500">Voir tous les projets collectés</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              
              {/* Résumé en bas de sidebar */}
              <div className="pt-6 mt-6 border-t border-slate-200">
                <div className="px-2 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Résumé
                  </h3>
                  
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div>
                        <div className="text-lg font-bold text-green-600">{approvedDocuments}</div>
                        <div className="text-xs text-slate-500">Approuvés</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600">{missingDocuments}</div>
                        <div className="text-xs text-slate-500">Manquants</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-orange-600">{expiredDocuments}</div>
                        <div className="text-xs text-slate-500">Expirés</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-600">{pendingDocuments}</div>
                        <div className="text-xs text-slate-500">En attente</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Alertes importantes */}
                  {(missingDocuments > 0 || expiredDocuments > 0) && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800">Attention requise</span>
                      </div>
                      <div className="space-y-1 text-xs text-red-700">
                        {missingDocuments > 0 && (
                          <div>{missingDocuments} document{missingDocuments > 1 ? 's' : ''} manquant{missingDocuments > 1 ? 's' : ''}</div>
                        )}
                        {expiredDocuments > 0 && (
                          <div>{expiredDocuments} document{expiredDocuments > 1 ? 's' : ''} expiré{expiredDocuments > 1 ? 's' : ''}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Contenu principal avec marge pour sidebar fixe et header */}
        <div className="flex-1 ml-80 mt-[73px]">
          <div className="p-8">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsInterface;