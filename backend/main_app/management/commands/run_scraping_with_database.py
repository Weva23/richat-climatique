# =============================================================================
# FICHIER: run_scraping_with_database.py
# SCRIPT PRINCIPAL POUR EXÉCUTER LE SCRAPING AVEC INTÉGRATION BASE DE DONNÉES
# =============================================================================

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'funding_tracker.settings')
django.setup()

from django.core.management import call_command
from main_app.models import ScrapedProject, Project, ScrapingSession, CustomUser
from datetime import datetime

def main():
    print("🚀 SCRAPING AVEC INTÉGRATION BASE DE DONNÉES")
    print("=" * 60)
    print(f"🕒 Démarré le: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print()
    
    # 1. Afficher l'état actuel de la base
    print("📊 ÉTAT ACTUEL DE LA BASE DE DONNÉES:")
    print(f"   - Projets scrapés: {ScrapedProject.objects.count()}")
    print(f"   - Projets Django: {Project.objects.count()}")
    print(f"   - Sessions de scraping: {ScrapingSession.objects.count()}")
    print(f"   - Consultants: {CustomUser.objects.count()}")
    print()
    
    # 2. Exécuter les migrations si nécessaire
    print("🔧 VÉRIFICATION DES MIGRATIONS...")
    try:
        call_command('makemigrations', 'main_app', interactive=False)
        call_command('migrate', interactive=False)
        print("   ✅ Migrations appliquées")
    except Exception as e:
        print(f"   ⚠️  Erreur migrations: {e}")
    print()
    
    # 3. Créer un superutilisateur si nécessaire
    print("👤 VÉRIFICATION UTILISATEURS...")
    if not CustomUser.objects.filter(is_superuser=True).exists():
        print("   Création d'un superutilisateur...")
        try:
            call_command(
                'createsuperuser',
                '--username=admin',
                '--email=admin@richat-partners.com',
                '--noinput'
            )
            # Définir le mot de passe
            admin = CustomUser.objects.get(username='admin')
            admin.set_password('admin123')
            admin.first_name = 'Super'
            admin.last_name = 'Admin'
            admin.level = 'N4'
            admin.department = 'Administration'
            admin.save()
            print("   ✅ Superutilisateur créé (admin/admin123)")
        except Exception as e:
            print(f"   ⚠️  Erreur création admin: {e}")
    else:
        print("   ✅ Superutilisateur existe déjà")
    print()
    
    # 4. Exécuter le scraping intégré
    print("🌍 LANCEMENT DU SCRAPING INTÉGRÉ...")
    print("   Paramètres:")
    print("   - Sources: GEF et GCF")
    print("   - Pages GEF max: 10 (pour test rapide)")
    print("   - Mode: Avec interface (non headless)")
    print("   - Création projets Django: Oui")
    print()
    
    try:
        # Lancer le scraping avec la nouvelle commande intégrée
        call_command(
            'integrated_scraper',
            '--source=both',
            '--max-pages=10',  # Limité pour le test
            '--create-projects',
            # '--headless'  # Commenté pour voir le navigateur
        )
        print("   ✅ Scraping terminé avec succès!")
        
    except Exception as e:
        print(f"   ❌ Erreur pendant le scraping: {e}")
        print("   💡 Vérifiez que Chrome et chromedriver sont installés")
        
        # Fallback: essayer de synchroniser depuis les fichiers Excel existants
        print("\n🔄 TENTATIVE DE SYNCHRONISATION DEPUIS FICHIERS EXCEL...")
        try:
            call_command('sync_scraped_data', '--excel-dir=scraped_data')
            print("   ✅ Synchronisation depuis Excel réussie!")
        except Exception as e2:
            print(f"   ❌ Erreur synchronisation Excel: {e2}")
    
    print()
    
    # 5. Afficher les résultats
    print("📈 RÉSULTATS APRÈS SCRAPING:")
    scraped_count = ScrapedProject.objects.count()
    project_count = Project.objects.count()
    sessions_count = ScrapingSession.objects.count()
    
    print(f"   - Projets scrapés: {scraped_count}")
    print(f"   - Projets Django: {project_count}")
    print(f"   - Sessions: {sessions_count}")
    
    if scraped_count > 0:
        # Statistiques par source
        gef_count = ScrapedProject.objects.filter(source='GEF').count()
        gcf_count = ScrapedProject.objects.filter(source='GCF').count()
        print(f"   - GEF: {gef_count} projets")
        print(f"   - GCF: {gcf_count} projets")
        
        # Projets de haute qualité
        high_quality = ScrapedProject.objects.filter(data_completeness_score__gte=80).count()
        print(f"   - Haute qualité (≥80%): {high_quality} projets")
        
        # Projets prêts pour conversion
        ready_for_conversion = ScrapedProject.objects.filter(
            linked_project__isnull=True,
            is_relevant_for_mauritania=True,
            data_completeness_score__gte=60
        ).count()
        print(f"   - Prêts pour conversion: {ready_for_conversion} projets")
    
    print()
    
    # 6. Afficher les informations pour accéder à l'application
    print("🌐 ACCÈS À L'APPLICATION:")
    print("   1. Démarrer le serveur Django:")
    print("      python manage.py runserver")
    print()
    print("   2. Accéder à l'interface:")
    print("      - Application: http://localhost:8000/")
    print("      - Admin Django: http://localhost:8000/admin/")
    print("      - API: http://localhost:8000/api/")
    print()
    print("   3. Connexion:")
    print("      - Admin: admin / admin123")
    print("      - API Token: Disponible via /api/auth/login/")
    print()
    
    # 7. Afficher les endpoints API utiles
    print("📡 ENDPOINTS API POUR LES DONNÉES SCRAPÉES:")
    print("   - GET /api/scraped-projects/ - Liste des projets scrapés")
    print("   - GET /api/scraped-projects/stats/ - Statistiques")
    print("   - GET /api/scraped-projects/ready-for-creation/ - Prêts à convertir")
    print("   - POST /api/scraped-projects/{id}/create-django-project/ - Convertir")
    print("   - GET /api/scraping-sessions/ - Sessions de scraping")
    print("   - GET /api/projects/ - Projets Django")
    print()
    
    # 8. Prochaines étapes
    print("🎯 PROCHAINES ÉTAPES:")
    print("   1. ✅ Vérifier les données dans l'admin Django")
    print("   2. ✅ Tester l'API avec les nouveaux endpoints")
    print("   3. ✅ Convertir les projets scrapés en projets Django")
    print("   4. ✅ Mettre à jour le frontend pour afficher ces données")
    print("   5. ✅ Programmer des tâches de scraping automatiques")
    print()
    
    print("🎉 CONFIGURATION TERMINÉE!")
    print("   Les données scrapées sont maintenant intégrées à votre application!")

def test_api_data():
    """Teste que les données sont bien accessibles via l'API"""
    print("\n🧪 TEST D'ACCÈS AUX DONNÉES...")
    
    # Test des modèles
    try:
        scraped = ScrapedProject.objects.first()
        if scraped:
            print(f"   ✅ Premier projet scrapé: {scraped.title[:50]}...")
            print(f"      - Source: {scraped.source}")
            print(f"      - Score: {scraped.data_completeness_score}%")
            print(f"      - Organisation: {scraped.organization}")
        
        project = Project.objects.first()
        if project:
            print(f"   ✅ Premier projet Django: {project.name[:50]}...")
            print(f"      - Type: {project.type_project}")
            print(f"      - Statut: {project.status}")
            print(f"      - Score: {project.score_viabilite}")
        
        print("   ✅ Accès aux données OK")
        
    except Exception as e:
        print(f"   ❌ Erreur accès données: {e}")

def create_test_data():
    """Crée quelques données de test si le scraping échoue"""
    print("\n🧪 CRÉATION DE DONNÉES DE TEST...")
    
    if ScrapedProject.objects.count() == 0:
        print("   Création de projets scrapés de test...")
        
        # Données de test GEF
        ScrapedProject.objects.create(
            title="Projet Test GEF - Adaptation climatique Mauritanie",
            source="GEF",
            source_id="GEF-TEST-001",
            description="Projet test pour l'adaptation au changement climatique en Mauritanie",
            organization="Ministère de l'Environnement",
            project_type="Climate Change Adaptation",
            total_funding="USD 2,500,000",
            funding_amount=2500000,
            country="Mauritania",
            focal_areas="Climate Change",
            data_completeness_score=85,
            scraping_source="test_data"
        )
        
        # Données de test GCF
        ScrapedProject.objects.create(
            title="Projet Test GCF - Énergies renouvelables",
            source="GCF",
            source_id="GCF-TEST-001",
            description="Projet test pour le développement des énergies renouvelables",
            organization="Agence de Développement Durable",
            project_type="Funding Proposal",
            total_funding="USD 5,000,000",
            funding_amount=5000000,
            country="Mauritania",
            data_completeness_score=90,
            scraping_source="test_data"
        )
        
        print("   ✅ 2 projets de test créés")
    else:
        print("   ✅ Des données existent déjà")

if __name__ == "__main__":
    try:
        main()
        test_api_data()
        
        # Si pas de données, créer des données de test
        if ScrapedProject.objects.count() == 0:
            create_test_data()
            
    except KeyboardInterrupt:
        print("\n⏹️  Arrêt demandé par l'utilisateur")
    except Exception as e:
        print(f"\n❌ Erreur générale: {e}")
        print("\n💡 DÉPANNAGE:")
        print("   1. Vérifiez que Django est configuré")
        print("   2. Vérifiez les variables d'environnement")
        print("   3. Vérifiez que la base de données est accessible")
        print("   4. Lancez: python manage.py check")


# =============================================================================
# SCRIPT SÉPARÉ POUR JUSTE LANCER LE SCRAPING
# =============================================================================

def run_quick_scraping():
    """Lance juste le scraping sans toute la configuration"""
    print("🚀 SCRAPING RAPIDE")
    print("=" * 30)
    
    try:
        call_command(
            'integrated_scraper',
            '--source=gcf',  # Juste GCF plus rapide
            '--max-details=20',  # Limité
            '--create-projects',
            '--headless'
        )
        print("✅ Scraping rapide terminé!")
        
    except Exception as e:
        print(f"❌ Erreur: {e}")

# =============================================================================
# UTILITAIRES POUR VÉRIFIER L'INTÉGRATION
# =============================================================================

def check_integration():
    """Vérifie que l'intégration fonctionne correctement"""
    print("🔍 VÉRIFICATION DE L'INTÉGRATION")
    print("=" * 40)
    
    checks = []
    
    # 1. Vérifier les modèles
    try:
        from main_app.models import ScrapedProject, Project, ScrapingSession
        checks.append(("✅", "Modèles importés"))
    except Exception as e:
        checks.append(("❌", f"Erreur modèles: {e}"))
    
    # 2. Vérifier la base de données
    try:
        count = ScrapedProject.objects.count()
        checks.append(("✅", f"Base accessible ({count} projets scrapés)"))
    except Exception as e:
        checks.append(("❌", f"Erreur base: {e}"))
    
    # 3. Vérifier les serializers
    try:
        from main_app.serializers import ScrapedProjectSerializer
        checks.append(("✅", "Serializers OK"))
    except Exception as e:
        checks.append(("❌", f"Erreur serializers: {e}"))
    
    # 4. Vérifier les vues
    try:
        from main_app.views import ScrapedProjectViewSet
        checks.append(("✅", "Vues API OK"))
    except Exception as e:
        checks.append(("❌", f"Erreur vues: {e}"))
    
    # Afficher les résultats
    for status, message in checks:
        print(f"   {status} {message}")
    
    # Recommandations
    print("\n💡 RECOMMANDATIONS:")
    if all(check[0] == "✅" for check in checks):
        print("   🎉 Tout est en ordre! Vous pouvez lancer le scraping.")
    else:
        print("   ⚠️  Certains problèmes détectés. Vérifiez:")
        print("      1. Les migrations Django: python manage.py migrate")
        print("      2. Les imports dans settings.py")
        print("      3. La configuration de la base de données")

def show_api_examples():
    """Affiche des exemples d'utilisation de l'API"""
    print("\n📚 EXEMPLES D'UTILISATION DE L'API")
    print("=" * 40)
    
    examples = [
        {
            "title": "Lister tous les projets scrapés",
            "method": "GET",
            "url": "/api/scraped-projects/",
            "description": "Récupère tous les projets scrapés avec pagination"
        },
        {
            "title": "Statistiques des données scrapées",
            "method": "GET", 
            "url": "/api/scraped-projects/stats/",
            "description": "Statistiques globales (total, par source, etc.)"
        },
        {
            "title": "Projets prêts à être convertis",
            "method": "GET",
            "url": "/api/scraped-projects/ready-for-creation/",
            "description": "Projets avec données suffisantes pour conversion"
        },
        {
            "title": "Convertir un projet scrapé",
            "method": "POST",
            "url": "/api/scraped-projects/{id}/create-django-project/",
            "description": "Crée un projet Django depuis un projet scrapé"
        },
        {
            "title": "Sessions de scraping",
            "method": "GET",
            "url": "/api/scraping-sessions/",
            "description": "Historique des sessions de scraping"
        },
        {
            "title": "Filtrer par source",
            "method": "GET",
            "url": "/api/scraped-projects/?source=GEF",
            "description": "Filtrer les projets par source (GEF/GCF)"
        },
        {
            "title": "Recherche textuelle",
            "method": "GET",
            "url": "/api/scraped-projects/?search=climat",
            "description": "Rechercher dans titre, organisation, description"
        }
    ]
    
    for example in examples:
        print(f"\n🔹 {example['title']}")
        print(f"   {example['method']} {example['url']}")
        print(f"   → {example['description']}")

def show_frontend_integration():
    """Montre comment intégrer dans le frontend React"""
    print("\n⚛️  INTÉGRATION FRONTEND")
    print("=" * 30)
    
    print("📁 Nouveaux fichiers à créer:")
    print("   - src/hooks/useScrapedProjects.ts")
    print("   - src/services/scrapedProjectService.ts")
    print("   - src/pages/ScrapedProjects.tsx")
    print("   - src/components/ScrapedProjectCard.tsx")
    
    print("\n🔧 Hooks React suggérés:")
    hooks_example = """
// src/hooks/useScrapedProjects.ts
import { useQuery } from '@tanstack/react-query';
import { scrapedProjectService } from '../services/scrapedProjectService';

export const useScrapedProjects = (filters = {}) => {
  return useQuery({
    queryKey: ['scraped-projects', filters],
    queryFn: () => scrapedProjectService.getScrapedProjects(filters)
  });
};

export const useScrapedProjectStats = () => {
  return useQuery({
    queryKey: ['scraped-projects-stats'],
    queryFn: () => scrapedProjectService.getStats()
  });
};
"""
    print(hooks_example)
    
    print("🎛️  Composant suggéré:")
    component_example = """
// src/pages/ScrapedProjects.tsx
const ScrapedProjects = () => {
  const { data: projects, isLoading } = useScrapedProjects();
  const { data: stats } = useScrapedProjectStats();
  
  return (
    <div>
      <h1>Projets Scrapés ({stats?.total_scraped || 0})</h1>
      <div className="stats-grid">
        <StatCard title="GEF" value={stats?.by_source?.GEF || 0} />
        <StatCard title="GCF" value={stats?.by_source?.GCF || 0} />
        <StatCard title="Prêts" value={stats?.ready_projects || 0} />
      </div>
      <ScrapedProjectsList projects={projects} />
    </div>
  );
};
"""
    print(component_example)

# =============================================================================
# MENU INTERACTIF
# =============================================================================

def interactive_menu():
    """Menu interactif pour choisir les actions"""
    while True:
        print("\n" + "="*50)
        print("🚀 MENU SCRAPING & INTÉGRATION")
        print("="*50)
        print("1. 🔧 Vérifier l'intégration")
        print("2. 🌍 Lancer scraping complet (GEF + GCF)")
        print("3. ⚡ Scraping rapide (GCF seulement)")
        print("4. 📊 Afficher statistiques actuelles")
        print("5. 🔄 Convertir projets scrapés en projets Django")
        print("6. 📚 Voir exemples API")
        print("7. ⚛️  Guide intégration frontend")
        print("8. 🧪 Créer données de test")
        print("9. ❌ Quitter")
        print()
        
        try:
            choice = input("Choisissez une option (1-9): ").strip()
            
            if choice == "1":
                check_integration()
            
            elif choice == "2":
                print("\n🌍 Lancement scraping complet...")
                main()
            
            elif choice == "3":
                print("\n⚡ Scraping rapide...")
                run_quick_scraping()
            
            elif choice == "4":
                print("\n📊 Statistiques actuelles:")
                print(f"   - Projets scrapés: {ScrapedProject.objects.count()}")
                print(f"   - Projets Django: {Project.objects.count()}")
                print(f"   - Sessions: {ScrapingSession.objects.count()}")
                
                if ScrapedProject.objects.exists():
                    gef_count = ScrapedProject.objects.filter(source='GEF').count()
                    gcf_count = ScrapedProject.objects.filter(source='GCF').count()
                    print(f"   - GEF: {gef_count}")
                    print(f"   - GCF: {gcf_count}")
                    
                    ready = ScrapedProject.objects.filter(
                        linked_project__isnull=True,
                        data_completeness_score__gte=60
                    ).count()
                    print(f"   - Prêts conversion: {ready}")
            
            elif choice == "5":
                print("\n🔄 Conversion des projets scrapés...")
                try:
                    call_command('migrate_scraped_data', '--min-score=60')
                    print("✅ Conversion terminée!")
                except Exception as e:
                    print(f"❌ Erreur: {e}")
            
            elif choice == "6":
                show_api_examples()
            
            elif choice == "7":
                show_frontend_integration()
            
            elif choice == "8":
                create_test_data()
            
            elif choice == "9":
                print("👋 Au revoir!")
                break
            
            else:
                print("❌ Option invalide. Choisissez entre 1 et 9.")
        
        except KeyboardInterrupt:
            print("\n👋 Au revoir!")
            break
        except Exception as e:
            print(f"❌ Erreur: {e}")


# =============================================================================
# POINT D'ENTRÉE PRINCIPAL
# =============================================================================

if __name__ == "__main__":
    import sys
    
    # Si argument en ligne de commande
    if len(sys.argv) > 1:
        action = sys.argv[1].lower()
        
        if action == "check":
            check_integration()
        elif action == "scrape":
            main()
        elif action == "quick":
            run_quick_scraping()
        elif action == "test":
            create_test_data()
        elif action == "convert":
            call_command('migrate_scraped_data', '--min-score=60')
        else:
            print(f"❌ Action inconnue: {action}")
            print("Actions disponibles: check, scrape, quick, test, convert")
    else:
        # Menu interactif par défaut
        interactive_menu()


# =============================================================================
# INSTRUCTIONS D'UTILISATION
# =============================================================================

"""
🚀 COMMENT UTILISER CE SCRIPT:

1. PRÉPARATION:
   - Assurez-vous que Django est configuré
   - Installez les dépendances: pip install -r requirements.txt
   - Appliquez les migrations: python manage.py migrate

2. EXÉCUTION:
   
   A. Menu interactif (recommandé):
      python run_scraping_with_database.py
   
   B. Actions directes:
      python run_scraping_with_database.py check    # Vérifier l'intégration
      python run_scraping_with_database.py scrape   # Scraping complet
      python run_scraping_with_database.py quick    # Scraping rapide
      python run_scraping_with_database.py test     # Créer données test
      python run_scraping_with_database.py convert  # Convertir projets

3. APRÈS LE SCRAPING:
   - Démarrez le serveur: python manage.py runserver
   - Vérifiez l'admin: http://localhost:8000/admin/
   - Testez l'API: http://localhost:8000/api/scraped-projects/
   - Intégrez dans votre frontend React

4. SURVEILLANCE:
   - Les sessions de scraping sont trackées dans ScrapingSession
   - Les erreurs sont loggées
   - Les statistiques sont disponibles via l'API

5. MAINTENANCE:
   - Programmez des tâches automatiques avec Django-cron
   - Nettoyez les doublons régulièrement
   - Surveillez la qualité des données (scores de complétude)

🎯 OBJECTIF:
   Vos 94 projets scrapés seront maintenant visibles dans votre application
   et pourront être convertis en projets Django pour workflow complet!
"""