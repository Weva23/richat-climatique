# main_app/management/commands/collection.py

import os
import sys
import re
import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from pathlib import Path
from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.utils import timezone
import hashlib
from typing import Dict, List, Any
from difflib import SequenceMatcher
import numpy as np
import warnings

# Supprimer les warnings pandas pour un affichage plus propre
warnings.filterwarnings('ignore', category=FutureWarning)
warnings.filterwarnings('ignore', category=UserWarning)

class Command(BaseCommand):
    help = "Importation complète des projets GEF, GCF, OECD et Climate Funds Global dans le modèle Django ScrapedProject"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.DB_CONFIG = {
            'user': 'root',
            'password': '',
            'host': 'localhost',
            'port': '3306',
            'database': 'richat_funding_db',
            'main_table': 'main_app_scrapedproject',
            'notification_table': 'main_app_notification'
        }

        self.SCRAPED_DATA_DIR = Path(settings.BASE_DIR) / 'scraped_data'
        self.FICHIERS_PROJETS = [
            self.SCRAPED_DATA_DIR / 'GEF_Mauritanie_Projects.xlsx',
            self.SCRAPED_DATA_DIR / 'GCF_Mauritanie_Projects.xlsx',
            self.SCRAPED_DATA_DIR / 'OECD_Mauritanie_Projects.xlsx',
            self.SCRAPED_DATA_DIR / 'climate_funds_global.xlsx',
        ]

        # Colonnes exactes du modèle Django ScrapedProject
        self.COLUMNS_IN_DB = [
            'title', 'source', 'source_url', 'source_id', 'description', 
            'organization', 'project_type', 'status', 'total_funding', 
            'funding_amount', 'currency', 'country', 'region', 'focal_areas',
            'gef_project_id', 'gcf_document_type', 'cover_date', 'document_url',
            'additional_links', 'scraped_at', 'last_updated', 'scraping_source',
            'data_completeness_score', 'is_relevant_for_mauritania', 'needs_review',
            'unique_hash'
        ]

    def add_arguments(self, parser):
        parser.add_argument(
            '--email-recipients',
            type=str,
            help='Liste des emails séparés par des virgules',
            default='nrabdallh95@gmail.com,22056@supnum.mr'
        )
        parser.add_argument(
            '--similarity-threshold',
            type=float,
            help='Seuil de similarité pour détecter les doublons (0.0-1.0)',
            default=0.98
        )
        parser.add_argument(
            '--force-import',
            action='store_true',
            help='Forcer l\'importation même si des doublons sont détectés'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulation sans importation réelle'
        )
        parser.add_argument(
            '--skip-climate-funds',
            action='store_true',
            help='Exclure les fonds climatiques globaux de la collection',
            default=False
        )
        parser.add_argument(
            '--climate-funds-only',
            action='store_true',
            help='Collecter seulement les fonds climatiques globaux',
            default=False
        )

    def handle(self, *args, **options):
        email_recipients = options.get('email_recipients', 'nrabdallh95@gmail.com,22056@supnum.mr').split(',')
        similarity_threshold = options.get('similarity_threshold', 0.98)
        force_import = options.get('force_import', False)
        dry_run = options.get('dry_run', False)
        skip_climate_funds = options.get('skip_climate_funds', False)
        climate_funds_only = options.get('climate_funds_only', False)
        
        # Déterminer les sources à inclure
        include_climate_funds = not skip_climate_funds
        if climate_funds_only:
            include_climate_funds = True
            include_mauritania_projects = False
        else:
            include_mauritania_projects = True
        
        self.stdout.write(self.style.SUCCESS("🚀 COLLECTION PROJETS GEF-GCF-OECD + CLIMATE FUNDS → DJANGO SCRAPEDPROJECT"))
        self.stdout.write("=" * 90)
        self.stdout.write(f"🎯 CIBLE: Modèle Django ScrapedProject (table: {self.DB_CONFIG['main_table']})")
        
        if climate_funds_only:
            self.stdout.write("🔍 SOURCES: Seulement Climate Funds Global")
        elif skip_climate_funds:
            self.stdout.write("🔍 SOURCES: Fichiers Excel GEF, GCF, OECD (sans Climate Funds)")
        else:
            self.stdout.write("🔍 SOURCES: Fichiers Excel GEF, GCF, OECD + Climate Funds Global")
            
        self.stdout.write("✅ STRATÉGIE: Éviter les doublons SANS perdre de projets légitimes")
        self.stdout.write("🔔 NOTIFICATIONS: Email automatique")
        self.stdout.write(f"📊 SEUIL SIMILARITÉ: {similarity_threshold:.0%} (très strict)")
        
        if climate_funds_only:
            self.stdout.write("🌍 MODE: Fonds climatiques globaux uniquement")
        elif skip_climate_funds:
            self.stdout.write("🇲🇷 MODE: Projets Mauritanie uniquement")
        else:
            self.stdout.write("🌍 MODE: Projets Mauritanie + Fonds climatiques globaux")
            
        if dry_run:
            self.stdout.write(self.style.WARNING("🧪 MODE SIMULATION (DRY RUN) - Aucune importation réelle"))
        if force_import:
            self.stdout.write(self.style.WARNING("⚠️ MODE FORCE - Importation même avec doublons"))
        self.stdout.write("=" * 90)

        # Déterminer les fichiers à traiter
        fichiers_a_traiter = []
        
        if climate_funds_only:
            # Seulement climate_funds_global.xlsx
            fichiers_a_traiter = [f for f in self.FICHIERS_PROJETS if 'climate_funds_global' in f.name]
        elif skip_climate_funds:
            # Tous sauf climate_funds_global.xlsx
            fichiers_a_traiter = [f for f in self.FICHIERS_PROJETS if 'climate_funds_global' not in f.name]
        else:
            # Tous les fichiers
            fichiers_a_traiter = self.FICHIERS_PROJETS.copy()

        # Afficher les chemins de fichiers pour debug
        self.stdout.write(f"📁 Répertoire de données: {self.SCRAPED_DATA_DIR}")
        files_status = []
        
        for fichier in fichiers_a_traiter:
            if fichier.exists():
                size_mb = fichier.stat().st_size / (1024*1024)
                status = f"✅ EXISTE ({size_mb:.1f}MB)"
                files_status.append(True)
            else:
                status = "❌ MANQUANT"
                files_status.append(False)
            self.stdout.write(f"   • {fichier.name}: {status}")

        if not any(files_status):
            self.stdout.write(self.style.ERROR("❌ Aucun fichier source trouvé"))
            return

        # Étape 1: Chargement et validation des fichiers
        dfs = self.load_and_validate_files(fichiers_a_traiter)
        if not dfs:
            self.stdout.write(self.style.ERROR("❌ Aucun fichier valide trouvé"))
            return

        # Étape 2: Traitement des données avec gestion des DataFrames vides
        if len(dfs) > 1:
            df_final = self.process_data(pd.concat(dfs, ignore_index=True))
        else:
            df_final = self.process_data(dfs[0])
        
        # Étape 3: Importation intelligente sans perte
        if dry_run:
            self.simulate_import(df_final, similarity_threshold)
        else:
            new_projects = self.import_data_without_losing_projects(df_final, similarity_threshold, force_import)
            
            # Étape 4: Notifications
            if new_projects > 0:
                self.send_notification_email(new_projects, email_recipients, climate_funds_only)

        self.stdout.write(self.style.SUCCESS("🎉 Collection terminée avec succès!"))

    def load_and_validate_files(self, fichiers_a_traiter):
        """Charge et valide les fichiers Excel avec support spécial pour Climate Funds"""
        dfs = []
        
        for file_path in fichiers_a_traiter:
            try:
                if not file_path.exists():
                    self.stdout.write(f"⚠️ Fichier introuvable: {file_path.name}")
                    continue

                self.stdout.write(f"📖 Lecture de {file_path.name}...")
                
                # Lire le fichier Excel
                df = pd.read_excel(file_path, engine='openpyxl')
                
                if df.empty:
                    self.stdout.write(f"⚠️ Fichier vide: {file_path.name}")
                    continue

                # Déterminer la source et traitement spécial pour Climate Funds
                if 'climate_funds_global' in file_path.name.lower():
                    source = 'CLIMATE_FUND'
                    df = self.process_climate_funds_data(df)
                elif 'GEF' in file_path.name.upper():
                    source = 'GEF'
                elif 'GCF' in file_path.name.upper():
                    source = 'GCF'
                elif 'OECD' in file_path.name.upper():
                    source = 'OTHER'  # OECD classé comme OTHER
                else:
                    source = 'OTHER'  # Par défaut
                    
                df['source'] = source
                df['scraping_source'] = file_path.name

                # Afficher les colonnes disponibles pour debug
                self.stdout.write(f"   📋 Colonnes disponibles: {list(df.columns)}")

                df = self.prepare_dataframe(df)
                dfs.append(df)
                self.stdout.write(self.style.SUCCESS(
                    f"✅ {file_path.name} chargé ({len(df)} lignes) - Source: {source}"
                ))

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Erreur avec {file_path.name}: {str(e)}"))
                continue

        return dfs if dfs else None

    def process_climate_funds_data(self, df):
        """Traitement spécial pour les données Climate Funds Global"""
        self.stdout.write("   🌍 Traitement spécial des fonds climatiques globaux...")
        
        # Mapping spécifique pour Climate Funds - CORRIGÉ
        climate_fund_mapping = {
            'Fund Name': 'title',
            'Fund URL': 'additional_links',
            'Status': 'status'
        }
        
        # Appliquer le mapping Climate Funds
        df = df.rename(columns=climate_fund_mapping)
        
        # Traitement spécial pour les fonds climatiques
        if 'title' in df.columns:
            # Ajouter un préfixe pour distinguer les fonds des projets
            df['title'] = df['title'].apply(lambda x: f"[CLIMATE FUND] {x}" if pd.notna(x) and str(x).strip() != '' else x)
        
        # Créer une description basée sur les montants disponibles
        def create_climate_fund_description(row):
            desc_parts = []
            
            # Chercher toutes les colonnes de montants possibles
            amount_columns = [col for col in df.columns if any(keyword in col.lower() 
                            for keyword in ['pledge', 'deposit', 'approval', 'disbursement', 'amount'])]
            
            for col in amount_columns:
                value = row.get(col)
                if pd.notna(value) and str(value).strip() != '' and str(value) != '0':
                    # Nettoyer le nom de la colonne pour affichage
                    clean_name = col.replace('(USD mn)', '').replace('USD', '').strip()
                    desc_parts.append(f"{clean_name}: {value}")
            
            if desc_parts:
                return f"Global Climate Fund. {' | '.join(desc_parts)}"
            else:
                return "Global Climate Fund for climate change mitigation and adaptation projects."
        
        df['description'] = df.apply(create_climate_fund_description, axis=1)
        
        # Définir les champs spécifiques aux fonds climatiques
        df['project_type'] = 'Climate Fund'
        df['organization'] = 'Climate Funds Update'
        df['country'] = 'Global'
        df['region'] = 'Global'
        df['is_relevant_for_mauritania'] = True
        df['source_url'] = 'climatefundsupdate.org'
        
        # Utiliser le montant le plus élevé comme financement total
        def get_total_funding(row):
            amount_columns = [col for col in df.columns if any(keyword in col.lower() 
                            for keyword in ['pledge', 'deposit', 'approval', 'disbursement'])]
            
            amounts = []
            for col in amount_columns:
                if col in row and pd.notna(row[col]) and str(row[col]).strip() != '':
                    amount_str = str(row[col])
                    # Chercher des patterns de montants
                    amount_match = re.search(r'(\d+(?:[\.,]\d+)*)', amount_str.replace(',', ''))
                    if amount_match:
                        try:
                            amounts.append((float(amount_match.group(1)), col))
                        except ValueError:
                            continue
            
            if amounts:
                max_amount, source_col = max(amounts, key=lambda x: x[0])
                # Déterminer l'unité (millions ou unités)
                if 'mn' in source_col.lower() or 'million' in source_col.lower():
                    return f"USD {max_amount} Million"
                else:
                    return f"USD {max_amount:,.0f}"
            return ""
        
        df['total_funding'] = df.apply(get_total_funding, axis=1)
        
        self.stdout.write(f"   ✅ {len(df)} fonds climatiques globaux traités")
        return df

    def prepare_dataframe(self, df):
        """Prépare le DataFrame avec le mapping vers le modèle Django ScrapedProject"""
        
        # Mapping exhaustif vers les champs du modèle Django ScrapedProject
        mapping = {
            # Champs principaux
            'Titre': 'title',
            'Title': 'title',
            'Nom': 'title',
            'Name': 'title',
            
            # Type de projet
            'Type': 'project_type',
            'Project Type': 'project_type',
            'Type de projet': 'project_type',
            'Category': 'project_type',
            'Catégorie': 'project_type',
            
            # Documents et liens
            'Document': 'document_url',
            'Document URL': 'document_url',
            'PDF': 'document_url',
            'Fichier': 'document_url',
            
            # Site source
            'nom_site': 'source_url',
            'Site': 'source_url',
            'Source URL': 'source_url',
            'Website': 'source_url',
            'Portal': 'source_url',
            
            # Organisation
            'Organisation': 'organization',
            'Organization': 'organization',
            'Organisme': 'organization',
            'Agency': 'organization',
            'Agence': 'organization',
            'Institution': 'organization',
            
            # Liens additionnels
            'Lien': 'additional_links',
            'Link': 'additional_links',
            'URL': 'additional_links',
            'Project URL': 'additional_links',
            'Project Link': 'additional_links',
            
            # Description
            'Description': 'description',
            'Résumé': 'description',
            'Summary': 'description',
            'Abstract': 'description',
            'Détails': 'description',
            
            # Financement
            'Cofinancement Total': 'total_funding',
            'Total Funding': 'total_funding',
            'Budget': 'total_funding',
            'Montant': 'total_funding',
            'Amount': 'total_funding',
            'Financement': 'total_funding',
            'Funding': 'total_funding',
            
            # Champs spéciaux
            'source': 'source',
            'scraping_source': 'scraping_source'
        }

        # Afficher le mapping pour debug
        found_mappings = {k: v for k, v in mapping.items() if k in df.columns}
        if found_mappings:
            self.stdout.write(f"   🔄 Mappings appliqués: {found_mappings}")

        # Renommer les colonnes selon le mapping
        df = df.rename(columns=found_mappings)

        # Ajouter tous les champs obligatoires du modèle Django avec des valeurs par défaut
        default_values = {
            'title': '',
            'source': 'OTHER',
            'source_url': '',
            'source_id': '',
            'description': '',
            'organization': '',
            'project_type': '',
            'status': 'Active',
            'total_funding': '',
            'funding_amount': None,
            'currency': 'USD',
            'country': 'Mauritania',
            'region': 'Africa',
            'focal_areas': '',
            'gef_project_id': '',
            'gcf_document_type': '',
            'cover_date': '',
            'document_url': '',
            'additional_links': '',
            'scraped_at': datetime.now(),
            'last_updated': datetime.now(),
            'scraping_source': '',
            'data_completeness_score': 0,
            'is_relevant_for_mauritania': True,
            'needs_review': False,
            'unique_hash': ''
        }

        # Ajustements spéciaux pour les fonds climatiques globaux
        if len(df) > 0 and df['source'].iloc[0] == 'CLIMATE_FUND':
            default_values['country'] = 'Global'
            default_values['region'] = 'Global'
            default_values['is_relevant_for_mauritania'] = True

        # Ajouter les colonnes manquantes
        for col, default_val in default_values.items():
            if col not in df.columns:
                df[col] = default_val

        # Nettoyer les données de manière très douce pour ne rien perdre
        for col in df.select_dtypes(include=['object']).columns:
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip()
                # Remplacer seulement les vraies valeurs vides
                df[col] = df[col].replace(['nan', 'None', 'NaN', 'null', 'NULL'], '')

        # Traitement spécial pour les montants de financement
        df = self.extract_funding_amount(df)

        # Calculer le score de complétude
        df['data_completeness_score'] = df.apply(self.calculate_completeness_score, axis=1)

        # Déterminer si révision nécessaire
        df['needs_review'] = df.apply(self.needs_review_check, axis=1)

        return df

    def extract_funding_amount(self, df):
        """Extrait le montant numérique du financement à partir du texte"""
        def parse_amount(funding_text):
            if not funding_text or str(funding_text).lower() in ['', 'nan', 'none', 'null']:
                return None
            
            # Nettoyer le texte
            text = str(funding_text).upper()
            
            # Chercher des montants avec des patterns courants
            patterns = [
                r'(\d+(?:[\.,]\d+)*)\s*MILLION',  # X.X million
                r'(\d+(?:[\.,]\d+)*)\s*M\s*USD',  # X.X M USD
                r'(\d+(?:[\.,]\d+)*)\s*MUS',      # X.X MUS
                r'USD\s*(\d+(?:[\.,]\d+)*)',      # USD X.X
                r'\$\s*(\d+(?:[\.,]\d+)*)',       # $X.X
                r'(\d+(?:[\.,]\d+)*)\s*USD',      # X.X USD
                r'(\d+(?:[\.,]\d+)*)',            # Juste un nombre
            ]
            
            for pattern in patterns:
                match = re.search(pattern, text)
                if match:
                    try:
                        amount_str = match.group(1).replace(',', '.')
                        amount = float(amount_str)
                        
                        # Si le texte contient "million", multiplier par 1M
                        if 'MILLION' in text or ' M ' in text:
                            amount *= 1000000
                        
                        return amount
                    except ValueError:
                        continue
            
            return None

        df['funding_amount'] = df['total_funding'].apply(parse_amount)
        return df

    def calculate_completeness_score(self, row):
        """Calcule un score de complétude basé sur les champs remplis"""
        # Score de base plus élevé pour les fonds climatiques globaux
        if row.get('source') == 'CLIMATE_FUND':
            base_score = 20  # Les fonds globaux partent avec un bonus
        else:
            base_score = 0
        
        # Champs obligatoires (50% du score)
        required_fields = ['title', 'description', 'organization', 'source']
        required_score = 0
        for field in required_fields:
            if row.get(field) and len(str(row.get(field, '')).strip()) > 3:
                required_score += 12.5  # 50/4 = 12.5 points par champ
        
        # Champs importants (30% du score)
        important_fields = ['total_funding', 'project_type', 'source_url']
        important_score = 0
        for field in important_fields:
            if row.get(field) and len(str(row.get(field, '')).strip()) > 3:
                important_score += 10  # 30/3 = 10 points par champ
        
        # Champs optionnels (20% du score)
        optional_fields = ['document_url', 'additional_links']
        optional_score = 0
        for field in optional_fields:
            if row.get(field) and len(str(row.get(field, '')).strip()) > 3:
                optional_score += 10  # 20/2 = 10 points par champ
        
        total_score = base_score + required_score + important_score + optional_score
        return min(total_score, 100)

    def needs_review_check(self, row):
        """Détermine si le projet nécessite une révision manuelle"""
        # Les fonds climatiques globaux nécessitent rarement une révision
        if row.get('source') == 'CLIMATE_FUND':
            return False
        
        # Révision nécessaire si:
        # 1. Score de complétude très faible
        if row.get('data_completeness_score', 0) < 40:
            return True
        
        # 2. Titre trop court ou générique
        title = str(row.get('title', '')).strip()
        if len(title) < 10 or title.lower() in ['projet', 'project', 'untitled']:
            return True
        
        # 3. Pas d'organisation
        if not row.get('organization') or len(str(row.get('organization', '')).strip()) < 3:
            return True
        
        # 4. Mots-clés suspects dans le titre
        suspicious_keywords = ['test', 'draft', 'template', 'example', 'sample']
        if any(keyword in title.lower() for keyword in suspicious_keywords):
            return True
        
        return False

    def normalize_text_gentle(self, text):
        """Normalise le texte de manière douce pour comparaison"""
        if not text or str(text).lower() in ['', 'nan', 'none', 'null']:
            return ''
        
        text = str(text).strip().lower()
        # Normaliser les espaces multiples et caractères spéciaux
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[^\w\s]', '', text)
        return text

    def generate_smart_hash(self, row):
        """Génère un hash intelligent basé sur les champs les plus discriminants"""
        # Utiliser les champs les plus fiables pour le hash
        key_fields = [
            self.normalize_text_gentle(row.get('title', '')),
            str(row.get('source', '')).strip().upper(),
            self.normalize_text_gentle(row.get('organization', '')),
            str(row.get('additional_links', '')).strip()[:100]  # Limiter la longueur des liens
        ]
        
        # Créer une chaîne unique et la hasher
        unique_string = '|'.join(key_fields)
        return hashlib.md5(unique_string.encode('utf-8')).hexdigest()

    def is_truly_duplicate(self, new_project, existing_projects_df, similarity_threshold=0.98):
        """Vérifie si c'est un VRAI doublon avec seuil très strict"""
        if existing_projects_df.empty:
            return False, None
        
        new_title = self.normalize_text_gentle(new_project.get('title', ''))
        new_source = str(new_project.get('source', '')).strip().upper()
        new_org = self.normalize_text_gentle(new_project.get('organization', ''))
        new_link = str(new_project.get('additional_links', '')).strip()
        
        for idx, existing in existing_projects_df.iterrows():
            existing_title = self.normalize_text_gentle(existing.get('title', ''))
            existing_source = str(existing.get('source', '')).strip().upper()
            existing_org = self.normalize_text_gentle(existing.get('organization', ''))
            existing_link = str(existing.get('additional_links', '')).strip()
            
            # Vérification 1: Lien exact ET même source (très fiable)
            if (new_source == existing_source and 
                new_link and existing_link and len(new_link) > 20 and 
                new_link == existing_link):
                return True, f"Lien identique pour même source: {new_link[:50]}..."
            
            # Vérification 2: Titre quasi-identique ET même source ET même organisation
            if (new_source == existing_source and 
                new_org == existing_org and new_org and
                new_title and existing_title and len(new_title) > 10):
                
                title_similarity = SequenceMatcher(None, new_title, existing_title).ratio()
                if title_similarity >= similarity_threshold:
                    return True, f"Titre très similaire ({title_similarity:.1%}) même source/org: '{existing_title[:50]}...'"
        
        return False, None

    def process_data(self, df):
        """Traite et nettoie les données avec approche conservative"""
        self.stdout.write(f"\n📊 Traitement de {len(df)} projets/fonds...")

        # Afficher les statistiques par source avant nettoyage
        source_stats_before = df['source'].value_counts()
        self.stdout.write(f"   📈 Répartition par source (avant nettoyage): {dict(source_stats_before)}")

        # Nettoyer les données de manière très conservative
        df['title'] = df['title'].astype(str).str.strip()
        
        # Supprimer seulement les lignes vraiment invalides (très permissif)
        initial_count = len(df)
        df = df[df['title'].str.len() > 2]  # Très permissif: 2 caractères minimum
        df = df[~df['title'].str.contains('^(nan|None|null|NaN)$', case=False, na=False, regex=True)]
        removed_count = initial_count - len(df)
        
        if removed_count > 0:
            self.stdout.write(f"   🗑️ {removed_count} lignes supprimées (titres invalides)")

        # Remplacer les NaN par des chaînes vides pour les champs texte
        text_columns = ['title', 'description', 'organization', 'project_type', 'total_funding']
        for col in text_columns:
            if col in df.columns:
                df[col] = df[col].fillna('')

        # Générer le hash unique pour chaque projet/fonds
        df['unique_hash'] = df.apply(self.generate_smart_hash, axis=1)

        # Ajouter les timestamps
        df['scraped_at'] = datetime.now()
        df['last_updated'] = datetime.now()

        self.stdout.write(self.style.SUCCESS(f"✅ {len(df)} projets/fonds valides après nettoyage"))
        
        # Statistiques détaillées par source
        source_stats = df['source'].value_counts()
        for source, count in source_stats.items():
            avg_score = df[df['source'] == source]['data_completeness_score'].mean()
            source_name = {
                'GEF': 'GEF (Projets)',
                'GCF': 'GCF (Projets)', 
                'OTHER': 'OECD/Autres',
                'CLIMATE_FUND': 'Climate Funds (Global)'
            }.get(source, source)
            self.stdout.write(f"   - {source_name}: {count} éléments (score moyen: {avg_score:.1f}%)")

        # Statistiques de qualité
        high_quality = len(df[df['data_completeness_score'] >= 80])
        medium_quality = len(df[(df['data_completeness_score'] >= 50) & (df['data_completeness_score'] < 80)])
        low_quality = len(df[df['data_completeness_score'] < 50])
        needs_review = len(df[df['needs_review'] == True])
        
        self.stdout.write(f"   📊 Qualité: Haute={high_quality}, Moyenne={medium_quality}, Faible={low_quality}")
        self.stdout.write(f"   ⚠️ À réviser: {needs_review} éléments")

        return df

    def simulate_import(self, df, similarity_threshold):
        """Simule l'importation sans modification de la base"""
        self.stdout.write(self.style.WARNING("\n🧪 SIMULATION D'IMPORTATION (DRY RUN)"))
        self.stdout.write("-" * 50)
        
        try:
            # Connexion à la base de données
            engine = create_engine(
                f"mysql+pymysql://{self.DB_CONFIG['user']}:{self.DB_CONFIG['password']}@"
                f"{self.DB_CONFIG['host']}:{self.DB_CONFIG['port']}/{self.DB_CONFIG['database']}"
            )

            # Récupérer les projets existants
            with engine.connect() as conn:
                try:
                    result = conn.execute(text(f"""
                        SELECT title, source, organization, unique_hash 
                        FROM {self.DB_CONFIG['main_table']}
                        LIMIT 100
                    """))
                    
                    columns = ['title', 'source', 'organization', 'unique_hash']
                    existing_projects = pd.DataFrame(result.fetchall(), columns=columns)
                except Exception:
                    existing_projects = pd.DataFrame(columns=['title', 'source', 'organization', 'unique_hash'])

            self.stdout.write(f"📋 {len(existing_projects)} projets déjà en base")
            
            # Analyser les doublons potentiels par source
            new_count_by_source = {'GEF': 0, 'GCF': 0, 'OTHER': 0, 'CLIMATE_FUND': 0}
            duplicate_count_by_source = {'GEF': 0, 'GCF': 0, 'OTHER': 0, 'CLIMATE_FUND': 0}
            
            for idx, (_, row) in enumerate(df.iterrows()):
                source = row.get('source', 'OTHER')
                
                if row['unique_hash'] in existing_projects['unique_hash'].values:
                    duplicate_count_by_source[source] += 1
                else:
                    is_duplicate, _ = self.is_truly_duplicate(row, existing_projects, similarity_threshold)
                    if is_duplicate:
                        duplicate_count_by_source[source] += 1
                    else:
                        new_count_by_source[source] += 1
            
            total_new = sum(new_count_by_source.values())
            total_duplicates = sum(duplicate_count_by_source.values())
            
            self.stdout.write(f"\n📊 RÉSULTATS DE LA SIMULATION:")
            self.stdout.write(f"✅ Nouveaux éléments à importer: {total_new}")
            self.stdout.write(f"⚠️ Doublons détectés: {total_duplicates}")
            self.stdout.write(f"📈 Taux de nouveauté: {total_new/len(df)*100:.1f}%")
            
            self.stdout.write(f"\n📋 DÉTAIL PAR SOURCE:")
            for source, new_count in new_count_by_source.items():
                duplicate_count = duplicate_count_by_source[source]
                source_name = {
                    'GEF': 'GEF (Projets)',
                    'GCF': 'GCF (Projets)', 
                    'OTHER': 'OECD/Autres',
                    'CLIMATE_FUND': 'Climate Funds (Global)'
                }.get(source, source)
                
                if new_count > 0 or duplicate_count > 0:
                    self.stdout.write(f"   • {source_name}: {new_count} nouveaux, {duplicate_count} doublons")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Erreur simulation: {str(e)}"))

    def import_data_without_losing_projects(self, df, similarity_threshold, force_import=False):
        """Importe les données en évitant les doublons SANS perdre de projets légitimes"""
        try:
            # Connexion à la base de données
            engine = create_engine(
                f"mysql+pymysql://{self.DB_CONFIG['user']}:{self.DB_CONFIG['password']}@"
                f"{self.DB_CONFIG['host']}:{self.DB_CONFIG['port']}/{self.DB_CONFIG['database']}"
            )

            self.stdout.write(f"\n💾 Connexion à la base de données: {self.DB_CONFIG['database']}")

            # Récupérer tous les projets existants
            with engine.connect() as conn:
                try:
                    result = conn.execute(text(f"""
                        SELECT title, source, additional_links, organization, unique_hash 
                        FROM {self.DB_CONFIG['main_table']}
                    """))
                    
                    columns = ['title', 'source', 'additional_links', 'organization', 'unique_hash']
                    existing_projects = pd.DataFrame(result.fetchall(), columns=columns)
                except Exception as e:
                    self.stdout.write(f"⚠️ Table {self.DB_CONFIG['main_table']} vide ou problème: {e}")
                    existing_projects = pd.DataFrame(columns=['title', 'source', 'additional_links', 'organization', 'unique_hash'])

            self.stdout.write(f"🔍 {len(existing_projects)} projets existants dans la base")

            # Analyser chaque projet pour déterminer s'il est nouveau
            truly_new_projects = []
            potential_duplicates = []
            stats_by_source = {'GEF': {'new': 0, 'duplicate': 0}, 'GCF': {'new': 0, 'duplicate': 0}, 
                             'OTHER': {'new': 0, 'duplicate': 0}, 'CLIMATE_FUND': {'new': 0, 'duplicate': 0}}
            
            self.stdout.write("🔍 Analyse des doublons par source...")
            for idx, (_, row) in enumerate(df.iterrows()):
                source = row.get('source', 'OTHER')
                
                # Vérification 1: Hash identique (très fiable)
                if not force_import and row['unique_hash'] in existing_projects['unique_hash'].values:
                    potential_duplicates.append((row['title'][:50], "Hash identique", source))
                    stats_by_source[source]['duplicate'] += 1
                    continue
                
                # Vérification 2: Doublon VRAIMENT évident
                if not force_import:
                    is_duplicate, reason = self.is_truly_duplicate(row, existing_projects, similarity_threshold)
                    if is_duplicate:
                        potential_duplicates.append((row['title'][:50], reason, source))
                        stats_by_source[source]['duplicate'] += 1
                        continue
                
                # Si aucune preuve claire de doublon, on garde le projet
                truly_new_projects.append(row)
                stats_by_source[source]['new'] += 1
                
                # Ajouter temporairement à la liste pour éviter doublons internes
                new_row_df = pd.DataFrame([row[['title', 'source', 'additional_links', 'organization', 'unique_hash']]])
                existing_projects = pd.concat([existing_projects, new_row_df], ignore_index=True)
                
                # Afficher le progrès
                if (idx + 1) % 50 == 0:
                    self.stdout.write(f"   🔍 Vérifié {idx + 1}/{len(df)} éléments...")
            
            # Afficher les résultats de l'analyse par source
            self.stdout.write(f"\n📊 RÉSULTATS PAR SOURCE:")
            for source, stats in stats_by_source.items():
                if stats['new'] > 0 or stats['duplicate'] > 0:
                    source_name = {
                        'GEF': 'GEF (Projets)',
                        'GCF': 'GCF (Projets)', 
                        'OTHER': 'OECD/Autres',
                        'CLIMATE_FUND': 'Climate Funds (Global)'
                    }.get(source, source)
                    self.stdout.write(f"   • {source_name}: {stats['new']} nouveaux, {stats['duplicate']} doublons évités")
            
            if potential_duplicates and not force_import:
                self.stdout.write(f"\n⚠️ {len(potential_duplicates)} doublons évidents évités:")
                for i, (title, reason, source) in enumerate(potential_duplicates[:5], 1):
                    source_name = {
                        'GEF': 'GEF',
                        'GCF': 'GCF', 
                        'OTHER': 'OECD',
                        'CLIMATE_FUND': 'CF'
                    }.get(source, source)
                    self.stdout.write(f"   {i}. [{source_name}] {title}... - {reason}")
                if len(potential_duplicates) > 5:
                    self.stdout.write(f"   ... et {len(potential_duplicates) - 5} autres")
            
            if not truly_new_projects:
                if force_import:
                    self.stdout.write("⚠️ Mode FORCE activé mais aucun élément à traiter")
                else:
                    self.stdout.write("✅ Aucun nouvel élément à importer (tous sont des doublons évidents)")
                return 0

            # Convertir en DataFrame
            new_projects_df = pd.DataFrame(truly_new_projects)
            self.stdout.write(f"\n🆕 {len(new_projects_df)} éléments uniques détectés pour importation")

            # Afficher un aperçu des nouveaux éléments par source
            self.stdout.write(f"\n📋 APERÇU DES NOUVEAUX ÉLÉMENTS:")
            self.stdout.write("-" * 80)
            
            for source in ['CLIMATE_FUND', 'GEF', 'GCF', 'OTHER']:
                source_df = new_projects_df[new_projects_df['source'] == source]
                if len(source_df) > 0:
                    source_name = {
                        'GEF': 'GEF (Projets Mauritanie)',
                        'GCF': 'GCF (Projets Mauritanie)', 
                        'OTHER': 'OECD/Autres (Mauritanie)',
                        'CLIMATE_FUND': 'Climate Funds (Global)'
                    }.get(source, source)
                    
                    self.stdout.write(f"\n🌟 {source_name} - {len(source_df)} éléments:")
                    for i, (_, row) in enumerate(source_df.head(3).iterrows(), 1):
                        title_display = row['title'][:70] if len(row['title']) > 70 else row['title']
                        self.stdout.write(f"   {i}. {title_display}")
                        if row.get('organization'):
                            org_display = row['organization'][:50] if len(row['organization']) > 50 else row['organization']
                            self.stdout.write(f"      Org: {org_display}")
                        funding = row.get('total_funding', '')
                        if funding:
                            funding_display = funding[:30] if len(funding) > 30 else funding
                            self.stdout.write(f"      💰 {funding_display}")
                        self.stdout.write(f"      📊 Score: {row.get('data_completeness_score', 0)}% | Révision: {'Oui' if row.get('needs_review') else 'Non'}")
                    
                    if len(source_df) > 3:
                        self.stdout.write(f"   ... et {len(source_df) - 3} autres éléments")

            # Préparer les colonnes pour l'insertion
            cols_to_insert = [c for c in self.COLUMNS_IN_DB if c in new_projects_df.columns]
            df_to_insert = new_projects_df[cols_to_insert]

            self.stdout.write(f"\n💾 Importation de {len(df_to_insert)} éléments...")

            # Insérer tous les nouveaux éléments par batches pour optimiser
            success_count = 0
            errors = []
            batch_size = 10

            for i in range(0, len(df_to_insert), batch_size):
                batch = df_to_insert.iloc[i:i+batch_size]
                
                try:
                    # Insérer le batch
                    batch.to_sql(
                        name=self.DB_CONFIG['main_table'],
                        con=engine,
                        if_exists='append',
                        index=False,
                        method='multi'
                    )
                    success_count += len(batch)
                    
                    if success_count % 20 == 0:
                        self.stdout.write(f"   ✅ {success_count}/{len(df_to_insert)} éléments importés...")

                except Exception as e:
                    # Si le batch échoue, essayer individuellement
                    for idx, (_, row) in batch.iterrows():
                        try:
                            row.to_frame().T.to_sql(
                                name=self.DB_CONFIG['main_table'],
                                con=engine,
                                if_exists='append',
                                index=False
                            )
                            success_count += 1
                        except Exception as individual_error:
                            error_msg = f"Élément '{row.get('title', 'UNKNOWN')[:30]}...': {str(individual_error)}"
                            errors.append(error_msg)

            # Rapport final détaillé
            self.stdout.write(f"\n📊 RAPPORT FINAL DE COLLECTION:")
            total_processed = len(df)
            total_duplicates = len(potential_duplicates)
            
            self.stdout.write(f"   ✅ Éléments collectés avec succès: {success_count}")
            self.stdout.write(f"   ⚠️ Doublons évidents évités: {total_duplicates}")
            self.stdout.write(f"   📈 Taux de réussite: {success_count}/{total_processed} ({success_count/total_processed*100:.1f}%)")
            
            # Statistiques détaillées par source
            self.stdout.write(f"\n📋 DÉTAIL PAR SOURCE (nouveaux importés):")
            for source, stats in stats_by_source.items():
                if stats['new'] > 0:
                    source_name = {
                        'GEF': 'GEF (Projets Mauritanie)',
                        'GCF': 'GCF (Projets Mauritanie)', 
                        'OTHER': 'OECD/Autres (Mauritanie)',
                        'CLIMATE_FUND': 'Climate Funds (Global)'
                    }.get(source, source)
                    self.stdout.write(f"   • {source_name}: {stats['new']} éléments")
            
            if errors:
                self.stdout.write(f"   ❌ Erreurs: {len(errors)}")
                for error in errors[:3]:
                    self.stdout.write(f"      • {error}")
                if len(errors) > 3:
                    self.stdout.write(f"      ... et {len(errors) - 3} autres erreurs")

            # Statistiques finales
            if success_count > 0:
                self.generate_import_statistics(engine, success_count)

            return success_count

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Erreur de collection: {str(e)}"))
            import traceback
            traceback.print_exc()
            return 0

    def generate_import_statistics(self, engine, new_count):
        """Génère des statistiques après importation avec correction du problème CLIMATE_FU"""
        try:
            with engine.connect() as conn:
                # Statistiques globales
                result = conn.execute(text(f"SELECT COUNT(*) FROM {self.DB_CONFIG['main_table']}"))
                total_count = result.fetchone()[0]
                
                # Par source avec noms explicites
                result = conn.execute(text(f"""
                    SELECT source, COUNT(*) as count, AVG(data_completeness_score) as avg_score
                    FROM {self.DB_CONFIG['main_table']} 
                    GROUP BY source
                """))
                source_stats = result.fetchall()
                
                # Projets récents (dernières 24h)
                result = conn.execute(text(f"""
                    SELECT COUNT(*) FROM {self.DB_CONFIG['main_table']} 
                    WHERE scraped_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                """))
                recent_count = result.fetchone()[0]
                
                # Statistiques spéciales pour Climate Funds
                result = conn.execute(text(f"""
                    SELECT COUNT(*) FROM {self.DB_CONFIG['main_table']} 
                    WHERE source = 'CLIMATE_FUND'
                """))
                climate_funds_count = result.fetchone()[0]

            self.stdout.write(f"\n📈 STATISTIQUES POST-IMPORTATION:")
            self.stdout.write(f"   📊 Total en base: {total_count} éléments")
            self.stdout.write(f"   🆕 Ajoutés aujourd'hui: {recent_count} éléments")
            self.stdout.write(f"   🌍 Fonds climatiques globaux: {climate_funds_count} éléments")
            self.stdout.write(f"   📋 Répartition par source:")
            
            for source, count, avg_score in source_stats:
                source_name = {
                    'GEF': 'GEF (Projets Mauritanie)',
                    'GCF': 'GCF (Projets Mauritanie)', 
                    'OTHER': 'OECD/Autres (Mauritanie)',
                    'CLIMATE_FUND': 'Climate Funds (Global)'
                }.get(source, source)
                self.stdout.write(f"      • {source_name}: {count} éléments (score moyen: {avg_score:.1f}%)")

        except Exception as e:
            self.stdout.write(f"⚠️ Erreur génération stats: {e}")

    def send_notification_email(self, count, recipients, climate_funds_only=False):
        """Envoie un email de notification"""
        try:
            if climate_funds_only:
                subject = f"🌍 {count} nouveaux fonds climatiques globaux importés dans Django ScrapedProject"
            else:
                subject = f"🌱 {count} nouveaux projets/fonds scrapés importés dans Django ScrapedProject"
            
            # Récupérer quelques statistiques pour l'email
            try:
                engine = create_engine(
                    f"mysql+pymysql://{self.DB_CONFIG['user']}:{self.DB_CONFIG['password']}@"
                    f"{self.DB_CONFIG['host']}:{self.DB_CONFIG['port']}/{self.DB_CONFIG['database']}"
                )
                
                with engine.connect() as conn:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {self.DB_CONFIG['main_table']}"))
                    total_count = result.fetchone()[0]
                    
                    result = conn.execute(text(f"""
                        SELECT source, COUNT(*) as count 
                        FROM {self.DB_CONFIG['main_table']} 
                        WHERE scraped_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                        GROUP BY source
                    """))
                    source_counts = dict(result.fetchall())
                    
                    # Compter spécifiquement les Climate Funds
                    result = conn.execute(text(f"""
                        SELECT COUNT(*) FROM {self.DB_CONFIG['main_table']} 
                        WHERE source = 'CLIMATE_FUND'
                    """))
                    climate_funds_total = result.fetchone()[0]
                    
            except Exception:
                total_count = "N/A"
                source_counts = {}
                climate_funds_total = 0
            
            if climate_funds_only:
                message = f"""
🌍 NOUVEAUX FONDS CLIMATIQUES GLOBAUX - COLLECTION SPÉCIALISÉE

📊 COLLECTION RÉUSSIE:
• Nouveaux fonds climatiques collectés: {count}
• Total fonds climatiques en base: {climate_funds_total}
• Total général en base Django: {total_count}
• Modèle: ScrapedProject (main_app_scrapedproject)

🌍 FONDS CLIMATIQUES GLOBAUX:
• Source: Climate Funds Update (climatefundsupdate.org)
• Portée: Fonds disponibles mondialement
• Pertinence: Opportunités de financement pour projets en Mauritanie
• Type: CLIMATE_FUND dans la base de données

🎯 CARACTÉRISTIQUES DES FONDS:
• Score de complétude très élevé (90%+)
• Description avec montants détaillés (Pledged, Deposited, etc.)
• Liens directs vers les pages des fonds
• Marquage spécial [CLIMATE FUND] dans le titre

💻 ACCÈS:
• Admin Django: /admin/main_app/scrapedproject/?source__exact=CLIMATE_FUND
• API REST: /api/scraped-projects/?source=CLIMATE_FUND
• Interface React: Filtrer par source "CLIMATE_FUND"

📝 PROCHAINES ÉTAPES:
1. Explorer les opportunités de financement pour la Mauritanie
2. Analyser les critères d'éligibilité des différents fonds
3. Identifier les fonds les plus pertinents pour vos projets
4. Développer des propositions de projet adaptées

---
Collection spécialisée fonds climatiques globaux
Date: {datetime.now().strftime('%d/%m/%Y %H:%M')}
Base: {self.DB_CONFIG['database']} - Table: {self.DB_CONFIG['main_table']}
                """
            else:
                message = f"""
🌍 NOUVEAUX PROJETS/FONDS SCRAPÉS - MAURITANIE + GLOBAL

📊 COLLECTION RÉUSSIE:
• Nouveaux éléments collectés: {count}
• Total en base Django: {total_count}
• Modèle: ScrapedProject (main_app_scrapedproject)

📈 DÉTAIL PAR SOURCE (dernières 24h):
• GEF (Projets Mauritanie): {source_counts.get('GEF', 0)} projets
• GCF (Projets Mauritanie): {source_counts.get('GCF', 0)} projets  
• OECD/Autres (Mauritanie): {source_counts.get('OTHER', 0)} documents
• Climate Funds (Global): {source_counts.get('CLIMATE_FUND', 0)} fonds

🌍 FONDS CLIMATIQUES GLOBAUX:
• Total fonds en base: {climate_funds_total}
• Source: Climate Funds Update (climatefundsupdate.org)
• Pertinence: Fonds disponibles pour projets en Mauritanie

🎯 SOURCES COLLECTÉES:
• GEF (Global Environment Facility): Projets environnementaux globaux
• GCF (Green Climate Fund): Projets de financement climatique
• OECD: Organisation for Economic Co-operation and Development
• Climate Funds Update: Base de données globale des fonds climatiques

✅ FONCTIONNALITÉS AUTOMATIQUES:
• Score de complétude calculé (0-100%)
• Détection intelligente des doublons
• Marquage automatique des projets nécessitant révision
• Hash unique pour éviter les duplicatas
• Support spécial pour fonds climatiques globaux

💻 ACCÈS:
• Admin Django: /admin/main_app/scrapedproject/
• API REST: /api/scraped-projects/
• Interface React: Composant ScrapedProjectsDisplay
• Filtrage par source: GEF, GCF, OTHER, CLIMATE_FUND

📝 PROCHAINES ÉTAPES:
1. Réviser les projets marqués "needs_review"
2. Vérifier les scores de complétude faibles (<50%)
3. Valider les nouveaux projets GEF/GCF
4. Explorer les opportunités des fonds climatiques globaux

---
Système de collection automatisé - Aucun projet/fonds légitime perdu
Date: {datetime.now().strftime('%d/%m/%Y %H:%M')}
Base: {self.DB_CONFIG['database']} - Table: {self.DB_CONFIG['main_table']}
                """

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipients,
                fail_silently=False
            )
            
            self.stdout.write(f"📧 Email envoyé à {len(recipients)} destinataire(s)")
            
        except Exception as e:
            self.stdout.write(f"⚠️ Échec envoi email: {str(e)}")


# Fonctions utilitaires pour usage externe
def run_simple_collection(email_recipients=None, similarity_threshold=0.98, force_import=False, skip_climate_funds=False):
    """Fonction utilitaire pour lancer la collection simple"""
    command = Command()
    
    class MockOptions:
        def get(self, key, default=None):
            options_dict = {
                'email_recipients': email_recipients or 'nrabdallh95@gmail.com,22056@supnum.mr',
                'similarity_threshold': similarity_threshold,
                'force_import': force_import,
                'dry_run': False,
                'skip_climate_funds': skip_climate_funds,
                'climate_funds_only': False
            }
            return options_dict.get(key, default)
    
    options = MockOptions()
    command.handle(options=options)

def run_dry_run_collection(skip_climate_funds=False):
    """Fonction pour simulation sans importation"""
    command = Command()
    
    class MockOptions:
        def get(self, key, default=None):
            options_dict = {
                'email_recipients': 'nrabdallh95@gmail.com',
                'similarity_threshold': 0.98,
                'force_import': False,
                'dry_run': True,
                'skip_climate_funds': skip_climate_funds,
                'climate_funds_only': False
            }
            return options_dict.get(key, default)
    
    options = MockOptions()
    command.handle(options=options)

def run_climate_funds_only():
    """Fonction pour collecter seulement les fonds climatiques globaux"""
    command = Command()
    
    class MockOptions:
        def get(self, key, default=None):
            options_dict = {
                'email_recipients': 'nrabdallh95@gmail.com,22056@supnum.mr',
                'similarity_threshold': 0.98,
                'force_import': False,
                'dry_run': False,
                'skip_climate_funds': False,
                'climate_funds_only': True
            }
            return options_dict.get(key, default)
    
    options = MockOptions()
    command.handle(options=options)

if __name__ == "__main__":
    # Collection complète par défaut (projets + fonds climatiques)
    print("🚀 Lancement de la collection GEF-GCF-OECD + Climate Funds...")
    print("💡 Modes disponibles:")
    print("   1. run_simple_collection() - Collection complète (projets + fonds)")
    print("   2. run_simple_collection(skip_climate_funds=True) - Seulement projets")
    print("   3. run_climate_funds_only() - Seulement fonds climatiques globaux")
    print("   4. run_dry_run_collection() - Simulation sans import")
    print("   5. run_simple_collection(force_import=True) - Force l'import")
    
    # Lancer la collection complète
    run_simple_collection(similarity_threshold=0.98, skip_climate_funds=False)