// =============================================================================
// FICHIER: src/components/Sections/OverviewSection.tsx (MISE À JOUR COMPLÈTE)
// =============================================================================
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, CheckCircle, Clock, FileText } from "lucide-react";
import { useProjects, useDashboardStats } from "../../hooks/useProjects";

const OverviewSection = () => {
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useProjects();
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();

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
      color: "text-primary" 
    },
    { 
      label: "Projets prêts", 
      value: stats?.ready_projects?.toString() || projects.filter(p => p.status === 'ready').length.toString(), 
      icon: CheckCircle, 
      color: "text-success" 
    },
    { 
      label: "En cours", 
      value: stats?.pending_projects?.toString() || projects.filter(p => p.status === 'progress').length.toString(), 
      icon: Clock, 
      color: "text-warning" 
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

      <div className="grid grid-cols-3 gap-6">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                    <Icon className="w-6 h-6" />
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

      <div className="space-y-4">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">Aucun projet</h3>
              <p className="text-sm text-muted-foreground">
                Aucun projet n'a été créé pour le moment
              </p>
            </CardContent>
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.fund_display}</p>
                      <div className="mt-2">
                        <Badge 
                          variant={getStatusBadgeColor(project.type_project)}
                          className="text-xs"
                        >
                          {project.type_display}
                        </Badge>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Résumé</CardTitle>
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
      )}
    </div>
  );
};

export default OverviewSection;