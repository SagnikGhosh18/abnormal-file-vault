import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    Divider,
    Grid,
    Paper,
    Tooltip
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import fileService from '../services/fileService';

interface StorageMetrics {
    summary_metrics: {
        total_files: number;
        unique_files: number;
        duplicate_files: number;
        actual_storage_bytes: number;
        theoretical_storage_bytes: number;
        original_storage_bytes: number;
    };
    efficiency_metrics: {
        originality_percentage: number;
        storage_efficiency: number;
        average_duplication_factor: number;
    };
    duplicate_statistics: Array<{
        original_filename: string;
        size: number;
        duplicate_count: number;
        total_size_saved: number;
        originality_percentage: number;
    }>;
}

const StorageMetrics: React.FC = () => {
    const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    const loadMetrics = async () => {
        try {
            const data = await fileService.getStorageMetrics();
            setMetrics(data);
        } catch (err) {
            setError('Failed to load storage metrics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMetrics();
    }, []);

    if (loading) return <CircularProgress />;
    if (error) return <Typography color="error">{error}</Typography>;
    if (!metrics) return null;

    const pieData = [
        { name: 'Actual Storage', value: metrics.summary_metrics.actual_storage_bytes },
        { name: 'Saved Storage', value: metrics.summary_metrics.original_storage_bytes - metrics.summary_metrics.actual_storage_bytes }
    ];

    return (
        <Box sx={{ mb: 4 }}>
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Storage Efficiency
                            </Typography>
                            <Box sx={{ position: 'relative', display: 'inline-flex', mb: '40px' }}>
                                <CircularProgress
                                    variant="determinate"
                                    value={metrics.efficiency_metrics.originality_percentage}
                                    size={80}
                                    thickness={4}
                                    color="primary"
                                />
                                <Box
                                    sx={{
                                        top: 0,
                                        left: 0,
                                        bottom: 0,
                                        right: 0,
                                        position: 'absolute',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Typography variant="caption" component="div">
                                        {`${Math.round(metrics.efficiency_metrics.originality_percentage)}%`}
                                    </Typography>
                                </Box>
                            </Box>
                            <List dense sx={{display: 'flex', flexDirection: 'row', gap: 1}}>
                                <ListItem>
                                    <Tooltip title="Percentage of total files that are originals">
                                        <ListItemText
                                            primary={
                                                <Box display="flex" alignItems="center">
                                                    Originality
                                                    <InfoIcon fontSize="small" sx={{ ml: 1 }} />
                                                </Box>
                                            }
                                            secondary={`${metrics.efficiency_metrics.originality_percentage}%`}
                                        />
                                    </Tooltip>
                                </ListItem>
                                <ListItem>
                                    <Tooltip title="Percentage of storage used by original files">
                                        <ListItemText
                                            primary={
                                                <Box display="flex" alignItems="center">
                                                    Efficiency
                                                    <InfoIcon fontSize="small" sx={{ ml: 1 }} />
                                                </Box>
                                            }
                                            secondary={`${metrics.efficiency_metrics.storage_efficiency}%`}
                                        />
                                    </Tooltip>
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Storage Summary
                            </Typography>
                            <List dense>
                                <ListItem>
                                    <ListItemText
                                        primary="Actual Storage Used"
                                        secondary={formatBytes(metrics.summary_metrics.actual_storage_bytes)}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="Saved Storage"
                                        secondary={formatBytes(metrics.summary_metrics.original_storage_bytes - metrics.summary_metrics.actual_storage_bytes)}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="Theoretical Storage"
                                        secondary={formatBytes(metrics.summary_metrics.theoretical_storage_bytes)}
                                    />
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                File Statistics
                            </Typography>
                            <List dense>
                                <ListItem>
                                    <ListItemText
                                        primary="Total Files"
                                        secondary={metrics.summary_metrics.total_files}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="Unique Files"
                                        secondary={metrics.summary_metrics.unique_files}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary="Duplicate Files"
                                        secondary={metrics.summary_metrics.duplicate_files}
                                    />
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {metrics.duplicate_statistics.length > 0 && (
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Most Duplicated Files
                                </Typography>
                                <List>
                                    {metrics.duplicate_statistics.map((stat, index) => (
                                        <React.Fragment key={index}>
                                            <ListItem>
                                                <ListItemText
                                                    primary={stat.original_filename}
                                                    secondary={
                                                        <>
                                                            <Typography variant="body2">
                                                                {`${stat.duplicate_count} duplicates • ${formatBytes(stat.total_size_saved)} total`}
                                                            </Typography>
                                                            <Typography variant="body2" color="primary.main">
                                                                {`${stat.originality_percentage}% originality`}
                                                            </Typography>
                                                        </>
                                                    }
                                                />
                                            </ListItem>
                                            {index < metrics.duplicate_statistics.length - 1 && <Divider />}
                                        </React.Fragment>
                                    ))}
                                </List>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default StorageMetrics;
