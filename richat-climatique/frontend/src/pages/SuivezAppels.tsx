import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Filter, Grid, List, CheckCircle, Clock, Euro, TrendingUp, 
  Globe, Leaf, Building, DollarSign, Calendar, ExternalLink, Star,
  AlertCircle, RefreshCw, Eye, Archive, X, FileText
} from "lucide-react";
import Header from "@/components/Layout/Header";
import { useProjectAlerts, useProjectAlertsStats, useMarkAlertAsRead, useDismissAlert, useArchiveAlert } from "@/hooks/useProjectAlerts";

const SuivezAppels = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("active");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Hooks pour les mutations
  const markAsReadMutation = useMarkAlertAsRead();
  const dismissAlertMutation = useDismissAlert();
  const archiveAlertMutation = useArchiveAlert();

  // Charger les alertes projets
  const { 
    data: alertsData, 
    isLoading, 
    error, 
    refetch,
    isError 
  } = useProjectAlerts({
    status: selectedStatus === 'all' ? undefined : selectedStatus as any,
    priority: selectedPriority === 'all' ? undefined : selectedPriority as any,
    source: selectedSource === 'all' ? undefined : selectedSource as any,
    is_featured: showFeaturedOnly || undefined,
    search: searchTerm || undefined,
    page: currentPage,
    page_size: 20
  });

  // Charger les statistiques
  const { data: stats } = useProjectAlertsStats();

  // Extraire les alertes
  const alerts = alertsData?.results || [];
  const totalCount = alertsData?.count || 0;
  const hasNextPage = !!alertsData?.next;
  const hasPreviousPage = !!alertsData?.previous;

  // Filtrer localement si nécessaire (pour la recherche en temps réel)
  const filteredAlerts = alerts;

  // Actions sur les alertes
  const handleMarkAsRead = async (alertId: number) => {
    try {
      await markAsReadMutation.mutateAsync(alertId);
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  };

  const handleDismiss = async (alertId: number) => {
    try {
      await dismissAlertMutation.mutateAsync(alertId);
    } catch (error) {
      console.error('Erreur lors de l\'ignorance:', error);
    }
  };

  const handleArchive = async (alertId: number) => {
    try {
      await archiveAlertMutation.mutateAsync(alertId);
    } catch (error) {
      console.error('Erreur lors de l\'archivage:', error);
    }
  };

  const statsCards = [
    {
      title: "Alertes actives",
      value: stats?.active_alerts || 0,
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      title: "Haute priorité",
      value: stats?.high_priority_alerts || 0, 
      icon: AlertCircle,
      color: "text-orange-600"
    },
    {
      title: "Nouveaux cette semaine",
      value: stats?.new_this_week || 0,
      icon: TrendingUp,
      color: "text-blue-600"
    },
    {
      title: "Total disponible",
      value: stats?.total_alerts || 0,
      icon: FileText,
      color: "text-purple-600"
    }
  ];

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "GEF":
        return <Globe className="w-4 h-4 text-green-600" />;
      case "GCF":
        return <Leaf className="w-4 h-4 text-emerald-600" />;
      case "CLIMATE_FUND":
        return <Leaf className="w-4 h-4 text-blue-600" />;
      default:
        return <Building className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const configs = {
      urgent: { color: "bg-red-100 text-red-800 border-red-200", icon: "🚨" },
      high: { color: "bg-orange-100 text-orange-800 border-orange-200", icon: "🔥" },
      medium: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: "📋" },
      low: { color: "bg-gray-100 text-gray-800 border-gray-200", icon: "📝" }
    };
    const config = configs[priority as keyof typeof configs] || configs.medium;
    
    return (
      <Badge variant="outline" className={`text-xs ${config.color}`}>
        {config.icon} {priority}
      </Badge>
    );
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedSource("all");
    setSelectedPriority("all");
    setSelectedStatus("active");
    setShowFeaturedOnly(false);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSource, selectedPriority, selectedStatus, showFeaturedOnly]);

  const AlertCard = ({ alert }: { alert: any }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {getSourceIcon(alert.source)}
            <Badge variant="secondary" className="text-xs">
              {alert.source_display}
            </Badge>
            {getPriorityBadge(alert.priority_level)}
            {alert.is_featured && (
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
            )}
            {alert.is_new_this_week && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                🆕 Nouveau
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => handleMarkAsRead(alert.id)}
              disabled={markAsReadMutation.isPending}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => handleArchive(alert.id)}
              disabled={archiveAlertMutation.isPending}
            >
              <Archive className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => handleDismiss(alert.id)}
              disabled={dismissAlertMutation.isPending}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <CardTitle className="text-lg leading-tight">
          {alert.alert_icon} {alert.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {alert.description}
        </p>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-muted-foreground" />
            <span className="truncate">{alert.organization}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{alert.total_funding}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Qualité:</span>
            <Badge 
              variant={alert.data_completeness_score >= 80 ? "default" : "secondary"}
              className="text-xs"
            >
              {alert.data_completeness_score}%
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{alert.time_since_alert}</span>
          </div>
        </div>

        {alert.source_url && (
          <Button variant="outline" size="sm" className="w-full">
            <ExternalLink className="w-4 h-4 mr-2" />
            Voir les détails
          </Button>
        )}
      </CardContent>
    </Card>
  );

  const AlertListItem = ({ alert }: { alert: any }) => (
    <Card className="hover:bg-accent/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-1">
            {getSourceIcon(alert.source)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {alert.source_display}
                </Badge>
                {getPriorityBadge(alert.priority_level)}
                {alert.is_featured && (
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                )}
                {alert.is_new_this_week && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    🆕
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {alert.time_since_alert}
              </span>
            </div>

            <h3 className="font-medium text-sm leading-tight mb-2 line-clamp-2">
              {alert.alert_icon} {alert.title}
            </h3>

            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {alert.description}
            </p>

            <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Building className="w-3 h-3" />
                <span className="truncate">{alert.organization}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                <span>{alert.total_funding}</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>{alert.data_completeness_score}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-3 h-3 mr-1" />
                Détails
              </Button>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={() => handleMarkAsRead(alert.id)}
                  disabled={markAsReadMutation.isPending}
                >
                  <Eye className="w-3 h-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={() => handleArchive(alert.id)}
                  disabled={archiveAlertMutation.isPending}
                >
                  <Archive className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const Pagination = () => {
    const totalPages = Math.ceil(totalCount / 20);
    
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} sur {totalPages} ({totalCount} résultats)
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!hasPreviousPage}
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!hasNextPage}
          >
            Suivant
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header activeSection="notifications" onSectionChange={() => {}} />
      
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              Suivez les appels à projets
            </h1>
            <p className="text-muted-foreground">
              Nouvelles opportunités de financement climatique détectées automatiquement
            </p>
          </div>
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Actualiser
          </Button>
        </div>

        {/* Filtres */}
        <div className="flex gap-4 items-center flex-wrap">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom de fonds, organisation, titre..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes sources</SelectItem>
              <SelectItem value="GEF">🌍 GEF</SelectItem>
              <SelectItem value="GCF">💚 GCF</SelectItem>
              <SelectItem value="CLIMATE_FUND">🌱 Climate Funds</SelectItem>
              <SelectItem value="OTHER">📋 Autres</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Priorité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes priorités</SelectItem>
              <SelectItem value="urgent">🚨 Urgente</SelectItem>
              <SelectItem value="high">🔥 Haute</SelectItem>
              <SelectItem value="medium">📋 Moyenne</SelectItem>
              <SelectItem value="low">📝 Basse</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">✅ Actives</SelectItem>
              <SelectItem value="read">👀 Lues</SelectItem>
              <SelectItem value="archived">🗃️ Archivées</SelectItem>
              <SelectItem value="all">Toutes</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant={showFeaturedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
          >
            <Star className="w-4 h-4 mr-2" />
            Mises en avant
          </Button>

          <Button variant="outline" onClick={handleClearFilters}>
            Effacer
          </Button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-4 gap-6">
          {statsCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardContent className="p-6 text-center">
                  <Icon className={`w-8 h-8 mx-auto mb-2 ${stat.color}`} />
                  <h3 className="text-sm text-muted-foreground mb-1">{stat.title}</h3>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Contrôles d'affichage */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {filteredAlerts.length} alerte{filteredAlerts.length > 1 ? 's' : ''} affichée{filteredAlerts.length > 1 ? 's' : ''}
            </span>
            {totalCount > filteredAlerts.length && (
              <span className="text-sm text-muted-foreground">
                (sur {totalCount} total)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Affichage :</span>
            <div className="flex border rounded-lg p-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className={viewMode === 'list' ? 'bg-primary text-white' : ''}
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className={viewMode === 'grid' ? 'bg-primary text-white' : ''}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Contenu des alertes */}
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mr-3" />
              <span>Chargement des alertes...</span>
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Erreur de chargement</h3>
              <p className="text-muted-foreground mb-4">
                Impossible de charger les alertes de projets
              </p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune alerte</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedSource !== 'all' || selectedPriority !== 'all' || showFeaturedOnly
                  ? 'Aucune alerte ne correspond à vos critères de recherche'
                  : 'Aucune nouvelle alerte de projet disponible'
                }
              </p>
              {(searchTerm || selectedSource !== 'all' || selectedPriority !== 'all' || showFeaturedOnly) && (
                <Button variant="outline" onClick={handleClearFilters} className="mt-4">
                  Effacer les filtres
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                  : 'space-y-4'
              }>
                {filteredAlerts.map((alert) => 
                  viewMode === 'grid' ? (
                    <AlertCard key={alert.id} alert={alert} />
                  ) : (
                    <AlertListItem key={alert.id} alert={alert} />
                  )
                )}
              </div>
              
              {/* Pagination */}
              <div className="mt-8">
                <Pagination />
              </div>
            </>
          )}
        </div>


      </div>
    </div>
  );
};

export default SuivezAppels;