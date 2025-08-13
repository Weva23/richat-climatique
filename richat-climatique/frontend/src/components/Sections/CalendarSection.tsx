import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

const CalendarSection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Calendrier</h1>
        <p className="text-muted-foreground">Deadlines à venir</p>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">Aucune échéance prochaine</h3>
          <p className="text-sm text-muted-foreground">
            Les deadlines importantes apparaîtront ici
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarSection;