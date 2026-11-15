from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class ChatbotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'chatbot'
    
    def ready(self):
        """Chatbot runs as a separate service (RAG_SERVICE_URL) - nothing to initialise here"""
        logger.debug("Chatbot proxies to the RAG service at RAG_SERVICE_URL")
