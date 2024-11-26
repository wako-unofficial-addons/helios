export interface TorboxTransferCreateDto {
  success: boolean;
  detail: string;
  data?: {
    torrent_id: string;
    id: string;
    name: string;
    status: string;
    hash: string;
    size: number;
    progress: number;
    downloaded: number;
    speed: number;
    created_at: string;
    completed_at: string | null;
  } | null;
}
