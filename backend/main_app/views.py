# =============================================================================
# FICHIER: main_app/views.py - TOUTES LES VUES
# =============================================================================
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import models

from .models import CustomUser, Project, Document, DocumentType, Notification
from .serializers import (
    UserSerializer, UserProfileSerializer, ProjectSerializer, 
    ProjectCreateUpdateSerializer, DocumentSerializer, DocumentTypeSerializer,
    NotificationSerializer
)

# =============================================================================
# VUES POUR L'AUTHENTIFICATION
# =============================================================================
class CustomAuthToken(ObtainAuthToken):
    """Authentification personnalisée avec retour des infos utilisateur"""
    
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': user.full_name,
                'level': user.level,
                'department': user.department,
            }
        })

class UserProfileView(APIView):
    """Vue pour le profil utilisateur"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
    def put(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ConsultantViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les consultants"""
    serializer_class = UserSerializer
    
    def get_queryset(self):
        return CustomUser.objects.filter(actif=True).annotate(
            active_projects_count=models.Count(
                'projects', 
                filter=models.Q(projects__status__in=['progress', 'ready'])
            )
        )

# =============================================================================
# VUES POUR LES PROJETS
# =============================================================================
class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().select_related('consultant').prefetch_related('documents')
    serializer_class = ProjectSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'type_project', 'fund', 'consultant']
    search_fields = ['name', 'description', 'contact_name']
    ordering_fields = ['created_at', 'date_echeance', 'score_viabilite']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProjectCreateUpdateSerializer
        return ProjectSerializer
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Statistiques pour le tableau de bord"""
        stats = {
            'total_projects': Project.objects.count(),
            'ready_projects': Project.objects.filter(status='ready').count(),
            'pending_projects': Project.objects.filter(status='progress').count(),
            'avg_score': Project.objects.aggregate(avg_score=models.Avg('score_viabilite'))['avg_score'] or 0,
            'total_amount': Project.objects.aggregate(total=models.Sum('montant_demande'))['total'] or 0,
        }
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def by_status(self, request):
        """Projets groupés par statut"""
        projects_by_status = {
            'draft': self.get_queryset().filter(status='draft'),
            'progress': self.get_queryset().filter(status='progress'),
            'ready': self.get_queryset().filter(status='ready'),
        }
        
        result = {}
        for status_key, queryset in projects_by_status.items():
            result[status_key] = ProjectSerializer(queryset, many=True, context={'request': request}).data
        
        return Response(result)
    
    @action(detail=True, methods=['post'])
    def assign_consultant(self, request, pk=None):
        """Assigner un consultant à un projet"""
        project = self.get_object()
        consultant_id = request.data.get('consultant_id')
        
        if consultant_id:
            try:
                consultant = CustomUser.objects.get(id=consultant_id)
                project.consultant = consultant
                project.save()
                
                # Créer une notification
                Notification.objects.create(
                    type='assignment',
                    title='Nouveau projet assigné',
                    message=f'Le projet "{project.name}" vous a été assigné',
                    project=project,
                    consultant=consultant
                )
                
                return Response({'status': 'Consultant assigné avec succès'})
            except CustomUser.DoesNotExist:
                return Response({'error': 'Consultant non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({'error': 'ID consultant requis'}, status=status.HTTP_400_BAD_REQUEST)

# =============================================================================
# VUES POUR LES DOCUMENTS
# =============================================================================
class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all().select_related('project', 'document_type', 'uploaded_by')
    serializer_class = DocumentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['status', 'project', 'document_type']
    search_fields = ['name', 'project__name']
    
    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
        
        # Créer une notification
        document = serializer.instance
        if document.project.consultant:
            Notification.objects.create(
                type='document',
                title='Nouveau document soumis',
                message=f'Document "{document.name}" soumis pour le projet "{document.project.name}"',
                project=document.project,
                consultant=document.project.consultant
            )
    
    @action(detail=False, methods=['get'])
    def missing_by_project(self, request):
        """Documents manquants par projet"""
        projects = Project.objects.all()
        result = []
        
        for project in projects:
            missing_docs = project.missing_documents
            if missing_docs:
                result.append({
                    'project_id': project.id,
                    'project_name': project.name,
                    'missing_documents': missing_docs
                })
        
        return Response(result)

class DocumentTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les types de documents"""
    queryset = DocumentType.objects.all()
    serializer_class = DocumentTypeSerializer

# =============================================================================
# VUES POUR LES NOTIFICATIONS
# =============================================================================
class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        return Notification.objects.filter(consultant=self.request.user).select_related('project')
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Marquer toutes les notifications comme lues"""
        self.get_queryset().update(read=True)
        return Response({'status': 'Toutes les notifications marquées comme lues'})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Marquer une notification comme lue"""
        notification = self.get_object()
        notification.read = True
        notification.save()
        return Response({'status': 'Notification marquée comme lue'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Nombre de notifications non lues"""
        count = self.get_queryset().filter(read=False).count()
        return Response({'unread_count': count})