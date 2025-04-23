import logging
from django.core.cache import cache
from django.conf import settings
import hashlib
import json

logger = logging.getLogger(__name__)

class FileListCache:
    @staticmethod
    def generate_cache_key(filters, page, page_size, ordering):
        """Generate a unique cache key based on filters and pagination"""
        # Create a dictionary of all parameters
        cache_dict = {
            'filters': filters,
            'page': page,
            'page_size': page_size,
            'ordering': ordering
        }
        
        # Convert to a sorted JSON string to ensure consistent ordering
        cache_string = json.dumps(cache_dict, sort_keys=True)
        
        # Create an MD5 hash of the string
        key = f"file_hub:file_list:{hashlib.md5(cache_string.encode()).hexdigest()}"
        logger.info(f"Generated cache key: {key}")
        return key

    @staticmethod
    def get_cached_data(cache_key):
        """Retrieve data from cache"""
        data = cache.get(cache_key)
        if data is not None:
            logger.info(f"Cache hit for key: {cache_key}")
        else:
            logger.info(f"Cache miss for key: {cache_key}")
        return data

    @staticmethod
    def set_cached_data(cache_key, data):
        """Store data in cache"""
        try:
            cache.set(cache_key, data, timeout=settings.CACHE_TTL)
            logger.info(f"Data stored in cache with key: {cache_key}")
            
            # Verify the data was stored
            verification = cache.get(cache_key)
            if verification is not None:
                logger.info(f"Cache storage verified for key: {cache_key}")
            else:
                logger.error(f"Cache storage verification failed for key: {cache_key}")
        except Exception as e:
            logger.error(f"Error storing data in cache: {str(e)}")
