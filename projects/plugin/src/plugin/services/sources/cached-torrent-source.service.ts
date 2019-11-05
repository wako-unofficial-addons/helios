import { Injectable } from '@angular/core';
import { SourceQuery } from '../../entities/source-query';
import { RealDebridSourcesFromTorrentsQuery } from '../../queries/debrids/real-debrid-sources-from-torrents.query';
import { catchError, concatMap, last, map, switchMap } from 'rxjs/operators';
import { PremiumizeSourcesFromTorrentsQuery } from '../../queries/debrids/premiumize-sources-from-torrents.query';
import { TorrentSource } from '../../entities/torrent-source';
import { from, Observable, of } from 'rxjs';
import {
  getScoreMatchingName,
  getSourcesByQuality,
  isEpisodeCodeMatchesFileName,
  sortTorrentsByPackage,
  sortTorrentsBySize
} from '../tools';
import { PremiumizeAccountInfoForm } from '../premiumize/forms/account/premiumize-account-info.form';
import { StreamLink, StreamLinkSource } from '../../entities/stream-link-source';
import { PremiumizeGetStreamLinkQuery } from '../../queries/debrids/premiumize-get-stream-link.query';
import { RealDebridGetStreamLinkQuery } from '../../queries/debrids/real-debrid-get-stream-link.query';
import { LastPlayedSource } from '../../entities/last-played-source';

@Injectable()
export class CachedTorrentSourceService {
  constructor() {
  }

  private excludedAlreadyCached(torrents: TorrentSource[]) {
    return torrents.filter(torrent => (torrent.isOnRD || torrent.isOnPM) === false);
  }

  private removeDuplicates(cachedSources: StreamLinkSource[]) {
    const ids = [];
    return cachedSources.filter(cachedSource => {
      if (ids.includes(cachedSource.id)) {
        return false;
      }
      ids.push(cachedSource.id);
      return true;
    });
  }

  getFromTorrents(torrents: TorrentSource[], sourceQuery: SourceQuery) {
    return PremiumizeSourcesFromTorrentsQuery.getData(torrents).pipe(
      switchMap(pmSources => {
        return RealDebridSourcesFromTorrentsQuery.getData(this.excludedAlreadyCached(torrents), sourceQuery).pipe(
          map(rdSources => {
            return rdSources.concat(...pmSources);
          })
        );
      })
    );
  }

  getStreamLinks(source: StreamLinkSource, sourceQuery: SourceQuery) {
    if (source.streamLinks) {
      return of(source.streamLinks);
    }

    let obs: Observable<StreamLink[]> = of(source.streamLinks);
    if (source.premiumizeTransferDirectdlDto) {
      obs = PremiumizeGetStreamLinkQuery.getData(source, sourceQuery);
    } else if (source.realDebridLinks) {
      obs = RealDebridGetStreamLinkQuery.getData(source, sourceQuery);
    }
    return obs;
  }

  getBestSource(
    streamLinkSources: StreamLinkSource[],
    sourceQuery: SourceQuery,
    lastPlayedSource?: LastPlayedSource
  ): Observable<StreamLinkSource> {
    if (streamLinkSources.length === 0) {
      return of(null);
    }

    streamLinkSources = this.removeDuplicates(streamLinkSources);

    const sourceQuality = getSourcesByQuality<StreamLinkSource>(streamLinkSources, sortTorrentsBySize);
    sortTorrentsByPackage(sourceQuality.sources2160p);
    sortTorrentsByPackage(sourceQuality.sources1080p);
    sortTorrentsByPackage(sourceQuality.sources720p);
    sortTorrentsByPackage(sourceQuality.sourcesOther);

    let bestSource: StreamLinkSource = null;
    const bestSourceObss: Observable<StreamLink | StreamLink[]>[] = [];

    const allSources = sourceQuality.sources2160p.concat(sourceQuality.sources1080p, sourceQuality.sources720p, sourceQuality.sourcesOther);

    if (lastPlayedSource) {
      let maxScore = 0;
      let source: StreamLinkSource;
      streamLinkSources.forEach(d => {
        const score = getScoreMatchingName(lastPlayedSource.title, d.title);
        if (score > maxScore) {
          source = d;
          maxScore = score;
        }
      });
      if (source) {
        allSources.unshift(source);
      }
    }

    let hasPmSource = false;
    let hasPmPremiumAccount = true;

    allSources.forEach(source => {
      if (source.debridService === 'PM') {
        hasPmSource = true;
      }
      bestSourceObss.push(
        of(true).pipe(
          switchMap(() => {
            if (bestSource) {
              return of(bestSource);
            }

            if (source.debridService === 'PM' && !hasPmPremiumAccount) {
              // Don't check to avoid burning free account limit
              return of(null);
            }

            return this.getStreamLinks(source, sourceQuery).pipe(
              catchError(e => {
                return of([]);
              }),
              map((streamLinks: StreamLink[]) => {
                if (streamLinks.length > 0) {
                  if (sourceQuery.episode && streamLinks.length > 1) {
                    let currentEpisodeFound = false;
                    let episodeCode = sourceQuery.episode.episodeCode;

                    streamLinks.forEach(streamLink => {
                      if (isEpisodeCodeMatchesFileName(episodeCode, streamLink.filename)) {
                        currentEpisodeFound = true;
                      }
                    });

                    if (!currentEpisodeFound) {
                      return bestSource;
                    }
                  }
                  source.streamLinks = streamLinks;

                  bestSource = source;
                }

                return bestSource;
              })
            );
          })
        )
      );
    });

    let checkPmAccount = of(true);
    if (hasPmSource) {
      checkPmAccount = PremiumizeAccountInfoForm.submit().pipe(
        map(data => {
          if (data.status === 'success' && data.premium_until === false) {
            hasPmPremiumAccount = false;
          }
          return hasPmPremiumAccount;
        })
      );
    }

    return checkPmAccount.pipe(
      switchMap(() => {
        return from(bestSourceObss).pipe(
          concatMap(result => result),
          last(),
          map(() => {
            if (!bestSource && hasPmSource && !hasPmPremiumAccount && allSources.length > 0) {
              // Free PM account only, since PM sources are almost all reliable, let take the first one < 5gb
              allSources.forEach(source => {
                if (!bestSource && source.size < 5 * 1024 * 1024 * 1024) {
                  bestSource = source;
                }
              });
            }

            return bestSource;
          })
        );
      })
    );
  }
}
