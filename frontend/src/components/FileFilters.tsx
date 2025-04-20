import React from 'react';
import { Box, TextField, Select, MenuItem, FormControl, InputLabel, Stack } from '@mui/material';

interface FileFiltersProps {
  filters: {
    search: string;
    fileType: string;
    isDuplicate: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  onFilterChange: (name: string, value: string) => void;
}

const FileFilters: React.FC<FileFiltersProps> = ({ filters, onFilterChange }) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 2 }}>
        <TextField
          label="Search by filename"
          variant="outlined"
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
        />

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>File Type</InputLabel>
          <Select
            value={filters.fileType}
            label="File Type"
            onChange={(e) => onFilterChange('fileType', e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="application/pdf">PDF</MenuItem>
            <MenuItem value="image/jpeg">JPEG</MenuItem>
            <MenuItem value="image/png">PNG</MenuItem>
            <MenuItem value="text/plain">Text</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Duplicate Status</InputLabel>
          <Select
            value={filters.isDuplicate}
            label="Duplicate Status"
            onChange={(e) => onFilterChange('isDuplicate', e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Duplicates</MenuItem>
            <MenuItem value="false">Originals</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={filters.sortBy}
            label="Sort By"
            onChange={(e) => onFilterChange('sortBy', e.target.value)}
          >
            <MenuItem value="uploaded_at">Date</MenuItem>
            <MenuItem value="size">Size</MenuItem>
            <MenuItem value="original_filename">Name</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Order</InputLabel>
          <Select
            value={filters.sortOrder}
            label="Order"
            onChange={(e) => onFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
          >
            <MenuItem value="desc">Descending</MenuItem>
            <MenuItem value="asc">Ascending</MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </Box>
  );
};

export default FileFilters;
