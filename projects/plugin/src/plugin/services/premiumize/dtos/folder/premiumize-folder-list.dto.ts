export interface PremiumizeFolderListContentDto {
  id: string;
  name: string;
  type: 'folder' | 'file';
  transcode_status?: string;
  size?: number;
  vcodec?: string;
  resx?: string;
  created_at?: number;
  ip?: string;
  mime_type?: string;
  virus_scan?: string;
  link?: string;
  stream_link?: string;
}

export interface PremiumizeFolderListDto {
  status: 'error' | 'success';
  message?: string;
  content: PremiumizeFolderListContentDto[];
  breadcrumbs: string[];
  name: string;
  parent_id: string;
  folder_id: string;
}
