export type TorboxTorrentState =
  | 'downloading'
  | 'uploading'
  | 'stalled (no seeds)'
  | 'paused'
  | 'completed'
  | 'cached'
  | 'metaDL'
  | 'checkingResumeData';

export interface TorboxTorrentFile {
  id: number;
  md5: string;
  hash: string;
  name: string;
  size: number;
  s3_path: string;
  mimetype: string;
  short_name: string;
  absolute_path: string;
}

export interface TorboxTorrentItem {
  id: number;
  auth_id: string;
  server: number;
  hash: string;
  name: string;
  magnet: string | null;
  size: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  download_state: TorboxTorrentState;
  seeds: number;
  peers: number;
  ratio: number;
  progress: number;
  download_speed: number;
  upload_speed: number;
  eta: number;
  torrent_file: boolean;
  expires_at: string | null;
  download_present: boolean;
  files: TorboxTorrentFile[];
  download_path: string;
  inactive_check: number;
  availability: number;
  download_finished: boolean;
  tracker: string | null;
  total_uploaded: number;
  total_downloaded: number;
  cached: boolean;
  owner: string;
  seed_torrent: boolean;
  allow_zipped: boolean;
  long_term_seeding: boolean;
  tracker_message: string | null;
}

export interface TorboxTorrentListDto {
  success: boolean;
  error: string | null;
  detail: string;
  data: TorboxTorrentItem[];
}
