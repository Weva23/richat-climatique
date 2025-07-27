# =============================================================================
# SCRIPT DIRECT POUR CRÉER LES UTILISATEURS
# Placez ce fichier dans backend/ et exécutez : python create_users.py
# =============================================================================
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'richat_funding.settings')
django.setup()

from main_app.models import CustomUser
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token

def main():
    print("🔧 CRÉATION DES UTILISATEURS DE TEST")
    print("=" * 60)
    
    # Supprimer tous les utilisateurs existants pour recommencer à zéro
    print("🗑️ Suppression des utilisateurs existants...")
    CustomUser.objects.all().delete()
    Token.objects.all().delete()
    print("   ✅ Base utilisateurs nettoyée")
    
    # Utilisateurs à créer
    users_to_create = [
        {
            'username': 'admin',
            'email': 'admin@richat-partners.com',
            'password': 'admin123',
            'first_name': 'Super',
            'last_name': 'Admin',
            'level': 'N4',
            'department': 'Administration',
            'is_superuser': True,
            'is_staff': True
        },
        {
            'username': 'aminetou.khalef',
            'email': 'aminetou@richat-partners.com',
            'password': 'consultant123',
            'first_name': 'Aminetou',
            'last_name': 'EL KHALEF',
            'level': 'N2',
            'department': 'Financements Publics'
        },
        {
            'username': 'fatima.bint',
            'email': 'fatima@richat-partners.com',
            'password': 'consultant123',
            'first_name': 'Fatima',
            'last_name': 'BINT SIDI',
            'level': 'N1',
            'department': 'Financements Publics'
        },
        {
            'username': 'test',
            'email': 'test@richat-partners.com',
            'password': 'test123',
            'first_name': 'Test',
            'last_name': 'User',
            'level': 'N1',
            'department': 'Test'
        }
    ]
    
    print("\n👥 CRÉATION DES UTILISATEURS:")
    
    for user_data in users_to_create:
        username = user_data['username']
        password = user_data.pop('password')
        is_superuser = user_data.pop('is_superuser', False)
        is_staff = user_data.pop('is_staff', False)
        
        print(f"\n   📝 Création de {username}...")
        
        try:
            # Créer l'utilisateur
            if is_superuser:
                user = CustomUser.objects.create_superuser(
                    username=username,
                    email=user_data['email'],
                    password=password,
                    first_name=user_data['first_name'],
                    last_name=user_data['last_name']
                )
            else:
                user = CustomUser.objects.create_user(
                    username=username,
                    email=user_data['email'],
                    password=password,
                    first_name=user_data['first_name'],
                    last_name=user_data['last_name']
                )
            
            # Définir les attributs supplémentaires
            user.level = user_data.get('level', 'N1')
            user.department = user_data.get('department', 'Test')
            user.is_staff = is_staff
            user.actif = True
            user.save()
            
            print(f"      ✅ Utilisateur créé: {user.full_name}")
            print(f"      📧 Email: {user.email}")
            print(f"      🎯 Niveau: {user.level}")
            
            # Test d'authentification immédiat
            auth_user = authenticate(username=username, password=password)
            if auth_user:
                print(f"      🔐 Authentification: ✅ OK")
                
                # Créer le token
                token, created = Token.objects.get_or_create(user=user)
                print(f"      🔑 Token créé: {token.key[:20]}...")
            else:
                print(f"      🔐 Authentification: ❌ ÉCHEC")
                
        except Exception as e:
            print(f"      ❌ Erreur lors de la création: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 CRÉATION TERMINÉE!")
    print("=" * 60)
    
    # Vérification finale
    print("\n📊 VÉRIFICATION FINALE:")
    all_users = CustomUser.objects.all()
    print(f"   Total utilisateurs: {all_users.count()}")
    
    for user in all_users:
        print(f"   👤 {user.username} | {user.full_name} | Actif: {user.is_active}")
    
    print("\n🔑 COMPTES DISPONIBLES:")
    print("   👤 admin / admin123")
    print("   👤 aminetou.khalef / consultant123")
    print("   👤 fatima.bint / consultant123")
    print("   👤 test / test123")
    
    print("\n🧪 TEST RAPIDE:")
    print("   1. Redémarrer le serveur Django")
    print("   2. Tester avec curl:")
    print("      curl -X POST http://localhost:8000/api/auth/login/ \\")
    print("        -H 'Content-Type: application/json' \\")
    print("        -d '{\"username\": \"test\", \"password\": \"test123\"}'")
    print("")
    print("   3. Ou tester dans le frontend avec:")
    print("      Utilisateur: test")
    print("      Mot de passe: test123")
    
    # Test d'authentification final pour aminetou.khalef
    print("\n🎯 TEST SPÉCIAL pour aminetou.khalef:")
    test_user = authenticate(username='aminetou.khalef', password='consultant123')
    if test_user:
        print("   ✅ aminetou.khalef peut maintenant se connecter!")
    else:
        print("   ❌ Problème persistant avec aminetou.khalef")

if __name__ == "__main__":
    main()