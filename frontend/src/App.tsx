import React from 'react';
import { Container, Typography, Box, CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';
import StorageMetrics from './components/StorageMetrics';

const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            File Hub
          </Typography>
          <StorageMetrics />
          <FileUpload onUploadComplete={() => window.location.reload()} />
          <Box sx={{ mt: 4 }}>
            <FileList />
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
