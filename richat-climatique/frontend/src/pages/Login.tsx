import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserPlus, LogIn, Building2, Shield, Eye, EyeOff, Sparkles, Zap, TreePine, Globe2 } from "lucide-react";
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
  const [showLoginPassword, setShowLoginPassword] = useState(false);

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
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <>
      {/* Section gauche - Héro fixe (Position absolue) */}
      <div className="hidden lg:block fixed left-0 top-0 w-1/2 h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 overflow-hidden z-10">
        {/* Background avec motifs géométriques animés */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_70%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.1),transparent_70%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,rgba(6,182,212,0.08),transparent_70%)]"></div>
        </div>

        {/* Éléments décoratifs flottants */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-24 h-24 bg-gradient-to-r from-cyan-200 to-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-20 w-28 h-28 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-2000"></div>

        {/* Motifs géométriques */}
        <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-blue-300 rotate-45 opacity-20 animate-spin-slow"></div>
        <div className="absolute top-3/4 right-1/4 w-6 h-6 bg-indigo-300 opacity-20 animate-bounce"></div>
        <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-cyan-300 rounded-full opacity-20 animate-pulse"></div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 w-full h-full">
          
          {/* Logo et branding */}
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <div className="relative">
                <div className="absolute -inset-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-20"></div>
                <img 
                  src="/richat.jpg" 
                  alt="RICHAT Logo" 
                  className="relative w-24 h-24 object-contain rounded-xl bg-white/90 p-2 shadow-xl"
                />
              </div>
              <div className="ml-4">
                <h1 className="text-4xl xl:text-5xl font-bold bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                  RICHAT
                </h1>
                <p className="text-blue-600 font-semibold text-lg">Funding Tracker</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-xl xl:text-2xl font-semibold text-gray-700 leading-tight">
                Plateforme dédiée au suivi et financement 
                <span className="block text-blue-600">des projets climatiques en Mauritanie</span>
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Connectez vos projets de transition écologique aux opportunités de financement disponibles
              </p>
            </div>
          </div>

          {/* Statistiques/Features */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="group">
              <div className="flex items-center space-x-3 p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-blue-100 hover:bg-white/70 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Entreprises</p>
                  <p className="text-sm text-blue-600">Mauritaniennes</p>
                </div>
              </div>
            </div>
            
            <div className="group">
              <div className="flex items-center space-x-3 p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-indigo-100 hover:bg-white/70 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <TreePine className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Projets</p>
                  <p className="text-sm text-indigo-600">Climatiques</p>
                </div>
              </div>
            </div>
            
            <div className="group">
              <div className="flex items-center space-x-3 p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-cyan-100 hover:bg-white/70 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Globe2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Financement</p>
                  <p className="text-sm text-cyan-600">International</p>
                </div>
              </div>
            </div>
            
            <div className="group">
              <div className="flex items-center space-x-3 p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-violet-100 hover:bg-white/70 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Innovation</p>
                  <p className="text-sm text-violet-600">Technologique</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA inspirant */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Notre Mission</h3>
                <p className="text-sm text-gray-600">
                  Faciliter l'accès des entreprises mauritaniennes aux financements climatiques pour 
                  accélérer la transition écologique du pays et contribuer aux objectifs de développement durable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section droite - Formulaire (Position indépendante) */}
      <div className="min-h-screen w-full lg:ml-[50%] lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-white relative z-20">
        <div className="w-full max-w-md">
          
          {/* Header mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="/richat.jpg" 
                alt="RICHAT Logo" 
                className="w-14 h-14 object-contain rounded-xl bg-white p-2 shadow-lg"
              />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent mb-2">
              RICHAT
            </h1>
            <p className="text-blue-600 font-semibold">Funding Tracker</p>
          </div>

          {/* Carte de connexion */}
          <Card className="backdrop-blur-xl bg-white border border-gray-100 shadow-2xl shadow-blue-500/10">
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
                  Accès Plateforme
                </CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                Connectez-vous pour gérer vos projets climatiques
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-blue-50 p-1.5 rounded-xl border border-blue-100">
                  <TabsTrigger 
                    value="login" 
                    className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-700 rounded-lg transition-all duration-200 font-medium"
                  >
                    <LogIn className="w-4 h-4" />
                    Connexion
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register" 
                    className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-700 rounded-lg transition-all duration-200 font-medium"
                  >
                    <Building2 className="w-4 h-4" />
                    Inscription
                  </TabsTrigger>
                </TabsList>

                {/* ONGLET CONNEXION */}
                <TabsContent value="login" className="space-y-6">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="login-username" className="text-gray-700 font-medium">
                        Nom d'utilisateur ou Email
                      </Label>
                      <Input
                        id="login-username"
                        type="text"
                        placeholder="Votre identifiant"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        disabled={loginLoading}
                        className="h-12 border-gray-200 focus:border-blue-400 focus:ring-blue-200 rounded-xl transition-all duration-200 bg-gray-50/50"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-gray-700 font-medium">
                        Mot de passe
                      </Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          disabled={loginLoading}
                          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                          className="h-12 border-gray-200 focus:border-blue-400 focus:ring-blue-200 rounded-xl transition-all duration-200 bg-gray-50/50 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    type="button"
                    onClick={handleLogin}
                    disabled={loginLoading}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    {loginLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Connexion...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <LogIn className="w-5 h-5" />
                        Se connecter
                      </div>
                    )}
                  </Button>
                </TabsContent>

                {/* ONGLET INSCRIPTION */}
                <TabsContent value="register" className="space-y-6">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
                    <div className="flex items-center gap-3 text-blue-700 mb-2">
                      <Building2 className="w-5 h-5" />
                      <span className="font-semibold">Inscription Entreprise</span>
                    </div>
                    <p className="text-sm text-blue-600">
                      Rejoignez l'écosystème du financement climatique mauritanien
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-firstname" className="text-gray-700 font-medium">Prénom *</Label>
                        <Input
                          id="register-firstname"
                          type="text"
                          placeholder="Prénom"
                          value={registerData.first_name}
                          onChange={(e) => updateRegisterField('first_name', e.target.value)}
                          disabled={registerLoading}
                          className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-200 rounded-lg transition-all duration-200 bg-gray-50/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-lastname" className="text-gray-700 font-medium">Nom *</Label>
                        <Input
                          id="register-lastname"
                          type="text"
                          placeholder="Nom"
                          value={registerData.last_name}
                          onChange={(e) => updateRegisterField('last_name', e.target.value)}
                          disabled={registerLoading}
                          className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-200 rounded-lg transition-all duration-200 bg-gray-50/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-company" className="text-gray-700 font-medium">Nom de l'entreprise *</Label>
                      <Input
                        id="register-company"
                        type="text"
                        placeholder="Nom de votre entreprise ou organisation"
                        value={registerData.company_name}
                        onChange={(e) => updateRegisterField('company_name', e.target.value)}
                        disabled={registerLoading}
                        className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-200 rounded-lg transition-all duration-200 bg-gray-50/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-username" className="text-gray-700 font-medium">Nom d'utilisateur *</Label>
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="Nom d'utilisateur unique"
                        value={registerData.username}
                        onChange={(e) => updateRegisterField('username', e.target.value)}
                        disabled={registerLoading}
                        className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-200 rounded-lg transition-all duration-200 bg-gray-50/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-gray-700 font-medium">Email *</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="votre.email@entreprise.com"
                        value={registerData.email}
                        onChange={(e) => updateRegisterField('email', e.target.value)}
                        disabled={registerLoading}
                        className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-200 rounded-lg transition-all duration-200 bg-gray-50/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-phone" className="text-gray-700 font-medium">Téléphone</Label>
                      <Input
                        id="register-phone"
                        type="tel"
                        placeholder="+222 XX XX XX XX"
                        value={registerData.phone}
                        onChange={(e) => updateRegisterField('phone', e.target.value)}
                        disabled={registerLoading}
                        className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-200 rounded-lg transition-all duration-200 bg-gray-50/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-password" className="text-gray-700 font-medium">Mot de passe *</Label>
                        <div className="relative">
                          <Input
                            id="register-password"
                            type={showRegisterPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={registerData.password}
                            onChange={(e) => updateRegisterField('password', e.target.value)}
                            disabled={registerLoading}
                            className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-200 rounded-lg transition-all duration-200 bg-gray-50/50 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-password-confirm" className="text-gray-700 font-medium">Confirmer *</Label>
                        <div className="relative">
                          <Input
                            id="register-password-confirm"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={registerData.password_confirm}
                            onChange={(e) => updateRegisterField('password_confirm', e.target.value)}
                            disabled={registerLoading}
                            className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-200 rounded-lg transition-all duration-200 bg-gray-50/50 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="button"
                      onClick={handleRegister}
                      disabled={registerLoading}
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                    >
                      {registerLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Création...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <UserPlus className="w-5 h-5" />
                          Rejoindre RICHAT
                        </div>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Informations de sécurité */}
              <div className="mt-8 space-y-3">
                <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-100 rounded-xl">
                  <div className="flex items-center gap-3 text-green-700 mb-2">
                    <Building2 className="w-4 h-4" />
                    <span className="font-medium text-sm">Porteurs de projets</span>
                  </div>
                  <p className="text-xs text-green-600">
                    Accédez aux financements climatiques pour vos projets d'innovation verte
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-3 text-blue-700 mb-2">
                    <Shield className="w-4 h-4" />
                    <span className="font-medium text-sm">Accès sécurisé</span>
                  </div>
                  <p className="text-xs text-blue-600">
                    Plateforme certifiée avec protection des données et authentification sécurisée
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Login;