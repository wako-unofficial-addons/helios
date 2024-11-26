export interface TorboxFileItemDto {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  stream_url: string;
  download_url: string;
  created_at: string;
}

export interface TorboxFileListDto {
  status: 'success' | 'error';
  data?: {
    files: TorboxFileItemDto[];
  };
  error?: {
    message: string;
  };
}
