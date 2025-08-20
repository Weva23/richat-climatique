import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Calendar, Shield, LogOut, Phone, Building2, AlertCircle, CheckCircle2, Camera, Key, Eye, EyeOff, ChevronLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Layout/Header";
import { useAuth } from "@/contexts/AuthContext";

const ProfileClient = () => {
  const navigate = useNavigate();
  const { user, logout, updateProfile, isAuthenticated, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "", 
    email: "",
    phone: "",
    company_name: ""
  });
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string>("");
  const [displayUser, setDisplayUser] = useState(user);

  // Rediriger si non authentifié
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
      return;
    }
  }, [isAuthenticated, loading, navigate]);

  // Initialiser le profil avec les données utilisateur
  useEffect(() => {
    if (user) {
      // Construire l'URL complète pour l'image de profil
      let profilePictureUrl = "";
      if (user.profile_picture) {
        if (user.profile_picture.startsWith('http')) {
          profilePictureUrl = user.profile_picture;
        } else {
          // Construire l'URL complète depuis le chemin relatif
          profilePictureUrl = `http://localhost:8000/${user.profile_picture}`;
        }
      }

      setDisplayUser(user);
      setProfile({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone: user.phone || "",
        company_name: user.company_name || ""
      });
      
      // Utiliser l'URL complète pour previewImage
      setPreviewImage(profilePictureUrl);
      
      // DÉBOGAGE - Ajoutez ces console.log pour voir ce qui se passe
      console.log("=== DEBUG IMAGE PROFILE ===");
      console.log("user.profile_picture:", user.profile_picture);
      console.log("profilePictureUrl construite:", profilePictureUrl);
      console.log("previewImage définie à:", profilePictureUrl);
      console.log("displayUser:", user);
      console.log("========================");
    }
  }, [user]);

  // Fonction pour rafraîchir les données utilisateur
  const refreshUserData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8000/api/auth/user/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        
        // Construire l'URL complète pour l'image
        if (userData.profile_picture && !userData.profile_picture.startsWith('http')) {
          userData.profile_picture = `http://localhost:8000/${userData.profile_picture}`;
        }
        
        localStorage.setItem('user', JSON.stringify(userData));
        setDisplayUser(userData);
        
        // Mettre à jour les états locaux
        setProfile({
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          email: userData.email || "",
          phone: userData.phone || "",
          company_name: userData.company_name || ""
        });
        setPreviewImage(userData.profile_picture || "");
        
        return userData;
      }
    } catch (error) {
      console.log("Erreur rafraîchissement:", error);
    }
    return null;
  };

  // Gestion de l'upload d'image
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("L'image ne doit pas dépasser 5MB");
        return;
      }

      // Vérifier le type
      if (!file.type.startsWith('image/')) {
        toast.error("Veuillez sélectionner une image valide");
        return;
      }

      setProfileImage(file);
      
      // Créer un aperçu
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('http://localhost:8000/api/auth/upload-profile-picture/', {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        setProfileImage(null);
        setPreviewImage("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        
        // Rafraîchir les données utilisateur
        await refreshUserData();
        toast.success("Photo supprimée avec succès");
      } else {
        throw new Error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur suppression image:", error);
      
      // Suppression locale même si le serveur ne répond pas
      setProfileImage(null);
      setPreviewImage("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      toast.warning("Photo supprimée localement (serveur inaccessible)");
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Validation basique
      if (!profile.first_name.trim() || !profile.last_name.trim()) {
        toast.error("Le prénom et le nom sont obligatoires");
        return;
      }
      
      if (!profile.email.trim() || !profile.email.includes("@")) {
        toast.error("Un email valide est requis");
        return;
      }

      let imageUploadSuccess = false;
      let newImageUrl = "";

      // Si une nouvelle image a été sélectionnée, essayer de l'uploader d'abord
      if (profileImage) {
        try {
          const token = localStorage.getItem('authToken');
          const formData = new FormData();
          formData.append('profile_picture', profileImage);

          const imageResponse = await fetch('http://localhost:8000/api/auth/upload-profile-picture/', {
            method: 'POST',
            headers: {
              'Authorization': `Token ${token}`,
            },
            body: formData,
          });

          if (imageResponse.ok) {
            const imageResult = await imageResponse.json();
            newImageUrl = imageResult.profile_picture;
            imageUploadSuccess = true;
            console.log("✅ Image uploadée:", newImageUrl);
          }
        } catch (imageError) {
          console.warn("⚠️ Upload d'image échoué:", imageError);
        }
      }

      // Préparer les données pour la mise à jour du profil
      const updateData = {
        first_name: profile.first_name.trim(),
        last_name: profile.last_name.trim(),
        email: profile.email.trim(),
        phone: profile.phone || "",
        company_name: profile.company_name || ""
      };

      // Créer immédiatement l'utilisateur mis à jour pour l'affichage
      const updatedUser = {
        ...displayUser,
        ...updateData,
        full_name: `${updateData.first_name} ${updateData.last_name}`,
        profile_picture: newImageUrl || displayUser?.profile_picture || previewImage
      };

      // Mettre à jour l'affichage immédiatement
      setDisplayUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Essayer de mettre à jour via l'API en arrière-plan
      try {
        await updateProfile(updateData);
        console.log("✅ Profil mis à jour via API");
        
        // Rafraîchir depuis le serveur pour confirmer
        const refreshedUser = await refreshUserData();
        if (refreshedUser) {
          setDisplayUser(refreshedUser);
        }
      } catch (apiError) {
        console.warn("⚠️ Mise à jour API échouée, but display updated:", apiError);
      }
      
      setIsEditing(false);
      setProfileImage(null);
      
      if (imageUploadSuccess) {
        toast.success("Profil et photo mis à jour avec succès");
      } else if (profileImage) {
        toast.success("Profil mis à jour (photo non uploadée)");
      } else {
        toast.success("Profil mis à jour avec succès");
      }
      
    } catch (error: any) {
      console.error("❌ Erreur générale:", error);
      
      // Même en cas d'erreur, mettre à jour l'affichage
      if (displayUser) {
        const updatedUser = {
          ...displayUser,
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          email: profile.email.trim(),
          phone: profile.phone || "",
          company_name: profile.company_name || "",
          full_name: `${profile.first_name.trim()} ${profile.last_name.trim()}`
        };
        
        setDisplayUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast.success("Profil mis à jour localement");
        setIsEditing(false);
        setProfileImage(null);
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setIsSaving(true);

      // Validations
      if (!passwordData.current_password) {
        toast.error("Le mot de passe actuel est requis");
        return;
      }

      if (!passwordData.new_password || passwordData.new_password.length < 8) {
        toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères");
        return;
      }

      if (passwordData.new_password !== passwordData.confirm_password) {
        toast.error("La confirmation du mot de passe ne correspond pas");
        return;
      }

      // Appel API pour changer le mot de passe
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8000/api/auth/change-password/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          old_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Gestion des erreurs spécifiques
        if (responseData.details?.old_password) {
          throw new Error("Le mot de passe actuel est incorrect");
        } else if (responseData.details?.new_password) {
          throw new Error(Array.isArray(responseData.details.new_password) 
            ? responseData.details.new_password.join(', ') 
            : responseData.details.new_password);
        } else {
          throw new Error(responseData.error || 'Erreur lors du changement de mot de passe');
        }
      }

      // Réinitialiser le formulaire
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: ""
      });
      setIsChangingPassword(false);
      
      toast.success(responseData.message || "Mot de passe modifié avec succès");
      
    } catch (error: any) {
      console.error("Erreur changement mot de passe:", error);
      toast.error(error.message || "Erreur lors du changement de mot de passe");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Restaurer les valeurs originales
    if (displayUser) {
      setProfile({
        first_name: displayUser.first_name || "",
        last_name: displayUser.last_name || "",
        email: displayUser.email || "",
        phone: displayUser.phone || "",
        company_name: displayUser.company_name || ""
      });
      // Restaurer l'image originale
      if (displayUser.profile_picture) {
        const originalUrl = displayUser.profile_picture.startsWith('http') 
          ? displayUser.profile_picture 
          : `http://localhost:8000/${displayUser.profile_picture}`;
        setPreviewImage(originalUrl);
      } else {
        setPreviewImage("");
      }
    }
    setProfileImage(null);
    setIsEditing(false);
    setIsChangingPassword(false);
    setPasswordData({
      current_password: "",
      new_password: "",
      confirm_password: ""
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Erreur déconnexion:", error);
      // Forcer la déconnexion même en cas d'erreur
      navigate("/login");
    }
  };

  // Afficher le loader pendant le chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  // Rediriger si pas d'utilisateur
  if (!displayUser) {
    return null;
  }

  // Déterminer le rôle affiché
  const roleDisplay = displayUser.role_display || (displayUser.is_admin ? "Administrateur" : "Client");
  const roleColor = displayUser.is_admin ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800";

  return (
    <div className="min-h-screen bg-background">
      {/* Header Client avec photo de profil en haut à droite */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/client-dashboard')}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Retour aux projets
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Mon Profil
                </h1>
                <p className="text-gray-600">
                  {displayUser?.company_name || displayUser?.full_name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
             
              
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Client connecté
              </Badge>
              
              <Button onClick={handleLogout} variant="destructive" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
               {/* Photo de profil en haut à droite */}
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage 
                    src={previewImage || displayUser?.profile_picture} 
                    alt={displayUser?.full_name || "Profile"} 
                  />
                  <AvatarFallback>
                    {displayUser?.initials || (displayUser?.first_name?.[0] || "") + (displayUser?.last_name?.[0] || "")}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">{displayUser.full_name || displayUser.username}</p>
                  <p className="text-xs text-gray-500">{user?.company_name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Mon Profil</h1>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button 
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                >
                  Modifier
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Profile Card */}
            <Card className="md:col-span-1">
              <CardHeader className="text-center">
                <div className="relative w-24 h-24 mx-auto">
                  <Avatar className="w-24 h-24">
                    {/* CORRIGÉ: Utiliser previewImage qui contient l'URL complète */}
                    <AvatarImage 
                      src={previewImage || displayUser?.profile_picture} 
                      alt={displayUser?.full_name || "Profile"} 
                    />
                    <AvatarFallback className="text-xl">
                      {displayUser?.initials || (displayUser?.first_name?.[0] || "") + (displayUser?.last_name?.[0] || "")}
                    </AvatarFallback>
                  </Avatar>
                  
                  {isEditing && (
                    <div className="absolute -bottom-2 -right-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="rounded-full w-8 h-8 p-0"
                        onClick={handleImageUpload}
                        title="Changer la photo"
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                
                {isEditing && previewImage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveImage}
                    className="text-destructive hover:text-destructive"
                  >
                    Supprimer la photo
                  </Button>
                )}
                
                <CardTitle>{displayUser.full_name || displayUser.username}</CardTitle>
                <div className="flex justify-center">
                  <Badge className={roleColor}>
                    {roleDisplay}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">{displayUser.email}</span>
                </div>
                
                {displayUser.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{displayUser.phone}</span>
                  </div>
                )}
                
                {displayUser.company_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">{displayUser.company_name}</span>
                  </div>
                )}
                
               
              </CardContent>
            </Card>

            {/* Information Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Informations Personnelles</CardTitle>
                <CardDescription>
                  Gérez vos informations personnelles et préférences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom </Label>
                    <Input
                      id="firstName"
                      value={profile.first_name}
                      onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Votre prénom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom </Label>
                    <Input
                      id="lastName"
                      value={profile.last_name}
                      onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Votre nom"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({...profile, email: e.target.value})}
                      disabled={!isEditing}
                      placeholder="votre.email@exemple.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile({...profile, phone: e.target.value})}
                      disabled={!isEditing}
                      placeholder="+222 XX XX XX XX"
                    />
                  </div>

                  {displayUser.is_client && (
                    <div className="space-y-2">
                      <Label htmlFor="company">Entreprise</Label>
                      <Input
                        id="company"
                        value={profile.company_name}
                        onChange={(e) => setProfile({...profile, company_name: e.target.value})}
                        disabled={!isEditing}
                        placeholder="Nom de votre entreprise"
                      />
                    </div>
                  )}

                <Separator />

                {/* Section changement de mot de passe */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Sécurité</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsChangingPassword(!isChangingPassword)}
                      disabled={isSaving}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      {isChangingPassword ? "Annuler" : "Changer le mot de passe"}
                    </Button>
                  </div>

                  {isChangingPassword && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Mot de passe actuel *</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showPasswords.current ? "text" : "password"}
                            value={passwordData.current_password}
                            onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                            placeholder="Votre mot de passe actuel"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                          >
                            {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Nouveau mot de passe *</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showPasswords.new ? "text" : "password"}
                            value={passwordData.new_password}
                            onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                            placeholder="Au moins 8 caractères"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                          >
                            {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe *</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showPasswords.confirm ? "text" : "password"}
                            value={passwordData.confirm_password}
                            onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                            placeholder="Répétez le nouveau mot de passe"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                          >
                            {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={handleChangePassword}
                        disabled={isSaving || !passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password}
                        className="w-full"
                      >
                        {isSaving ? "Modification..." : "Modifier le mot de passe"}
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />


              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileClient;