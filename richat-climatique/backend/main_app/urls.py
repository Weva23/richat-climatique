# =============================================================================
# URLS CORRIGÉES AVEC ENDPOINTS DE DEBUG
# =============================================================================
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Configuration du routeur API
router = DefaultRouter()
router.register(r'projects', views.ProjectViewSet)
router.register(r'documents', views.DocumentViewSet)
router.register(r'document-types', views.DocumentTypeViewSet)
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'consultants', views.ConsultantViewSet, basename='consultant')
router.register(r'scraped-projects', views.ScrapedProjectViewSet)
router.register(r'scraping-sessions', views.ScrapingSessionViewSet)

urlpatterns = [
    # API Routes avec le routeur
    path('', include(router.urls)),
    
    # Routes d'authentification CORRIGÉES
    path('auth/login/', views.CustomAuthToken.as_view(), name='api_token_auth'),
    path('auth/profile/', views.UserProfileView.as_view(), name='user_profile'),
    
    # Routes de debug pour tester l'authentification
    path('auth/test/', views.auth_test, name='auth_test'),
    path('auth/debug/', views.auth_debug, name='auth_debug'),
    
    # Routes DRF par défaut
    path('auth/', include('rest_framework.urls')),
]