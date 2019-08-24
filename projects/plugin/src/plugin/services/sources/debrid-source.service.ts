import { Injectable } from '@angular/core';
import { SourceEpisodeQuery, SourceQuery } from '../../entities/source-query';
import { RealDebridSourcesFromTorrentsQuery } from '../../queries/debrids/real-debrid-sources-from-torrents.query';
import { catchError, last, map, switchMap } from 'rxjs/operators';
import { PremiumizeSourcesFromTorrentsQuery } from '../../queries/debrids/premiumize-sources-from-torrents.query';
import { TorrentSource } from '../../entities/torrent-source';
import { concat, of } from 'rxjs';
import { DebridSource, DebridSourceFile } from '../../entities/debrid-source';
import { getScoreMatchingName, getSourcesByQuality, sortTorrentsBySize } from '../tools';

@Injectable()
export class DebridSourceService {
  constructor() {}

  private excludedDebrided(torrents: TorrentSource[]) {
    return torrents.filter(torrent => (torrent.isOnRD || torrent.isOnPM) === false);
  }

  getFromTorrents(torrents: TorrentSource[], sourceQuery: SourceQuery | SourceEpisodeQuery | string) {
    return PremiumizeSourcesFromTorrentsQuery.getData(torrents, sourceQuery).pipe(
      switchMap(pmSources => {
        return RealDebridSourcesFromTorrentsQuery.getData(this.excludedDebrided(torrents), sourceQuery).pipe(
          map(rdSources => {
            return rdSources.concat(...pmSources);
          })
        );
      })
    );
  }

  getBestSource(debridSources: DebridSource[], previousPlayedSourceName?: string) {
    if (debridSources.length === 0) {
      return of(null);
    }
    const debridQuality = getSourcesByQuality<DebridSource>(debridSources, sortTorrentsBySize);

    let bestSource: DebridSource = null;
    const bestDebridSourceObss = [];

    const allDebridSources = debridQuality.sources2160p.concat(
      debridQuality.sources1080p,
      debridQuality.sources720p,
      debridQuality.sourcesOther
    );

    if (previousPlayedSourceName) {
      let maxScore = 0;
      let debridSource;
      debridSources.forEach(d => {
        const score = getScoreMatchingName(previousPlayedSourceName, d.title);
        console.log(d.title, score, previousPlayedSourceName);
        if (score > maxScore) {
          debridSource = d;
          maxScore = score;
        }
      });
      if (debridSource) {
        allDebridSources.unshift(debridSource);
      }
    }

    allDebridSources.forEach(debridSource => {
      bestDebridSourceObss.push(
        of(true).pipe(
          switchMap(() => {
            if (bestSource) {
              return of(bestSource);
            }

            return debridSource.debridSourceFileObs.pipe(
              catchError(() => {
                return of(null);
              }),
              map(debridSourceFile => {
                if (debridSourceFile instanceof DebridSourceFile) {
                  bestSource = debridSource;
                }

                return of(bestSource);
              })
            );
          })
        )
      );
    });

    return concat(...bestDebridSourceObss).pipe(
      last(),
      map(() => {
        return bestSource;
      })
    );
  }
}
