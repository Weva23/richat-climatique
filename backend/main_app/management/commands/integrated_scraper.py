# =============================================================================
# FICHIER: main_app/management/commands/integrated_scraper.py
# SCRAPER COMPLET AVEC INTÉGRATION BASE DE DONNÉES
# =============================================================================
import re
import requests
from bs4 import BeautifulSoup
from pathlib import Path
import html
import ftfy
from django.core.management.base import BaseCommand
from urllib.parse import urljoin, urlparse, parse_qs
from datetime import datetime
import time
import logging
import traceback
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    NoSuchElementException, 
    TimeoutException,
    ElementClickInterceptedException,
    WebDriverException,
    StaleElementReferenceException
)
from webdriver_manager.chrome import ChromeDriverManager
from typing import List, Dict, Optional
from decimal import Decimal
from django.db import transaction
from django.utils import timezone

# Import des modèles
from main_app.models import ScrapedProject, Project, CustomUser, Notification, ScrapingSession

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Scraper intégré GEF et GCF avec sauvegarde complète en base de données'

    def __init__(self):
        super().__init__()
        self.driver = None
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.current_scraping_session = None

    def add_arguments(self, parser):
        parser.add_argument('--source', type=str, choices=['gef', 'gcf', 'both'], default='both')
        parser.add_argument('--max-pages', type=int, default=20)
        parser.add_argument('--headless', action='store_true', default=False)
        parser.add_argument('--max-details', type=int, default=None)
        parser.add_argument('--create-projects', action='store_true', help='Créer des projets Django depuis les données scrapées')
        parser.add_argument('--update-existing', action='store_true', help='Mettre à jour les projets existants')

    def handle(self, *args, **options):
        source = options.get('source', 'both')
        max_pages = options.get('max_pages', 20)
        headless = options.get('headless', False)
        max_details = options.get('max_details', None)
        create_projects = options.get('create_projects', False)
        update_existing = options.get('update_existing', False)
        
        self.stdout.write("🚀 SCRAPER INTÉGRÉ AVEC BASE DE DONNÉES")
        self.stdout.write("=" * 60)
        
        try:
            sources_to_scrape = []
            if source in ['gef', 'both']:
                sources_to_scrape.append('GEF')
            if source in ['gcf', 'both']:
                sources_to_scrape.append('GCF')
            
            total_projects = 0
            
            for scrape_source in sources_to_scrape:
                # Créer une session de scraping
                session = ScrapingSession.objects.create(
                    source=scrape_source,
                    max_pages=max_pages if scrape_source == 'GEF' else None,
                    headless_mode=headless
                )
                self.current_scraping_session = session
                
                try:
                    self.stdout.write(f"\n🌍 === SCRAPING {scrape_source} ===")
                    
                    if scrape_source == 'GEF':
                        projects_count = self.scrape_gef_to_database(max_pages, headless)
                    else:  # GCF
                        projects_count = self.scrape_gcf_to_database(max_details)
                    
                    total_projects += projects_count
                    
                    # Marquer la session comme réussie
                    session.projects_found = projects_count
                    session.projects_saved = projects_count
                    session.completed_at = timezone.now()
                    session.success = True
                    session.save()
                    
                    self.stdout.write(f"✅ {scrape_source}: {projects_count} projets scrapés")
                    
                except Exception as e:
                    # Marquer la session comme échouée
                    session.completed_at = timezone.now()
                    session.success = False
                    session.error_message = str(e)
                    session.save()
                    self.stdout.write(f"❌ Erreur {scrape_source}: {e}")
                    continue
            
            # Créer des projets Django si demandé
            if create_projects:
                self.stdout.write("\n📋 === CRÉATION DES PROJETS DJANGO ===")
                created_count = self.create_projects_from_scraped_data(update_existing)
                self.stdout.write(f"✅ {created_count} projets Django créés")
            
            # Créer des notifications
            self.create_completion_notifications(total_projects, create_projects)
            
            self.stdout.write(self.style.SUCCESS(
                f"\n🎉 SCRAPING TERMINÉ!\n"
                f"📊 Total projets scrapés: {total_projects}\n"
                f"💾 Projets en base ScrapedProject: {ScrapedProject.objects.count()}\n"
                f"📋 Projets Django: {Project.objects.count()}\n"
                f"✅ Toutes les données sont maintenant dans la base!"
            ))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Erreur générale: {e}"))
            traceback.print_exc()
        finally:
            self.cleanup_driver()

    def scrape_gef_to_database(self, max_pages, headless):
        """Scraper GEF et sauvegarder directement en base"""
        self.setup_driver(headless)
        
        base_url = "https://www.thegef.org/projects-operations/database?f%5B0%5D=project_country_national%3A105"
        
        try:
            self.driver.get(base_url)
            WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "table.views-table, .view-content"))
            )
            
            # Gérer les cookies
            try:
                cookie_btn = WebDriverWait(self.driver, 5).until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Accept')]"))
                )
                self.driver.execute_script("arguments[0].click();", cookie_btn)
                time.sleep(2)
            except:
                pass
            
            page_num = 1
            total_saved = 0
            
            while page_num <= max_pages:
                self.stdout.write(f"📄 Page GEF {page_num}")
                
                projects_data = self.extract_gef_projects_from_current_page()
                
                if not projects_data:
                    break
                
                # Sauvegarder en base
                saved_count = self.save_gef_projects_to_database(projects_data)
                total_saved += saved_count
                
                self.stdout.write(f"✅ Page {page_num}: {saved_count} projets sauvegardés")
                
                if not self.navigate_to_next_page():
                    break
                
                page_num += 1
                time.sleep(2)
            
            return total_saved
            
        except Exception as e:
            logger.error(f"Erreur scraping GEF: {e}")
            return 0

    def extract_gef_projects_from_current_page(self):
        """Extraire les projets GEF de la page actuelle"""
        try:
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            table = soup.find('table', class_='views-table')
            if not table:
                return []
            
            projects = []
            rows = table.find('tbody').find_all('tr') if table.find('tbody') else []
            
            for row in rows:
                try:
                    cells = row.find_all('td')
                    if len(cells) < 9:
                        continue
                    
                    # Extraction des données de base
                    title_cell = cells[0]
                    title_link = title_cell.find('a')
                    title = self.clean_text(title_link.get_text()) if title_link else self.clean_text(title_cell.get_text())
                    
                    project_url = ""
                    if title_link and title_link.get('href'):
                        project_url = urljoin("https://www.thegef.org", title_link['href'])
                    
                    project_data = {
                        'title': title,
                        'source_url': project_url,
                        'source_id': self.clean_text(cells[1].get_text()),
                        'country': self.clean_text(cells[2].get_text()),
                        'focal_areas': self.clean_text(cells[3].get_text()),
                        'project_type': self.clean_text(cells[4].get_text()),
                        'organization': self.clean_text(cells[5].get_text()),
                        'total_funding': self.clean_text(cells[7].get_text()),
                        'status': self.clean_text(cells[8].get_text())
                    }
                    
                    if len(title) > 10:  # Filtrer les titres trop courts
                        projects.append(project_data)
                        
                except Exception as e:
                    logger.warning(f"Erreur extraction ligne GEF: {e}")
                    continue
            
            return projects
            
        except Exception as e:
            logger.error(f"Erreur extraction page GEF: {e}")
            return []

    def save_gef_projects_to_database(self, projects_data):
        """Sauvegarde les projets GEF en base de données"""
        saved_count = 0
        
        with transaction.atomic():
            for project_data in projects_data:
                try:
                    # Vérifier si existe déjà
                    existing = ScrapedProject.objects.filter(
                        source='GEF',
                        source_id=project_data.get('source_id', ''),
                        title=project_data['title']
                    ).first()
                    
                    if existing:
                        # Mettre à jour les données
                        for field, value in project_data.items():
                            setattr(existing, field, value)
                        existing.last_updated = timezone.now()
                        existing.save()
                    else:
                        # Créer un nouveau projet scrapé
                        scraped_project = ScrapedProject.objects.create(
                            source='GEF',
                            title=project_data['title'],
                            source_url=project_data.get('source_url', ''),
                            source_id=project_data.get('source_id', ''),
                            description=f"Projet GEF en {project_data.get('country', 'Mauritanie')}",
                            organization=project_data.get('organization', ''),
                            project_type=project_data.get('project_type', ''),
                            status=project_data.get('status', ''),
                            total_funding=project_data.get('total_funding', ''),
                            funding_amount=self.extract_amount_from_string(project_data.get('total_funding', '')),
                            country=project_data.get('country', 'Mauritania'),
                            focal_areas=project_data.get('focal_areas', ''),
                            gef_project_id=project_data.get('source_id', ''),
                            data_completeness_score=self.calculate_completeness_score(project_data),
                            scraping_source='integrated_scraper'
                        )
                        saved_count += 1
                    
                except Exception as e:
                    logger.error(f"Erreur sauvegarde projet GEF: {e}")
                    continue
        
        return saved_count

    def scrape_gcf_to_database(self, max_details=None):
        """Scraper GCF et sauvegarder directement en base"""
        mauritania_url = "https://www.greenclimate.fund/countries/mauritania"
        
        try:
            all_projects = self.get_all_gcf_pages_projects(mauritania_url)
            
            if max_details:
                all_projects = all_projects[:max_details]
            
            # Sauvegarder en base
            saved_count = self.save_gcf_projects_to_database(all_projects)
            
            return saved_count
            
        except Exception as e:
            logger.error(f"Erreur scraping GCF: {e}")
            return 0

    def get_all_gcf_pages_projects(self, mauritania_url):
        """Récupère tous les projets GCF avec pagination"""
        all_projects = []
        page = 0
        
        while True:
            if page == 0:
                url = mauritania_url
            else:
                url = f"{mauritania_url}?page={page}"
            
            self.stdout.write(f"📄 Page GCF {page + 1}")
            soup = self.get_page_content(url)
            
            if not soup:
                break

            page_projects = self.extract_gcf_projects_from_table(soup)
            
            if not page_projects:
                break
            
            all_projects.extend(page_projects)
            self.stdout.write(f"✅ Page {page + 1}: {len(page_projects)} projets trouvés")
            
            # Vérification pagination
            pagination = soup.find('ul', class_='pager')
            if pagination:
                next_link = pagination.find('a', title=re.compile(r'Go to next page'))
                if not next_link:
                    break
            else:
                break
            
            page += 1
            time.sleep(1)

        return all_projects

    def extract_gcf_projects_from_table(self, soup):
        """Extrait les projets GCF depuis le tableau"""
        projects = []
        
        table = soup.find('table', class_='table') or soup.find('table')
        if not table:
            return projects

        tbody = table.find('tbody')
        rows = tbody.find_all('tr') if tbody else table.find_all('tr')[1:]
        
        for row in rows:
            try:
                cells = row.find_all('td')
                if len(cells) < 3:
                    continue

                title_cell = cells[0]
                link_elem = title_cell.find('a')
                if not link_elem:
                    continue

                project_url = urljoin("https://www.greenclimate.fund", link_elem.get('href', ''))
                title = link_elem.get_text(strip=True)
                document_type = cells[1].get_text(strip=True) if len(cells) > 1 else ''

                cover_date = ''
                if len(cells) > 2:
                    date_span = cells[2].find('span', class_='date-display-single')
                    if date_span:
                        cover_date = date_span.get_text(strip=True)
                    else:
                        cover_date = cells[2].get_text(strip=True)

                # Extraire l'organisation des badges
                badges = title_cell.find_all('span', class_='badge')
                organization = ''
                for badge in badges:
                    badge_text = badge.get_text(strip=True)
                    if not badge_text.startswith('FP'):
                        organization = badge_text
                        break

                project_data = {
                    'title': title,
                    'source_url': project_url,
                    'document_type': document_type,
                    'organization': organization,
                    'cover_date': cover_date
                }

                projects.append(project_data)

            except Exception as e:
                logger.error(f"Erreur extraction ligne GCF: {e}")
                continue

        return projects

    def save_gcf_projects_to_database(self, projects_data):
        """Sauvegarde les projets GCF en base de données"""
        saved_count = 0
        
        with transaction.atomic():
            for project_data in projects_data:
                try:
                    # Enrichir avec les détails de la page
                    detailed_info = self.extract_gcf_project_details(project_data['source_url'])
                    project_data.update(detailed_info)
                    
                    # Vérifier si existe déjà
                    existing = ScrapedProject.objects.filter(
                        source='GCF',
                        title=project_data['title'],
                        source_url=project_data['source_url']
                    ).first()
                    
                    if existing:
                        # Mettre à jour
                        for field, value in project_data.items():
                            if hasattr(existing, field):
                                setattr(existing, field, value)
                        existing.last_updated = timezone.now()
                        existing.save()
                    else:
                        # Créer nouveau
                        scraped_project = ScrapedProject.objects.create(
                            source='GCF',
                            title=project_data['title'],
                            source_url=project_data['source_url'],
                            description=project_data.get('description', ''),
                            organization=project_data.get('organization', ''),
                            project_type=project_data.get('document_type', ''),
                            total_funding=project_data.get('total_funding', ''),
                            funding_amount=self.extract_amount_from_string(project_data.get('total_funding', '')),
                            country='Mauritania',
                            gcf_document_type=project_data.get('document_type', ''),
                            cover_date=project_data.get('cover_date', ''),
                            document_url=project_data.get('document_url', ''),
                            data_completeness_score=self.calculate_completeness_score(project_data),
                            scraping_source='integrated_scraper'
                        )
                        saved_count += 1
                    
                    time.sleep(0.5)  # Pause entre les requêtes
                    
                except Exception as e:
                    logger.error(f"Erreur sauvegarde projet GCF: {e}")
                    continue
        
        return saved_count

    def extract_gcf_project_details(self, project_url):
        """Extrait les détails d'un projet GCF"""
        soup = self.get_page_content(project_url)
        if not soup:
            return {}

        details = {}

        try:
            # Description
            desc_elem = soup.find('div', class_='field-name-body')
            if desc_elem:
                desc_text = desc_elem.find('p')
                if desc_text:
                    details['description'] = desc_text.get_text(strip=True)

            # Document PDF
            download_link = soup.find('a', class_='btn-primary', href=True)
            if download_link and download_link.get('href', '').endswith('.pdf'):
                details['document_url'] = download_link['href']

            # Métadonnées
            meta_sections = soup.find_all('div', class_='col-md-6')
            for section in meta_sections:
                label_elem = section.find('span', class_='node-label')
                if not label_elem:
                    continue
                    
                label = label_elem.get_text(strip=True).lower()
                strong_elem = section.find('strong')
                if not strong_elem:
                    continue
                    
                value = strong_elem.get_text(strip=True)
                
                if any(keyword in label for keyword in ['funding', 'amount', 'cofinancement']):
                    details['total_funding'] = value

        except Exception as e:
            logger.error(f"Erreur extraction détails GCF: {e}")

        return details

    def create_projects_from_scraped_data(self, update_existing=False):
        """Crée des projets Django depuis les données scrapées"""
        scraped_projects = ScrapedProject.objects.filter(
            linked_project__isnull=True,
            is_relevant_for_mauritania=True
        )
        
        # Consultant par défaut
        default_consultant, _ = CustomUser.objects.get_or_create(
            username='scraper_admin',
            defaults={
                'first_name': 'Scraper',
                'last_name': 'Admin',
                'email': 'scraper@richat-partners.com',
                'level': 'N1',
                'department': 'Data Collection',
                'actif': True
            }
        )
        
        created_count = 0
        
        for scraped_project in scraped_projects:
            try:
                if scraped_project.can_create_project():
                    django_project = scraped_project.create_linked_project(default_consultant)
                    created_count += 1
                    
                    if created_count % 10 == 0:
                        self.stdout.write(f"✅ {created_count} projets Django créés...")
                        
            except Exception as e:
                logger.error(f"Erreur création projet Django: {e}")
                continue
        
        return created_count

    def create_completion_notifications(self, total_scraped, projects_created):
        """Crée des notifications de fin de scraping"""
        try:
            admins = CustomUser.objects.filter(is_superuser=True)
            
            message = f"Scraping terminé avec succès!\n"
            message += f"- {total_scraped} projets scrapés\n"
            message += f"- Données stockées dans ScrapedProject\n"
            if projects_created:
                message += f"- Projets Django créés automatiquement\n"
            message += f"- Consultez l'admin pour plus de détails"
            
            for admin in admins:
                Notification.objects.create(
                    type='scraping',
                    title=f'Scraping terminé: {total_scraped} projets',
                    message=message,
                    consultant=admin
                )
                
        except Exception as e:
            logger.warning(f"Impossible de créer les notifications: {e}")

    # Méthodes utilitaires
    def extract_amount_from_string(self, amount_str):
        """Extrait le montant numérique d'une chaîne"""
        if not amount_str:
            return None
        
        try:
            import re
            # Nettoyer et extraire les chiffres
            clean_amount = re.sub(r'[^\d.,]', '', str(amount_str).replace(',', ''))
            if clean_amount:
                return Decimal(clean_amount)
        except:
            pass
        
        return None

    def calculate_completeness_score(self, project_data):
        """Calcule un score de complétude des données"""
        fields_to_check = ['title', 'organization', 'description', 'total_funding', 'source_url']
        filled_fields = sum(1 for field in fields_to_check if project_data.get(field))
        return int((filled_fields / len(fields_to_check)) * 100)

    def clean_text(self, text):
        """Nettoie le texte"""
        if not text:
            return ""
        text = str(text)
        text = html.unescape(text)
        text = ftfy.fix_text(text)
        return " ".join(text.split()).strip()

    def get_page_content(self, url):
        """Récupère le contenu HTML d'une page"""
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            return BeautifulSoup(response.content, 'html.parser')
        except requests.RequestException as e:
            logger.error(f"Erreur récupération {url}: {e}")
            return None

    def setup_driver(self, headless=False):
        """Configuration du driver Chrome"""
        try:
            options = Options()
            options.add_argument("--start-maximized")
            options.add_argument("--disable-infobars")
            options.add_argument("--disable-extensions")
            options.add_argument("--disable-notifications")
            options.add_argument("--disable-popup-blocking")
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--disable-gpu")
            
            if headless:
                options.add_argument("--headless")
            
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=options)
            self.driver.implicitly_wait(15)
            
        except Exception as e:
            logger.error(f"Erreur configuration driver: {e}")
            raise

    def cleanup_driver(self):
        """Nettoie le driver"""
        if self.driver:
            try:
                self.driver.quit()
            except Exception as e:
                logger.warning(f"Erreur fermeture driver: {e}")

    def navigate_to_next_page(self):
        """Navigation vers la page suivante GEF"""
        try:
            time.sleep(2)
            
            next_selectors = [
                "//li[@class='page-item']/a[contains(@title, 'Go to next page')]",
                "//a[contains(@rel, 'next')]",
                "//li[contains(@class, 'page-item')]/a[contains(text(), '››')]"
            ]
            
            for selector in next_selectors:
                try:
                    next_link = self.driver.find_element(By.XPATH, selector)
                    if next_link.is_displayed() and next_link.is_enabled():
                        parent_li = next_link.find_element(By.XPATH, "./..")
                        if "disabled" not in parent_li.get_attribute("class").lower():
                            self.driver.execute_script("arguments[0].click();", next_link)
                            
                            WebDriverWait(self.driver, 15).until(
                                EC.presence_of_element_located((By.CSS_SELECTOR, "table.views-table tbody tr"))
                            )
                            
                            return True
                except:
                    continue
            
            return False
            
        except Exception as e:
            logger.error(f"Erreur navigation: {e}")
            return False


# =============================================================================
# COMMANDE POUR MIGRER LES DONNÉES SCRAPÉES VERS LES PROJETS
# =============================================================================

class MigrateScrapedDataCommand(BaseCommand):
    help = 'Migre les données scrapées vers des projets Django'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Simulation sans création')
        parser.add_argument('--source', type=str, choices=['GEF', 'GCF', 'both'], default='both')
        parser.add_argument('--min-score', type=int, default=50, help='Score minimum de complétude')

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        source_filter = options.get('source', 'both')
        min_score = options.get('min_score', 50)
        
        self.stdout.write("📋 MIGRATION DES DONNÉES SCRAPÉES VERS PROJETS DJANGO")
        self.stdout.write("=" * 60)
        
        # Filtrer les projets scrapés
        queryset = ScrapedProject.objects.filter(
            linked_project__isnull=True,
            data_completeness_score__gte=min_score,
            is_relevant_for_mauritania=True
        )
        
        if source_filter != 'both':
            queryset = queryset.filter(source=source_filter)
        
        self.stdout.write(f"📊 {queryset.count()} projets scrapés éligibles")
        
        if dry_run:
            self.stdout.write("⚠️  MODE SIMULATION")
            for project in queryset[:10]:  # Afficher 10 exemples
                self.stdout.write(f"   - [{project.source}] {project.title[:50]}... (Score: {project.data_completeness_score})")
            return
        
        # Créer les projets
        created_count = 0
        default_consultant, _ = CustomUser.objects.get_or_create(
            username='migration_bot',
            defaults={
                'first_name': 'Migration',
                'last_name': 'Bot',
                'email': 'migration@richat-partners.com',
                'level': 'N1',
                'department': 'Data Migration',
                'actif': True
            }
        )
        
        for scraped_project in queryset:
            try:
                if scraped_project.can_create_project():
                    django_project = scraped_project.create_linked_project(default_consultant)
                    created_count += 1
                    
                    if created_count % 5 == 0:
                        self.stdout.write(f"✅ {created_count} projets migrés...")
                        
            except Exception as e:
                self.stdout.write(f"❌ Erreur migration {scraped_project.title[:30]}: {e}")
                continue
        
        self.stdout.write(self.style.SUCCESS(
            f"🎉 Migration terminée: {created_count} projets Django créés"
        ))


# =============================================================================
# UTILITAIRES POUR EXÉCUTION
# =============================================================================

def run_complete_scraping():
    """Lance le scraping complet avec sauvegarde en base"""
    from django.core.management import call_command
    
    call_command(
        'integrated_scraper',
        '--source=both',
        '--max-pages=15',
        '--create-projects',
        '--headless'
    )

def migrate_scraped_to_projects():
    """Migre les données scrapées vers des projets Django"""
    from django.core.management import call_command
    
    call_command(
        'migrate_scraped_data',
        '--source=both',
        '--min-score=60'
    )

if __name__ == "__main__":
    print("🚀 Lancement du scraping intégré avec base de données...")
    run_complete_scraping()