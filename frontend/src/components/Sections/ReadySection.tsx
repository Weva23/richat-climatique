import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const ReadySection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Projets prêts</h1>
        <p className="text-muted-foreground">Dossiers à 100% complétés</p>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">Aucun projet prêt</h3>
          <p className="text-sm text-muted-foreground">
            Les projets complétés à 100% apparaîtront ici
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReadySection;