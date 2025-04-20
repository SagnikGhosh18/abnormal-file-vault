import React, { useState } from 'react';
import { Button, Box, LinearProgress, Typography, Alert } from '@mui/material';
import axios from 'axios';

// Define the props interface
export interface FileUploadProps {
  onUploadComplete: () => void;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API_URL}/files/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      onUploadComplete();
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset the input
      event.target.value = '';
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <input
        accept="*/*"
        style={{ display: 'none' }}
        id="raised-button-file"
        type="file"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <label htmlFor="raised-button-file">
        <Button
          variant="contained"
          component="span"
          disabled={uploading}
        >
          Upload File
        </Button>
      </label>

      {uploading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <Typography variant="body2" color="text.secondary" align="center">
            {uploadProgress}%
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default FileUpload; 