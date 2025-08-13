from django.core.management.base import BaseCommand
from main_app.models import ScrapedProject, Project, CustomUser
from decimal import Decimal
import re

class Command(BaseCommand):
    help = 'Convertit les projets scrapés en projets Django'

    def add_arguments(self, parser):
        parser.add_argument('--min-score', type=int, default=50, help='Score minimum')
        parser.add_argument('--max-convert', type=int, default=None, help='Nombre maximum à convertir')

    def handle(self, *args, **options):
        min_score = options.get('min_score', 50)
        max_convert = options.get('max_convert', None)
        
        self.stdout.write("📋 CONVERSION PROJETS SCRAPÉS → PROJETS DJANGO")
        self.stdout.write("=" * 60)
        
        # Consultant par défaut
        consultant, created = CustomUser.objects.get_or_create(
            username='converter',
            defaults={
                'first_name': 'Data',
                'last_name': 'Converter',
                'email': 'converter@richat-partners.com',
                'level': 'N2',
                'department': 'Conversion de données'
            }
        )
        
        # Sélectionner les projets à convertir
        scraped_projects = ScrapedProject.objects.filter(
            linked_project__isnull=True,
            data_completeness_score__gte=min_score
        ).order_by('-data_completeness_score')
        
        if max_convert:
            scraped_projects = scraped_projects[:max_convert]
        
        self.stdout.write(f"🎯 {scraped_projects.count()} projets éligibles pour conversion")
        
        converted_count = 0
        
        for scraped in scraped_projects:
            try:
                # Déterminer le type de projet
                if scraped.source == 'GEF':
                    project_type = 'etat'
                    fund_type = 'GEF_LDCF'
                elif scraped.source == 'GCF':
                    project_type = 'institution'
                    fund_type = 'GCF_SAP'
                else:
                    project_type = 'etat'
                    fund_type = 'GEF_LDCF'
                
                # Extraire le montant
                montant = self.extract_amount(scraped.total_funding)
                
                # Créer le projet Django
                django_project = Project.objects.create(
                    name=scraped.title[:200],
                    description=f"{scraped.description}\n\nSource: {scraped.source}\nOrganisation: {scraped.organization}",
                    type_project=project_type,
                    status='draft',
                    fund=fund_type,
                    score_viabilite=scraped.data_completeness_score,
                    montant_demande=montant,
                    contact_name=scraped.organization[:100] or 'Contact',
                    contact_email=self.generate_email(scraped.organization),
                    contact_phone='+222 XX XX XX XX',
                    consultant=consultant,
                    is_from_scraping=True,
                    original_source=scraped.source,
                    source_reference=scraped.source_id
                )
                
                # Lier au projet scrapé
                scraped.linked_project = django_project
                scraped.save()
                
                converted_count += 1
                
                if converted_count % 10 == 0:
                    self.stdout.write(f"   ✅ {converted_count} projets convertis...")
                    
            except Exception as e:
                self.stdout.write(f"   ❌ Erreur conversion {scraped.title[:30]}: {e}")
                continue
        
        self.stdout.write(self.style.SUCCESS(
            f"\n🎉 CONVERSION TERMINÉE!\n"
            f"📊 {converted_count} projets convertis\n"
            f"💾 Total projets Django: {Project.objects.count()}\n"
            f"🔗 Projets scrapés liés: {ScrapedProject.objects.filter(linked_project__isnull=False).count()}"
        ))

    def extract_amount(self, amount_str):
        """Extrait le montant numérique"""
        if not amount_str:
            return Decimal('0')
        
        try:
            # Nettoyer et extraire les chiffres
            clean_amount = re.sub(r'[^\d.,]', '', str(amount_str).replace(',', ''))
            if clean_amount:
                return Decimal(clean_amount)
        except:
            pass
        
        return Decimal('0')

    def generate_email(self, organization):
        """Génère un email de contact"""
        if not organization:
            return 'contact@example.org'
        
        clean_org = re.sub(r'[^a-zA-Z0-9]', '', organization.lower())[:20]
        return f"contact@{clean_org}.org" if clean_org else 'contact@example.org'
