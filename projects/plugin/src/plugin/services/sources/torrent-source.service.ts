import { Injectable } from '@angular/core';
import { ProviderService } from '../provider.service';
import { SettingsService } from '../settings.service';
import { from, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { TorrentSource } from '../../entities/torrent-source';
import { getScoreMatchingName, getSourcesByQuality, sortTorrentsBalanced } from '../tools';
import { Provider } from '../../entities/provider';
import { SourceQuery } from '../../entities/source-query';
import { TorrentsFromProviderQuery } from '../../queries/torrents/torrents-from-provider.query';
import { LastPlayedSource } from '../../entities/last-played-source';

@Injectable()
export class TorrentSourceService {
  constructor(private providerService: ProviderService, private settingsService: SettingsService) {
  }


  getBestSource(torrents: TorrentSource[], lastPlayedSource?: LastPlayedSource) {
    const torrentQuality = getSourcesByQuality<TorrentSource>(torrents, sortTorrentsBalanced);

    if (lastPlayedSource) {
      let maxScore = 0;
      let source;
      torrents.forEach(t => {
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

  private excludeUnwantedHighQuality(torrents: TorrentSource[]) {
    return from(this.settingsService.get()).pipe(
      map(settings => {
        const excludeQualities = [];
        let stop = false;
        settings.qualities.forEach(quality => {
          if (quality.enabled) {
            stop = true;
          }
          if (!stop && !quality.enabled) {
            excludeQualities.push(quality.quality);
          }
        });

        return torrents.filter(torrent => !excludeQualities.includes(torrent.quality));
      })
    );
  }

  getByProvider(sourceQuery: SourceQuery, provider: Provider) {
    return TorrentsFromProviderQuery.getData(sourceQuery, provider)
      .pipe(
        catchError(err => {
          return throwError(err);
        }),
        switchMap(torrentSourceDetail => {
          return this.excludeUnwantedHighQuality(torrentSourceDetail.sources)
            .pipe(
              map(torrents => {
                torrentSourceDetail.sources = torrents;
                return torrentSourceDetail;
              })
            )
        }),
      )
  }

  private hasBestTorrent(torrents: TorrentSource[]) {
    if (torrents.length === 0) {
      return false;
    }
    const torrent = torrents[0];
    return torrent.seeds >= 20 && torrent.seeds > torrent.peers;
  }
}
