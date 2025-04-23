from django.shortcuts import render
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db.models import Q, Sum, Count, F, ExpressionWrapper, FloatField
from django.db.models.functions import Cast
from django_filters import rest_framework as django_filters
import os
from .models import File
from .serializers import FileSerializer
from django.http import HttpResponse
from rest_framework.pagination import PageNumberPagination
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from django.core.cache import cache
from .cache import FileListCache
from django.conf import settings
import json
import logging

# Create your views here.

logger = logging.getLogger(__name__)

class FileFilter(django_filters.FilterSet):
    filename = django_filters.CharFilter(field_name='original_filename', lookup_expr='icontains')
    file_type = django_filters.CharFilter(field_name='file_type', lookup_expr='iexact')
    is_duplicate = django_filters.BooleanFilter(field_name='is_duplicate')
    min_size = django_filters.NumberFilter(field_name='size', lookup_expr='gte')
    max_size = django_filters.NumberFilter(field_name='size', lookup_expr='lte')
    uploaded_after = django_filters.DateTimeFilter(field_name='uploaded_at', lookup_expr='gte')
    uploaded_before = django_filters.DateTimeFilter(field_name='uploaded_at', lookup_expr='lte')
    
    class Meta:
        model = File
        fields = ['filename', 'file_type', 'is_duplicate', 'min_size', 'max_size', 
                 'uploaded_after', 'uploaded_before']

class CustomPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'results': data
        })

class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer
    pagination_class = CustomPagination
    throttle_classes = [AnonRateThrottle, UserRateThrottle]
    filter_backends = [
        django_filters.DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    filterset_class = FileFilter
    search_fields = ['original_filename']
    ordering_fields = ['uploaded_at', 'size', 'original_filename']
    ordering = ['-uploaded_at']

    def list(self, request, *args, **kwargs):
        # Extract all query parameters
        filters = {
            'search': request.query_params.get('search', ''),
            'file_type': request.query_params.get('file_type', ''),
            'is_duplicate': request.query_params.get('is_duplicate'),
            'min_size': request.query_params.get('min_size'),
            'max_size': request.query_params.get('max_size'),
            'uploaded_after': request.query_params.get('uploaded_after'),
            'uploaded_before': request.query_params.get('uploaded_before'),
        }
        
        # Get pagination parameters
        page = self.paginator.get_page_number(request, self.paginator)
        page_size = request.query_params.get('page_size', self.pagination_class.page_size)
        
        # Get ordering
        ordering = request.query_params.get('ordering', '-uploaded_at')

        # Generate cache key
        cache_key = FileListCache.generate_cache_key(filters, page, page_size, ordering)
        logger.info(f"Generated cache key: {cache_key}")
        
        # Try to get data from cache
        cached_data = FileListCache.get_cached_data(cache_key)
        if cached_data is not None:
            logger.info(f"Cache hit for key: {cache_key}")
            return Response(cached_data)

        logger.info(f"Cache miss for key: {cache_key}")
        # If not in cache, get from database
        response = super().list(request, *args, **kwargs)
        
        # Store in cache
        try:
            FileListCache.set_cached_data(cache_key, response.data)
            logger.info(f"Successfully stored data in cache with key: {cache_key}")
            
            # Verify the data was stored
            verification = FileListCache.get_cached_data(cache_key)
            if verification is not None:
                logger.info("Cache verification successful")
            else:
                logger.error("Cache verification failed - data not stored")
        except Exception as e:
            logger.error(f"Error storing data in cache: {str(e)}")
        
        return response

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        # Invalidate the file list cache when a new file is created
        cache.delete_pattern("file_list:*")
        return response

    def destroy(self, request, *args, **kwargs):
        response = super().destroy(request, *args, **kwargs)
        # Invalidate the file list cache when a file is deleted
        cache.delete_pattern("file_list:*")
        return response

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Download the file content
        """
        file_obj = self.get_object()
        
        # Get the actual file content (either from this file or its original)
        if file_obj.is_duplicate and file_obj.original_file:
            content = file_obj.original_file.file_content
        else:
            content = file_obj.file_content

        response = HttpResponse(
            content,
            content_type=file_obj.file_type
        )
        response['Content-Disposition'] = f'attachment; filename="{file_obj.original_filename}"'
        return response

    @action(detail=False, methods=['get'])
    def duplicates(self, request):
        """
        Get all files that have duplicates
        """
        files_with_duplicates = File.objects.filter(
            duplicates__isnull=False
        ).distinct()
        serializer = self.get_serializer(files_with_duplicates, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def storage_metrics(self, request):
        """Get detailed storage metrics"""
        # Try to get from cache
        cache_key = "storage_metrics"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # If not in cache, calculate metrics
        original_files = File.objects.filter(is_duplicate=False)
        duplicate_files = File.objects.filter(is_duplicate=True)

        # Basic counts
        total_files = File.objects.count()
        total_unique_files = original_files.count()
        total_duplicates = duplicate_files.count()
        
        # Storage calculations
        actual_storage = original_files.aggregate(total=Sum('size'))['total'] or 0
        theoretical_storage = actual_storage + (duplicate_files.aggregate(total=Sum('size'))['total'] or 0)
        
        # Calculate originality metrics
        originality_percentage = (total_unique_files / total_files * 100) if total_files > 0 else 100
        storage_efficiency = (actual_storage / theoretical_storage * 100) if theoretical_storage > 0 else 100
        
        # Calculate average duplication factor
        files_with_duplicates = (
            File.objects.filter(is_duplicate=False)
            .annotate(duplicate_count=Count('duplicates'))
            .aggregate(
                total_duplicates=Sum('duplicate_count'),
                file_count=Count('id')
            )
        )
        avg_duplication_factor = (
            (files_with_duplicates['total_duplicates'] or 0) / 
            files_with_duplicates['file_count']
            if files_with_duplicates['file_count'] > 0 else 0
        )

        # Get most duplicated files
        top_duplicated = (
            File.objects.filter(is_duplicate=False)
            .annotate(
                duplicate_count=Count('duplicates'),
                total_size_saved=F('size') * F('duplicate_count'),
                originality_factor=Cast(1, FloatField()) / (Cast('duplicate_count', FloatField()) + 1)
            )
            .filter(duplicate_count__gt=0)
            .order_by('-duplicate_count')
            .values(
                'original_filename',
                'size',
                'duplicate_count',
                'total_size_saved',
                'originality_factor'
            )[:5]
        )

        response_data = {
            'summary_metrics': {
                'total_files': total_files,
                'unique_files': total_unique_files,
                'duplicate_files': total_duplicates,
                'actual_storage_bytes': actual_storage,
                'theoretical_storage_bytes': theoretical_storage,
                'original_storage_bytes': actual_storage,
            },
            'efficiency_metrics': {
                'originality_percentage': round(originality_percentage, 2),  # Percentage of files that are original
                'storage_efficiency': round(storage_efficiency, 2),  # Percentage of storage used by original files
                'average_duplication_factor': round(avg_duplication_factor + 1, 2),  # Average copies per file (including original)
            },
            'duplicate_statistics': [
                {
                    **stat,
                    'originality_percentage': round(stat['originality_factor'] * 100, 2)
                }
                for stat in top_duplicated
            ]
        }

        # Store in cache
        cache.set(cache_key, response_data, timeout=settings.CACHE_TTL)

        return Response(response_data)

    @action(detail=False, methods=['get'])
    def test_cache(self, request):
        """Test endpoint to verify Redis cache functionality"""
        test_key = "test_cache_key"
        test_data = {"test": "data"}
        
        try:
            # Try to store data
            cache.set(test_key, test_data, timeout=300)
            logger.info("Successfully stored test data in cache")
            
            # Try to retrieve data
            retrieved_data = cache.get(test_key)
            if retrieved_data == test_data:
                logger.info("Successfully retrieved test data from cache")
                return Response({
                    "status": "success",
                    "message": "Cache is working correctly",
                    "data": retrieved_data
                })
            else:
                logger.error("Retrieved data doesn't match stored data")
                return Response({
                    "status": "error",
                    "message": "Cache retrieval verification failed"
                }, status=500)
            
        except Exception as e:
            logger.error(f"Cache test failed: {str(e)}")
            return Response({
                "status": "error",
                "message": f"Cache test failed: {str(e)}"
            }, status=500)
