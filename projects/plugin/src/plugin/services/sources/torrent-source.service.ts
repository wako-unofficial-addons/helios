import { Injectable } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LastPlayedSource } from '../../entities/last-played-source';
import { Provider } from '../../entities/provider';
import { Settings } from '../../entities/settings';
import { SourceQuery } from '../../entities/source-query';
import { TorrentSource } from '../../entities/torrent-source';
import { TorrentsFromProviderQuery } from '../../queries/torrents/torrents-from-provider.query';
import { getScoreMatchingName, getSourcesByQuality, sortTorrentsBalanced } from '../tools';

@Injectable()
export class TorrentSourceService {
  getBestSource(torrents: TorrentSource[], lastPlayedSource?: LastPlayedSource) {
    const torrentQuality = getSourcesByQuality<TorrentSource>(torrents, sortTorrentsBalanced);

    if (lastPlayedSource) {
      let maxScore = 0;
      let source: TorrentSource;
      torrents.forEach((t) => {
        const score = getScoreMatchingName(lastPlayedSource.title, t.title);
        if (score > maxScore) {
          source = t;
          maxScore = score;
        }
      });
      if (source) {
        return source;
      }
    }

    let bestTorrent: TorrentSource = null;

    if (this.hasBestTorrent(torrentQuality.sources2160p)) {
      bestTorrent = torrentQuality.sources2160p[0];
    } else if (this.hasBestTorrent(torrentQuality.sources1080p)) {
      bestTorrent = torrentQuality.sources1080p[0];
    } else if (this.hasBestTorrent(torrentQuality.sources720p)) {
      bestTorrent = torrentQuality.sources720p[0];
    } else if (this.hasBestTorrent(torrentQuality.sourcesOther)) {
      bestTorrent = torrentQuality.sourcesOther[0];
    }

    return bestTorrent;
  }

  getByProvider(sourceQuery: SourceQuery, provider: Provider) {
    return TorrentsFromProviderQuery.getData(sourceQuery, provider).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  private hasBestTorrent(torrents: TorrentSource[]) {
    if (torrents.length === 0) {
      return false;
    }
    const torrent = torrents[0];
    return torrent.seeds >= 20 && torrent.seeds > torrent.peers;
  }
}
