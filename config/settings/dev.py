from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']

CORS_ALLOW_ALL_ORIGINS = True

# Local SQLite fallback settings for running without Docker/Redis
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

CELERY_BROKER_URL = 'memory://'
CELERY_RESULT_BACKEND = 'cache+memory://'

# Disable Elasticsearch for local dev
ELASTICSEARCH_DSL = {}
ELASTICSEARCH_DSL_AUTOSYNC = False



# Serve static and media files in dev
STATIC_URL = '/static/'
MEDIA_URL = '/media/'

# Use In-Memory channel layer for local development without Docker/Redis
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

