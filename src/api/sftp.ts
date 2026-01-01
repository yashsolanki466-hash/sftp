import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api/sftp';

export const sftpApi = {
    connect: (credentials: any) => axios.post(`${API_BASE_URL}/connect`, credentials),
    list: (sessionId: string, path: string) => axios.get(`${API_BASE_URL}/list`, { params: { sessionId, path } }),
    download: (sessionId: string, file: string, options: any = {}) => axios.get(`${API_BASE_URL}/download`, {
        params: { sessionId, file },
        responseType: 'blob',
        ...options
    }),
    delete: (sessionId: string, path: string, isDirectory: boolean) =>
        axios.post(`${API_BASE_URL}/delete`, { sessionId, path, isDirectory }),
    upload: (formData: FormData) => axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    batchDownload: (sessionId: string, paths: string[], options: any = {}) => axios.post(`${API_BASE_URL}/batch-download`,
        { sessionId, paths },
        { responseType: 'blob', headers: { Accept: 'application/zip' }, ...options }
    ),
    // Return file as text for small previews (server will stream same endpoint)
    preview: (sessionId: string, file: string, options: any = {}) => axios.get(`${API_BASE_URL}/download`, {
        params: { sessionId, file },
        responseType: 'text',
        ...options
    }),
    disconnect: (sessionId: string) => axios.post(`${API_BASE_URL}/disconnect`, { sessionId }),
};
