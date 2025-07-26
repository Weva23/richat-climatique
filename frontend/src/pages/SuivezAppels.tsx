import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Grid, List, CheckCircle, Clock, Euro, TrendingUp } from "lucide-react";
import Header from "@/components/Layout/Header";

const SuivezAppels = () => {
  const stats = [
    {
      title: "Appels ouverts",
      value: "0",
      icon: CheckCircle,
      color: "text-success"
    },
    {
      title: "À venir",
      value: "0", 
      icon: Clock,
      color: "text-warning"
    },
    {
      title: "Montant total",
      value: "0€",
      icon: Euro,
      color: "text-primary"
    },
    {
      title: "Cette semaine",
      value: "0",
      icon: TrendingUp,
      color: "text-info"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header activeSection="notifications" onSectionChange={() => {}} />
      
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Suivez les appels à projets des fonds climatiques internationaux</h1>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom de fonds, titre..."
              className="pl-10"
            />
          </div>
          
          <Select>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type de..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="gcf">GCF</SelectItem>
              <SelectItem value="gef">GEF</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Région" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes régions</SelectItem>
              <SelectItem value="africa">Afrique</SelectItem>
              <SelectItem value="asia">Asie</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Fonds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les fonds</SelectItem>
              <SelectItem value="gcf">GCF</SelectItem>
              <SelectItem value="gef">GEF</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon">
            <Filter className="w-4 h-4" />
          </Button>

          <Button variant="outline">
            Effacer
          </Button>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Trier par :</span>
            <Select defaultValue="deadline">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline">Date limite (plus urgent)</SelectItem>
                <SelectItem value="amount">Montant</SelectItem>
                <SelectItem value="name">Nom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Affichage :</span>
            <div className="flex border rounded-lg p-1">
              <Button variant="ghost" size="sm" className="bg-success text-white">
                <List className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Grid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {stats.map((stat) => {
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

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-success rounded-full"></div>
          <span className="text-sm text-muted-foreground">0 appel actif</span>
        </div>
      </div>
    </div>
  );
};

export default SuivezAppels;