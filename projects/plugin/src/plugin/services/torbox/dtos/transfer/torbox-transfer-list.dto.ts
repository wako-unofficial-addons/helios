export interface TorboxTransferListItemDto {
  id: string;
  name: string;
  size: number;
  status: string;
  progress: number;
  downloaded: number;
  speed: number;
  created_at: string;
  completed_at: string;
}

export interface TorboxTransferListDto {
  status: 'success' | 'error';
  data?: {
    transfers: TorboxTransferListItemDto[];
  };
  error?: {
    message: string;
  };
}
