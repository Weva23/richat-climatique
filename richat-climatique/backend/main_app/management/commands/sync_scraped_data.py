# =============================================================================
# FICHIER: main_app/management/commands/sync_scraped_data.py - CORRIGÉ
# COMMANDE POUR SYNCHRONISER LES DONNÉES SCRAPÉES AVEC LA BASE
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
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='Supprimer les projets existants avant import',
            default=False
        )

    def handle(self, *args, **options):
        excel_dir = Path(options.get('excel_dir', 'scraped_data'))
        dry_run = options.get('dry_run', False)
        clear_existing = options.get('clear_existing', False)
        
        self.stdout.write("🔄 SYNCHRONISATION DES DONNÉES SCRAPÉES")
        self.stdout.write("=" * 50)
        
        if dry_run:
            self.stdout.write("⚠️  MODE SIMULATION - Aucune modification en base")
        
        try:
            # Supprimer les projets existants si demandé
            if clear_existing and not dry_run:
                removed_count = Project.objects.filter(is_from_scraping=True).count()
                Project.objects.filter(is_from_scraping=True).delete()
                self.stdout.write(f"🗑️  {removed_count} projets existants supprimés")
            
            # Créer le consultant par défaut
            default_consultant = self.get_or_create_default_consultant(dry_run)
            
            # Traiter les fichiers Excel
            total_processed = 0
            
            # Fichier GEF
            gef_file = excel_dir / 'GEF_Mauritanie_Projects.xlsx'
            if gef_file.exists():
                gef_count = self.process_excel_file(gef_file, 'GEF', default_consultant, dry_run)
                total_processed += gef_count
                self.stdout.write(f"✅ GEF: {gef_count} projets traités")
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
            
            # Nettoyer les doublons
            if not dry_run:
                total_removed = self.clean_duplicates()
                self.stdout.write(f"🧹 {total_removed} doublons supprimés")
            
            if not dry_run:
                # Créer une notification pour l'admin
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
            'date_echeance': None,
            'is_from_scraping': True,
            'original_source': source
        }

    def clean_duplicates(self):
        """Nettoie les projets en doublon dans la base de données"""
        from django.db import models
        
        # Identifier les doublons par nom
        duplicates = Project.objects.values('name').annotate(
            count=models.Count('name')
        ).filter(count__gt=1)
        
        total_removed = 0
        
        for duplicate in duplicates:
            name = duplicate['name']
            count = duplicate['count']
            
            # Garder le plus récent, supprimer les autres
            projects = Project.objects.filter(name=name).order_by('-created_at')
            to_remove = projects[1:]  # Tous sauf le premier (plus récent)
            
            removed_count = len(to_remove)
            for project in to_remove:
                project.delete()
            
            total_removed += removed_count
            self.stdout.write(f"🗑️  '{name}': {removed_count} doublons supprimés")
        
        return total_removed

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
# COMMANDE POUR NETTOYER LES DOUBLONS UNIQUEMENT
# =============================================================================

class CleanDuplicatesCommand(BaseCommand):
    help = 'Nettoie les projets en doublon dans la base de données'

    def handle(self, *args, **options):
        from django.db import models
        
        self.stdout.write("🧹 NETTOYAGE DES DOUBLONS")
        self.stdout.write("=" * 30)
        
        # Identifier les doublons par nom
        duplicates = Project.objects.values('name').annotate(
            count=models.Count('name')
        ).filter(count__gt=1)
        
        total_removed = 0
        
        for duplicate in duplicates:
            name = duplicate['name']
            count = duplicate['count']
            
            # Garder le plus récent, supprimer les autres
            projects = Project.objects.filter(name=name).order_by('-created_at')
            to_remove = projects[1:]  # Tous sauf le premier (plus récent)
            
            removed_count = len(to_remove)
            for project in to_remove:
                project.delete()
            
            total_removed += removed_count
            self.stdout.write(f"🗑️  '{name}': {removed_count} doublons supprimés")
        
        self.stdout.write(self.style.SUCCESS(
            f"✅ Nettoyage terminé: {total_removed} doublons supprimés"
        ))