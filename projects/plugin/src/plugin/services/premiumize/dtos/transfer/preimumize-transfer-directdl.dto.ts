export interface PreimumizeTransferDirectdlContentDto {
  path: string;
  size: number;
  link: string;
  stream_link: string;
  transcode_status: string;
}

export interface PreimumizeTransferDirectdlDto {
  status: 'success' | 'error';
  message?: string;
  content?: PreimumizeTransferDirectdlContentDto[];
}
