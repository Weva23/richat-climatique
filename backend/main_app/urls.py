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

urlpatterns = [
    # API Routes avec le routeur
    path('', include(router.urls)),
    
    # Routes d'authentification
    path('auth/login/', views.CustomAuthToken.as_view(), name='api_token_auth'),
    path('auth/profile/', views.UserProfileView.as_view(), name='user_profile'),
    path('auth/', include('rest_framework.urls')),
]