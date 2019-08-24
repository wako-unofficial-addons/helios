import { Injectable } from '@angular/core';
import { SourceEpisodeQuery, SourceQuery } from '../../entities/source-query';
import { RealDebridSourcesFromTorrentsQuery } from '../../queries/debrids/real-debrid-sources-from-torrents.query';
import { catchError, last, map, switchMap } from 'rxjs/operators';
import { PremiumizeSourcesFromTorrentsQuery } from '../../queries/debrids/premiumize-sources-from-torrents.query';
import { ProviderService } from '../provider.service';
import { SettingsService } from '../settings.service';
import { TorrentSource } from '../../entities/torrent-source';
import { concat, from, of } from 'rxjs';
import { DebridSource, DebridSourceFile } from '../../entities/debrid-source';
import { getScoreMatchingName, getSourcesByQuality, sortTorrentsBySize } from '../tools';
import { TorrentsFilterOnWantedQualityQuery } from '../../queries/torrents/torrents-filter-on-wanted-quality.query';

@Injectable()
export class DebridSourceService {
  constructor(private providerService: ProviderService, private settingsService: SettingsService) {
  }

  private excludedDebrided(torrents: TorrentSource[]) {
    return torrents.filter(torrent => (torrent.isOnRD || torrent.isOnPM) === false);
  }

  getFromTorrents(torrents: TorrentSource[], sourceQuery: SourceQuery | SourceEpisodeQuery | string, skipUnWantedQualityDebrid = true) {

    return from(this.settingsService.get())
      .pipe(
        map(settings => {
          if (!skipUnWantedQualityDebrid) {
            return torrents;
          }
          return TorrentsFilterOnWantedQualityQuery.getData(torrents, settings.qualities)
        }),
        switchMap(filteredTorrents => {
          return PremiumizeSourcesFromTorrentsQuery.getData(filteredTorrents, sourceQuery).pipe(
            switchMap(pmSources => {
              return RealDebridSourcesFromTorrentsQuery.getData(this.excludedDebrided(filteredTorrents), sourceQuery).pipe(
                map(rdSources => {
                  return rdSources.concat(...pmSources);
                })
              );
            })
          );
        })
      )


  }

  getBestSource(debridSources: DebridSource[], previousPlayedSourceName?: string) {
    if (debridSources.length === 0) {
      return of(null);
    }
    const debridQuality = getSourcesByQuality<DebridSource>(debridSources, sortTorrentsBySize);

    let bestSource: DebridSource = null;
    const bestDebridSourceObss = [];


    const allDebridSources = debridQuality.sources2160p.concat(debridQuality.sources1080p, debridQuality.sources720p, debridQuality.sourcesOther);

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
