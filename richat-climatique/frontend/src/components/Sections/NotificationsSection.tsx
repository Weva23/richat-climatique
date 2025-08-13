import { Card, CardContent } from "@/components/ui/card";
import { Bell, CheckCircle, AlertTriangle } from "lucide-react";

const NotificationsSection = () => {
  const notifications = [
    {
      id: 1,
      type: "document",
      title: "Nouveau document soumis",
      description: "EcoTech Mauritanie - Il y a 2 heures",
      icon: Bell,
      iconColor: "text-primary",
      bgColor: "bg-primary-light"
    },
    {
      id: 2,
      type: "ready",
      title: "Dossier prêt pour soumission",
      description: "Association Verte - Il y a 1 jour",
      icon: CheckCircle,
      iconColor: "text-success",
      bgColor: "bg-success-light"
    },
    {
      id: 3,
      type: "expired",
      title: "Document expiré",
      description: "Startup Solaire - Il y a 3 jours",
      icon: AlertTriangle,
      iconColor: "text-warning",
      bgColor: "bg-warning-light"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Notifications récentes</h1>
        <p className="text-muted-foreground">Dernières activités</p>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => {
          const Icon = notification.icon;
          return (
            <Card key={notification.id}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${notification.bgColor}`}>
                    <Icon className={`w-5 h-5 ${notification.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{notification.title}</h3>
                    <p className="text-sm text-muted-foreground">{notification.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationsSection;