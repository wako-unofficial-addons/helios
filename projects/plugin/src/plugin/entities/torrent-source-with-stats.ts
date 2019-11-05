import { TorrentSource } from './torrent-source';
import { SourceTorrentStats } from './source-torrent-stats';

export interface TorrentSourceWithStats {
  torrents: TorrentSource[];
  stats: SourceTorrentStats[]
}
