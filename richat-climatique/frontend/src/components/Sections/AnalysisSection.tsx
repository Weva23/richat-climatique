import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

const AnalysisSection = () => {
  const projects = [
    {
      id: 1,
      name: "Association Verte Mauritanie",
      type: "Guichet permanent du GCF",
      score: 65,
      rating: 3
    },
    {
      id: 2,
      name: "Coopérative des Pêcheurs", 
      type: "Fonds GEF",
      score: 95,
      rating: 5
    },
    {
      id: 3,
      name: "Initiative Jeunesse Climat",
      type: "Programme CIF",
      score: 35,
      rating: 2
    }
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating 
            ? "fill-warning text-warning" 
            : "text-muted-foreground"
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Analyse financière</h1>
        <p className="text-muted-foreground">Scores et viabilité des projets</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Score moyen de viabilité (à définir avec l'IA)</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-success">65</span>
                <span className="text-lg text-muted-foreground">/100</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Montant total demandé</p>
              <div className="text-4xl font-bold text-primary">0 €</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-medium text-foreground mb-4">Analyse par projet</h2>
        <div className="space-y-4">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">{project.type}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1">
                      {renderStars(project.rating)}
                      <span className="text-sm text-muted-foreground ml-2">({project.score}/100)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalysisSection;