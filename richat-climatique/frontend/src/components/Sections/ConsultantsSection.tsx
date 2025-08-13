import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users } from "lucide-react";

const ConsultantsSection = () => {
  const consultants = [
    {
      id: 1,
      name: "Aminetou EL KHALEF",
      initials: "AE",
      assignments: 5,
      color: "bg-primary"
    },
    {
      id: 2,
      name: "Consultant N2",
      initials: "CN",
      assignments: 3,
      color: "bg-success"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Consultants actifs</h1>
        <p className="text-muted-foreground">Assignations en cours</p>
      </div>

      <div className="space-y-4">
        {consultants.map((consultant) => (
          <Card key={consultant.id}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className={`${consultant.color} text-white font-medium`}>
                    {consultant.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-foreground">{consultant.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {consultant.assignments} dossiers assignés
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ConsultantsSection;