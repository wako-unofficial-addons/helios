import { Injectable } from '@angular/core';
import { SourceEpisodeQuery, SourceQuery } from '../../entities/source-query';
import { RealDebridSourcesFromTorrentsQuery } from '../../queries/debrids/real-debrid-sources-from-torrents.query';
import { catchError, last, map, mapTo, switchMap } from 'rxjs/operators';
import { PremiumizeSourcesFromTorrentsQuery } from '../../queries/debrids/premiumize-sources-from-torrents.query';
import { TorrentSource } from '../../entities/torrent-source';
import { concat, forkJoin, Observable, of } from 'rxjs';
import { DebridSource, DebridSourceFile } from '../../entities/debrid-source';
import { getScoreMatchingName, getSourcesByQuality, sortTorrentsBySize } from '../tools';
import { TorrentGetUrlQuery } from '../../queries/torrents/torrent-get-url.query';
import { TorrentsFromProviderBaseQuery } from '../../queries/torrents/torrents-from-provider-base.query';
import { PremiumizeAccountInfoForm } from '../premiumize/forms/account/premiumize-account-info.form';

@Injectable()
export class DebridSourceService {
  constructor() {
  }

  private excludedDebrided(torrents: TorrentSource[]) {
    return torrents.filter(torrent => (torrent.isOnRD || torrent.isOnPM) === false);
  }

  private getHashFromSubPages(torrents: TorrentSource[]) {
    if (torrents.length === 0) {
      return of(torrents);
    }
    const obss: Observable<TorrentSource>[] = [];

    const allTorrents: TorrentSource[] = [];
    const allHashes = [];

    torrents.forEach(torrent => {
      if (torrent.hash || !torrent.subPageUrl) {
        if (torrent.hash) {
          allHashes.push(torrent.hash);
        }
        allTorrents.push(torrent);
        obss.push(of(torrent));
        return;
      }
      const obs = TorrentGetUrlQuery.getData(torrent.url, torrent.subPageUrl).pipe(
        map(url => {
          if (url) {
            torrent.url = url;
            torrent.hash = TorrentsFromProviderBaseQuery.getHashFromUrl(url);
          }
          if (!torrent.hash) {
            allTorrents.push(torrent);
          } else if (!allHashes.includes(torrent.hash)) {
            allHashes.push(torrent.hash);
            allTorrents.push(torrent);
          }
          return torrent;
        })
      );
      obss.push(obs);
    });
    return forkJoin(obss).pipe(mapTo(allTorrents));
  }

  getFromTorrents(torrents: TorrentSource[], sourceQuery: SourceQuery | SourceEpisodeQuery | string) {
    return this.getHashFromSubPages(torrents)
      .pipe(
        switchMap(newTorrents => {
          return PremiumizeSourcesFromTorrentsQuery.getData(newTorrents, sourceQuery).pipe(
            switchMap(pmSources => {
              return RealDebridSourcesFromTorrentsQuery.getData(this.excludedDebrided(newTorrents), sourceQuery).pipe(
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
        if (score > maxScore) {
          debridSource = d;
          maxScore = score;
        }
      });
      if (debridSource) {
        allDebridSources.unshift(debridSource);
      }
    }

    let hasPmSource = false;
    let hasPmPremiumAccount = true;

    allDebridSources.forEach(debridSource => {
      if (debridSource.serviceName === 'PM') {
        hasPmSource = true;
      }
      bestDebridSourceObss.push(
        of(true).pipe(
          switchMap(() => {
            if (bestSource) {
              return of(bestSource);
            }

            if (debridSource.serviceName === 'PM' && !hasPmPremiumAccount) { // Don't check to avoid burning free account limit
              return of(null);
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

    if (hasPmSource) {
      bestDebridSourceObss.unshift(
        PremiumizeAccountInfoForm.submit()
          .pipe(
            map(data => {
              if (data.status === 'success' && data.premium_until === false) {
                hasPmPremiumAccount = false;
              }
              return data;
            })
          )
      )
    }

    return concat(...bestDebridSourceObss).pipe(
      last(),
      map(() => {

        if (!bestSource && hasPmSource && !hasPmPremiumAccount && allDebridSources.length > 0) {
          // Free PM account only, since PM sources are almost all reliable, let take the first one < 5gb
          allDebridSources.forEach(source => {
            if (!bestSource && source.size < 5 * 1024 * 1024 * 1024) {
              bestSource = source;
            }
          })
        }

        return bestSource;
      })
    );
  }
}
