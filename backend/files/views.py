from django.shortcuts import render
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db.models import Q
from django_filters import rest_framework as django_filters
import os
from .models import File
from .serializers import FileSerializer
from django.http import HttpResponse

# Create your views here.

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

class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer
    filter_backends = [
        django_filters.DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    filterset_class = FileFilter
    search_fields = ['original_filename']
    ordering_fields = ['uploaded_at', 'size', 'original_filename']
    ordering = ['-uploaded_at']  # default ordering

    def create(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response(
                {'error': 'No file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Read file content and calculate hash
        file_content = file_obj.read()
        file_hash = File.calculate_sha256(file_content)
        file_obj.seek(0)  # Reset file pointer

        # Check if a file with this hash already exists
        existing_file = File.objects.filter(
            Q(file_hash=file_hash, is_duplicate=False) | 
            Q(file_hash=file_hash, original_file__isnull=True)
        ).first()

        if existing_file:
            # Create a new file record that points to the existing file
            new_file = File(
                original_filename=file_obj.name,
                file_type=file_obj.content_type,
                size=len(file_content),
                file_hash=file_hash,
                is_duplicate=True,
                original_file=existing_file
            )
            new_file.save()
            
            serializer = self.get_serializer(new_file)
            return Response(
                {
                    **serializer.data,
                    'message': 'File already exists. Created reference to existing file.'
                },
                status=status.HTTP_201_CREATED
            )
        else:
            # Create new file record with content
            new_file = File(
                original_filename=file_obj.name,
                file_type=file_obj.content_type,
                size=len(file_content),
                file_hash=file_hash,
                is_duplicate=False,
                file_content=file_content
            )
            new_file.save()
            
            serializer = self.get_serializer(new_file)
            return Response(
                serializer.data, 
                status=status.HTTP_201_CREATED
            )

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

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Check if this is the original file and has duplicates
        if not instance.is_duplicate and instance.duplicates.exists():
            # Find the oldest duplicate to become the new original
            new_original = instance.duplicates.order_by('uploaded_at').first()
            
            # Update all other duplicates to point to the new original
            instance.duplicates.exclude(id=new_original.id).update(
                original_file=new_original
            )
            
            # Update the new original
            new_original.is_duplicate = False
            new_original.original_file = None
            new_original.file_content = instance.file_content
            new_original.save()
        
        # If this is the last copy and it's not a duplicate, delete the content
        if not instance.is_duplicate and not instance.duplicates.exists():
            instance.file_content = None
            
        return super().destroy(request, *args, **kwargs)

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
