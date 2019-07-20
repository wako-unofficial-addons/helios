import { Observable } from 'rxjs';

export class Torrent {
  providerName: string;
  displayName?: string;
  title: string;
  seeds: number;
  peers: number;
  size_bytes?: number;
  size_str?: string;
  quality: string;
  url: string;
  subPageUrl: string;
  isAccurate?: boolean;
  isCachedSource: boolean;
  cachedData?: {
    service: 'PM' | 'RD';
    link?: CachedLink;
    linkObs?: Observable<CachedLink | CachedLink[]>;
  };
  hash?: string;
}

export interface CachedLink {
  filename: string;
  is_streamable: boolean;
  url: string;
  transcoded_url: string;
}
