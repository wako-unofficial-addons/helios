import { SourceQuality } from './source-quality';
import { BaseSource } from './base-source';

export interface TorrentSource extends BaseSource {
  id: string;
  provider: string;
  title: string;
  seeds: number;
  peers: number;
  size: number;
  quality: SourceQuality;
  url: string;
  subPageUrl?: string;
  isPackage: boolean;
  hash: string;
  isCached: boolean;
  cachedService?: 'PM' | 'RD' | 'AD';
}
