import { ProviderResponse } from './provider';
import { TorrentSource } from './torrent-source';

export class TorrentSourceDetail {
  provider: string;
  sources: TorrentSource[];
  excludedSources: TorrentSource[] = [];
  providerResponses: ProviderResponse[] = [];
  timeElapsed: number;
  errorMessage?: string;
  skipped?: boolean;

  static setExcludedSources(torrentSourceDetail: TorrentSourceDetail) {
    torrentSourceDetail.excludedSources = [];

    for (const provider of torrentSourceDetail.providerResponses) {
      for (const source of provider.torrents) {
        if (source.excludedReason) {
          torrentSourceDetail.excludedSources.push(source);
        }
      }
    }
  }
}
