// =============================================================================
// OVERVIEW SECTION AMÉLIORÉE AVEC DONNÉES SCRAPÉES
// =============================================================================
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderOpen, CheckCircle, Clock, FileText, Database, Globe, TrendingUp } from "lucide-react";
import { useProjects, useDashboardStats } from "../../hooks/useProjects";
import { useScrapedProjectStats } from "../../hooks/useScrapedProjects";

const OverviewSection = () => {
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useProjects();
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: scrapedStats } = useScrapedProjectStats();

  if (projectsLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Aperçu des dossiers</h1>
          <p className="text-muted-foreground">Vue d'ensemble des projets clients</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (projectsError || statsError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Aperçu des dossiers</h1>
          <p className="text-muted-foreground">Vue d'ensemble des projets clients</p>
        </div>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <p className="text-destructive">Erreur lors du chargement des données</p>
            <p className="text-sm text-muted-foreground mt-2">
              Vérifiez que le backend est démarré et accessible
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statsData = [
    { 
      label: "Total dossiers", 
      value: stats?.total_projects?.toString() || projects.length.toString(), 
      icon: FolderOpen, 
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    { 
      label: "Projets prêts", 
      value: stats?.ready_projects?.toString() || projects.filter(p => p.status === 'ready').length.toString(), 
      icon: CheckCircle, 
      color: "text-success",
      bgColor: "bg-success/10"
    },
    { 
      label: "En cours", 
      value: stats?.pending_projects?.toString() || projects.filter(p => p.status === 'progress').length.toString(), 
      icon: Clock, 
      color: "text-warning",
      bgColor: "bg-warning/10"
    },
    {
      label: "Données scrapées",
      value: scrapedStats?.total_scraped?.toString() || "0",
      icon: Database,
      color: "text-info",
      bgColor: "bg-info/10"
    }
  ];

  const getStatusBadgeColor = (type: string) => {
    switch (type) {
      case "etat":
        return "default";
      case "prive":
        return "secondary";
      case "institution":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "text-success";
      case "progress":
        return "text-warning";
      case "draft":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Aperçu des dossiers</h1>
        <p className="text-muted-foreground">Vue d'ensemble des projets clients</p>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Aperçu des données scrapées */}
      {scrapedStats && scrapedStats.total_scraped > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Données Scrapées Récentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <Globe className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-green-600">
                  {scrapedStats.by_source?.GEF || 0}
                </div>
                <div className="text-xs text-muted-foreground">Projets GEF</div>
              </div>
              
              <div className="text-center p-3 bg-white rounded-lg">
                <Globe className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-blue-600">
                  {scrapedStats.by_source?.GCF || 0}
                </div>
                <div className="text-xs text-muted-foreground">Projets GCF</div>
              </div>
              
              <div className="text-center p-3 bg-white rounded-lg">
                <CheckCircle className="w-6 h-6 text-success mx-auto mb-1" />
                <div className="text-lg font-bold text-success">
                  {scrapedStats.ready_projects || 0}
                </div>
                <div className="text-xs text-muted-foreground">Prêts à convertir</div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <Button variant="outline" size="sm" className="gap-2">
                <Database className="w-4 h-4" />
                Voir toutes les données scrapées
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des projets */}
      <div className="space-y-4">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">Aucun projet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Aucun projet n'a été créé pour le moment
              </p>
              {scrapedStats && scrapedStats.ready_projects > 0 && (
                <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                  💡 Vous avez {scrapedStats.ready_projects} projets scrapés prêts à être convertis en projets Django
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground">{project.name}</h3>
                        {project.is_from_scraping && (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            <Database className="w-3 h-3 mr-1" />
                            Scrapé
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{project.fund_display}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge 
                          variant={getStatusBadgeColor(project.type_project)}
                          className="text-xs"
                        >
                          {project.type_display}
                        </Badge>
                        {project.original_source && (
                          <Badge variant="outline" className="text-xs">
                            {project.original_source}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-sm font-medium ${getStatusColor(project.status)}`}>
                        {project.status_display}
                      </p>
                      <div className="w-32 bg-muted rounded-full h-2 mt-1">
                        <div 
                          className="bg-success h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${project.progress_percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {project.progress_percentage}% complet
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Résumé des statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Résumé Financier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Score moyen de viabilité:</span>
                  <span className="ml-2 font-medium">{Math.round(stats.avg_score || 0)}/100</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Montant total demandé:</span>
                  <span className="ml-2 font-medium">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR'
                    }).format(stats.total_amount || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {scrapedStats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Données Automatiques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total scrapé:</span>
                    <span className="ml-2 font-medium">{scrapedStats.total_scraped}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Score moyen complétude:</span>
                    <span className="ml-2 font-medium">{Math.round(scrapedStats.avg_completeness_score)}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Prêts conversion:</span>
                    <span className="ml-2 font-medium">{scrapedStats.ready_projects}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Déjà convertis:</span>
                    <span className="ml-2 font-medium">{scrapedStats.linked_projects}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default OverviewSection;