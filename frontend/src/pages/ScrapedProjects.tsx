// =============================================================================
// PAGE PRINCIPALE POUR LES PROJETS SCRAPÉS
// =============================================================================
import { useState } from "react";
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
  CheckCircle, AlertCircle, Play
} from "lucide-react";
import Header from "@/components/Layout/Header";
import { useScrapedProjects, useScrapedProjectStats, useTriggerScraping, useCreateProjectFromScraping } from "../hooks/useScrapedProjects";
import { ScrapedProjectFilters } from "../services/scrapedProjectService";
import { toast } from "sonner";

const ScrapedProjects = () => {
  const [filters, setFilters] = useState<ScrapedProjectFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [scrapingDialogOpen, setScrapingDialogOpen] = useState(false);
  const [scrapingParams, setScrapingParams] = useState({
    source: 'both',
    max_pages: 10,
    headless: true
  });

  // Hooks pour les données
  const { data: scrapedProjects = [], isLoading, error } = useScrapedProjects(filters);
  const { data: stats } = useScrapedProjectStats();
  const triggerScraping = useTriggerScraping();
  const createProject = useCreateProjectFromScraping();

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters({ ...filters, search: value });
  };

  const handleSourceFilter = (source: string) => {
    if (source === "all") {
      const { source: _, ...newFilters } = filters;
      setFilters(newFilters);
    } else {
      setFilters({ ...filters, source });
    }
  };

  const handleScraping = () => {
    triggerScraping.mutate(scrapingParams, {
      onSuccess: () => {
        setScrapingDialogOpen(false);
      }
    });
  };

  const handleCreateProject = (scrapedProjectId: number) => {
    // Pour la démo, on utilise un consultant par défaut
    // Dans une vraie application, l'utilisateur choisirait le consultant
    createProject.mutate({ 
      scrapedProjectId, 
      consultantId: 1 // ID du consultant par défaut
    });
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'GEF':
        return "bg-green-100 text-green-800";
      case 'GCF':
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCompletionColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header activeSection="scraped" onSectionChange={() => {}} />
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
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
              <p className="text-sm text-destructive/80">
                Impossible de charger les données scrapées. Vérifiez que le backend est démarré.
              </p>
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
            <h1 className="text-2xl font-semibold text-foreground mb-1">Projets Scrapés</h1>
            <p className="text-muted-foreground">Données automatiquement collectées depuis GEF et GCF</p>
          </div>
          
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
                      <SelectItem value="both">GEF + GCF</SelectItem>
                      <SelectItem value="gef">GEF seulement</SelectItem>
                      <SelectItem value="gcf">GCF seulement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Pages maximum (GEF)</label>
                  <Input
                    type="number"
                    value={scrapingParams.max_pages}
                    onChange={(e) => setScrapingParams({
                      ...scrapingParams, 
                      max_pages: parseInt(e.target.value) || 10
                    })}
                  />
                </div>
                
                <div className="flex gap-4">
                  <Button 
                    onClick={handleScraping} 
                    disabled={triggerScraping.isPending}
                    className="flex-1"
                  >
                    {triggerScraping.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Scraping en cours...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Démarrer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Database className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Scrapé</p>
                    <p className="text-2xl font-bold">{stats.total_scraped}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-success" />
                  <div>
                    <p className="text-sm text-muted-foreground">Prêts à convertir</p>
                    <p className="text-2xl font-bold">{stats.ready_projects}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">GEF</p>
                    <p className="text-2xl font-bold">{stats.by_source?.GEF || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">GCF</p>
                    <p className="text-2xl font-bold">{stats.by_source?.GCF || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtres */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre, organisation..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          
          <Select onValueChange={handleSourceFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Toutes les sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les sources</SelectItem>
              <SelectItem value="GEF">GEF</SelectItem>
              <SelectItem value="GCF">GCF</SelectItem>
            </SelectContent>
          </Select>
          
          <Select onValueChange={(value) => {
            if (value === "all") {
              const { is_relevant_for_mauritania, ...newFilters } = filters;
              setFilters(newFilters);
            } else {
              setFilters({ ...filters, is_relevant_for_mauritania: value === "relevant" });
            }
          }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Pertinence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="relevant">Pertinents Mauritanie</SelectItem>
              <SelectItem value="not-relevant">Non pertinents</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Liste des projets */}
        <div className="space-y-4">
          {scrapedProjects.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">Aucun projet scrapé</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Lancez le scraping pour collecter automatiquement les données depuis GEF et GCF
                </p>
                <Button onClick={() => setScrapingDialogOpen(true)}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Démarrer le scraping
                </Button>
              </CardContent>
            </Card>
          ) : (
            scrapedProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-foreground">{project.title}</h3>
                              <Badge className={getSourceColor(project.source)}>
                                {project.source}
                              </Badge>
                              {project.linked_project && (
                                <Badge variant="outline" className="text-success border-success">
                                  Converti
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {project.description || "Aucune description disponible"}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Organisation</p>
                              <p className="font-medium">{project.organization || "Non spécifiée"}</p>
                            </div>
                            
                            <div>
                              <p className="text-muted-foreground">Financement</p>
                              <p className="font-medium">{project.total_funding || "Non spécifié"}</p>
                            </div>
                            
                            <div>
                              <p className="text-muted-foreground">Complétude</p>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={project.data_completeness_score} 
                                  className="w-16 h-2"
                                />
                                <span className={`font-medium ${getCompletionColor(project.data_completeness_score)}`}>
                                  {project.data_completeness_score}%
                                </span>
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-muted-foreground">Scrapé le</p>
                              <p className="font-medium">
                                {new Date(project.scraped_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      {project.source_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={project.source_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Source
                          </a>
                        </Button>
                      )}
                      
                      {project.can_create_project && !project.linked_project && (
                        <Button 
                          size="sm"
                          onClick={() => handleCreateProject(project.id)}
                          disabled={createProject.isPending}
                        >
                          {createProject.isPending ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Créer Projet
                        </Button>
                      )}
                      
                      {project.linked_project && (
                        <Badge variant="outline" className="text-success border-success">
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
      </div>
    </div>
  );
};

export default ScrapedProjects;