# =============================================================================
# SOLUTION 1: MODIFIER LE SCRAPER EXISTANT POUR STOCKAGE DIRECT
# =============================================================================

# FICHIER: main_app/management/commands/scraping_auto_store.py
from django.core.management.base import BaseCommand
from main_app.models import Project, CustomUser
import pandas as pd
from decimal import Decimal
import subprocess
import os
from pathlib import Path
import re

class Command(BaseCommand):
    help = 'Lance le scraping puis importe automatiquement en base'

    def add_arguments(self, parser):
        parser.add_argument('--source', type=str, choices=['gef', 'gcf', 'both'], default='both')
        parser.add_argument('--max-pages', type=int, default=20)

    def handle(self, *args, **options):
        source = options.get('source', 'both')
        max_pages = options.get('max_pages', 20)
        
        self.stdout.write("🚀 SCRAPING AUTOMATIQUE AVEC STOCKAGE EN BASE")
        self.stdout.write("=" * 60)
        
        # ÉTAPE 1: Lancer le scraping Excel
        self.stdout.write("1️⃣ Lancement du scraping...")
        try:
            # Chemin vers votre script de scraping existant
            scraping_script = Path('main_app/management/commands/scraping.py')
            
            if scraping_script.exists():
                # Exécuter le script de scraping
                result = subprocess.run([
                    'python', str(scraping_script)
                ], capture_output=True, text=True, cwd='.')
                
                if result.returncode == 0:
                    self.stdout.write("✅ Scraping terminé avec succès")
                else:
                    self.stdout.write(f"❌ Erreur scraping: {result.stderr}")
                    return
            else:
                self.stdout.write("❌ Script de scraping non trouvé")
                return
                
        except Exception as e:
            self.stdout.write(f"❌ Erreur exécution scraping: {e}")
            return
        
        # ÉTAPE 2: Import automatique en base
        self.stdout.write("\n2️⃣ Import automatique en base de données...")
        imported_count = self.import_scraped_data()
        
        self.stdout.write(f"\n🎉 PROCESSUS TERMINÉ!")
        self.stdout.write(f"📊 {imported_count} projets importés automatiquement")
        self.stdout.write(f"💾 Total en base: {Project.objects.count()}")

    def import_scraped_data(self):
        """Importe automatiquement les données scrapées"""
        # Consultant par défaut
        consultant, _ = CustomUser.objects.get_or_create(
            username='auto_scraper',
            defaults={
                'first_name': 'Auto',
                'last_name': 'Scraper',
                'email': 'auto@richat-partners.com',
                'level': 'N1',
                'department': 'Scraping automatique',
                'actif': True
            }
        )
        
        def extract_amount(amount_str):
            if not amount_str: return Decimal('0')
            try:
                clean = re.sub(r'[^\d.,]', '', str(amount_str).replace(',', ''))
                return Decimal(clean) if clean else Decimal('0')
            except: return Decimal('0')
        
        def clean_email(org):
            if not org: return 'contact@example.org'
            clean_org = re.sub(r'[^a-zA-Z0-9]', '', str(org).lower())[:20]
            return f'contact@{clean_org}.org' if clean_org else 'contact@example.org'
        
        total_imported = 0
        
        # Chercher les fichiers Excel récemment créés
        search_paths = [
            Path('scraped_data'),
            Path('main_app/management/commands/scraped_data'),
            Path('.')
        ]
        
        for excel_dir in search_paths:
            gef_file = excel_dir / 'GEF_Mauritanie_Projects.xlsx'
            gcf_file = excel_dir / 'GCF_Mauritanie_Projects.xlsx'
            
            if gef_file.exists() or gcf_file.exists():
                self.stdout.write(f"📁 Fichiers trouvés dans: {excel_dir}")
                
                # Import GEF
                if gef_file.exists():
                    try:
                        df = pd.read_excel(gef_file)
                        for i, row in df.iterrows():
                            title = str(row.get('Titre', f'GEF-{i}'))[:200]
                            
                            # Éviter les doublons
                            if Project.objects.filter(name=title).exists():
                                continue
                            
                            Project.objects.create(
                                name=title,
                                description=f"Projet GEF auto-importé\nOrg: {row.get('Organisation', '')}\nDesc: {row.get('Description', '')}",
                                type_project='etat', status='draft', fund='GEF_LDCF',
                                score_viabilite=70,
                                montant_demande=extract_amount(row.get('Cofinancement Total')),
                                contact_name=str(row.get('Organisation', 'GEF'))[:100],
                                contact_email=clean_email(row.get('Organisation')),
                                contact_phone='+222 XX XX XX XX',
                                consultant=consultant,
                                is_from_scraping=True,
                                original_source='GEF'
                            )
                            total_imported += 1
                        
                        self.stdout.write(f"✅ GEF: {total_imported} projets importés")
                    except Exception as e:
                        self.stdout.write(f"❌ Erreur GEF: {e}")
                
                # Import GCF
                if gcf_file.exists():
                    try:
                        df = pd.read_excel(gcf_file)
                        gcf_count = 0
                        for i, row in df.iterrows():
                            title = str(row.get('Titre', f'GCF-{i}'))[:200]
                            
                            # Éviter les doublons
                            if Project.objects.filter(name=title).exists():
                                continue
                            
                            Project.objects.create(
                                name=title,
                                description=f"Projet GCF auto-importé\nOrg: {row.get('Organisation', '')}\nDesc: {row.get('Description', '')}",
                                type_project='institution', status='draft', fund='GCF_SAP',
                                score_viabilite=75,
                                montant_demande=extract_amount(row.get('Cofinancement Total')),
                                contact_name=str(row.get('Organisation', 'GCF'))[:100],
                                contact_email=clean_email(row.get('Organisation')),
                                contact_phone='+222 XX XX XX XX',
                                consultant=consultant,
                                is_from_scraping=True,
                                original_source='GCF'
                            )
                            gcf_count += 1
                            total_imported += 1
                        
                        self.stdout.write(f"✅ GCF: {gcf_count} projets importés")
                    except Exception as e:
                        self.stdout.write(f"❌ Erreur GCF: {e}")
                
                break
        
        return total_imported

# =============================================================================
# SOLUTION 2: TÂCHE AUTOMATIQUE AVEC DJANGO-CRON
# =============================================================================

# FICHIER: main_app/cron.py
from django_cron import CronJobBase, Schedule
from django.core.management import call_command

class AutoScrapingJob(CronJobBase):
    """Tâche automatique de scraping quotidien"""
    
    RUN_EVERY_MINS = 24 * 60  # Tous les jours
    # RUN_EVERY_MINS = 60     # Toutes les heures (pour test)
    
    schedule = Schedule(run_every_mins=RUN_EVERY_MINS)
    code = 'main_app.auto_scraping'  # Identifiant unique
    
    def do(self):
        """Exécute le scraping automatique"""
        try:
            # Lancer le scraping avec stockage automatique
            call_command('scraping_auto_store', '--source=both', '--max-pages=20')
            
            # Optionnel: envoyer une notification
            self.send_notification()
            
        except Exception as e:
            print(f"Erreur scraping automatique: {e}")
    
    def send_notification(self):
        """Envoie une notification après scraping"""
        from main_app.models import CustomUser, Notification, Project
        
        # Notifier les admins
        admins = CustomUser.objects.filter(is_superuser=True)
        total_projects = Project.objects.count()
        
        for admin in admins:
            Notification.objects.create(
                type='scraping',
                title='Scraping automatique terminé',
                message=f'Scraping quotidien terminé. Total projets en base: {total_projects}',
                consultant=admin
            )

# =============================================================================
# SOLUTION 3: WEBHOOK POUR SCRAPING À LA DEMANDE
# =============================================================================

# FICHIER: main_app/views.py (ajouter cette vue)
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.management import call_command
import json

@csrf_exempt
@require_http_methods(["POST"])
def trigger_scraping(request):
    """API endpoint pour déclencher le scraping"""
    try:
        # Paramètres optionnels
        data = json.loads(request.body) if request.body else {}
        source = data.get('source', 'both')
        max_pages = data.get('max_pages', 20)
        
        # Lancer le scraping en arrière-plan
        call_command('scraping_auto_store', f'--source={source}', f'--max-pages={max_pages}')
        
        return JsonResponse({
            'success': True,
            'message': 'Scraping lancé avec succès',
            'parameters': {'source': source, 'max_pages': max_pages}
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

# Ajouter cette URL dans main_app/urls.py:
# path('api/trigger-scraping/', views.trigger_scraping, name='trigger_scraping'),

# =============================================================================
# SOLUTION 4: TASK QUEUE AVEC CELERY (Avancé)
# =============================================================================

# FICHIER: main_app/tasks.py
from celery import shared_task
from django.core.management import call_command

@shared_task
def run_scraping_task(source='both', max_pages=20):
    """Tâche Celery pour scraping asynchrone"""
    try:
        call_command('scraping_auto_store', f'--source={source}', f'--max_pages={max_pages}')
        return f"Scraping {source} terminé avec succès"
    except Exception as e:
        return f"Erreur scraping: {str(e)}"

# Utilisation:
# from main_app.tasks import run_scraping_task
# run_scraping_task.delay('both', 20)  # Exécution asynchrone

# =============================================================================
# CONFIGURATION POUR AUTOMATISATION
# =============================================================================

# 1. INSTALLER DJANGO-CRON (pour tâches automatiques)
"""
pip install django-cron

# Dans settings.py, ajouter:
INSTALLED_APPS = [
    # ... vos apps existantes
    'django_cron',
]

CRON_CLASSES = [
    'main_app.cron.AutoScrapingJob',
]

# Lancer les tâches cron:
python manage.py runcrons
"""

# 2. COMMANDES POUR UTILISATION
"""
# Scraping manuel avec stockage automatique:
python manage.py scraping_auto_store --source=both

# Scraping via API:
curl -X POST http://localhost:8000/api/trigger-scraping/ \
     -H "Content-Type: application/json" \
     -d '{"source": "both", "max_pages": 20}'

# Vérifier les résultats:
python manage.py shell -c "
from main_app.models import Project
print(f'Total: {Project.objects.count()}')
print(f'GEF: {Project.objects.filter(original_source=\"GEF\").count()}')
print(f'GCF: {Project.objects.filter(original_source=\"GCF\").count()}')
"
"""

# =============================================================================
# SCRIPT DE MONITORING
# =============================================================================

# FICHIER: monitor_scraping.py
def monitor_scraping():
    """Surveille l'état du scraping et de la base"""
    import os, django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'richat_funding.settings')
    django.setup()
    
    from main_app.models import Project
    from pathlib import Path
    import pandas as pd
    from datetime import datetime
    
    print(f"📊 MONITORING SCRAPING - {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("=" * 60)
    
    # État de la base
    total = Project.objects.count()
    gef = Project.objects.filter(original_source='GEF').count()
    gcf = Project.objects.filter(original_source='GCF').count()
    scraped = Project.objects.filter(is_from_scraping=True).count()
    
    print(f"📈 BASE DE DONNÉES:")
    print(f"   - Total projets: {total}")
    print(f"   - Projets GEF: {gef}")
    print(f"   - Projets GCF: {gcf}")
    print(f"   - Issus scraping: {scraped}")
    
    # État des fichiers Excel
    print(f"\n📁 FICHIERS EXCEL:")
    for excel_dir in [Path('scraped_data'), Path('main_app/management/commands/scraped_data')]:
        if excel_dir.exists():
            gef_file = excel_dir / 'GEF_Mauritanie_Projects.xlsx'
            gcf_file = excel_dir / 'GCF_Mauritanie_Projects.xlsx'
            
            if gef_file.exists():
                df = pd.read_excel(gef_file)
                print(f"   - GEF Excel: {len(df)} projets")
            
            if gcf_file.exists():
                df = pd.read_excel(gcf_file)
                print(f"   - GCF Excel: {len(df)} projets")
            break
    
    # Recommandations
    print(f"\n💡 RECOMMANDATIONS:")
    if scraped < 90:
        print("   ⚠️ Moins de 90 projets scrapés - Relancer le scraping")
    else:
        print("   ✅ Données à jour")
    
    if total == 0:
        print("   🚨 Aucun projet en base - Lancer l'import")
    
    print(f"\n🔄 POUR METTRE À JOUR:")
    print(f"   python manage.py scraping_auto_store")

if __name__ == "__main__":
    monitor_scraping()