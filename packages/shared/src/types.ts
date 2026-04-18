export type IconType = 'mdi' | 'uploaded_file' | 'remote_url';
export type AppSource = 'manual' | 'docker' | 'kubernetes';
export type SyncStatus = 'running' | 'success' | 'error';
export type SortOrder = 'name_asc' | 'name_desc' | 'created_asc' | 'created_desc' | 'custom';

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
