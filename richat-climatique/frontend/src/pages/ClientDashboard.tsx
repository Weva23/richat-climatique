import React, { useState, useEffect } from 'react';
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
  ChevronRight, MapPin, Banknote, Award, Users
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

// Interfaces TypeScript
interface ScrapedProject {
  id: number;
  title: string;
  source: 'GEF' | 'GCF' | 'OTHER';
  source_display: string;
  source_url: string;
  description: string;
  organization: string;
  project_type: string;
  status: string;
  total_funding: string;
  funding_amount: number | null;
  currency: string;
  country: string;
  region: string;
  scraped_at: string;
  data_completeness_score: number;
  is_relevant_for_mauritania: boolean;
  can_create_project: boolean;
  linked_project: number | null;
}

interface ProjectRequest {
  id: number;
  client: number;
  projects: number[];
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

// Service API
const apiClient = {
  get: async (url: string) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`http://127.0.0.1:8000/api${url}`, {
      headers: {
        'Authorization': token ? `Token ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Erreur réseau');
    return response.json();
  },
  
  post: async (url: string, data: any) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`http://127.0.0.1:8000/api${url}`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Token ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Erreur réseau');
    return response.json();
  },
};

const ClientProjectSelection = () => {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<ScrapedProject[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<ProjectRequest[]>([]);

  // Statistiques pour le header
  const stats = [
    {
      title: "Projets Disponibles",
      value: projects.filter(p => p.can_create_project && !p.linked_project).length,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Mes Sélections",
      value: selectedProjects.length,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Demandes Envoyées",
      value: myRequests.filter(r => r.status === 'pending').length,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Projets Approuvés",
      value: myRequests.filter(r => r.status === 'approved').length,
      icon: Award,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  useEffect(() => {
    loadScrapedProjects();
    loadMyRequests();
  }, []);

  const loadScrapedProjects = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get('/scraped-projects/');
      setProjects(data.results || data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de charger les projets');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyRequests = async () => {
    try {
      if (!user?.id) return;
      const data = await apiClient.get(`/project-requests/?client=${user.id}`);
      setMyRequests(data.results || []);
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
    }
  };

  const filteredProjects = projects.filter(project => {
    // Filtrer seulement les projets disponibles (non liés)
    if (project.linked_project) return false;
    
    // Filtre de recherche
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtre par source
    const matchesSource = sourceFilter === "all" || project.source === sourceFilter;
    
    return matchesSearch && matchesSource;
  });

  const handleProjectToggle = (projectId: number) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSelectAll = () => {
    const availableProjectIds = filteredProjects
      .filter(p => p.can_create_project && !p.linked_project)
      .map(p => p.id);
    
    if (selectedProjects.length === availableProjectIds.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(availableProjectIds);
    }
  };

  const handleSubmitRequest = async () => {
    if (selectedProjects.length === 0) {
      toast.error('Veuillez sélectionner au moins un projet');
      return;
    }

    if (!requestMessage.trim()) {
      toast.error('Veuillez ajouter un message expliquant votre demande');
      return;
    }

    if (!user?.id) {
      toast.error('Erreur d\'authentification');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const requestData = {
        client_id: user.id,
        project_ids: selectedProjects,
        message: requestMessage,
        client_info: {
          name: user.full_name,
          company: user.company_name || '',
          email: user.email,
          phone: user.phone || ''
        }
      };

      await apiClient.post('/project-requests/', requestData);
      
      toast.success('Demande envoyée avec succès ! L\'administrateur va examiner votre sélection.');
      setSelectedProjects([]);
      setRequestMessage("");
      setConfirmDialogOpen(false);
      loadMyRequests();
    } catch (error: any) {
      console.error('Erreur:', error);
      const errorMessage = error.message || 'Erreur lors de l\'envoi de la demande';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
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
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Client */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Building className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Sélection de Projets
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
              
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </Button>
              
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Paramètres
              </Button>
              
              <Button onClick={logout} variant="destructive" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
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
                🎯 Sélectionnez vos Projets de Financement Climatique
              </h2>
              <p className="text-blue-800 mb-4">
                Bienvenue <strong>{user?.full_name}</strong> ! Explorez notre base de données de projets de financement climatique 
                et sélectionnez ceux qui correspondent à votre domaine d'activité. Une fois confirmés, notre équipe vous accompagnera 
                dans le processus de soumission.
              </p>
              <div className="bg-white p-4 rounded border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2">📋 Comment ça marche :</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">1</span>
                    <span>Parcourez les projets disponibles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">2</span>
                    <span>Sélectionnez ceux qui vous intéressent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">3</span>
                    <span>Confirmez votre demande d'accompagnement</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filtres et Actions */}
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
                    <SelectItem value="OTHER">OECD/Autres</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={handleSelectAll}
                  className="gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {selectedProjects.length === filteredProjects.filter(p => p.can_create_project && !p.linked_project).length ? 'Désélectionner tout' : 'Sélectionner tout'}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={loadScrapedProjects}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Actualiser
                </Button>

                <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      disabled={selectedProjects.length === 0}
                      className="gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Confirmer ma sélection ({selectedProjects.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Confirmer votre demande d'accompagnement</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-4">
                          Vous avez sélectionné <strong>{selectedProjects.length} projet(s)</strong>. 
                          Veuillez expliquer pourquoi ces projets vous intéressent et comment ils s'alignent 
                          avec votre activité.
                        </p>
                        
                        <div className="bg-gray-50 p-4 rounded-lg mb-4">
                          <h4 className="font-medium mb-2">Projets sélectionnés :</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {projects.filter(p => selectedProjects.includes(p.id)).map(project => (
                              <div key={project.id} className="flex items-center gap-2 text-sm">
                                <Badge className={getSourceColor(project.source)}>
                                  {project.source === 'OTHER' ? 'OECD' : project.source}
                                </Badge>
                                <span className="truncate">{project.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Message de demande *
                        </label>
                        <Textarea
                          placeholder="Décrivez votre intérêt pour ces projets, votre domaine d'activité, et comment vous comptez les utiliser..."
                          value={requestMessage}
                          onChange={(e) => setRequestMessage(e.target.value)}
                          rows={6}
                          className="resize-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Ce message sera envoyé à notre équipe pour évaluer votre demande
                        </p>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Vos informations :</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                          <div>
                            <span className="font-medium">Nom :</span> {user?.full_name}
                          </div>
                          <div>
                            <span className="font-medium">Email :</span> {user?.email}
                          </div>
                          <div>
                            <span className="font-medium">Entreprise :</span> {user?.company_name}
                          </div>
                          <div>
                            <span className="font-medium">Téléphone :</span> {user?.phone || 'Non renseigné'}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setConfirmDialogOpen(false)}
                          disabled={isSubmitting}
                        >
                          Annuler
                        </Button>
                        <Button
                          onClick={handleSubmitRequest}
                          disabled={isSubmitting || !requestMessage.trim()}
                          className="flex-1"
                        >
                          {isSubmitting ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Envoi en cours...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Envoyer la demande
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                Aucun projet trouvé
              </h3>
              <p className="text-gray-500">
                Essayez de modifier vos critères de recherche ou actualisez la page
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id} 
                className={`hover:shadow-lg transition-all duration-200 border-l-4 ${
                  selectedProjects.includes(project.id) 
                    ? 'border-l-green-500 bg-green-50/30' 
                    : 'border-l-gray-200'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      <Checkbox
                        checked={selectedProjects.includes(project.id)}
                        onCheckedChange={() => handleProjectToggle(project.id)}
                        disabled={!project.can_create_project}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 text-lg leading-tight">
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
                              value={project.data_completeness_score} 
                              className="w-16 h-2"
                            />
                            <span className="font-bold text-blue-600">
                              {project.data_completeness_score}%
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
                        {project.source_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={project.source_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Voir la source
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer informatif */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6 text-center">
            <h4 className="font-semibold text-lg mb-4 text-blue-900">
              🤝 Accompagnement Personnalisé
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-blue-800">
              <div>
                <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <h5 className="font-medium mb-2">Conseil Expert</h5>
                <p>Notre équipe vous accompagne dans l'analyse de faisabilité et la préparation de votre dossier</p>
              </div>
              <div>
                <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <h5 className="font-medium mb-2">Dossier Complet</h5>
                <p>Nous vous aidons à constituer un dossier solide avec tous les documents requis</p>
              </div>
              <div>
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <h5 className="font-medium mb-2">Suivi Personnalisé</h5>
                <p>Accompagnement jusqu'à la soumission et le suivi de votre demande de financement</p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-white rounded border border-blue-200">
              <p className="text-xs text-blue-600">
                📧 Contact : <strong>contact@richat-funding.mr</strong> | 
                📞 Téléphone : <strong>+222 XX XX XX XX</strong> | 
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