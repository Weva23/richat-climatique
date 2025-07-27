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


class Command(BaseCommand):
    help = "Importation complète des projets GEF et GCF - Collection directe sans perte de projets"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.DB_CONFIG = {
            'user': 'root',
            'password': '',
            'host': 'localhost',
            'port': '3306',
            'database': 'richat_funding_db',
            'main_table': 'gefgcf',
            'notification_table': 'notifications'
        }

        self.SCRAPED_DATA_DIR = Path(settings.BASE_DIR) / 'scraped_data'
        self.FICHIERS_PROJETS = [
            self.SCRAPED_DATA_DIR / 'GEF_Mauritanie_Projects.xlsx',
            self.SCRAPED_DATA_DIR / 'GCF_Mauritanie_Projects.xlsx',
        ]

        # Colonnes de la table gefgcf
        self.COLUMNS_IN_DB = [
            'titre', 'type_projet', 'document_url', 'nom_site', 
            'organisation', 'lien_projet', 'description', 
            'cofinancement_total', 'source', 'hash_unique', 
            'created_at', 'updated_at'
        ]

        # Colonnes de la table notifications
        self.NOTIFICATION_COLUMNS = [
            'titre', 'source', 'organisation', 'type_projet',
            'cofinancement_total', 'date_notification', 'niveau_notification'
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

    def handle(self, *args, **options):
        email_recipients = options.get('email_recipients', 'nrabdallh95@gmail.com,22056@supnum.mr').split(',')
        similarity_threshold = options.get('similarity_threshold', 0.98)
        
        self.stdout.write("🚀 Collection directe des projets GEF-GCF dans la base de données")
        self.stdout.write("=" * 80)
        self.stdout.write("🎯 CIBLE: Base de données 'richat_funding_db' - Table 'gefgcf'")
        self.stdout.write("🔍 SOURCES: Fichiers Excel GEF et GCF")
        self.stdout.write("✅ STRATÉGIE: Éviter les doublons SANS perdre de projets légitimes")
        self.stdout.write("🔔 NOTIFICATIONS: Email automatique + table notifications")
        self.stdout.write(f"📊 SEUIL SIMILARITÉ: {similarity_threshold:.0%} (très strict)")
        self.stdout.write("=" * 80)

        # Afficher les chemins de fichiers pour debug
        self.stdout.write(f"📁 Répertoire de données: {self.SCRAPED_DATA_DIR}")
        for fichier in self.FICHIERS_PROJETS:
            status = "✅ EXISTE" if fichier.exists() else "❌ MANQUANT"
            self.stdout.write(f"   • {fichier.name}: {status}")

        # Étape 1: Chargement et validation des fichiers
        dfs = self.load_and_validate_files()
        if not dfs:
            self.stdout.write("❌ Aucun fichier valide trouvé")
            return

        # Étape 2: Traitement des données
        df_final = self.process_data(pd.concat(dfs, ignore_index=True))
        
        # Étape 3: Importation intelligente sans perte
        new_projects = self.import_data_without_losing_projects(df_final, similarity_threshold)
        
        # Étape 4: Notifications
        if new_projects > 0:
            self.send_notification_email(new_projects, email_recipients)

        self.stdout.write("🎉 Collection terminée avec succès!")

    def load_and_validate_files(self):
        """Charge et valide les fichiers Excel"""
        dfs = []
        
        for file_path in self.FICHIERS_PROJETS:
            try:
                if not file_path.exists():
                    self.stdout.write(f"⚠️ Fichier introuvable: {file_path.name}")
                    continue

                df = pd.read_excel(file_path, engine='openpyxl')
                if df.empty:
                    self.stdout.write(f"⚠️ Fichier vide: {file_path.name}")
                    continue

                # Déterminer la source depuis le nom du fichier
                source = 'GEF' if 'GEF' in file_path.name else 'GCF'
                df['source'] = source

                df = self.prepare_dataframe(df)
                dfs.append(df)
                self.stdout.write(f"✅ {file_path.name} chargé ({len(df)} lignes) - Source: {source}")

            except Exception as e:
                self.stdout.write(f"❌ Erreur avec {file_path.name}: {str(e)}")
                continue

        return dfs if dfs else None

    def prepare_dataframe(self, df):
        """Prépare le DataFrame avec le mapping des colonnes"""
        
        # Mapping des colonnes vers le schéma de la DB
        mapping = {
            'Titre': 'titre',
            'Type': 'type_projet', 
            'Document': 'document_url',
            'nom_site': 'nom_site',
            'Organisation': 'organisation',
            'Lien': 'lien_projet',
            'Description': 'description',
            'Cofinancement Total': 'cofinancement_total',
            'source': 'source'
        }

        # Renommer les colonnes
        df = df.rename(columns={k: v for k, v in mapping.items() if k in df.columns})

        # Nettoyer les données de manière très douce pour ne rien perdre
        for col in df.columns:
            if col in df.select_dtypes(include=['object']).columns:
                df[col] = df[col].astype(str).str.strip()
                # Remplacer seulement les vraies valeurs vides
                df[col] = df[col].replace(['nan', 'None', 'NaN', 'null', 'NULL'], '')

        return df

    def normalize_text_gentle(self, text):
        """Normalise le texte de manière douce pour comparaison"""
        if not text or str(text).lower() in ['', 'nan', 'none', 'null']:
            return ''
        
        text = str(text).strip().lower()
        # Normaliser les espaces multiples seulement
        text = ' '.join(text.split())
        return text

    def normalize_amount_gentle(self, amount_str):
        """Normalise les montants de manière douce"""
        if not amount_str or str(amount_str).lower() in ['', 'nan', 'none', 'null']:
            return ''
        
        # Garder le texte original mais normaliser les espaces
        normalized = str(amount_str).strip()
        normalized = ' '.join(normalized.split())
        return normalized

    def generate_smart_hash(self, row):
        """Génère un hash intelligent basé sur les champs les plus discriminants"""
        # Utiliser seulement les champs les plus fiables pour le hash
        key_fields = [
            self.normalize_text_gentle(row.get('titre', '')),
            str(row.get('source', '')).strip().upper(),
            str(row.get('lien_projet', '')).strip(),
            self.normalize_text_gentle(row.get('nom_site', ''))
        ]
        
        # Créer une chaîne unique et la hasher
        unique_string = '|'.join(key_fields)
        return hashlib.md5(unique_string.encode('utf-8')).hexdigest()

    def is_truly_duplicate(self, new_project, existing_projects_df, similarity_threshold=0.98):
        """Vérifie si c'est un VRAI doublon avec seuil très strict"""
        if existing_projects_df.empty:
            return False, None
        
        new_titre = self.normalize_text_gentle(new_project.get('titre', ''))
        new_source = str(new_project.get('source', '')).strip().upper()
        new_link = str(new_project.get('lien_projet', '')).strip()
        new_site = self.normalize_text_gentle(new_project.get('nom_site', ''))
        
        for idx, existing in existing_projects_df.iterrows():
            existing_titre = self.normalize_text_gentle(existing.get('titre', ''))
            existing_source = str(existing.get('source', '')).strip().upper()
            existing_link = str(existing.get('lien_projet', '')).strip()
            existing_site = self.normalize_text_gentle(existing.get('nom_site', ''))
            
            # Vérification 1: Lien exact ET même source (très fiable)
            if (new_source == existing_source and 
                new_link and existing_link and len(new_link) > 20 and 
                new_link == existing_link):
                return True, f"Lien identique pour même source: {new_link[:50]}..."
            
            # Vérification 2: Titre quasi-identique ET même source ET même site
            if (new_source == existing_source and 
                new_site == existing_site and 
                new_titre and existing_titre and len(new_titre) > 10):
                
                titre_similarity = SequenceMatcher(None, new_titre, existing_titre).ratio()
                if titre_similarity >= similarity_threshold:
                    return True, f"Titre très similaire ({titre_similarity:.1%}) même source/site: '{existing_titre[:50]}...'"
        
        return False, None

    def process_data(self, df):
        """Traite et nettoie les données avec approche conservative"""
        self.stdout.write(f"\n📊 Traitement de {len(df)} projets...")

        # Nettoyer les données de manière très conservative
        df['titre'] = df['titre'].astype(str).str.strip()
        
        # Supprimer seulement les lignes vraiment invalides (très permissif)
        df = df[df['titre'].str.len() > 2]  # Très permissif: 2 caractères minimum
        df = df[~df['titre'].str.contains('^(nan|None|null|NaN)$', case=False, na=False)]

        # Remplacer les NaN par des chaînes vides
        df = df.fillna('')

        # Générer le hash unique pour chaque projet
        df['hash_unique'] = df.apply(self.generate_smart_hash, axis=1)

        # Ajouter les timestamps
        df['created_at'] = datetime.now()
        df['updated_at'] = datetime.now()

        self.stdout.write(f"✅ {len(df)} projets valides après nettoyage (approche conservative)")
        
        # Statistiques par source
        gef_count = len(df[df['source'] == 'GEF'])
        gcf_count = len(df[df['source'] == 'GCF'])
        self.stdout.write(f"   - Projets GEF: {gef_count}")
        self.stdout.write(f"   - Projets GCF: {gcf_count}")

        return df

    def import_data_without_losing_projects(self, df, similarity_threshold):
        """Importe les données en évitant les doublons SANS perdre de projets légitimes"""
        try:
            # Connexion à la base de données
            engine = create_engine(
                f"mysql+pymysql://{self.DB_CONFIG['user']}:{self.DB_CONFIG['password']}@"
                f"{self.DB_CONFIG['host']}:{self.DB_CONFIG['port']}/{self.DB_CONFIG['database']}"
            )

            self.stdout.write(f"\n💾 Connexion à la base de données: {self.DB_CONFIG['database']}")

            # Créer les tables si elles n'existent pas
            self.create_tables_if_not_exist(engine)

            # Récupérer tous les projets existants (seulement les champs nécessaires)
            with engine.connect() as conn:
                result = conn.execute(text(f"""
                    SELECT titre, source, lien_projet, nom_site, hash_unique 
                    FROM {self.DB_CONFIG['main_table']}
                """))
                
                columns = ['titre', 'source', 'lien_projet', 'nom_site', 'hash_unique']
                existing_projects = pd.DataFrame(result.fetchall(), columns=columns)

            self.stdout.write(f"🔍 {len(existing_projects)} projets existants dans la base")

            # Stratégie: Être TRÈS conservateur sur ce qui constitue un doublon
            truly_new_projects = []
            potential_duplicates = []
            
            for idx, (_, row) in enumerate(df.iterrows()):
                
                # Vérification 1: Hash identique (très fiable)
                if row['hash_unique'] in existing_projects['hash_unique'].values:
                    potential_duplicates.append((row['titre'][:50], "Hash identique"))
                    continue
                
                # Vérification 2: Doublon VRAIMENT évident
                is_duplicate, reason = self.is_truly_duplicate(row, existing_projects, similarity_threshold)
                if is_duplicate:
                    potential_duplicates.append((row['titre'][:50], reason))
                    continue
                
                # Si aucune preuve claire de doublon, on garde le projet
                truly_new_projects.append(row)
                
                # Ajouter temporairement à la liste pour éviter doublons internes
                new_row_df = pd.DataFrame([row[['titre', 'source', 'lien_projet', 'nom_site', 'hash_unique']]])
                existing_projects = pd.concat([existing_projects, new_row_df], ignore_index=True)
                
                # Afficher le progrès
                if (idx + 1) % 20 == 0:
                    self.stdout.write(f"   🔍 Vérifié {idx + 1}/{len(df)} projets...")
            
            # Afficher les doublons évidents détectés
            if potential_duplicates:
                self.stdout.write(f"\n⚠️ {len(potential_duplicates)} doublons évidents évités:")
                for i, (title, reason) in enumerate(potential_duplicates[:3], 1):
                    self.stdout.write(f"   {i}. {title}... - {reason}")
                if len(potential_duplicates) > 3:
                    self.stdout.write(f"   ... et {len(potential_duplicates) - 3} autres")
            
            if not truly_new_projects:
                self.stdout.write("✅ Aucun nouveau projet à importer (tous sont des doublons évidents)")
                return 0

            # Convertir en DataFrame
            new_projects_df = pd.DataFrame(truly_new_projects)
            self.stdout.write(f"\n🆕 {len(new_projects_df)} projets uniques détectés pour importation")

            # Afficher aperçu complet des nouveaux projets
            self.stdout.write("\n📋 TOUS LES NOUVEAUX PROJETS:")
            self.stdout.write("-" * 70)
            for i, (_, row) in enumerate(new_projects_df.iterrows(), 1):
                self.stdout.write(f"{i:2d}. [{row['source']}] {row['titre'][:60]}...")
                if row.get('organisation'):
                    self.stdout.write(f"     Org: {row['organisation'][:40]}...")
                if row.get('nom_site'):
                    self.stdout.write(f"     Site: {row['nom_site']}")

            # Préparer les colonnes pour l'insertion
            cols_to_insert = [c for c in self.COLUMNS_IN_DB if c in new_projects_df.columns]
            df_to_insert = new_projects_df[cols_to_insert]

            # Insérer tous les nouveaux projets
            success_count = 0
            notification_count = 0
            errors = []

            for i, (_, row) in enumerate(df_to_insert.iterrows(), 1):
                try:
                    # Vérification finale minimale
                    if not row.get('titre') or len(str(row.get('titre', '')).strip()) < 2:
                        errors.append(f"Titre trop court: '{row.get('titre', '')}'")
                        continue

                    # Insérer le projet
                    row.to_frame().T.to_sql(
                        name=self.DB_CONFIG['main_table'],
                        con=engine,
                        if_exists='append',
                        index=False
                    )
                    success_count += 1

                    # Créer une notification
                    self.create_notification(engine, row)
                    notification_count += 1

                    if success_count % 3 == 0:
                        self.stdout.write(f"   ✅ {success_count}/{len(df_to_insert)} projets importés...")

                except Exception as e:
                    error_msg = f"Projet '{row.get('titre', 'UNKNOWN')[:30]}...': {str(e)}"
                    errors.append(error_msg)
                    self.stdout.write(f"   ⚠️ {error_msg}")

            # Rapport final
            self.stdout.write(f"\n📊 RAPPORT FINAL DE COLLECTION:")
            self.stdout.write(f"   ✅ Projets collectés avec succès: {success_count}")
            self.stdout.write(f"   🔔 Notifications créées: {notification_count}")
            self.stdout.write(f"   ⚠️ Doublons évidents évités: {len(potential_duplicates)}")
            self.stdout.write(f"   📈 Taux de réussite: {success_count}/{len(df)} ({success_count/len(df)*100:.1f}%)")
            
            if errors:
                self.stdout.write(f"   ❌ Erreurs mineures: {len(errors)}")

            return success_count

        except Exception as e:
            self.stdout.write(f"❌ Erreur de collection: {str(e)}")
            import traceback
            traceback.print_exc()
            return 0

    def create_tables_if_not_exist(self, engine):
        """Crée les tables si elles n'existent pas"""
        
        # Table principale gefgcf
        create_main_table = f"""
        CREATE TABLE IF NOT EXISTS {self.DB_CONFIG['main_table']} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titre VARCHAR(500) NOT NULL,
            type_projet VARCHAR(200),
            document_url TEXT,
            nom_site VARCHAR(100),
            organisation VARCHAR(200),
            lien_projet TEXT,
            description TEXT,
            cofinancement_total VARCHAR(100),
            source ENUM('GEF', 'GCF') NOT NULL,
            hash_unique VARCHAR(32) UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_source (source),
            INDEX idx_organisation (organisation),
            INDEX idx_hash (hash_unique),
            INDEX idx_created (created_at),
            INDEX idx_titre (titre(100)),
            INDEX idx_nom_site (nom_site)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """

        # Table des notifications
        create_notification_table = f"""
        CREATE TABLE IF NOT EXISTS {self.DB_CONFIG['notification_table']} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titre VARCHAR(500) NOT NULL,
            source ENUM('GEF', 'GCF') NOT NULL,
            organisation VARCHAR(200),
            type_projet VARCHAR(200),
            cofinancement_total VARCHAR(100),
            niveau_notification ENUM('NOUVEAU', 'IMPORTANT', 'CRITIQUE') DEFAULT 'NOUVEAU',
            date_notification DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_source_notif (source),
            INDEX idx_date_notif (date_notification),
            INDEX idx_niveau (niveau_notification)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """

        with engine.connect() as conn:
            conn.execute(text(create_main_table))
            conn.execute(text(create_notification_table))
            conn.commit()

        self.stdout.write("✅ Tables créées/vérifiées")

    def create_notification(self, engine, project_row):
        """Crée une notification pour le nouveau projet"""
        
        # Déterminer le niveau de notification
        niveau = self.determine_notification_level(project_row)
        
        notification_data = {
            'titre': project_row['titre'],
            'source': project_row['source'],
            'organisation': project_row.get('organisation', ''),
            'type_projet': project_row.get('type_projet', ''),
            'cofinancement_total': project_row.get('cofinancement_total', ''),
            'niveau_notification': niveau,
            'date_notification': datetime.now()
        }

        # Insérer la notification
        df_notif = pd.DataFrame([notification_data])
        df_notif.to_sql(
            name=self.DB_CONFIG['notification_table'],
            con=engine,
            if_exists='append',
            index=False
        )

    def determine_notification_level(self, project_row):
        """Détermine le niveau de notification basé sur les critères du projet"""
        
        titre = str(project_row.get('titre', '')).lower()
        cofinancement = str(project_row.get('cofinancement_total', '')).lower()
        description = str(project_row.get('description', '')).lower()
        
        # Critères pour niveau CRITIQUE
        critical_keywords = ['urgent', 'emergency', 'crisis', 'climate change', 'adaptation', 'disaster']
        if any(keyword in titre or keyword in description for keyword in critical_keywords):
            return 'CRITIQUE'
        
        # Critères pour niveau IMPORTANT
        important_keywords = ['infrastructure', 'renewable', 'sustainable', 'environment', 'green', 'energy']
        large_amount = any(keyword in cofinancement for keyword in ['million', 'billion'])
        
        if large_amount or any(keyword in titre for keyword in important_keywords):
            return 'IMPORTANT'
        
        # Par défaut : NOUVEAU
        return 'NOUVEAU'

    def send_notification_email(self, count, recipients):
        """Envoie un email de notification"""
        try:
            # Récupérer les statistiques pour le résumé
            engine = create_engine(
                f"mysql+pymysql://{self.DB_CONFIG['user']}:{self.DB_CONFIG['password']}@"
                f"{self.DB_CONFIG['host']}:{self.DB_CONFIG['port']}/{self.DB_CONFIG['database']}"
            )

            with engine.connect() as conn:
                # Derniers projets par source
                result = conn.execute(text(f"""
                    SELECT source, COUNT(*) as count 
                    FROM {self.DB_CONFIG['main_table']} 
                    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
                    GROUP BY source
                """))
                source_counts = dict(result.fetchall())

                # Total projets
                result = conn.execute(text(f"SELECT COUNT(*) FROM {self.DB_CONFIG['main_table']}"))
                total_count = result.fetchone()[0]

            # Construire le message
            subject = f"🌱 {count} nouveaux projets de financement vert collectés"
            
            message = f"""
🌍 NOUVEAUX PROJETS DE FINANCEMENT VERT - MAURITANIE

📊 COLLECTION RÉUSSIE:
• Nouveaux projets collectés: {count}
• Projets GEF: {source_counts.get('GEF', 0)}
• Projets GCF: {source_counts.get('GCF', 0)}
• Total en base: {total_count}

✅ GARANTIE AUCUNE PERTE:
• Approche conservative pour éviter de perdre des projets légitimes
• Seuil de similarité strict (98%) pour détecter seulement les vrais doublons
• Vérification basée sur titre + source + site + lien

🎯 SOURCES:
• GEF (Global Environment Facility): Projets environnementaux globaux
• GCF (Green Climate Fund): Projets de financement climatique

💻 Connectez-vous à la plateforme pour consulter tous les projets.

---
Système de collection optimisé - Aucun projet légitime perdu
Date: {datetime.now().strftime('%d/%m/%Y %H:%M')}
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
def run_simple_collection(email_recipients=None, similarity_threshold=0.98):
    """Fonction utilitaire pour lancer la collection simple"""
    command = Command()
    
    class MockOptions:
        def get(self, key, default=None):
            options_dict = {
                'email_recipients': email_recipients or 'nrabdallh95@gmail.com,22056@supnum.mr',
                'similarity_threshold': similarity_threshold
            }
            return options_dict.get(key, default)
    
    options = MockOptions()
    command.handle(options=options)

if __name__ == "__main__":
    # Collection simple et sûre
    run_simple_collection(similarity_threshold=0.98)