import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(username, password);
      toast.success("Connexion réussie !");
      navigate("/");
    } catch (error: any) {
      console.error("Erreur de connexion:", error);
      toast.error("Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Search className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">Richat Funding Tracker</h1>
          </div>
          <CardTitle className="text-xl">Connexion</CardTitle>
          <CardDescription>
            Connectez-vous à votre compte pour accéder au tableau de bord
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input
                id="username"
                type="text"
                placeholder="Votre nom d'utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
            
            {/* Informations de test */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              {/* <h3 className="font-medium text-sm mb-2">Comptes de test :</h3> */}
              <div className="text-xs space-y-1">
                {/* <p><strong>Admin:</strong> admin / admin123</p> */}
                {/* <p><strong>Consultant:</strong> aminetou.khalef / consultant123</p> */}
                {/* <p><strong>Consultant:</strong> fatima.bint / consultant123</p> */}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;