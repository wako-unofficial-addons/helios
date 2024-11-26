interface TorboxCacheFile {
  name: string;
  size: number;
}

interface TorboxCacheItem {
  name: string;
  size: number;
  hash: string;
  files: TorboxCacheFile[];
}

export interface TorboxCacheCheckDto {
  success: boolean;
  detail: string;
  data: Record<string, TorboxCacheItem>;
}
