// =============================================================================
// SECTION POUR LES DONNÉES SCRAPÉES DANS LE DASHBOARD
// =============================================================================
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Database, Globe, RefreshCw, CheckCircle, 
  AlertCircle, FileText, TrendingUp, Clock
} from "lucide-react";
import { useScrapedProjectStats, useScrapingSessions, useTriggerScraping } from "../../hooks/useScrapedProjects";

const ScrapedSection = () => {
  const { data: stats, isLoading: statsLoading } = useScrapedProjectStats();
  const { data: sessions = [], isLoading: sessionsLoading } = useScrapingSessions();
  const triggerScraping = useTriggerScraping();

  const handleQuickScraping = () => {
    triggerScraping.mutate({
      source: 'both',
      max_pages: 5,
      headless: true
    });
  };

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Données Scrapées</h1>
          <p className="text-muted-foreground">Collecte automatique depuis GEF et GCF</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Données Scrapées</h1>
          <p className="text-muted-foreground">Collecte automatique depuis GEF et GCF</p>
        </div>
        
        <Button 
          onClick={handleQuickScraping}
          disabled={triggerScraping.isPending}
          className="gap-2"
        >
          {triggerScraping.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Scraping...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Scraping Rapide
            </>
          )}
        </Button>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Scrapé</p>
                <p className="text-2xl font-bold">{stats?.total_scraped || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prêts à convertir</p>
                <p className="text-2xl font-bold">{stats?.ready_projects || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Projets GEF</p>
                <p className="text-2xl font-bold">{stats?.by_source?.GEF || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <Globe className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Projets GCF</p>
                <p className="text-2xl font-bold">{stats?.by_source?.GCF || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Qualité des données */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Qualité des Données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Score moyen de complétude</span>
              <div className="flex items-center gap-2">
                <Progress value={stats.avg_completeness_score} className="w-32" />
                <span className="font-medium">{Math.round(stats.avg_completeness_score)}%</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {stats.by_completeness_score?.excellent || 0}
                </div>
                <div className="text-xs text-muted-foreground">Excellent (≥90%)</div>
              </div>
              
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {stats.by_completeness_score?.good || 0}
                </div>
                <div className="text-xs text-muted-foreground">Bon (70-89%)</div>
              </div>
              
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-lg font-bold text-yellow-600">
                  {stats.by_completeness_score?.fair || 0}
                </div>
                <div className="text-xs text-muted-foreground">Moyen (50-69%)</div>
              </div>
              
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-lg font-bold text-red-600">
                  {stats.by_completeness_score?.poor || 0}
                </div>
                <div className="text-xs text-muted-foreground">Faible (<50%)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions de scraping récentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Sessions de Scraping Récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucune session de scraping récente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${session.success ? 'bg-success/10' : 'bg-destructive/10'}`}>
                      {session.success ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{session.source_display}</Badge>
                        <span className="text-sm font-medium">
                          {session.projects_saved} projets sauvegardés
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.started_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge variant={session.success ? "default" : "destructive"}>
                      {session.success ? "Succès" : "Échec"}
                    </Badge>
                    {session.duration && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Durée: {session.duration}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions Rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => window.open('/scraped-projects', '_blank')}
            >
              <FileText className="w-4 h-4" />
              Voir tous les projets scrapés
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              disabled={!stats?.ready_projects}
            >
              <CheckCircle className="w-4 h-4" />
              Convertir projets prêts ({stats?.ready_projects || 0})
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <p className="text-muted-foreground">Dernière mise à jour:</p>
              <p className="font-medium">
                {sessions[0] ? new Date(sessions[0].started_at).toLocaleString('fr-FR') : 'Jamais'}
              </p>
            </div>
            
            <div className="text-sm">
              <p className="text-muted-foreground">Projets convertis:</p>
              <p className="font-medium">{stats?.linked_projects || 0}</p>
            </div>
            
            <div className="text-sm">
              <p className="text-muted-foreground">Nécessitent révision:</p>
              <p className="font-medium">{stats?.needs_review || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScrapedSection;