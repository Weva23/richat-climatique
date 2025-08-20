import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Search, Globe, Database, Download, RefreshCw, 
  FileText, Star, User, ExternalLink, Calendar,
  CheckCircle, AlertCircle, Play, Eye, EyeOff, Filter,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from "lucide-react";
import Header from "@/components/Layout/Header";
import { toast } from "sonner";

// Interface pour les projets scrapés basée sur le modèle Django
interface ScrapedProject {
  id: number;
  title: string;
  source: 'GEF' | 'GCF' | 'OTHER';
  source_display: string;
  source_url: string;
  source_id: string;
  description: string;
  organization: string;
  project_type: string;
  status: string;
  total_funding: string;
  funding_amount: number | null;
  currency: string;
  country: string;
  region: string;
  focal_areas: string;
  gef_project_id: string;
  gcf_document_type: string;
  cover_date: string;
  document_url: string;
  additional_links: string;
  scraped_at: string;
  last_updated: string;
  scraping_source: string;
  linked_project: number | null;
  linked_project_name: string | null;
  data_completeness_score: number;
  is_relevant_for_mauritania: boolean;
  needs_review: boolean;
  can_create_project: boolean;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ScrapedProject[];
}

interface Stats {
  total_scraped: number;
  by_source: Record<string, number>;
  ready_projects: number;
  linked_projects: number;
  needs_review: number;
  avg_completeness_score: number;
}

const ScrapedProjects = () => {
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20); // Taille de page fixe
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [relevanceFilter, setRelevanceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // UI
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [scrapingDialogOpen, setScrapingDialogOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState<number | null>(null);
  
  // Configuration de scraping
  const [scrapingParams, setScrapingParams] = useState({
    source: 'both',
    max_pages: 10,
    headless: true
  });

  // Chargement des données depuis l'API Django
  useEffect(() => {
    loadScrapedProjects();
    loadStats();
  }, [currentPage, searchTerm, sourceFilter, relevanceFilter, statusFilter]);

  const buildApiUrl = (page: number = 1) => {
    const baseUrl = 'http://127.0.0.1:8000/api/scraped-projects/';
    const params = new URLSearchParams();
    
    // Pagination
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    
    // Filtres
    if (searchTerm.trim()) {
      params.append('search', searchTerm.trim());
    }
    
    if (sourceFilter !== "all") {
      params.append('source', sourceFilter);
    }
    
    if (relevanceFilter !== "all") {
      params.append('is_relevant_for_mauritania', relevanceFilter === "relevant" ? "true" : "false");
    }
    
    if (statusFilter !== "all") {
      if (statusFilter === "linked") {
        params.append('linked_project__isnull', 'false');
      } else if (statusFilter === "ready") {
        params.append('linked_project__isnull', 'true');
        // Ajouter d'autres critères pour "ready" si nécessaire
      } else if (statusFilter === "needs_review") {
        params.append('needs_review', 'true');
      }
    }
    
    return `${baseUrl}?${params.toString()}`;
  };

  const loadScrapedProjects = async (page: number = currentPage) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const url = buildApiUrl(page);
      console.log('Chargement depuis:', url);
      
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

      const data: ApiResponse = await response.json();
      console.log('Données reçues:', data);
      
      setApiResponse(data);
      
    } catch (err) {
      console.error('Erreur chargement projets:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      toast.error('Erreur lors du chargement des projets scrapés');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/scraped-projects/stats/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset à la page 1 lors d'une recherche
  };

  const handleFilterChange = (filterType: string, value: string) => {
    switch (filterType) {
      case 'source':
        setSourceFilter(value);
        break;
      case 'relevance':
        setRelevanceFilter(value);
        break;
      case 'status':
        setStatusFilter(value);
        break;
    }
    setCurrentPage(1); // Reset à la page 1 lors d'un changement de filtre
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleCreateProject = async (scrapedProjectId: number) => {
    try {
      setIsCreatingProject(scrapedProjectId);
      
      const response = await fetch(`http://127.0.0.1:8000/api/scraped-projects/${scrapedProjectId}/create_project/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultant_id: 1 // ID du consultant par défaut
        }),
      });

      if (response.ok) {
        toast.success("Projet créé avec succès!");
        loadScrapedProjects(); // Recharger la page actuelle
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Erreur lors de la création du projet");
      }
    } catch (err) {
      console.error('Erreur création projet:', err);
      toast.error("Erreur lors de la création du projet");
    } finally {
      setIsCreatingProject(null);
    }
  };

  const handleScraping = async () => {
    try {
      toast.info("Lancement du scraping...");
      setScrapingDialogOpen(false);
      
      // Note: Cette fonctionnalité nécessite une commande Django management
      // Pour l'instant, on simule le scraping
      setTimeout(() => {
        toast.success("Scraping simulé terminé!");
        loadScrapedProjects();
        loadStats();
      }, 3000);
      
    } catch (err) {
      console.error('Erreur scraping:', err);
      toast.error("Erreur lors du scraping");
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSourceFilter("all");
    setRelevanceFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  // Calculs de pagination
  const projects = apiResponse?.results || [];
  const totalCount = apiResponse?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNext = apiResponse?.next !== null;
  const hasPrevious = apiResponse?.previous !== null;

  // Générer les numéros de pages visibles
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); 
         i <= Math.min(totalPages - 1, currentPage + delta); 
         i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index);
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

  const getCompletionColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header activeSection="scraped" onSectionChange={() => {}} />
        <div className="p-8 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Chargement de la page {currentPage}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header activeSection="scraped" onSectionChange={() => {}} />
        <div className="p-8">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium text-destructive mb-2">Erreur de connexion</h3>
              <p className="text-sm text-destructive/80 mb-4">
                {error}
              </p>
              <Button 
                variant="outline" 
                onClick={() => loadScrapedProjects()}
                className="gap-2"
              >
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
      <Header activeSection="scraped" onSectionChange={() => {}} />
      
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Base de Données - Projets Scrapés</h1>
            <p className="text-muted-foreground">
              Exploration paginée de tous les projets collectés depuis GEF, GCF et OECD
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowAllDetails(!showAllDetails)}
              className="gap-2"
            >
              {showAllDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showAllDetails ? "Masquer détails" : "Voir détails"}
            </Button>
            
            <Dialog open={scrapingDialogOpen} onOpenChange={setScrapingDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Lancer Scraping
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configurer le Scraping</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Source</label>
                    <Select value={scrapingParams.source} onValueChange={(value) => 
                      setScrapingParams({...scrapingParams, source: value})
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">GEF + GCF + OECD</SelectItem>
                        <SelectItem value="gef">GEF seulement</SelectItem>
                        <SelectItem value="gcf">GCF seulement</SelectItem>
                        <SelectItem value="oecd">OECD seulement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Pages maximum</label>
                    <Input
                      type="number"
                      value={scrapingParams.max_pages}
                      onChange={(e) => setScrapingParams({
                        ...scrapingParams, 
                        max_pages: parseInt(e.target.value) || 10
                      })}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleScraping} 
                    className="w-full gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Démarrer le Scraping
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ✅ STATISTIQUES CORRIGÉES - TOUTES LES SOURCES */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Card className="border-2 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Database className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total en BD</p>
                    <p className="text-3xl font-bold text-primary">{stats.total_scraped}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Prêts</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.ready_projects}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">GEF</p>
                    <p className="text-2xl font-bold text-green-600">{stats.by_source?.GEF || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">GCF</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.by_source?.GCF || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ✅ AJOUT DE LA CARTE OECD/AUTRES */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-gray-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">OECD/Autres</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.by_source?.OTHER || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Star className="w-8 h-8 text-amber-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Convertis</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.linked_projects}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtres de recherche */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans tous les projets..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              
              {/* ✅ FILTRE SOURCE CORRIGÉ */}
              <Select value={sourceFilter} onValueChange={(value) => handleFilterChange('source', value)}>
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
              
              <Select value={relevanceFilter} onValueChange={(value) => handleFilterChange('relevance', value)}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Pertinence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les projets</SelectItem>
                  <SelectItem value="relevant">Pertinents Mauritanie</SelectItem>
                  <SelectItem value="not-relevant">Non pertinents</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="ready">Prêts à convertir</SelectItem>
                  <SelectItem value="linked">Déjà convertis</SelectItem>
                  <SelectItem value="needs_review">À réviser</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={resetFilters}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informations de pagination */}
        <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
          <p className="font-medium">
            📊 Page {currentPage} sur {totalPages} • 
            Affichage de {((currentPage - 1) * pageSize) + 1} à {Math.min(currentPage * pageSize, totalCount)} sur {totalCount} projets
          </p>
          <div className="flex items-center gap-2">
            <span>Éléments par page: {pageSize}</span>
          </div>
        </div>

        {/* Liste des projets de la page actuelle */}
        <div className="space-y-4">
          {projects.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  {totalCount === 0 ? "Aucun projet en base de données" : "Aucun résultat trouvé"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {totalCount === 0
                    ? "Lancez le scraping pour collecter les données depuis GEF, GCF et OECD"
                    : "Essayez de modifier vos critères de recherche"
                  }
                </p>
                {totalCount === 0 && (
                  <Button onClick={() => setScrapingDialogOpen(true)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Démarrer le scraping
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            projects.map((project, index) => (
              <Card key={project.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <FileText className="w-6 h-6 text-primary" />
                          <div className="text-xs text-center mt-1 font-bold text-primary">
                            #{((currentPage - 1) * pageSize) + index + 1}
                          </div>
                        </div>
                        
                        <div className="flex-1 space-y-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="font-semibold text-foreground text-lg leading-tight">
                                {project.title}
                              </h3>
                              <Badge className={getSourceColor(project.source)}>
                                {project.source === 'OTHER' ? 'OECD' : project.source}
                              </Badge>
                              {project.is_relevant_for_mauritania && (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                  🇲🇷 Mauritanie
                                </Badge>
                              )}
                              {project.linked_project && (
                                <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                                  ✅ Converti
                                </Badge>
                              )}
                              {project.needs_review && (
                                <Badge variant="outline" className="text-amber-600 border-amber-600">
                                  ⚠️ À réviser
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {project.description || "Aucune description disponible"}
                            </p>
                          </div>
                          
                          {/* Grille d'informations détaillées */}
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm bg-muted/20 p-4 rounded-lg">
                            <div>
                              <p className="text-muted-foreground font-medium">Organisation</p>
                              <p className="font-semibold truncate" title={project.organization}>
                                {project.organization || "Non spécifiée"}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-muted-foreground font-medium">Financement</p>
                              <p className="font-semibold text-green-600">
                                {formatAmount(project.funding_amount || project.total_funding)}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-muted-foreground font-medium">Complétude</p>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={project.data_completeness_score} 
                                  className="w-16 h-2"
                                />
                                <span className={`font-bold ${getCompletionColor(project.data_completeness_score)}`}>
                                  {project.data_completeness_score}%
                                </span>
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-muted-foreground font-medium">Date scraping</p>
                              <p className="font-semibold">
                                {formatDate(project.scraped_at)}
                              </p>
                            </div>

                            {project.project_type && (
                              <div>
                                <p className="text-muted-foreground font-medium">Type</p>
                                <p className="font-semibold">{project.project_type}</p>
                              </div>
                            )}

                            {project.status && (
                              <div>
                                <p className="text-muted-foreground font-medium">Statut</p>
                                <p className="font-semibold">{project.status}</p>
                              </div>
                            )}

                            {project.region && (
                              <div>
                                <p className="text-muted-foreground font-medium">Région</p>
                                <p className="font-semibold">{project.region}</p>
                              </div>
                            )}

                            {project.cover_date && (
                              <div>
                                <p className="text-muted-foreground font-medium">Date couverture</p>
                                <p className="font-semibold">{project.cover_date}</p>
                              </div>
                            )}
                          </div>

                          {/* Détails supplémentaires si activés */}
                          {showAllDetails && (
                            <div className="border-t pt-4 space-y-3">
                              {project.focal_areas && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Domaines focaux</p>
                                  <p className="text-sm">{project.focal_areas}</p>
                                </div>
                              )}
                              
                              {project.gef_project_id && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ID Projet GEF</p>
                                  <p className="text-sm font-mono">{project.gef_project_id}</p>
                                </div>
                              )}

                              {project.gcf_document_type && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type document GCF</p>
                                  <p className="text-sm">{project.gcf_document_type}</p>
                                </div>
                              )}

                              {project.source_id && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ID Source</p>
                                  <p className="text-sm font-mono">{project.source_id}</p>
                                </div>
                              )}

                              {project.additional_links && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Liens additionnels</p>
                                  <p className="text-sm text-blue-600">{project.additional_links}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-6">
                      {project.source_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={project.source_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Source
                          </a>
                        </Button>
                      )}

                      {project.document_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={project.document_url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4 mr-2" />
                            Document
                          </a>
                        </Button>
                      )}
                      
                      {project.can_create_project && !project.linked_project && (
                        <Button 
                          size="sm"
                          onClick={() => handleCreateProject(project.id)}
                          disabled={isCreatingProject === project.id}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          {isCreatingProject === project.id ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Créer Projet
                        </Button>
                      )}
                      
                      {project.linked_project && (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-600 justify-center">
                          Projet #{project.linked_project}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-2">
                {/* Première page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="w-9 h-9 p-0"
                  title="Première page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>

                {/* Page précédente */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={!hasPrevious}
                  className="w-9 h-9 p-0"
                  title="Page précédente"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {/* Numéros de pages */}
                {getVisiblePages().map((page, index) => (
                  <Button
                    key={index}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => typeof page === 'number' ? goToPage(page) : null}
                    disabled={page === '...'}
                    className="w-9 h-9 p-0"
                  >
                    {page === '...' ? '...' : page}
                  </Button>
                ))}

                {/* Page suivante */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={!hasNext}
                  className="w-9 h-9 p-0"
                  title="Page suivante"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>

                {/* Dernière page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="w-9 h-9 p-0"
                  title="Dernière page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Navigation rapide par saisie */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="text-sm text-muted-foreground">Aller à la page:</span>
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  className="w-20 h-8 text-center"
                  placeholder={currentPage.toString()}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const page = parseInt((e.target as HTMLInputElement).value);
                      if (page >= 1 && page <= totalPages) {
                        goToPage(page);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
                <span className="text-sm text-muted-foreground">sur {totalPages}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Boutons d'action en bas */}
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => loadScrapedProjects()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser la page
          </Button>
          
          {hasNext && (
            <Button
              onClick={() => goToPage(currentPage + 1)}
              className="gap-2"
            >
              Page suivante
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScrapedProjects;