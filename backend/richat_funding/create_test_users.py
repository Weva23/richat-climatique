# =============================================================================
# SCRIPT DE TEST D'AUTHENTIFICATION
# =============================================================================
import requests
import json

def test_auth():
    print("🧪 TEST D'AUTHENTIFICATION")
    print("=" * 40)
    
    base_url = "http://localhost:8000/api"
    
    # Test 1: Vérifier que l'API est accessible
    print("1️⃣ Test accès API de base...")
    try:
        response = requests.get(f"{base_url}/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ API accessible")
        else:
            print(f"   ❌ Erreur: {response.text}")
    except Exception as e:
        print(f"   ❌ Erreur connexion: {e}")
        return
    
    # Test 2: Test endpoint de debug auth
    print("\n2️⃣ Test endpoint auth/test...")
    try:
        response = requests.get(f"{base_url}/auth/test/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Auth test: {data['message']}")
        else:
            print(f"   ❌ Erreur: {response.text}")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    # Test 3: Test de connexion
    print("\n3️⃣ Test de connexion...")
    
    # Tester avec différents comptes
    test_accounts = [
        {"username": "admin", "password": "admin123"},
        {"username": "test", "password": "test123"},
        {"username": "aminetou.khalef", "password": "consultant123"}
    ]
    
    for account in test_accounts:
        print(f"\n   Tentative avec: {account['username']}")
        
        try:
            response = requests.post(
                f"{base_url}/auth/login/",
                headers={"Content-Type": "application/json"},
                data=json.dumps(account)
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Connexion réussie!")
                print(f"   Token: {data['token'][:20]}...")
                print(f"   Utilisateur: {data['user']['full_name']}")
                
                # Test du profil avec le token
                print("   Test récupération profil...")
                profile_response = requests.get(
                    f"{base_url}/auth/profile/",
                    headers={"Authorization": f"Token {data['token']}"}
                )
                
                if profile_response.status_code == 200:
                    profile = profile_response.json()
                    print(f"   ✅ Profil récupéré: {profile['full_name']}")
                    print(f"   Stats: {profile['stats']}")
                    break
                else:
                    print(f"   ❌ Erreur profil: {profile_response.status_code}")
                    
            else:
                try:
                    error_data = response.json()
                    print(f"   ❌ Erreur: {error_data.get('error', response.text)}")
                except:
                    print(f"   ❌ Erreur: {response.text}")
                    
        except Exception as e:
            print(f"   ❌ Exception: {e}")
    
    # Test 4: Test des autres endpoints
    print("\n4️⃣ Test des autres endpoints...")
    
    endpoints_to_test = [
        "/projects/",
        "/scraped-projects/",
        "/consultants/",
        "/notifications/"
    ]
    
    for endpoint in endpoints_to_test:
        try:
            response = requests.get(f"{base_url}{endpoint}")
            print(f"   {endpoint}: {response.status_code}")
        except Exception as e:
            print(f"   {endpoint}: Erreur - {e}")
    
    print("\n" + "=" * 40)
    print("🎉 TESTS TERMINÉS")
    print("\n💡 Si tous les tests passent:")
    print("   - Le backend fonctionne correctement")
    print("   - Vous pouvez tester le frontend")
    print("\n🔧 Si des tests échouent:")
    print("   - Vérifiez que le serveur Django est démarré")
    print("   - Vérifiez les logs Django")
    print("   - Exécutez: python manage.py create_test_users")

if __name__ == "__main__":
    test_auth()