# =============================================================================
# FICHIER: main_app/admin.py - CORRECTION DES ERREURS ADMIN
# =============================================================================
from django.contrib import admin
from .models import CustomUser, Project, Document, DocumentType, Notification

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'level', 'department', 'actif']
    list_filter = ['level', 'department', 'actif', 'date_embauche']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    readonly_fields = ['date_joined', 'last_login']

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'type_project', 'status', 'fund', 'score_viabilite', 'consultant', 'created_at']
    list_filter = ['status', 'type_project', 'fund', 'created_at']
    search_fields = ['name', 'description', 'contact_name']
    readonly_fields = ['created_at', 'updated_at']  # CORRECTION: suppression des champs inexistants
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('name', 'description', 'type_project', 'status', 'fund')
        }),
        ('Financements', {
            'fields': ('score_viabilite', 'montant_demande')
        }),
        ('Contact', {
            'fields': ('contact_name', 'contact_email', 'contact_phone')
        }),
        ('Assignation', {
            'fields': ('consultant', 'date_echeance')
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(DocumentType)
class DocumentTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'obligatoire']
    list_filter = ['obligatoire']
    search_fields = ['name']

from django.contrib import admin
from .models import Document

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('id', 'file', 'status', 'uploaded_at')
    list_filter = ('status', 'uploaded_at')
    readonly_fields = ('uploaded_at',)
    search_fields = ('project__title', 'user__username')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('project', 'user')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'type', 'consultant', 'read', 'created_at']
    list_filter = ['type', 'read', 'created_at']
    search_fields = ['title', 'message', 'consultant__username']
    readonly_fields = ['created_at']

# =============================================================================
# FICHIER: main_app/management/commands/sync_scraped_data.py - CORRECTION SYNTAXE
# =============================================================================
from django.core.management.base import BaseCommand
from django.db import transaction
from main_app.models import Project, CustomUser, Notification
from pathlib import Path
import pandas as pd
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Synchronise les données scrapées depuis les fichiers Excel vers la base de données'

    def add_arguments(self, parser):
        parser.add_argument(
            '--excel-dir',
            type=str,
            help='Répertoire contenant les fichiers Excel scrapés',
            default='scraped_data'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulation sans sauvegarde réelle',
            default=False
        )

    def handle(self, *args, **options):
        excel_dir = Path(options.get('excel_dir', 'scraped_data'))
        dry_run = options.get('dry_run', False)
        
        self.stdout.write("🔄 SYNCHRONISATION DES DONNÉES SCRAPÉES")
        self.stdout.write("=" * 50)
        
        if dry_run:
            self.stdout.write("⚠️  MODE SIMULATION - Aucune modification en base")
        
        try:
            # Créer le consultant par défaut
            default_consultant = self.get_or_create_default_consultant(dry_run)
            
            # Traiter les fichiers Excel
            total_processed = 0
            
            # Fichier GEF
            gef_file = excel_dir / 'GEF_Mauritanie_Projects.xlsx'
            if gef_file.exists():
                gef_count = self.process_excel_file(gef_file, 'GEF', default_consultant, dry_run)
                total_processed += gef_count
                self.stdout.write(f"✅ GEF: {gef_count} projets traités")  # CORRECTION: émojis corrigés
            else:
                self.stdout.write("⚠️  Fichier GEF non trouvé")
            
            # Fichier GCF
            gcf_file = excel_dir / 'GCF_Mauritanie_Projects.xlsx'
            if gcf_file.exists():
                gcf_count = self.process_excel_file(gcf_file, 'GCF', default_consultant, dry_run)
                total_processed += gcf_count
                self.stdout.write(f"✅ GCF: {gcf_count} projets traités")
            else:
                self.stdout.write("⚠️  Fichier GCF non trouvé")
            
            # Créer une notification pour l'admin
            if not dry_run and total_processed > 0:
                self.create_sync_notification(total_processed)
            
            self.stdout.write(self.style.SUCCESS(
                f"\n🎉 SYNCHRONISATION TERMINÉE!\n"
                f"📊 Total projets traités: {total_processed}\n"
                f"💾 Projets en base: {Project.objects.count() if not dry_run else 'N/A (simulation)'}"
            ))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Erreur: {e}"))
            logger.error(f"Erreur synchronisation: {e}")

    def get_or_create_default_consultant(self, dry_run=False):
        """Créer ou récupérer le consultant par défaut"""
        if dry_run:
            return None
            
        consultant, created = CustomUser.objects.get_or_create(
            username='data_scraper',
            defaults={
                'first_name': 'Data',
                'last_name': 'Scraper',
                'email': 'data.scraper@richat-partners.com',
                'level': 'N1',
                'department': 'Collecte de données',
                'actif': True
            }
        )
        
        if created:
            self.stdout.write(f"✅ Consultant créé: {consultant.username}")
        
        return consultant

    def process_excel_file(self, file_path, source, default_consultant, dry_run=False):
        """Traite un fichier Excel et synchronise avec la base"""
        try:
            # Lire le fichier Excel
            df = pd.read_excel(file_path)
            self.stdout.write(f"📁 Traitement {file_path.name}: {len(df)} lignes")
            
            projects_created = 0
            projects_updated = 0
            
            with transaction.atomic():
                for index, row in df.iterrows():
                    try:
                        project_data = self.map_excel_row_to_project(row, source, default_consultant)
                        
                        if dry_run:
                            self.stdout.write(f"   [SIMULATION] Projet: {project_data['name'][:50]}...")
                            projects_created += 1
                            continue
                        
                        # Vérifier si le projet existe
                        existing_project = Project.objects.filter(
                            name=project_data['name']
                        ).first()
                        
                        if existing_project:
                            # Mettre à jour
                            for field, value in project_data.items():
                                if field not in ['created_at']:
                                    setattr(existing_project, field, value)
                            existing_project.save()
                            projects_updated += 1
                        else:
                            # Créer nouveau
                            Project.objects.create(**project_data)
                            projects_created += 1
                            
                        if (projects_created + projects_updated) % 10 == 0:
                            self.stdout.write(f"   ✅ {projects_created + projects_updated} projets traités...")
                            
                    except Exception as e:
                        self.stdout.write(f"   ❌ Erreur ligne {index}: {e}")
                        continue
            
            if not dry_run:
                self.stdout.write(f"   📊 {source}: {projects_created} créés, {projects_updated} mis à jour")
            
            return projects_created + projects_updated
            
        except Exception as e:
            self.stdout.write(f"❌ Erreur traitement {file_path}: {e}")
            return 0

    def map_excel_row_to_project(self, row, source, default_consultant):
        """Convertit une ligne Excel en données de projet Django"""
        
        # Nettoyer les données
        titre = str(row.get('Titre', 'Projet sans titre')).strip()[:200]
        description = str(row.get('Description', '')).strip()[:1000]
        organisation = str(row.get('Organisation', 'Organisation inconnue')).strip()[:100]
        lien = str(row.get('Lien', '')).strip()
        document = str(row.get('Document', '')).strip()
        
        # Enrichir la description
        description_parts = [description] if description else []
        description_parts.append(f"Source: {source}")
        if document:
            description_parts.append(f"Document: {document}")
        if lien:
            description_parts.append(f"URL: {lien}")
        
        # Déterminer le type et le fonds
        if source == 'GEF':
            project_type = 'etat'
            fund_type = 'GEF_LDCF'
        else:  # GCF
            project_type = 'institution'
            fund_type = 'GCF_SAP'
        
        # Extraire le montant
        montant_str = str(row.get('Cofinancement Total', '0'))
        try:
            import re
            montant_clean = re.sub(r'[^\d.,]', '', montant_str.replace(',', ''))
            montant = Decimal(montant_clean) if montant_clean else Decimal('0')
        except:
            montant = Decimal('0')
        
        # Score de viabilité basique
        score = 50  # Score par défaut
        if description and len(description) > 100:
            score += 20
        if montant > 0:
            score += 20
        if document:
            score += 10
        
        # Email de contact
        contact_email = f"contact@{organisation.lower().replace(' ', '').replace('-', '')[:20]}.org"
        if '@' not in contact_email or len(contact_email) > 50:
            contact_email = "contact@example.org"
        
        return {
            'name': titre,
            'description': " | ".join(description_parts),
            'type_project': project_type,
            'status': 'draft',
            'fund': fund_type,
            'score_viabilite': min(score, 100),
            'montant_demande': montant,
            'contact_name': organisation,
            'contact_email': contact_email,
            'contact_phone': '+222 XX XX XX XX',
            'consultant': default_consultant,
            'date_echeance': None
        }

    def create_sync_notification(self, total_processed):
        """Crée une notification pour informer de la synchronisation"""
        try:
            # Trouver les admins
            admins = CustomUser.objects.filter(is_superuser=True)
            
            for admin in admins:
                Notification.objects.create(
                    type='info',
                    title='Synchronisation des données terminée',
                    message=f'Synchronisation réussie: {total_processed} projets traités depuis les fichiers scrapés.',
                    consultant=admin
                )
                
        except Exception as e:
            logger.warning(f"Impossible de créer la notification: {e}")

# =============================================================================
# FICHIER: main_app/management/commands/create_test_data.py - NOUVELLE COMMANDE
# =============================================================================
from django.core.management.base import BaseCommand
from main_app.models import Project, CustomUser, DocumentType
from decimal import Decimal

class Command(BaseCommand):
    help = 'Crée des données de test pour l\'application'

    def handle(self, *args, **options):
        self.stdout.write("🧪 CRÉATION DE DONNÉES DE TEST")
        self.stdout.write("=" * 40)
        
        # Créer un consultant de test
        consultant, created = CustomUser.objects.get_or_create(
            username='test_consultant',
            defaults={
                'first_name': 'Test',
                'last_name': 'Consultant',
                'email': 'test@richat-partners.com',
                'level': 'N2',
                'department': 'Test',
                'actif': True
            }
        )
        
        if created:
            consultant.set_password('test123')
            consultant.save()
            self.stdout.write("✅ Consultant de test créé: test_consultant / test123")
        
        # Créer des types de documents
        doc_types = [
            'Business plan',
            'Pitch deck',
            'Lettre d\'intention',
            'Étude de faisabilité',
            'Annexes',
            'Preuves de cofinancement'
        ]
        
        for doc_type in doc_types:
            DocumentType.objects.get_or_create(
                name=doc_type,
                defaults={'obligatoire': True}
            )
        
        self.stdout.write(f"✅ {len(doc_types)} types de documents créés")
        
        # Créer des projets de test
        test_projects = [
            {
                'name': 'Projet Adaptation Climatique Mauritanie',
                'description': 'Projet d\'adaptation au changement climatique pour les communautés rurales',
                'type_project': 'etat',
                'status': 'progress',
                'fund': 'GEF_LDCF',
                'score_viabilite': 85,
                'montant_demande': Decimal('2500000'),
                'contact_name': 'Ministère de l\'Environnement',
                'contact_email': 'contact@environnement.gov.mr'
            },
            {
                'name': 'Initiative Énergies Renouvelables',
                'description': 'Développement de l\'énergie solaire et éolienne en Mauritanie',
                'type_project': 'institution',
                'status': 'ready',
                'fund': 'GCF_SAP',
                'score_viabilite': 92,
                'montant_demande': Decimal('5000000'),
                'contact_name': 'Agence de Développement Durable',
                'contact_email': 'contact@add.gov.mr'
            },
            {
                'name': 'Coopérative Pêcheurs Durables',
                'description': 'Projet de pêche durable et protection des écosystèmes marins',
                'type_project': 'prive',
                'status': 'draft',
                'fund': 'CIF',
                'score_viabilite': 68,
                'montant_demande': Decimal('1200000'),
                'contact_name': 'Coopérative des Pêcheurs',
                'contact_email': 'contact@pecheurs.coop'
            }
        ]
        
        created_count = 0
        for project_data in test_projects:
            project, created = Project.objects.get_or_create(
                name=project_data['name'],
                defaults={
                    **project_data,
                    'consultant': consultant,
                    'contact_phone': '+222 45 XX XX XX'
                }
            )
            if created:
                created_count += 1
        
        self.stdout.write(f"✅ {created_count} projets de test créés")
        
        total_projects = Project.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f"\n🎉 DONNÉES DE TEST CRÉÉES!\n"
            f"📊 Total projets en base: {total_projects}\n"
            f"👤 Utilisateur test: test_consultant / test123\n"
            f"🔗 Admin: http://localhost:8000/admin/\n"
            f"🚀 Lancez le serveur: python manage.py runserver"
        ))

# =============================================================================
# FICHIER: main_app/management/commands/fix_database.py - COMMANDE DE RÉPARATION
# =============================================================================
from django.core.management.base import BaseCommand
from django.core.management import call_command

class Command(BaseCommand):
    help = 'Répare et initialise la base de données'

    def handle(self, *args, **options):
        self.stdout.write("🔧 RÉPARATION DE LA BASE DE DONNÉES")
        self.stdout.write("=" * 50)
        
        try:
            # 1. Créer les migrations
            self.stdout.write("1. Création des migrations...")
            call_command('makemigrations', 'main_app', interactive=False)
            self.stdout.write("   ✅ Migrations créées")
            
            # 2. Appliquer les migrations
            self.stdout.write("2. Application des migrations...")
            call_command('migrate', interactive=False)
            self.stdout.write("   ✅ Migrations appliquées")
            
            # 3. Créer un superutilisateur si nécessaire
            self.stdout.write("3. Vérification superutilisateur...")
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            if not User.objects.filter(is_superuser=True).exists():
                self.stdout.write("   Création d'un superutilisateur...")
                admin = User.objects.create_superuser(
                    username='admin',
                    email='admin@richat-partners.com',
                    password='admin123',
                    first_name='Super',
                    last_name='Admin',
                    level='N4',
                    department='Administration'
                )
                self.stdout.write("   ✅ Superutilisateur créé: admin / admin123")
            else:
                self.stdout.write("   ✅ Superutilisateur existe déjà")
            
            # 4. Créer des données de test
            self.stdout.write("4. Création de données de test...")
            call_command('create_test_data')
            
            self.stdout.write(self.style.SUCCESS(
                f"\n🎉 BASE DE DONNÉES RÉPARÉE!\n"
                f"🔗 Admin: http://localhost:8000/admin/\n"
                f"👤 Admin: admin / admin123\n"
                f"👤 Test: test_consultant / test123\n"
                f"🚀 Commande suivante: python manage.py runserver"
            ))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Erreur: {e}"))

# =============================================================================
# INSTRUCTIONS DE RÉPARATION
# =============================================================================
"""
ÉTAPES POUR RÉPARER VOTRE APPLICATION:

1. Copiez le code ci-dessus dans les fichiers correspondants
2. Exécutez dans le terminal:

   cd backend
   python manage.py fix_database

3. Si ça fonctionne, lancez le serveur:
   
   python manage.py runserver

4. Testez l'accès:
   - Admin: http://localhost:8000/admin/ (admin/admin123)
   - API: http://localhost:8000/api/projects/

5. Si vous avez vos fichiers Excel scrapés:
   
   python manage.py sync_scraped_data --excel-dir=scraped_data

6. Pour voir les données dans l'app React:
   - Assurez-vous que le serveur Django tourne
   - Lancez le frontend React
   - Les données apparaîtront dans l'interface

NOTES:
- Les émojis dans les commandes ont été corrigés
- L'admin a été simplifié
- Des commandes de test ont été ajoutées
- La base sera proprement initialisée
"""