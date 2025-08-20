# =============================================================================
# URLS PRINCIPALES - CORRIGÉES POUR RÉSOUDRE L'ERREUR 403
# =============================================================================
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def api_root(request):
    """Vue racine pour l'API"""
    return JsonResponse({
        'message': 'Richat Funding Tracker API',
        'version': '1.0',
        'endpoints': {
            'auth': '/api/auth/',
            'projects': '/api/projects/',
            'scraped-projects': '/api/scraped-projects/',
            'documents': '/api/documents/',
            'notifications': '/api/notifications/',
            'consultants': '/api/consultants/',
        }
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api_root, name='api-root'),  # Vue racine pour éviter 403
    path('api/', include('main_app.urls')),   # Inclure nos URLs
]

# Servir les fichiers statiques en développement
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)