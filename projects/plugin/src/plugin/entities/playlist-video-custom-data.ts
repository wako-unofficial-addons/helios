import { SourceQuery } from './source-query';
import { TorrentSource } from './torrent-source';

export interface PlaylistVideoHeliosCustomData {
  sourceQuery?: SourceQuery;
  torrentSource?: TorrentSource;
  type?: 'torrent' | 'cached_torrent';
}
