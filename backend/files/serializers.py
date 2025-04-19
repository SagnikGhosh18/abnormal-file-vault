from rest_framework import serializers
from .models import File

class FileSerializer(serializers.ModelSerializer):
    is_duplicate = serializers.BooleanField(read_only=True)
    file_hash = serializers.CharField(read_only=True)
    original_file_id = serializers.UUIDField(source='original_file.id', read_only=True)
    
    class Meta:
        model = File
        fields = [
            'id', 
            'file', 
            'original_filename', 
            'file_type', 
            'size', 
            'uploaded_at',
            'file_hash',
            'is_duplicate',
            'original_file_id'
        ]
        read_only_fields = [
            'id', 
            'uploaded_at', 
            'file_hash', 
            'is_duplicate', 
            'original_file_id'
        ]