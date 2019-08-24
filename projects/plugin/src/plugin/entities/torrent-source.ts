import { SourceQuality } from './source-quality';

export class TorrentSource {
  id: string;
  providerName: string;
  fileName: string;
  title: string;
  seeds: number;
  peers: number;
  size: number;
  quality: SourceQuality;
  url: string;
  subPageUrl?: string;
  isPackage: boolean;
  hash: string;
  isOnPM: boolean;
  isOnRD: boolean;
}
