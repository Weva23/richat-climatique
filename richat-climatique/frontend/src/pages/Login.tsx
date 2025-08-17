import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserPlus, LogIn, Building2, Shield } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

interface RegisterData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  phone: string;
  company_name: string;
}

const Login = () => {
  // États pour la connexion
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // États pour l'inscription (clients uniquement)
  const [registerData, setRegisterData] = useState<RegisterData>({
    username: "",
    email: "",
    password: "",
    password_confirm: "",
    first_name: "",
    last_name: "",
    phone: "",
    company_name: ""
  });
  const [registerLoading, setRegisterLoading] = useState(false);

  const { login, register } = useAuth();

  const handleLogin = async () => {
    if (!loginUsername.trim() || !loginPassword.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoginLoading(true);

    try {
      await login(loginUsername, loginPassword);
      // La redirection est gérée automatiquement par le context
    } catch (error: any) {
      console.error("Erreur de connexion:", error);
      toast.error(error.message || "Erreur de connexion");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    // Validations côté client
    if (!registerData.username.trim() || !registerData.email.trim() || 
        !registerData.password.trim() || !registerData.first_name.trim() || 
        !registerData.last_name.trim() || !registerData.company_name.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (registerData.password !== registerData.password_confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (registerData.password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setRegisterLoading(true);

    try {
      await register(registerData);
      // La redirection est gérée automatiquement par le context
    } catch (error: any) {
      console.error("Erreur d'inscription:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
    } finally {
      setRegisterLoading(false);
    }
  };

  const updateRegisterField = (field: keyof RegisterData, value: string) => {
    setRegisterData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Search className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">Richat Funding Tracker</h1>
          </div>
          <CardTitle className="text-xl">Authentification</CardTitle>
          <CardDescription>
            Connectez-vous ou créez un compte client pour accéder à la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                Connexion
              </TabsTrigger>
              <TabsTrigger value="register" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Inscription Client
              </TabsTrigger>
            </TabsList>

            {/* ONGLET CONNEXION */}
            <TabsContent value="login">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Nom d'utilisateur ou Email</Label>
                  <Input
                    id="login-username"
                    type="text"
                    placeholder="Votre nom d'utilisateur ou email"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    disabled={loginLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Mot de passe</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={loginLoading}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <Button 
                  type="button"
                  onClick={handleLogin}
                  className="w-full" 
                  disabled={loginLoading}
                >
                  {loginLoading ? "Connexion..." : "Se connecter"}
                </Button>
              </div>
            </TabsContent>

            {/* ONGLET INSCRIPTION CLIENT */}
            <TabsContent value="register">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Inscription Client/Entreprise</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Créez un compte pour suivre vos projets de financement climatique
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-firstname">Prénom *</Label>
                    <Input
                      id="register-firstname"
                      type="text"
                      placeholder="Prénom"
                      value={registerData.first_name}
                      onChange={(e) => updateRegisterField('first_name', e.target.value)}
                      disabled={registerLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-lastname">Nom *</Label>
                    <Input
                      id="register-lastname"
                      type="text"
                      placeholder="Nom"
                      value={registerData.last_name}
                      onChange={(e) => updateRegisterField('last_name', e.target.value)}
                      disabled={registerLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-company">Nom de l'entreprise *</Label>
                  <Input
                    id="register-company"
                    type="text"
                    placeholder="Nom de votre entreprise ou organisation"
                    value={registerData.company_name}
                    onChange={(e) => updateRegisterField('company_name', e.target.value)}
                    disabled={registerLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-username">Nom d'utilisateur *</Label>
                  <Input
                    id="register-username"
                    type="text"
                    placeholder="Nom d'utilisateur unique"
                    value={registerData.username}
                    onChange={(e) => updateRegisterField('username', e.target.value)}
                    disabled={registerLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">Email *</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="votre.email@entreprise.com"
                    value={registerData.email}
                    onChange={(e) => updateRegisterField('email', e.target.value)}
                    disabled={registerLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-phone">Téléphone</Label>
                  <Input
                    id="register-phone"
                    type="tel"
                    placeholder="+222 XX XX XX XX"
                    value={registerData.phone}
                    onChange={(e) => updateRegisterField('phone', e.target.value)}
                    disabled={registerLoading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Mot de passe *</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerData.password}
                      onChange={(e) => updateRegisterField('password', e.target.value)}
                      disabled={registerLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password-confirm">Confirmer *</Label>
                    <Input
                      id="register-password-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={registerData.password_confirm}
                      onChange={(e) => updateRegisterField('password_confirm', e.target.value)}
                      disabled={registerLoading}
                    />
                  </div>
                </div>

                <Button 
                  type="button"
                  onClick={handleRegister}
                  className="w-full" 
                  disabled={registerLoading}
                >
                  {registerLoading ? "Création du compte..." : "Créer mon compte client"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Informations de sécurité */}
          <div className="mt-6 space-y-3">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <Building2 className="w-4 h-4" />
                <span className="font-medium text-sm">Pour les clients</span>
              </div>
              <p className="text-xs text-green-600">
                Créez votre compte client pour soumettre et suivre vos projets de financement climatique.
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Shield className="w-4 h-4" />
                <span className="font-medium text-sm">Pour les administrateurs</span>
              </div>
              <p className="text-xs text-blue-600">
                Les comptes administrateurs sont créés par l'équipe technique pour des raisons de sécurité.
                Contactez l'équipe IT si vous avez besoin d'un accès administrateur.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;