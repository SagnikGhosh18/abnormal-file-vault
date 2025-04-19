from django.db import models
import uuid
import os
import hashlib

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
    file = models.FileField(upload_to=file_upload_path)
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)
    size = models.BigIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_hash = models.CharField(max_length=64, db_index=True, null=True)  # SHA256 hash
    is_duplicate = models.BooleanField(default=False)
    original_file = models.ForeignKey(
        'self', 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name='duplicates'
    )
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return self.original_filename

    @staticmethod
    def calculate_sha256(file_object):
        """Calculate SHA256 hash of a file"""
        sha256_hash = hashlib.sha256()
        for chunk in file_object.chunks():
            sha256_hash.update(chunk)
        return sha256_hash.hexdigest()

    def save(self, *args, **kwargs):
        if not self.file_hash and self.file:
            # Calculate hash only if it hasn't been set and we have a file
            self.file.seek(0)  # Ensure we're at the start of the file
            self.file_hash = self.calculate_sha256(self.file)
            self.file.seek(0)  # Reset file pointer for subsequent operations
        super().save(*args, **kwargs)
