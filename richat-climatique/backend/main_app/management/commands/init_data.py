# =============================================================================
# FICHIER: main_app/management/commands/init_data.py
# =============================================================================
from django.core.management.base import BaseCommand
from main_app.models import CustomUser, DocumentType, Project, Notification

class Command(BaseCommand):
    help = 'Initialise les données de base pour l\'application'

    def handle(self, *args, **options):
        self.stdout.write('🚀 Initialisation des données...')
        
        # =============================================================================
        # CRÉER LES TYPES DE DOCUMENTS
        # =============================================================================
        document_types = [
            {'name': 'Statuts juridiques', 'description': 'Statuts de l\'organisation', 'obligatoire': True},
            {'name': 'Budget prévisionnel', 'description': 'Budget détaillé du projet', 'obligatoire': True},
            {'name': 'Business plan', 'description': 'Plan d\'affaires complet', 'obligatoire': True},
            {'name': 'Pitch deck', 'description': 'Présentation du projet', 'obligatoire': True},
            {'name': 'Lettre d\'intention', 'description': 'Lettre d\'intention du partenaire', 'obligatoire': True},
            {'name': 'Étude de faisabilité', 'description': 'Étude technique et financière', 'obligatoire': True},
            {'name': 'Annexes techniques', 'description': 'Documents techniques supplémentaires', 'obligatoire': False},
            {'name': 'Preuves de cofinancement', 'description': 'Justificatifs de cofinancement', 'obligatoire': True},
            {'name': 'Relevé d\'identité bancaire', 'description': 'RIB de l\'organisation', 'obligatoire': True},
            {'name': 'Identité du représentant légal', 'description': 'Pièce d\'identité du représentant', 'obligatoire': True},
        ]

        for doc_type_data in document_types:
            doc_type, created = DocumentType.objects.get_or_create(
                name=doc_type_data['name'],
                defaults=doc_type_data
            )
            if created:
                self.stdout.write(f'✅ Type de document créé: {doc_type.name}')

        # =============================================================================
        # CRÉER UN UTILISATEUR ADMIN
        # =============================================================================
        if not CustomUser.objects.filter(username='admin').exists():
            admin_user = CustomUser.objects.create_superuser(
                username='admin',
                email='admin@richat-partners.com',
                password='admin123',
                first_name='Admin',
                last_name='Richat',
                level='N4',
                department='Administration'
            )
            self.stdout.write(f'👤 Utilisateur admin créé: {admin_user.username}')

        # =============================================================================
        # CRÉER DES CONSULTANTS DE TEST
        # =============================================================================
        consultants_data = [
            {
                'username': 'aminetou.khalef',
                'email': 'aminetou@richat-partners.com',
                'first_name': 'Aminetou',
                'last_name': 'EL KHALEF',
                'level': 'N2',
                'password': 'consultant123'
            },
            {
                'username': 'fatima.bint',
                'email': 'fatima@richat-partners.com', 
                'first_name': 'Fatima',
                'last_name': 'BINT',
                'level': 'N3',
                'password': 'consultant123'
            }
        ]

        for consultant_data in consultants_data:
            if not CustomUser.objects.filter(username=consultant_data['username']).exists():
                CustomUser.objects.create_user(**consultant_data)
                self.stdout.write(f'👨‍💼 Consultant créé: {consultant_data["first_name"]} {consultant_data["last_name"]}')

        # =============================================================================
        # CRÉER DES PROJETS DE TEST
        # =============================================================================
        aminetou = CustomUser.objects.filter(username='aminetou.khalef').first()
        fatima = CustomUser.objects.filter(username='fatima.bint').first()

        projects_data = [
            {
                'name': 'Association Verte Mauritanie',
                'description': 'Projet de développement durable en Mauritanie',
                'type_project': 'etat',
                'status': 'progress',
                'fund': 'GCF_SAP',
                'score_viabilite': 65,
                'montant_demande': 500000,
                'contact_name': 'Aminata Sow',
                'contact_email': 'aminata@exemple.com',
                'consultant': aminetou
            },
            {
                'name': 'Coopérative des Pêcheurs',
                'description': 'Projet de pêche durable',
                'type_project': 'prive',
                'status': 'ready',
                'fund': 'GEF_LDCF',
                'score_viabilite': 95,
                'montant_demande': 750000,
                'contact_name': 'Mohamed Vall',
                'contact_email': 'mohamed@exemple.com',
                'consultant': fatima
            },
            {
                'name': 'Initiative Jeunesse Climat',
                'description': 'Programme pour la jeunesse',
                'type_project': 'institution',
                'status': 'progress',
                'fund': 'CIF',
                'score_viabilite': 75,
                'montant_demande': 300000,
                'contact_name': 'Oumar Ba',
                'contact_email': 'oumar@exemple.com',
                'consultant': aminetou
            }
        ]

        for project_data in projects_data:
            project, created = Project.objects.get_or_create(
                name=project_data['name'],
                defaults=project_data
            )
            if created:
                self.stdout.write(f'📁 Projet créé: {project.name}')

        # =============================================================================
        # CRÉER DES NOTIFICATIONS DE TEST
        # =============================================================================
        if aminetou and fatima:
            notifications_data = [
                {
                    'type': 'document',
                    'title': 'Nouveau document soumis',
                    'message': 'EcoTech Mauritanie - Il y a 2 heures',
                    'consultant': aminetou
                },
                {
                    'type': 'success',
                    'title': 'Dossier prêt pour soumission',
                    'message': 'Association Verte - Il y a 1 jour',
                    'consultant': fatima
                },
                {
                    'type': 'warning',
                    'title': 'Document expiré',
                    'message': 'Startup Solaire - Il y a 3 jours',
                    'consultant': aminetou
                }
            ]

            for notif_data in notifications_data:
                notif, created = Notification.objects.get_or_create(
                    title=notif_data['title'],
                    consultant=notif_data['consultant'],
                    defaults=notif_data
                )
                if created:
                    self.stdout.write(f'🔔 Notification créée: {notif.title}')

        self.stdout.write(
            self.style.SUCCESS('🎉 Données initialisées avec succès!')
        )
        
        self.stdout.write('\n📋 Comptes créés:')
        self.stdout.write('   Admin: admin / admin123')
        self.stdout.write('   Consultant: aminetou.khalef / consultant123')
        self.stdout.write('   Consultant: fatima.bint / consultant123')
        self.stdout.write('\n🌐 Accès:')
        self.stdout.write('   Admin: http://localhost:8000/admin/')
        self.stdout.write('   API: http://localhost:8000/api/')
        self.stdout.write('   Frontend: http://localhost:3000/')