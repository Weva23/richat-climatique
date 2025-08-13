import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, User, Database, Bell } from "lucide-react";

const SettingsSection = () => {
  const settingsCategories = [
    {
      id: 1,
      title: "Paramètres utilisateur",
      description: "Gérer votre profil et vos préférences",
      icon: User,
      items: ["Profil", "Préférences", "Sécurité"]
    },
    {
      id: 2,
      title: "Configuration système",
      description: "Paramètres de l'application",
      icon: Database,
      items: ["Base de données", "API", "Intégrations"]
    },
    {
      id: 3,
      title: "Notifications",
      description: "Gérer les alertes et notifications",
      icon: Bell,
      items: ["Email", "Push", "SMS"]
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Paramètres</h1>
        <p className="text-muted-foreground">Configuration et préférences</p>
      </div>

      <div className="grid gap-6">
        {settingsCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary-light">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">{category.title}</h3>
                    <p className="text-sm text-muted-foreground font-normal">{category.description}</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {category.items.map((item, index) => (
                    <div key={index} className="p-3 border rounded-lg hover:bg-accent cursor-pointer">
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SettingsSection;