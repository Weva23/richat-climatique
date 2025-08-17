from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import getpass

User = get_user_model()

class Command(BaseCommand):
    help = 'Créer un compte administrateur de manière sécurisée'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help='Nom d\'utilisateur admin')
        parser.add_argument('--email', type=str, help='Email admin')
        parser.add_argument('--first-name', type=str, help='Prénom')
        parser.add_argument('--last-name', type=str, help='Nom')

    def handle(self, *args, **options):
        username = options['username'] or input('Nom d\'utilisateur admin: ')
        email = options['email'] or input('Email admin: ')
        first_name = options['first_name'] or input('Prénom: ')
        last_name = options['last_name'] or input('Nom: ')
        
        password = getpass.getpass('Mot de passe admin: ')
        password_confirm = getpass.getpass('Confirmer le mot de passe: ')
        
        if password != password_confirm:
            self.stdout.write(self.style.ERROR('Les mots de passe ne correspondent pas'))
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.ERROR(f'L\'utilisateur {username} existe déjà'))
            return

        admin_user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='admin',
            level='N4',
            department='Administration',
            is_staff=True,
            is_superuser=True,
            actif=True,
            email_verified=True
        )

        self.stdout.write(
            self.style.SUCCESS(f'✅ Administrateur {admin_user.full_name} créé avec succès!')
        )