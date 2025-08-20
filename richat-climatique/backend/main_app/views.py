#            
# FICHIER: main_app/views.py - SYNTAXE CORRIGÉE
#            
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
from .serializers import DocumentActionSerializer, ProjectAlertSerializer

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

#            
# VUES D'AUTHENTIFICATION
#            
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

#            
# VUES DE TEST POUR DEBUG
#            
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

#            
# VIEWSETS POUR LES CONSULTANTS
#            
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

#            
# VIEWSETS POUR LES PROJETS SCRAPÉS
#            
class ScrapedProjectViewSet(viewsets.ModelViewSet):
 
    """ViewSet pour les projets scrapés - SANS PAGINATION"""
    queryset = ScrapedProject.objects.all()
    serializer_class = ScrapedProjectSerializer
    permission_classes = [AllowAny]
 
    """ViewSet pour les projets scrapés - VERSION CORRIGÉE"""
    queryset = ScrapedProject.objects.all()
    serializer_class = ScrapedProjectSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
 
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
 
    @action(detail=True, methods=['get'])
    def full_details(self, request, pk=None):
        """Récupérer tous les détails d'un projet scrapé"""
        try:
            project = self.get_object()
            
            # Sérializer détaillé avec tous les champs
            project_data = {
                'id': project.id,
                'title': project.title,
                'name': project.title,
                'description': project.description or '',
                'organization': project.organization or '',
                'status': project.status or '',
                'project_type': project.project_type or '',
                'total_funding': project.total_funding or '',
                'funding_amount': float(project.funding_amount) if project.funding_amount else None,
                'currency': project.currency or 'USD',
                'country': project.country or 'Mauritania',
                'region': project.region or '',
                'source': project.source or '',
                'source_url': project.source_url or '',
                'source_id': project.source_id or '',
                'focal_areas': project.focal_areas or '',
                'gef_project_id': project.gef_project_id or '',
                'gcf_document_type': project.gcf_document_type or '',
                'cover_date': project.cover_date or '',
                'document_url': project.document_url or '',
                'additional_links': project.additional_links or '',
                'scraped_at': project.scraped_at,
                'last_updated': project.last_updated,
                'scraping_source': project.scraping_source or '',
                'data_completeness_score': project.data_completeness_score,
                'is_relevant_for_mauritania': project.is_relevant_for_mauritania,
                'needs_review': project.needs_review,
                'linked_project_id': project.linked_project.id if project.linked_project else None,
                'linked_project_name': project.linked_project.name if project.linked_project else None,
                'can_create_project': project.can_create_project(),
            }
            
            return Response(project_data)
            
        except Exception as e:
            logger.error(f"Erreur récupération détails projet scrapé: {str(e)}")
            return Response(
                {'error': 'Erreur lors de la récupération des détails'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def list(self, request, *args, **kwargs):
        """Override list method for debugging"""
        try:
            logger.info(f"ScrapedProject list called by user: {request.user}")
            
            queryset = self.filter_queryset(self.get_queryset())
            
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error in ScrapedProject list: {e}")
            return Response({
                'error': 'Internal server error',
                'details': str(e)
            }, status=500)
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def stats(self, request):
        """Statistiques des projets scrapés"""
        try:
            total_scraped = ScrapedProject.objects.count()
            
            # Par source
            by_source = {}
            for source_code, source_name in ScrapedProject.SOURCE_CHOICES:
                count = ScrapedProject.objects.filter(source=source_code).count()
                by_source[source_code] = count
            
            # Par score de complétude
            by_completeness_score = {
                'excellent': ScrapedProject.objects.filter(data_completeness_score__gte=90).count(),
                'good': ScrapedProject.objects.filter(
                    data_completeness_score__gte=70, 
                    data_completeness_score__lt=90
                ).count(),
                'fair': ScrapedProject.objects.filter(
                    data_completeness_score__gte=50, 
                    data_completeness_score__lt=70
                ).count(),
                'poor': ScrapedProject.objects.filter(data_completeness_score__lt=50).count(),
            }
            
            # Autres statistiques
            ready_projects = ScrapedProject.objects.filter(
                linked_project__isnull=True,
                is_relevant_for_mauritania=True,
                data_completeness_score__gte=60
            ).count()
            
            linked_projects = ScrapedProject.objects.filter(linked_project__isnull=False).count()
            needs_review = ScrapedProject.objects.filter(needs_review=True).count()
            
            # Score moyen de complétude
            avg_completeness = ScrapedProject.objects.aggregate(
                avg_score=models.Avg('data_completeness_score')
            )['avg_score'] or 0
            
            # Sessions récentes
            recent_sessions = ScrapingSession.objects.all()[:5]
            
            stats_data = {
                'total_scraped': total_scraped,
                'by_source': by_source,
                'by_completeness_score': by_completeness_score,
                'ready_projects': ready_projects,
                'linked_projects': linked_projects,
                'needs_review': needs_review,
                'avg_completeness_score': round(avg_completeness, 2),
                'recent_sessions': ScrapingSessionSerializer(recent_sessions, many=True).data
            }
            
            return Response(stats_data)
            
        except Exception as e:
            logger.error(f"Erreur stats projets scrapés: {e}")
            return Response({
                'error': 'Erreur lors du calcul des statistiques',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

 
#            
# VIEWSETS POUR LES PROJETS DJANGO
#            
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

#            
# VIEWSETS POUR LES NOTIFICATIONS
#            
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

#            
# VIEWSETS POUR LES DOCUMENTS
#            
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

#            
# VIEWSETS POUR LES SESSIONS DE SCRAPING
#            
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
#            
# VIEWSETS POUR LES DEMANDES DE PROJETS
#            
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
        
#            
# AJOUT AU FICHIER: main_app/views.py - VUES POUR LES ALERTES PROJETS
#            

# Ajouter ces imports en haut du fichier


#            
# VIEWSET POUR LES ALERTES PROJETS
#            
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
        
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from main_app.models import ScrapedProject, Document
from main_app.serializers import (
    ScrapedProjectSerializer, 
    DocumentSerializer,
    ProjectDocumentSubmissionSerializer
)
from django.shortcuts import get_object_or_404

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import models
import logging

from .models import ScrapedProject, ScrapingSession
from .serializers import ScrapedProjectSerializer, ScrapingSessionSerializer

logger = logging.getLogger(__name__)

class ScrapedProjectViewSet(viewsets.ModelViewSet):
    """ViewSet pour les projets scrapés - FIXED VERSION"""
    queryset = ScrapedProject.objects.all()
    serializer_class = ScrapedProjectSerializer
    permission_classes = [AllowAny]  # Explicitly allow any access
    authentication_classes = []  # Disable authentication temporarily for debugging
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['source', 'is_relevant_for_mauritania', 'needs_review', 'linked_project']
    search_fields = ['title', 'organization', 'description']
    ordering_fields = ['scraped_at', 'data_completeness_score', 'funding_amount']
    ordering = ['-scraped_at']
    
    def list(self, request, *args, **kwargs):
        """Override list method for debugging"""
        try:
            logger.info(f"ScrapedProject list called by user: {request.user}")
            logger.info(f"Authentication: {request.user.is_authenticated}")
            logger.info(f"Permissions: {self.permission_classes}")
            
            # Force the queryset
            queryset = self.filter_queryset(self.get_queryset())
            
            # Pagination
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error in ScrapedProject list: {e}")
            return Response({
                'error': 'Internal server error',
                'details': str(e)
            }, status=500)
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def stats(self, request):
        """Statistiques des projets scrapés - FIXED"""
        try:
            logger.info(f"Stats endpoint called by: {request.user}")
            
            total_scraped = ScrapedProject.objects.count()
            
            # Par source
            by_source = {}
            for source_code, source_name in ScrapedProject.SOURCE_CHOICES:
                count = ScrapedProject.objects.filter(source=source_code).count()
                by_source[source_code] = count
            
            # Par score de complétude
            by_completeness_score = {
                'excellent': ScrapedProject.objects.filter(data_completeness_score__gte=90).count(),
                'good': ScrapedProject.objects.filter(
                    data_completeness_score__gte=70, 
                    data_completeness_score__lt=90
                ).count(),
                'fair': ScrapedProject.objects.filter(
                    data_completeness_score__gte=50, 
                    data_completeness_score__lt=70
                ).count(),
                'poor': ScrapedProject.objects.filter(data_completeness_score__lt=50).count(),
            }
            
            # Autres statistiques
            ready_projects = ScrapedProject.objects.filter(
                linked_project__isnull=True,
                is_relevant_for_mauritania=True,
                data_completeness_score__gte=60
            ).count()
            
            linked_projects = ScrapedProject.objects.filter(linked_project__isnull=False).count()
            needs_review = ScrapedProject.objects.filter(needs_review=True).count()
            
            # Score moyen de complétude
            avg_completeness = ScrapedProject.objects.aggregate(
                avg_score=models.Avg('data_completeness_score')
            )['avg_score'] or 0
            
            # Sessions récentes
            recent_sessions = ScrapingSession.objects.all()[:5]
            
            stats_data = {
                'total_scraped': total_scraped,
                'by_source': by_source,
                'by_completeness_score': by_completeness_score,
                'ready_projects': ready_projects,
                'linked_projects': linked_projects,
                'needs_review': needs_review,
                'avg_completeness_score': round(avg_completeness, 2),
                'recent_sessions': ScrapingSessionSerializer(recent_sessions, many=True).data
            }
            
            logger.info(f"Stats calculated successfully: {stats_data}")
            return Response(stats_data)
            
        except Exception as e:
            logger.error(f"Erreur stats projets scrapés: {e}")
            return Response({
                'error': 'Erreur lors du calcul des statistiques',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_permissions(self):
        """Override to ensure AllowAny is always applied"""
        return [AllowAny()]
    


import logging
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser  # IMPORTANT: Ajouter JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import NotFound
from .models import Document, ScrapedProject, CustomUser, Notification
from .serializers import DocumentSerializer, DocumentActionSerializer

logger = logging.getLogger(__name__)
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
import logging

from .models import Document, ScrapedProject, Notification, CustomUser
from .serializers import DocumentSerializer

logger = logging.getLogger(__name__)
class DocumentViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les documents avec nouveaux champs - VERSION CORRIGÉE FINALE"""
    serializer_class = DocumentSerializer
    permission_classes = [AllowAny]
    # FIX: Ajouter JSONParser pour supporter application/json
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        """Retourne les documents selon le contexte"""
        if self.request.query_params.get('admin_view') == 'true':
            return Document.objects.all().select_related(
                'project', 'scraped_project', 'uploaded_by', 'document_type', 'traite_par'
            ).order_by('-uploaded_at')
        
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            return Document.objects.filter(uploaded_by=self.request.user).select_related(
                'project', 'scraped_project', 'uploaded_by', 'document_type', 'traite_par'
            )
        return Document.objects.none()

    def get_object(self):
        """
        FIX PRINCIPAL: Override get_object pour permettre l'accès admin aux documents
        """
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        assert lookup_url_kwarg in self.kwargs, (
            'Expected view %s to be called with a URL keyword argument '
            'named "%s". Fix your URL conf, or set the `.lookup_field` '
            'attribute on the view correctly.' %
            (self.__class__.__name__, lookup_url_kwarg)
        )

        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        
        # FIX: Pour les actions admin (approve, reject, process_document), 
        # utiliser un queryset sans restriction
        if hasattr(self, 'action') and self.action in ['approve', 'reject', 'process_document']:
            # Admin peut accéder à tous les documents pour ces actions
            queryset = Document.objects.all().select_related(
                'project', 'scraped_project', 'uploaded_by', 'document_type', 'traite_par'
            )
            logger.info(f"DEBUG: Action {self.action} - utilisation queryset complet")
        else:
            # Pour les autres actions, utiliser le queryset normal
            queryset = self.filter_queryset(self.get_queryset())
            logger.info(f"DEBUG: Action {getattr(self, 'action', 'unknown')} - utilisation queryset filtré")

        try:
            obj = queryset.get(**filter_kwargs)
            logger.info(f"DEBUG: Document trouvé - ID: {obj.id}, Nom: {obj.name}")
        except Document.DoesNotExist:
            from rest_framework.exceptions import NotFound
            logger.error(f"DEBUG: Document avec {filter_kwargs} introuvable dans queryset")
            raise NotFound(f'Document avec ID {filter_kwargs[self.lookup_field]} introuvable')

        # May raise a permission denied
        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def submit_project_documents(self, request):
        """Soumettre plusieurs documents pour un projet scrapé avec message d'accompagnement"""
        try:
            logger.info(f"Données reçues: {request.data}")
            logger.info(f"Fichiers reçus: {request.FILES}")
            
            # Récupérer les données
            project_id = request.data.get('project_id')
            message = request.data.get('message', '')  # Message d'accompagnement
            files = request.FILES.getlist('files')
            descriptions = request.data.getlist('descriptions', [])

            # Validations
            if not project_id:
                return Response(
                    {'error': 'project_id est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not files:
                return Response(
                    {'error': 'Au moins un fichier est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not message.strip():
                return Response(
                    {'error': 'Message d\'accompagnement requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Vérifier le projet
            try:
                scraped_project = ScrapedProject.objects.get(id=project_id)
            except ScrapedProject.DoesNotExist:
                return Response(
                    {'error': f'Projet avec ID {project_id} introuvable'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Validation des fichiers
            allowed_extensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif']
            max_file_size = 10 * 1024 * 1024  # 10MB

            for file in files:
                file_extension = file.name.split('.')[-1].lower() if '.' in file.name else ''
                if file_extension not in allowed_extensions:
                    return Response(
                        {'error': f'Type de fichier non autorisé: {file.name}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                if file.size > max_file_size:
                    return Response(
                        {'error': f'Fichier {file.name} trop volumineux. Max: 10MB'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Vérifier l'utilisateur
            if not hasattr(request, 'user') or not request.user.is_authenticated:
                return Response(
                    {'error': 'Authentification requise'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # Transaction pour créer les documents
            with transaction.atomic():
                created_docs = []
                
                for i, file in enumerate(files):
                    description = descriptions[i] if i < len(descriptions) else ''
                    
                    # Créer le document avec le nouveau champ message_accompagnement
                    doc = Document.objects.create(
                        scraped_project=scraped_project,
                        uploaded_by=request.user,
                        file=file,
                        name=file.name,
                        description=description,
                        message_accompagnement=message.strip(),  # NOUVEAU CHAMP
                        status='submitted',
                        date_soumission=timezone.now()
                    )
                    created_docs.append(doc)
                    logger.info(f"Document créé: {doc.id} - {doc.name}")

                # Notifications
                Notification.objects.create(
                    type='document',
                    title=f'Documents soumis pour {scraped_project.title[:50]}...',
                    message=f'Vous avez soumis {len(created_docs)} document(s) pour le projet "{scraped_project.title}". Message: {message[:100]}{"..." if len(message) > 100 else ""}',
                    consultant=request.user
                )

                # Notifier les admins
                admins = CustomUser.objects.filter(role='admin', actif=True)
                for admin in admins:
                    Notification.objects.create(
                        type='document',
                        title=f'🔔 Nouveaux documents reçus',
                        message=f'{request.user.full_name} a soumis {len(created_docs)} document(s) pour "{scraped_project.title[:50]}..."\n\nMessage du client: {message[:150]}{"..." if len(message) > 150 else ""}',
                        consultant=admin
                    )

                return Response({
                    'message': f'{len(created_docs)} document(s) soumis avec succès',
                    'project_title': scraped_project.title,
                    'scraped_project_id': scraped_project.id,
                    'documents_count': len(created_docs),
                    'client_message': message,  # NOUVEAU: Inclure le message dans la réponse
                    'documents': DocumentSerializer(created_docs, many=True).data
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Erreur soumission documents: {str(e)}")
            logger.exception("Détails de l'erreur:")
            return Response(
                {'error': 'Erreur lors de la soumission des documents', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], parser_classes=[JSONParser])
    def approve(self, request, pk=None):
        """Approuver un document avec les nouveaux champs"""
        try:
            logger.info(f"DEBUG: Tentative d'approbation document ID: {pk}")
            logger.info(f"DEBUG: Utilisateur: {request.user}")
            logger.info(f"DEBUG: Action: {self.action}")
            logger.info(f"DEBUG: Content-Type: {request.content_type}")
            logger.info(f"DEBUG: Données brutes: {request.body}")
            
            # FIX: get_object() va maintenant utiliser le queryset complet pour cette action
            document = self.get_object()
            
            notes_admin = request.data.get('notes_admin', '').strip()
            
            logger.info(f"DEBUG: Notes admin reçues: '{notes_admin}'")
            
            # Utiliser la nouvelle méthode du modèle
            document.approuver(request.user, notes_admin)
            
            logger.info(f"DEBUG: Document {document.id} approuvé avec succès")
            
            return Response({
                'message': 'Document approuvé avec succès',
                'document': DocumentSerializer(document).data
            })
            
        except Exception as e:
            logger.error(f"Erreur approbation document: {e}")
            logger.exception("Stack trace complet:")
            return Response({'error': f'Erreur lors de l\'approbation: {str(e)}'}, status=500)

    @action(detail=True, methods=['post'], parser_classes=[JSONParser])
    def reject(self, request, pk=None):
        """Rejeter un document avec les nouveaux champs"""
        try:
            logger.info(f"DEBUG: Tentative de rejet document ID: {pk}")
            logger.info(f"DEBUG: Utilisateur: {request.user}")
            logger.info(f"DEBUG: Action: {self.action}")
            logger.info(f"DEBUG: Content-Type: {request.content_type}")
            
            # FIX: get_object() va maintenant utiliser le queryset complet pour cette action
            document = self.get_object()
            
            motif_rejet = request.data.get('motif_rejet', '').strip()
            notes_admin = request.data.get('notes_admin', '').strip()
            
            logger.info(f"DEBUG: Motif rejet: '{motif_rejet}'")
            logger.info(f"DEBUG: Notes admin: '{notes_admin}'")
            
            # Validation
            if not motif_rejet:
                return Response({'error': 'Motif de rejet requis'}, status=400)
            
            # Utiliser la nouvelle méthode du modèle
            document.rejeter(request.user, motif_rejet, notes_admin)
            
            logger.info(f"DEBUG: Document {document.id} rejeté avec succès")
            
            return Response({
                'message': 'Document rejeté',
                'document': DocumentSerializer(document).data
            })
            
        except Exception as e:
            logger.error(f"Erreur rejet document: {e}")
            logger.exception("Stack trace complet:")
            return Response({'error': f'Erreur lors du rejet: {str(e)}'}, status=500)

    @action(detail=True, methods=['post'], parser_classes=[JSONParser])
    def process_document(self, request, pk=None):
        """NOUVELLE ACTION: Traiter un document (approuver ou rejeter) en une seule API"""
        try:
            logger.info(f"DEBUG: Tentative de traitement document ID: {pk}")
            logger.info(f"DEBUG: Utilisateur: {request.user}")
            logger.info(f"DEBUG: Action: {self.action}")
            logger.info(f"DEBUG: Données reçues: {request.data}")
            
            # FIX: get_object() va maintenant utiliser le queryset complet pour cette action
            document = self.get_object()
            
            # Validation des données avec le nouveau serializer
            action_serializer = DocumentActionSerializer(data=request.data)
            if not action_serializer.is_valid():
                logger.error(f"Données invalides: {action_serializer.errors}")
                return Response(action_serializer.errors, status=400)
            
            validated_data = action_serializer.validated_data
            action = validated_data['action']
            notes_admin = validated_data.get('notes_admin', '').strip()
            motif_rejet = validated_data.get('motif_rejet', '').strip()
            
            if action == 'approve':
                document.approuver(request.user, notes_admin)
                message = 'Document approuvé avec succès'
                logger.info(f"DEBUG: Document {document.id} approuvé via process_document")
            else:  # action == 'reject'
                document.rejeter(request.user, motif_rejet, notes_admin)
                message = 'Document rejeté avec succès'
                logger.info(f"DEBUG: Document {document.id} rejeté via process_document")
            
            return Response({
                'message': message,
                'action': action,
                'document': DocumentSerializer(document).data
            })
            
        except Exception as e:
            logger.error(f"Erreur traitement document: {e}")
            logger.exception("Stack trace complet:")
            return Response({'error': f'Erreur lors du traitement: {str(e)}'}, status=500)

    @action(detail=False, methods=['get'])
    def all_documents_admin(self, request):
        """Récupérer tous les documents pour les administrateurs"""
        try:
            documents = Document.objects.all().select_related(
                'project', 'scraped_project', 'uploaded_by', 'document_type', 'traite_par'
            ).order_by('-uploaded_at')

            return Response({
                'results': DocumentSerializer(documents, many=True).data,
                'count': documents.count()
            })

        except Exception as e:
            logger.error(f"Erreur récupération tous documents: {str(e)}")
            return Response(
                {'error': 'Erreur lors de la récupération des documents'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def my_documents(self, request):
        """Récupérer les documents de l'utilisateur connecté"""
        try:
            if not hasattr(request, 'user') or not request.user.is_authenticated:
                return Response(
                    {'error': 'Authentification requise'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            documents = Document.objects.filter(uploaded_by=request.user).select_related(
                'project', 'scraped_project', 'document_type', 'traite_par'
            ).order_by('-uploaded_at')

            return Response({
                'results': DocumentSerializer(documents, many=True).data,
                'count': documents.count()
            })

        except Exception as e:
            logger.error(f"Erreur récupération documents: {str(e)}")
            return Response(
                {'error': 'Erreur lors de la récupération des documents'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def admin_overview(self, request):
        """Vue d'ensemble pour les administrateurs avec nouveaux champs"""
        try:
            from django.db.models import Count, Q, F, Value, Max
            from django.db.models.functions import Concat
    
            # Récupérer les clients avec leurs statistiques de documents
            clients_data = CustomUser.objects.filter(
                role='client',
                uploaded_documents__isnull=False
            ).annotate(
                full_name_concat=Concat(F('first_name'), Value(' '), F('last_name')),
                total_documents=Count('uploaded_documents'),
                pending_documents=Count('uploaded_documents', filter=Q(uploaded_documents__status='submitted')),
                approved_documents=Count('uploaded_documents', filter=Q(uploaded_documents__status='approved')),
                rejected_documents=Count('uploaded_documents', filter=Q(uploaded_documents__status='rejected')),
                latest_submission=Max('uploaded_documents__uploaded_at')
            ).distinct().values(
                'id', 'first_name', 'last_name', 'email', 'company_name',
                'total_documents', 'pending_documents', 
                'approved_documents', 'rejected_documents',
                'latest_submission'
            )
        
            # Formater les données clients
            clients_list = []
            for client_data in clients_data:
                client_info = {
                    'id': client_data['id'],
                    'full_name': f"{client_data['first_name']} {client_data['last_name']}",
                    'email': client_data['email'],
                    'company_name': client_data['company_name'],
                    'total_documents': client_data['total_documents'],
                    'pending_documents': client_data['pending_documents'],
                    'approved_documents': client_data['approved_documents'],
                    'rejected_documents': client_data['rejected_documents'],
                    'latest_submission': client_data['latest_submission']
                }
                clients_list.append(client_info)
        
            # Statistiques globales
            total_docs = Document.objects.count()
            pending_docs = Document.objects.filter(status='submitted').count()
            approved_docs = Document.objects.filter(status='approved').count()
            rejected_docs = Document.objects.filter(status='rejected').count()
            active_clients = CustomUser.objects.filter(
                role='client',
                uploaded_documents__isnull=False
            ).distinct().count()
            
            # NOUVELLES STATISTIQUES: Documents avec message d'accompagnement
            docs_with_message = Document.objects.exclude(
                Q(message_accompagnement__isnull=True) | Q(message_accompagnement__exact='')
            ).count()
            
            # Documents traités par admin
            docs_processed = Document.objects.filter(traite_par__isnull=False).count()
        
            return Response({
                'clients': clients_list,
                'stats': {
                    'total_documents': total_docs,
                    'pending_documents': pending_docs,
                    'approved_documents': approved_docs,
                    'rejected_documents': rejected_docs,
                    'active_clients': active_clients,
                    'docs_with_message': docs_with_message,  # NOUVEAU
                    'docs_processed': docs_processed,  # NOUVEAU
                    'processing_rate': round((docs_processed / total_docs * 100), 2) if total_docs > 0 else 0  # NOUVEAU
                }
            })
        
        except Exception as e:
            logger.error(f"Erreur vue d'ensemble: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Erreur lors du chargement', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """NOUVELLE ACTION: Statistiques détaillées des documents"""
        try:
            from django.db.models import Count, Avg, Q
            from django.db.models.functions import TruncDate
            
            # Statistiques par statut
            stats_by_status = Document.objects.values('status').annotate(
                count=Count('id')
            ).order_by('status')
            
            # Statistiques par jour (derniers 30 jours)
            from datetime import timedelta
            thirty_days_ago = timezone.now() - timedelta(days=30)
            daily_stats = Document.objects.filter(
                uploaded_at__gte=thirty_days_ago
            ).annotate(
                date=TruncDate('uploaded_at')
            ).values('date').annotate(
                count=Count('id')
            ).order_by('date')
            
            # Temps moyen de traitement
            processed_docs = Document.objects.filter(
                reviewed_at__isnull=False,
                date_soumission__isnull=False
            )
            
            avg_processing_time = None
            if processed_docs.exists():
                # Calculer la différence moyenne en heures
                total_time = 0
                count = 0
                for doc in processed_docs:
                    if doc.reviewed_at and doc.date_soumission:
                        diff = doc.reviewed_at - doc.date_soumission
                        total_time += diff.total_seconds() / 3600  # Convertir en heures
                        count += 1
                
                if count > 0:
                    avg_processing_time = round(total_time / count, 2)
            
            # Top des clients les plus actifs
            top_clients = CustomUser.objects.filter(
                role='client'
            ).annotate(
                docs_count=Count('uploaded_documents')
            ).filter(docs_count__gt=0).order_by('-docs_count')[:5]
            
            top_clients_data = [{
                'client_name': client.full_name,
                'company': client.company_name or 'N/A',
                'documents_count': client.docs_count
            } for client in top_clients]
            
            return Response({
                'stats_by_status': list(stats_by_status),
                'daily_submissions': list(daily_stats),
                'avg_processing_time_hours': avg_processing_time,
                'top_clients': top_clients_data,
                'total_documents': Document.objects.count(),
                'documents_with_messages': Document.objects.exclude(
                    Q(message_accompagnement__isnull=True) | Q(message_accompagnement__exact='')
                ).count()
            })
            
        except Exception as e:
            logger.error(f"Erreur statistiques: {str(e)}")
            return Response(
                {'error': 'Erreur lors du calcul des statistiques'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )