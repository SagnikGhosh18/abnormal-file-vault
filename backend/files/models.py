from django.db import models
import uuid
import os
import hashlib
from django.core.files.uploadedfile import UploadedFile

def file_upload_path(instance, filename):
    """Generate file path for new file upload"""
    ext = filename.split('.')[-1]
    if instance.file_hash:
        filename = f"{instance.file_hash}.{ext}"
    else:
        filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('uploads', filename)

class File(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)
    size = models.BigIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_hash = models.CharField(max_length=64, db_index=True)
    is_duplicate = models.BooleanField(default=False)
    original_file = models.ForeignKey(
        'self', 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name='duplicates'
    )
    # New fields for storing file content
    file_content = models.BinaryField(null=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return self.original_filename

    @staticmethod
    def calculate_sha256(file_content: bytes) -> str:
        """Calculate SHA256 hash of file content"""
        sha256_hash = hashlib.sha256()
        sha256_hash.update(file_content)
        return sha256_hash.hexdigest()

    def save_file_content(self, file: UploadedFile) -> None:
        """Save the file content and calculate hash"""
        content = file.read()
        self.file_content = content
        self.file_hash = self.calculate_sha256(content)
        self.size = len(content)

    def save(self, *args, **kwargs):
        if not self.file_hash and self.file:
            # Calculate hash only if it hasn't been set and we have a file
            self.file.seek(0)  # Ensure we're at the start of the file
            self.file_hash = self.calculate_sha256(self.file.read())
            self.file.seek(0)  # Reset file pointer for subsequent operations
        super().save(*args, **kwargs)
