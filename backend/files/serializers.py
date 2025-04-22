from rest_framework import serializers
from .models import File

class FileSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = File
        fields = [
            'id', 
            'original_filename', 
            'file_type', 
            'size', 
            'uploaded_at',
            'file_hash',
            'is_duplicate',
            'download_url'
        ]
        read_only_fields = [
            'id', 
            'uploaded_at', 
            'file_hash', 
            'is_duplicate',
            'download_url'
        ]

    def get_download_url(self, obj):
        request = self.context.get('request')
        if request is None:
            return None
        return request.build_absolute_uri(f'/api/files/{obj.id}/download/')