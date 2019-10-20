import { TorrentSourceDetail } from './torrent-source-detail';
import { StreamLinkSourceDetail } from './stream-link-source-detail';

export interface SourceByProvider {
  provider: string;
  torrentSourceDetail: TorrentSourceDetail;
  cachedTorrentDetail: StreamLinkSourceDetail;
  timeElapsedTotal: number;
}
