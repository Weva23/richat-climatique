// =============================================================================
// FICHIER: src/pages/DossiersCandidature.tsx (MODIFIÉ POUR L'API)
// =============================================================================
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, FileText, Star, User, MoreHorizontal, Download, File, AlertCircle } from "lucide-react";
import Header from "@/components/Layout/Header";
import { useState } from "react";
import { useProjects } from "../hooks/useProjects";
import { ProjectFilters } from "../services/projectService";

const DossiersCandidature = () => {
  const [selectedDossier, setSelectedDossier] = useState<number | null>(null);
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  
  // Utiliser les données réelles de l'API
  const { data: projets = [], isLoading, error } = useProjects(filters);

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < count ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'etat':
        return "bg-blue-100 text-blue-800";
      case 'prive':
        return "bg-orange-100 text-orange-800";
      case 'institution':
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'progress':
        return "En cours";
      case 'ready':
        return "Prêt";
      case 'draft':
        return "Brouillon";
      default:
        return status;
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters({ ...filters, search: value });
  };

  const handleStatusFilter = (status: string) => {
    if (status === "all") {
      const { status: _, ...newFilters } = filters;
      setFilters(newFilters);
    } else {
      setFilters({ ...filters, status });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header activeSection="settings" onSectionChange={() => {}} />
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header activeSection="settings" onSectionChange={() => {}} />
        <div className="p-8">
          <div className="text-center text-red-600">
            Erreur lors du chargement des données. Vérifiez que le backend est démarré.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header activeSection="settings" onSectionChange={() => {}} />
      
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Dossiers de candidature</h1>
          <p className="text-muted-foreground">Gérez les candidatures clients et leur documentation</p>
          <div className="flex justify-end">
            <span className="text-sm text-muted-foreground">{projets.length} dossiers</span>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par organisation ou appel à projet..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          
          <Select onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="progress">En cours</SelectItem>
              <SelectItem value="ready">Prêt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {projets.map((projet) => (
            <Card key={projet.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{projet.name}</h3>
                        <Badge variant="secondary" className={getStatusColor(projet.type_project)}>
                          {projet.type_display}
                        </Badge>
                        <Badge variant="outline">
                          {getStatusBadge(projet.status)}
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Appel à projet</p>
                        <p className="text-sm font-medium">{projet.fund_display}</p>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span>Score :</span>
                          <div className="flex">
                            {renderStars(projet.rating_stars)}
                          </div>
                          <span>{projet.score_viabilite}/100</span>
                        </div>
                        
                        <Badge variant="outline" className="text-xs">
                          {projet.progress_percentage}% complet
                        </Badge>
                      </div>
                      
                      {projet.consultant_details && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>Assigné à : {projet.consultant_details.full_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Contact</p>
                      <p className="text-sm font-medium">{projet.contact_name}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedDossier(projet.id)}>
                            Voir les documents
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <File className="w-5 h-5" />
                              Documents - {projet.name}
                            </DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                              <div>
                                <p className="text-muted-foreground">Appel à projet</p>
                                <p className="font-medium">{projet.fund_display}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-muted-foreground">Score de complétude</p>
                                <div className="flex items-center gap-1">
                                  <div className="flex">
                                    {renderStars(projet.rating_stars)}
                                  </div>
                                  <span className="font-medium">{projet.score_viabilite}/100</span>
                                </div>
                              </div>
                            </div>

                            <ScrollArea className="h-[400px] pr-4">
                              <div className="space-y-6">
                                {/* Documents soumis */}
                                {projet.submitted_documents && projet.submitted_documents.length > 0 && (
                                  <div>
                                    <h3 className="font-medium mb-3">Documents soumis</h3>
                                    <div className="space-y-3">
                                      {projet.submitted_documents.map((doc, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                          <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 rounded">
                                              <FileText className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                              <p className="font-medium text-sm">{doc.name}</p>
                                              <p className="text-xs text-muted-foreground">{doc.document_type_name}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                              {doc.status === 'submitted' ? 'Soumis' : doc.status}
                                            </Badge>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                              <Download className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Documents manquants */}
                                {projet.missing_documents && projet.missing_documents.length > 0 && (
                                  <div>
                                    <h3 className="font-medium mb-3 text-destructive">Documents manquants</h3>
                                    <div className="space-y-2">
                                      {projet.missing_documents.map((doc, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                                          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                                          <span className="text-sm text-destructive">{doc}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Message si aucun document */}
                                {(!projet.submitted_documents || projet.submitted_documents.length === 0) && 
                                 (!projet.missing_documents || projet.missing_documents.length === 0) && (
                                  <div className="text-center py-8 text-muted-foreground">
                                    Aucun document disponible pour ce projet
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="sm">
                        Actions
                      </Button>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Message si aucun projet */}
          {projets.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">Aucun dossier trouvé</h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'Aucun dossier ne correspond à votre recherche' : 'Aucun dossier de candidature disponible'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DossiersCandidature;