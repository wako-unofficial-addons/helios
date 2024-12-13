import { ProviderResponse } from './provider';
import { TorrentSource } from './torrent-source';

export class TorrentSourceDetail {
  provider: string;
  sources: TorrentSource[];
  providerResponses: ProviderResponse[];
  timeElapsed: number;
  errorMessage?: string;
  skipped?: boolean;
}
