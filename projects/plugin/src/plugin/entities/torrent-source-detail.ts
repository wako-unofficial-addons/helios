import { TorrentSource } from './torrent-source';

export class TorrentSourceDetail {
  provider: string;
  sources: TorrentSource[];
  timeElapsed: number;
  errorMessage?: string;
}
