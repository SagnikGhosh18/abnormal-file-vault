import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FileFilters from './FileFilters';
import axios from 'axios';

interface File {
  id: string;
  original_filename: string;
  file_type: string;
  size: number;
  uploaded_at: string;
  is_duplicate: boolean;
  file_hash: string;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const FileList: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    fileType: '',
    isDuplicate: '',
    sortBy: 'uploaded_at',
    sortOrder: 'desc' as 'asc' | 'desc'
  });

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.fileType) params.append('file_type', filters.fileType);
      if (filters.isDuplicate) params.append('is_duplicate', filters.isDuplicate);
      params.append('ordering', `${filters.sortOrder === 'desc' ? '-' : ''}${filters.sortBy}`);

      const response = await axios.get(`${API_URL}/files/?${params.toString()}`);
      setFiles(response.data);
    } catch (err) {
      setError('Failed to load files. Please try again later.');
      console.error('Error loading files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [filters]);

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/files/${id}/`);
      loadFiles();
    } catch (err) {
      setError('Failed to delete file. Please try again.');
      console.error('Error deleting file:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <FileFilters filters={filters} onFilterChange={handleFilterChange} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Uploaded</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body1" color="textSecondary">
                    No files found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>{file.original_filename}</TableCell>
                  <TableCell>{file.file_type}</TableCell>
                  <TableCell>{formatFileSize(file.size)}</TableCell>
                  <TableCell>
                    {new Date(file.uploaded_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={file.is_duplicate ? 'Duplicate' : 'Original'}
                      color={file.is_duplicate ? 'secondary' : 'primary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleDelete(file.id)}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default FileList; 