import { TorrentSource } from './torrent-source';
import { DebridSource } from './debrid-source';
import { SourceTorrentStats } from './source-torrent-stats';

export interface  SourceDetail {
  bestDebrid: DebridSource;
  debridSources: DebridSource[];
  bestTorrent: TorrentSource;
  torrentSources: TorrentSource[];
  stats: SourceTorrentStats[];
}
