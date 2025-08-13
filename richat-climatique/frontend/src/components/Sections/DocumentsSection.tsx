import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

const DocumentsSection = () => {
  const projects = [
    {
      id: 1,
      name: "Association Verte Mauritanie",
      documents: [
        "Business plan",
        "Pitch deck", 
        "Lettre d'intention",
        "Étude de faisabilité",
        "Annexes",
        "Preuves de cofinancement"
      ]
    },
    {
      id: 2,
      name: "Coopérative des Pêcheurs",
      documents: [
        "Business plan",
        "Pitch deck",
        "Lettre d'intention", 
        "Étude de faisabilité",
        "Annexes"
      ]
    },
    {
      id: 3,
      name: "Initiative Jeunesse Climat",
      documents: [
        "Statuts juridiques",
        "Budget prévisionnel",
        "Business plan",
        "Pitch deck"
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Documents manquants</h1>
        <p className="text-muted-foreground">Pièces non soumises</p>
      </div>

      <div className="space-y-6">
        {projects.map((project) => (
          <Card key={project.id} className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-destructive mt-1" />
                <div>
                  <h3 className="font-medium text-destructive">{project.name}</h3>
                  <p className="text-sm text-destructive/80 mt-1">Documents manquants:</p>
                </div>
              </div>
              
              <ul className="space-y-2 ml-8">
                {project.documents.map((doc, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-destructive rounded-full" />
                    <span className="text-sm text-destructive">{doc}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DocumentsSection;