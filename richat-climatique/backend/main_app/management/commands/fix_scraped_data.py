from django.core.management.base import BaseCommand
from django.db import transaction
from main_app.models import ScrapedProject, Project, CustomUser
import hashlib

class Command(BaseCommand):
    help = 'Corrige et importe les données scrapées en résolvant les conflits'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear-scraped',
            action='store_true',
            help='Supprimer tous les projets scrapés existants avant import',
            default=False
        )

    def handle(self, *args, **options):
        clear_scraped = options.get('clear_scraped', False)
        
        self.stdout.write("🔧 CORRECTION DES DONNÉES SCRAPÉES")
        self.stdout.write("=" * 50)
        
        if clear_scraped:
            self.stdout.write("🗑️ Suppression des projets scrapés existants...")
            deleted_count = ScrapedProject.objects.all().delete()[0]
            self.stdout.write(f"   ✅ {deleted_count} projets scrapés supprimés")
        
        # Importer depuis les fichiers Excel avec gestion des doublons
        self.import_from_excel()
        
        self.stdout.write(self.style.SUCCESS(
            f"\n🎉 CORRECTION TERMINÉE!\n"
            f"📊 Projets scrapés en base: {ScrapedProject.objects.count()}\n"
            f"🔗 Prêts à être convertis en projets Django"
        ))

    def import_from_excel(self):
        """Importe les données depuis les fichiers Excel avec gestion des doublons"""
        from pathlib import Path
        import pandas as pd
        import os
        
        # Chercher les fichiers Excel dans différents emplacements
        possible_dirs = [
            Path('scraped_data'),
            Path('main_app/management/commands/scraped_data'),
            Path('../scraped_data'),
            Path.cwd() / 'scraped_data'
        ]
        
        excel_dir = None
        for dir_path in possible_dirs:
            if dir_path.exists():
                excel_dir = dir_path
                break
        
        if not excel_dir:
            self.stdout.write("❌ Dossier scraped_data non trouvé")
            return
        
        self.stdout.write(f"📁 Dossier trouvé: {excel_dir}")
        
        # Créer consultant par défaut
        consultant, created = CustomUser.objects.get_or_create(
            username='scraper_fixed',
            defaults={
                'first_name': 'Scraper',
                'last_name': 'Fixed',
                'email': 'scraper@richat-partners.com',
                'level': 'N1',
                'department': 'Import données'
            }
        )
        
        total_imported = 0
        
        # Import GEF
        gef_file = excel_dir / 'GEF_Mauritanie_Projects.xlsx'
        if gef_file.exists():
            imported = self.import_source_file(gef_file, 'GEF')
            total_imported += imported
            self.stdout.write(f"✅ GEF: {imported} projets importés")
        
        # Import GCF
        gcf_file = excel_dir / 'GCF_Mauritanie_Projects.xlsx'
        if gcf_file.exists():
            imported = self.import_source_file(gcf_file, 'GCF')
            total_imported += imported
            self.stdout.write(f"✅ GCF: {imported} projets importés")
        
        self.stdout.write(f"📊 Total importé: {total_imported} projets")

    def import_source_file(self, file_path, source):
        """Importe un fichier source avec gestion des doublons"""
        import pandas as pd
        
        try:
            df = pd.read_excel(file_path)
            self.stdout.write(f"📄 Lecture {file_path.name}: {len(df)} lignes")
            
            imported_count = 0
            
            for index, row in df.iterrows():
                try:
                    # Nettoyer les données
                    title = str(row.get('Titre', f'Projet {source} {index}')).strip()[:500]
                    organization = str(row.get('Organisation', '')).strip()[:200]
                    description = str(row.get('Description', '')).strip()
                    source_url = str(row.get('Lien', '')).strip()
                    
                    # Générer hash unique
                    content = f"{title}|{source}|{source_url}|{organization}"
                    unique_hash = hashlib.sha256(content.encode()).hexdigest()[:32]
                    
                    # Vérifier si existe déjà
                    if ScrapedProject.objects.filter(unique_hash=unique_hash).exists():
                        continue
                    
                    # Créer le projet scrapé
                    scraped_project = ScrapedProject.objects.create(
                        title=title,
                        source=source,
                        source_url=source_url,
                        source_id=str(row.get('ID', f'{source}-{index}')),
                        description=description,
                        organization=organization,
                        project_type=str(row.get('Type', '')),
                        total_funding=str(row.get('Cofinancement Total', '')),
                        data_completeness_score=self.calculate_score(row),
                        unique_hash=unique_hash,
                        scraping_source='excel_import'
                    )
                    
                    imported_count += 1
                    
                except Exception as e:
                    self.stdout.write(f"   ⚠️ Erreur ligne {index}: {e}")
                    continue
            
            return imported_count
            
        except Exception as e:
            self.stdout.write(f"❌ Erreur lecture {file_path}: {e}")
            return 0

    def calculate_score(self, row):
        """Calcule un score de complétude"""
        score = 0
        if row.get('Titre'): score += 20
        if row.get('Organisation'): score += 20
        if row.get('Description'): score += 20
        if row.get('Cofinancement Total'): score += 20
        if row.get('Lien'): score += 20
        return score
