import axios, { AxiosResponse } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export interface FileData {
    id: string;
    original_filename: string;
    file_type: string;
    size: number;
    uploaded_at: string;
    is_duplicate: boolean;
    file_hash: string;
    download_url: string;
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    total_pages: number;
    current_page: number;
    results: T[];
}

export interface FileFilter {
    search?: string;
    file_type?: string;
    is_duplicate?: boolean;
    ordering?: string;
    page?: number;
    page_size?: number;
}

export interface StorageMetrics {
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

// Create axios instance with default config
const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add response interceptor for rate limit handling
axiosInstance.interceptors.response.use(
    response => response,
    error => {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'];
                throw new Error(
                    `Rate limit exceeded. Please try again ${retryAfter ? `after ${retryAfter} seconds` : 'later'}.`
                );
            }
        }
        throw error;
    }
);

const fileService = {
    async getFiles(filters: FileFilter = {}): Promise<PaginatedResponse<FileData>> {
        const params = new URLSearchParams();
        
        if (filters.search) params.append('search', filters.search);
        if (filters.file_type) params.append('file_type', filters.file_type);
        if (filters.is_duplicate !== undefined) {
            params.append('is_duplicate', filters.is_duplicate.toString());
        }
        if (filters.ordering) params.append('ordering', filters.ordering);
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.page_size) params.append('page_size', filters.page_size.toString());

        const response = await axiosInstance.get<PaginatedResponse<FileData>>(`/files/?${params.toString()}`);
        return response.data;
    },

    async uploadFile(file: File): Promise<FileData> {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axiosInstance.post<FileData>('/files/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    async downloadFile(id: string, filename: string): Promise<void> {
        const response = await axiosInstance.get(`/files/${id}/download/`, {
            responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    async deleteFile(id: string): Promise<void> {
        await axiosInstance.delete(`/files/${id}/`);
    },

    // New utility methods for pagination
    calculatePageCount(totalItems: number, pageSize: number): number {
        return Math.ceil(totalItems / pageSize);
    },

    getPageRange(currentPage: number, totalPages: number, maxPages: number = 5): number[] {
        const range: number[] = [];
        const halfMax = Math.floor(maxPages / 2);
        
        let start = Math.max(currentPage - halfMax, 1);
        let end = Math.min(start + maxPages - 1, totalPages);
        
        if (end - start + 1 < maxPages) {
            start = Math.max(end - maxPages + 1, 1);
        }
        
        for (let i = start; i <= end; i++) {
            range.push(i);
        }
        
        return range;
    },

    async getStorageMetrics(): Promise<StorageMetrics> {
        try {
            const response = await axiosInstance.get<StorageMetrics>('/files/storage_metrics/');
            return response.data;
        } catch (error) {
            throw new Error('Error fetching storage metrics');
        }
    }
};

export default fileService;