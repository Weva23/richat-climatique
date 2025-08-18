# =============================================================================
# FICHIER: main_app/views.py - SYNTAXE CORRIGÉE
# =============================================================================
from datetime import timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import models
from django.core.management import call_command
from django.utils import timezone
from django.contrib.auth import authenticate
import logging
from .models import ProjectAlert
from .serializers import ProjectAlertSerializer

from .models import (
    CustomUser, Project, Document, DocumentType, Notification,
    ScrapedProject, ScrapingSession, ProjectRequest
)
from .serializers import (
    UserSerializer, UserProfileSerializer, ProjectSerializer,
    ProjectCreateUpdateSerializer, DocumentSerializer, DocumentTypeSerializer,
    NotificationSerializer, ScrapedProjectSerializer, ScrapingSessionSerializer,
    ScrapedProjectCreateProjectSerializer, DashboardStatsSerializer,
    ScrapedProjectStatsSerializer, UserRegistrationSerializer, UserLoginSerializer,
    ProjectRequestSerializer, ProjectRequestCreateSerializer
)

logger = logging.getLogger(__name__)

# =============================================================================
# VUES D'AUTHENTIFICATION
# =============================================================================
class RegisterView(APIView):
    """Vue pour l'inscription - CLIENTS UNIQUEMENT"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            serializer = UserRegistrationSerializer(data=request.data)
            
            if serializer.is_valid():
                # Créer l'utilisateur (automatiquement client)
                user = serializer.save()
                
                # Créer le token
                token, created = Token.objects.get_or_create(user=user)
                
                logger.info(f"Nouveau client inscrit: {user.username} - {user.company_name}")
                
                return Response({
                    'message': f'Bienvenue {user.full_name}! Votre compte client a été créé avec succès.',
                    'token': token.key,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'full_name': user.full_name,
                        'role': user.role,
                        'role_display': user.get_role_display(),
                        'is_admin': False,
                        'is_client': True,
                        'company_name': user.company_name,
                        'level': user.level
                    },
                    'redirect_url': '/client-dashboard'
                }, status=status.HTTP_201_CREATED)
            
            return Response({
                'error': 'Données invalides',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Erreur lors de l'inscription: {e}")
            return Response({
                'error': 'Erreur interne du serveur'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LoginView(APIView):
    """Vue pour la connexion"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            serializer = UserLoginSerializer(data=request.data)
            
            if serializer.is_valid():
                user = serializer.validated_data['user']
                
                # Mettre à jour la dernière connexion
                user.last_login = timezone.now()
                
                # Enregistrer l'IP de connexion
                x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                if x_forwarded_for:
                    ip = x_forwarded_for.split(',')[0]
                else:
                    ip = request.META.get('REMOTE_ADDR')
                user.last_login_ip = ip
                
                user.save(update_fields=['last_login', 'last_login_ip'])
                
                # Créer ou récupérer le token
                token, created = Token.objects.get_or_create(user=user)
                
                logger.info(f"Connexion réussie: {user.username} ({user.get_role_display()}) depuis {ip}")
                
                # Déterminer l'URL de redirection selon le rôle
                redirect_url = '/admin-dashboard' if user.is_admin else '/client-dashboard'
                
                return Response({
                    'message': f'Bienvenue {user.full_name}',
                    'token': token.key,
                    'user': UserProfileSerializer(user).data,
                    'redirect_url': redirect_url
                }, status=status.HTTP_200_OK)
            
            return Response({
                'error': 'Identifiants incorrects',
                'details': serializer.errors
            }, status=status.HTTP_401_UNAUTHORIZED)
            
        except Exception as e:
            logger.error(f"Erreur lors de la connexion: {e}")
            return Response({
                'error': 'Erreur interne du serveur'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LogoutView(APIView):
    """Vue pour la déconnexion"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Supprimer le token
            request.user.auth_token.delete()
            
            logger.info(f"Déconnexion: {request.user.username}")
            
            return Response({
                'message': 'Déconnexion réussie'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur lors de la déconnexion: {e}")
            return Response({
                'error': 'Erreur lors de la déconnexion'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProfileView(APIView):
    """Vue pour le profil utilisateur"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Récupérer le profil"""
        try:
            serializer = UserProfileSerializer(request.user)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Erreur récupération profil: {e}")
            return Response({
                'error': 'Erreur lors de la récupération du profil'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request):
        """Mettre à jour le profil"""
        try:
            serializer = UserProfileSerializer(
                request.user, 
                data=request.data, 
                partial=True
            )
            
            if serializer.is_valid():
                serializer.save()
                logger.info(f"Profil mis à jour: {request.user.username}")
                return Response({
                    'message': 'Profil mis à jour avec succès',
                    'user': serializer.data
                })
            
            return Response({
                'error': 'Données invalides',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Erreur mise à jour profil: {e}")
            return Response({
                'error': 'Erreur lors de la mise à jour'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Vue de vérification du rôle
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_user_role(request):
    """Vérifier le rôle de l'utilisateur"""
    return Response({
        'role': request.user.role,
        'is_admin': request.user.is_admin,
        'is_client': request.user.is_client,
        'redirect_url': '/admin-dashboard' if request.user.is_admin else '/client-dashboard'
    })

# =============================================================================
# VUES DE TEST POUR DEBUG
# =============================================================================
@api_view(['GET'])
@permission_classes([AllowAny])
def auth_test(request):
    """Vue de test pour vérifier l'authentification"""
    return Response({
        'message': 'Auth endpoint accessible',
        'authenticated': request.user.is_authenticated,
        'user': request.user.username if request.user.is_authenticated else None,
        'method': request.method,
        'headers': dict(request.headers)
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def auth_debug(request):
    """Vue de debug pour tester l'authentification"""
    return Response({
        'message': 'Debug auth endpoint',
        'data_received': request.data,
        'content_type': request.content_type,
        'method': request.method,
    })

# =============================================================================
# VIEWSETS POUR LES CONSULTANTS
# =============================================================================
class ConsultantViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les consultants"""
    serializer_class = UserSerializer
    permission_classes = [AllowAny]  # Temporaire pour debug
    
    def get_queryset(self):
        return CustomUser.objects.filter(actif=True).annotate(
            active_projects_count=models.Count(
                'projects', 
                filter=models.Q(projects__status__in=['progress', 'ready'])
            )
        )

# =============================================================================
# VIEWSETS POUR LES PROJETS SCRAPÉS
# =============================================================================
class ScrapedProjectViewSet(viewsets.ModelViewSet):
    """ViewSet pour les projets scrapés - SANS PAGINATION"""
    queryset = ScrapedProject.objects.all()
    serializer_class = ScrapedProjectSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['source', 'is_relevant_for_mauritania', 'needs_review', 'linked_project']
    search_fields = ['title', 'organization', 'description']
    ordering_fields = ['scraped_at', 'data_completeness_score', 'funding_amount']
    ordering = ['-scraped_at']
    
    # ✅ DÉSACTIVER COMPLÈTEMENT LA PAGINATION
    pagination_class = None
    
    def list(self, request, *args, **kwargs):
        """Override complet pour retourner TOUS les projets"""
        print(f"🔍 API appelée avec paramètres: {request.query_params}")
        
        # Appliquer les filtres
        queryset = self.filter_queryset(self.get_queryset())
        
        # Compter le total
        total_count = queryset.count()
        print(f"📊 Total en base après filtres: {total_count}")
        
        # RETOURNER TOUS LES PROJETS SANS PAGINATION
        serializer = self.get_serializer(queryset, many=True)
        
        print(f"✅ Retour de {len(serializer.data)} projets")
        
        return Response({
            'count': total_count,
            'next': None,
            'previous': None,
            'results': serializer.data
        })
# =============================================================================
# VIEWSETS POUR LES PROJETS DJANGO
# =============================================================================
class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().select_related('consultant').prefetch_related('documents')
    serializer_class = ProjectSerializer
    permission_classes = [AllowAny]  # Temporaire pour debug
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'type_project', 'fund', 'consultant', 'is_from_scraping', 'original_source']
    search_fields = ['name', 'description', 'contact_name']
    ordering_fields = ['created_at', 'date_echeance', 'score_viabilite']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProjectCreateUpdateSerializer
        return ProjectSerializer
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Statistiques complètes pour le tableau de bord"""
        try:
            # Statistiques des projets Django
            total_projects = Project.objects.count()
            ready_projects = Project.objects.filter(status='ready').count()
            pending_projects = Project.objects.filter(status='progress').count()
            avg_score = Project.objects.aggregate(avg_score=models.Avg('score_viabilite'))['avg_score'] or 0
            total_amount = Project.objects.aggregate(total=models.Sum('montant_demande'))['total'] or 0
            
            # Statistiques des projets scrapés
            total_scraped = ScrapedProject.objects.count()
            scraped_by_source = {}
            for source_code, _ in ScrapedProject.SOURCE_CHOICES:
                scraped_by_source[source_code] = ScrapedProject.objects.filter(source=source_code).count()
            
            ready_for_conversion = ScrapedProject.objects.filter(
                linked_project__isnull=True,
                is_relevant_for_mauritania=True,
                data_completeness_score__gte=60
            ).count()
            
            # Sessions de scraping récentes
            recent_sessions = ScrapingSession.objects.all()[:3]
            
            stats = {
                'total_projects': total_projects,
                'ready_projects': ready_projects,
                'pending_projects': pending_projects,
                'avg_score': round(avg_score, 2),
                'total_amount': total_amount,
                'total_scraped': total_scraped,
                'scraped_by_source': scraped_by_source,
                'ready_for_conversion': ready_for_conversion,
                'recent_scraping_sessions': ScrapingSessionSerializer(recent_sessions, many=True).data
            }
            
            return Response(stats)
            
        except Exception as e:
            logger.error(f"Erreur dashboard stats: {e}")
            return Response({
                'error': 'Erreur lors du calcul des statistiques'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# =============================================================================
# VIEWSETS POUR LES NOTIFICATIONS
# =============================================================================
class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [AllowAny]  # Temporaire pour debug
    
    def get_queryset(self):
        # Si pas d'utilisateur authentifié, retourner des notifications vides
        if not self.request.user.is_authenticated:
            return Notification.objects.none()
        return Notification.objects.filter(consultant=self.request.user).select_related('project')
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Nombre de notifications non lues et d'alertes actives"""
        if not request.user.is_authenticated:
           return Response({'unread_count': 0, 'alerts_count': 0})
    
        # Notifications non lues
        notifications_count = self.get_queryset().filter(read=False).count()
    
       # Alertes actives (si l'utilisateur est admin)
        alerts_count = 0
        if request.user.role == 'admin':
          try:
            alerts_count = ProjectAlert.objects.filter(status='active').count()
          except Exception:
            alerts_count = 0
    
        return Response({
           'unread_count': notifications_count,
           'alerts_count': alerts_count
        })

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Marquer une notification comme lue"""
        try:
            notification = self.get_object()
            notification.read = True
            notification.save()
            return Response({'message': 'Notification marquée comme lue'})
        except Exception as e:
            return Response({'error': 'Erreur lors du marquage'}, status=400)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Marquer toutes les notifications comme lues"""
        try:
            self.get_queryset().update(read=True)
            return Response({'message': 'Toutes les notifications marquées comme lues'})
        except Exception as e:
            return Response({'error': 'Erreur lors du marquage'}, status=400)

# =============================================================================
# VIEWSETS POUR LES DOCUMENTS
# =============================================================================
class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all().select_related('project', 'document_type', 'uploaded_by')
    serializer_class = DocumentSerializer
    permission_classes = [AllowAny]  # Temporaire pour debug
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['status', 'project', 'document_type']
    search_fields = ['name', 'project__name']

class DocumentTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les types de documents"""
    queryset = DocumentType.objects.all()
    serializer_class = DocumentTypeSerializer
    permission_classes = [AllowAny]  # Temporaire pour debug

# =============================================================================
# VIEWSETS POUR LES SESSIONS DE SCRAPING
# =============================================================================
class ScrapingSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les sessions de scraping"""
    queryset = ScrapingSession.objects.all()
    serializer_class = ScrapingSessionSerializer
    permission_classes = [AllowAny]  # Temporaire pour debug
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['source', 'success']
    ordering = ['-started_at']
class ProjectAlertStatsView(APIView):
    def get(self, request):
        stats = {
            'active_alerts': ProjectAlert.objects.filter(status='active').count(),
            'high_priority_alerts': ProjectAlert.objects.filter(
                status='active', 
                priority_level__in=['high', 'urgent']
            ).count(),
            'new_this_week': ProjectAlert.objects.filter(
                created_at__gte=timezone.now() - timedelta(days=7)
            ).count(),
            'total_funding': "€2.5M+"  # À remplacer par un calcul réel
        }
        return Response(stats)
# =============================================================================
# VIEWSETS POUR LES DEMANDES DE PROJETS
# =============================================================================
class ProjectRequestViewSet(viewsets.ModelViewSet):
    """ViewSet pour les demandes de projets"""
    queryset = ProjectRequest.objects.all().select_related('client', 'processed_by').prefetch_related('projects')
    serializer_class = ProjectRequestSerializer
    permission_classes = [AllowAny]  # À adapter selon vos besoins
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'client', 'processed_by']
    ordering = ['-priority_score', '-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProjectRequestCreateSerializer
        return ProjectRequestSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Si l'utilisateur est un client, voir seulement ses demandes
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            if self.request.user.role == 'client':
                queryset = queryset.filter(client=self.request.user)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approuver une demande"""
        try:
            project_request = self.get_object()
            response_message = request.data.get('response_message', '')
            
            if not hasattr(request.user, 'is_admin') or not request.user.is_admin:
                return Response({'error': 'Permission refusée'}, status=403)
            
            project_request.approve(request.user, response_message)
            
            return Response({
                'message': 'Demande approuvée avec succès',
                'request': ProjectRequestSerializer(project_request).data
            })
        except Exception as e:
            logger.error(f"Erreur approbation demande: {e}")
            return Response({'error': 'Erreur lors de l\'approbation'}, status=500)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Rejeter une demande"""
        try:
            project_request = self.get_object()
            response_message = request.data.get('response_message', '')
            
            if not hasattr(request.user, 'is_admin') or not request.user.is_admin:
                return Response({'error': 'Permission refusée'}, status=403)
            
            if not response_message:
                return Response({'error': 'Message de rejet requis'}, status=400)
            
            project_request.reject(request.user, response_message)
            
            return Response({
                'message': 'Demande rejetée',
                'request': ProjectRequestSerializer(project_request).data
            })
        except Exception as e:
            logger.error(f"Erreur rejet demande: {e}")
            return Response({'error': 'Erreur lors du rejet'}, status=500)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques des demandes"""
        try:
            total_requests = ProjectRequest.objects.count()
            pending_requests = ProjectRequest.objects.filter(status='pending').count()
            approved_requests = ProjectRequest.objects.filter(status='approved').count()
            rejected_requests = ProjectRequest.objects.filter(status='rejected').count()
            
            # Demandes par priorité
            high_priority = ProjectRequest.objects.filter(
                status='pending',
                priority_score__gte=70
            ).count()
            
            return Response({
                'total_requests': total_requests,
                'pending_requests': pending_requests,
                'approved_requests': approved_requests,
                'rejected_requests': rejected_requests,
                'high_priority_pending': high_priority,
                'avg_processing_time': '2.5 jours',  # À calculer dynamiquement
            })
        except Exception as e:
            logger.error(f"Erreur stats demandes: {e}")
            return Response({'error': 'Erreur lors du calcul des statistiques'}, status=500)
        
# =============================================================================
# AJOUT AU FICHIER: main_app/views.py - VUES POUR LES ALERTES PROJETS
# =============================================================================

# Ajouter ces imports en haut du fichier


# =============================================================================
# VIEWSET POUR LES ALERTES PROJETS
# =============================================================================
class ProjectAlertViewSet(viewsets.ModelViewSet):
    """ViewSet pour les alertes de projets"""
    queryset = ProjectAlert.objects.all().select_related('scraped_project')
    serializer_class = ProjectAlertSerializer
    permission_classes = [AllowAny]  # À adapter selon vos besoins
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority_level', 'source', 'is_featured', 'is_new_this_week']
    search_fields = ['title', 'organization', 'description']
    ordering_fields = ['alert_created_at', 'priority_level', 'data_completeness_score']
    ordering = ['-alert_created_at']
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Marquer une alerte comme lue"""
        try:
            alert = self.get_object()
            alert.mark_as_read()
            return Response({
                'message': 'Alerte marquée comme lue',
                'alert': ProjectAlertSerializer(alert).data
            })
        except Exception as e:
            logger.error(f"Erreur marquage alerte: {e}")
            return Response({'error': 'Erreur lors du marquage'}, status=500)
    
    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        """Ignorer une alerte"""
        try:
            alert = self.get_object()
            alert.dismiss()
            return Response({
                'message': 'Alerte ignorée',
                'alert': ProjectAlertSerializer(alert).data
            })
        except Exception as e:
            logger.error(f"Erreur ignorance alerte: {e}")
            return Response({'error': 'Erreur lors de l\'ignorance'}, status=500)
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archiver une alerte"""
        try:
            alert = self.get_object()
            alert.status = 'archived'
            alert.save()
            return Response({
                'message': 'Alerte archivée',
                'alert': ProjectAlertSerializer(alert).data
            })
        except Exception as e:
            logger.error(f"Erreur archivage alerte: {e}")
            return Response({'error': 'Erreur lors de l\'archivage'}, status=500)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques des alertes"""
        try:
            total_alerts = ProjectAlert.objects.count()
            active_alerts = ProjectAlert.objects.filter(status='active').count()
            
            # Alertes par priorité
            high_priority_alerts = ProjectAlert.objects.filter(
                status='active',
                priority_level__in=['high', 'urgent']
            ).count()
            
            new_this_week = ProjectAlert.objects.filter(
                is_new_this_week=True,
                status='active'
            ).count()
            
            # Par source
            by_source = {}
            for source_code, _ in ProjectAlert._meta.get_field('source').choices:
                by_source[source_code] = ProjectAlert.objects.filter(
                    source=source_code,
                    status='active'
                ).count()
            
            # Par priorité
            by_priority = {}
            for priority_code, _ in ProjectAlert._meta.get_field('priority_level').choices:
                by_priority[priority_code] = ProjectAlert.objects.filter(
                    priority_level=priority_code,
                    status='active'
                ).count()
            
            return Response({
                'total_alerts': total_alerts,
                'active_alerts': active_alerts,
                'high_priority_alerts': high_priority_alerts,
                'new_this_week': new_this_week,
                'by_source': by_source,
                'by_priority': by_priority,
            })
        except Exception as e:
            logger.error(f"Erreur stats alertes: {e}")
            return Response({'error': 'Erreur lors du calcul des statistiques'}, status=500)
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Alertes mises en avant"""
        try:
            featured_alerts = ProjectAlert.objects.filter(
                status='active',
                is_featured=True
            ).order_by('-priority_level', '-alert_created_at')[:10]
            
            return Response({
                'results': ProjectAlertSerializer(featured_alerts, many=True).data,
                'count': len(featured_alerts)
            })
        except Exception as e:
            logger.error(f"Erreur alertes featured: {e}")
            return Response({'error': 'Erreur lors du chargement'}, status=500)