from supabase import create_client, Client
from app.core.config import settings
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self):
        self.client: Optional[Client] = None

    async def initialize(self):
        """Initialize Supabase client"""
        try:
            if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
                logger.error("Supabase credentials not found in environment")
                raise ValueError("Supabase credentials not found")

            self.client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_ANON_KEY
            )
            logger.info("Supabase client initialized successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise

    def get_client(self) -> Client:
        """Get Supabase client instance"""
        if not self.client:
            raise RuntimeError("Database not initialized. Call initialize() first.")
        return self.client

# Global database instance
db = DatabaseService()