import { Provider } from '../../entities/provider';
import { BehaviorSubject, forkJoin, Observable, of, Subject, Subscription, throwError } from 'rxjs';
import { CachedLink, Torrent } from '../../entities/torrent';
import { TorrentFromProviderQuery } from './torrent-from-provider.query';
import { catchError, finalize, map, share, switchMap, tap } from 'rxjs/operators';
import { TorrentGetUrlQuery } from './torrent-get-url.query';
import { RealDebridApiService } from '../../services/real-debrid/services/real-debrid-api.service';
import { RealDebridTorrentsInstantAvailabilityForm } from '../../services/real-debrid/forms/torrents/real-debrid-torrents-instant-availability.form';
import { PremiumizeApiService } from '../../services/premiumize/services/premiumize-api.service';
import { PremiumizeCacheCheckForm } from '../../services/premiumize/forms/cache/premiumize-cache-check.form';
import { PremiumizeTransferDirectdlForm } from '../../services/premiumize/forms/transfer/premiumize-transfer-directdl.form';
import { RealDebridGetCachedUrlQuery } from '../../services/real-debrid/queries/real-debrid-get-cached-url.query';
import { PreimumizeTransferDirectdlContentDto } from '../../services/premiumize/dtos/transfer/preimumize-transfer-directdl.dto';
import { getSupportedMedia, logData, torrentCacheStrings } from '../../services/tools';
import { TorrentsQueryFilter } from '../../services/torrent.service';
import { ProviderService } from '../../services/provider.service';

export class TorrentFromProvidersQuery {
  private static sourceResult: SourceResult = null;
  private static searchingInProgressFilter: string = null;

  private static getHashFromUrl(url: string) {
    if (url.match(/btih:([a-zA-Z0-9]*)/)) {
      const match = url.match(/btih:([a-zA-Z0-9]*)/);
      return match.length > 1 ? match[1].trim().toLowerCase() : null;
    }
    return null;
  }

  private static cleanTitle(title: string) {
    title = title.toLowerCase();

    const apostrophe_replacement = 's';

    title = title.replace(`\\'s`, apostrophe_replacement);
    title = title.replace(`'s`, apostrophe_replacement);
    title = title.replace('&#039;s', apostrophe_replacement);
    title = title.replace(' 039 s', apostrophe_replacement);

    title = title.replace(/\:|\\|\/|\,|\!|\?|\(|\)|\'|\"|\\|\[|\]|\-|\_|\./g, ' ');
    title = title.replace(/\s+/g, ' ');
    title = title.replace('  ', ' ');
    title = title.replace(/\&/g, 'and');

    return title.trim();
  }

  private static matchEpisodeCode(episodeCode: string, filename: string) {
    const codes = torrentCacheStrings(episodeCode);
    const ext = '.' + filename.split('.').pop();
    const commonVideoExtensions = getSupportedMedia('video').split('|');

    if (!commonVideoExtensions.includes(ext)) {
      return false;
    }

    let match = false;
    codes.episodeStrings.forEach(str => {
      if (!match && this.cleanTitle(filename).indexOf(str) !== -1) {
        match = true;
      }
    });

    if (!match && filename.toLowerCase().match('s' + codes.season2) && filename.toLowerCase().match('e' + codes.episode2)) {
      match = true;
    }

    return match;
  }

  private static getFromRD(torrents: Torrent[], torrentsQueryFilter: TorrentsQueryFilter) {
    if (torrents.length === 0) {
      return of(torrents);
    }
    const allHashes = this.getAllHash(torrents);

    return RealDebridTorrentsInstantAvailabilityForm.submit(allHashes).pipe(
      map(realDebridTorrentsInstantAvailabilityDto => {
        console.log(realDebridTorrentsInstantAvailabilityDto);
        torrents.forEach(torrent => {
          if (!torrent.hash) {
            return;
          }
          const data = realDebridTorrentsInstantAvailabilityDto[torrent.hash.toLowerCase()];
          if (!data || !data.rd || data.rd.length === 0) {
            return;
          }

          // Take the group with the most video files
          let groupIndex = 0;

          if (torrentsQueryFilter.episodeCode) {
            const groupWithFile = [];

            data.rd.forEach((rd, index) => {
              Object.keys(rd).forEach(key => {
                const file = rd[key];

                if (file.filename.match(/.mkv|.mp4/) && this.matchEpisodeCode(torrentsQueryFilter.episodeCode, file.filename)) {
                  groupWithFile.push(index);
                }
              });
            });

            if (groupWithFile.length === 0) {
              return torrent;
            }
            groupIndex = groupWithFile.shift();
          }

          torrent.isCachedSource = true;
          torrent.cachedData = {
            service: 'RD'
          };

          const fileIds = Object.getOwnPropertyNames(data.rd[groupIndex]);

          torrent.cachedData.linkObs = RealDebridGetCachedUrlQuery.getData(
            torrent.url,
            fileIds.join(','),
            !!torrentsQueryFilter.episodeCode
          ).pipe(
            map(links => {
              let cachedDataLink: CachedLink = null;

              if (torrentsQueryFilter.episodeCode) {
                links.forEach(link => {
                  if (!cachedDataLink && this.matchEpisodeCode(torrentsQueryFilter.episodeCode, link.filename)) {
                    cachedDataLink = {
                      filename: link.filename,
                      is_streamable: !!link.streamable,
                      url: link.download,
                      transcoded_url: null
                    };
                  }
                });
              } else {
                const link = links.shift();

                cachedDataLink = {
                  filename: link.filename,
                  is_streamable: !!link.streamable,
                  url: link.download,
                  transcoded_url: null
                };
              }

              if (cachedDataLink) {
                torrent.cachedData.link = cachedDataLink;

                return cachedDataLink;
              }

              const cachedDataLinks: CachedLink[] = [];

              links.forEach(link => {
                cachedDataLinks.push({
                  filename: link.filename,
                  is_streamable: !!link.streamable,
                  url: link.download,
                  transcoded_url: null
                });
              });
              return cachedDataLinks.length === 1 ? cachedDataLinks.pop() : cachedDataLinks;
            })
          );
        });

        return torrents;
      }),
      catchError(err => {
        console.log('RD err', err);
        return of(torrents);
      })
    );
  }

  private static getFromPM(torrents: Torrent[], torrentsQueryFilter: TorrentsQueryFilter) {
    if (torrents.length === 0) {
      return of(torrents);
    }

    const allHashes = this.getAllHash(torrents);
    return PremiumizeCacheCheckForm.submit(allHashes).pipe(
      map(data => {
        if (data.status === 'error') {
          return torrents;
        }
        allHashes.forEach((hash, index) => {
          torrents.forEach(torrent => {
            if (torrent.hash && torrent.hash === hash) {
              if (data.response[index]) {
                torrent.isCachedSource = true;
                torrent.cachedData = {
                  service: 'PM'
                };
                torrent.cachedData.linkObs = PremiumizeTransferDirectdlForm.submit(torrent.url).pipe(
                  switchMap(_data => {
                    if (_data.status !== 'success') {
                      return throwError(_data.message);
                    }

                    let file: PreimumizeTransferDirectdlContentDto = null;

                    if (torrentsQueryFilter.episodeCode) {
                      _data.content.forEach(d => {
                        const filename = d.path;
                        if (!file && this.matchEpisodeCode(torrentsQueryFilter.episodeCode, filename)) {
                          file = d;
                        }
                      });
                    } else {
                      const files: PreimumizeTransferDirectdlContentDto[] = [];
                      let hasIncompatibleFile = false;
                      _data.content.forEach(_file => {
                        const ext = '.' + _file.link.split('.').pop();
                        const commonVideoExtensions = getSupportedMedia('video').split('|');

                        if (commonVideoExtensions.includes(ext)) {
                          files.push(_file);
                        } else {
                          hasIncompatibleFile = true;
                        }
                      });

                      if (files.length === 0 && hasIncompatibleFile) {
                        return throwError(`The file ${_data.content[0].link} is not a video format`);
                      }

                      files.sort((stream1, stream2) => {
                        if (+stream1.size === +stream2.size) {
                          return 0;
                        }

                        return +stream1.size > +stream2.size ? -1 : 1;
                      });

                      if (torrentsQueryFilter.title) {
                        const filterTitle = this.cleanTitle(torrentsQueryFilter.title);

                        files.forEach(_file => {
                          const names = _file.path.split('/');
                          if (names.length > 1) {
                            names.shift();
                          }

                          const title = this.cleanTitle(names.join('/'));

                          if (!file && title.indexOf(filterTitle) !== -1 && title.indexOf(torrentsQueryFilter.year.toString()) !== -1) {
                            file = _file;
                          }
                        });

                        if (!file && files.length === 1) {
                          file = files[0];
                        }

                        if (!file) {
                          files.forEach(__file => {
                            const _title = this.cleanTitle(__file.path);

                            if (!file && _title.indexOf('sample') !== -1 && _title.indexOf(filterTitle) !== -1) {
                              file = __file;
                            }
                          });
                        }
                      } else {
                        if (torrentsQueryFilter.query && files.length > 0) {
                          // Sort by name
                          files.sort((stream1, stream2) => {
                            if (stream1.path === stream2.path) {
                              return 0;
                            }

                            return stream1.path > stream2.path ? 1 : -1;
                          });

                          const cachedDataLinks: CachedLink[] = [];

                          files.forEach(file => {
                            const names = file.path.split('/');
                            if (names.length > 1) {
                              names.shift();
                            }

                            const title = names.join('/');

                            cachedDataLinks.push({
                              filename: title,
                              is_streamable: !!file.stream_link,
                              url: file.link,
                              transcoded_url: file.stream_link
                            });
                          });

                          return of(cachedDataLinks);
                        } else if (files.length > 0) {
                          file = files.shift();
                        }
                      }
                    }

                    if (file) {
                      const cachedDataLink: CachedLink = {
                        filename: file.path,
                        is_streamable: !!file.stream_link,
                        url: file.link,
                        transcoded_url: file.stream_link
                      };

                      torrent.cachedData.link = cachedDataLink;

                      return of(cachedDataLink);
                    }

                    const cachedDataLinks: CachedLink[] = [];

                    _data.content.forEach(_file => {
                      const ext = '.' + _file.link.split('.').pop();
                      const commonVideoExtensions = getSupportedMedia('video').split('|');

                      if (!commonVideoExtensions.includes(ext)) {
                        return;
                      }
                      const names = _file.path.split('/');
                      if (names.length > 1) {
                        names.shift();
                      }

                      const title = names.join('/');

                      cachedDataLinks.push({
                        filename: title,
                        is_streamable: !!_file.stream_link,
                        url: _file.link,
                        transcoded_url: _file.stream_link
                      });
                    });

                    return of(cachedDataLinks.length === 1 ? cachedDataLinks.pop() : cachedDataLinks);
                  })
                );
              }
            }
          });
        });

        return torrents;
      }),
      catchError(err => {
        logData(err);

        return of(torrents);
      })
    );
  }

  private static excludeDuplicateTorrentsByHash(torrents: Torrent[]) {
    // First sort all torrents by seeds
    this.sortBySeeds(torrents);

    const allHash = [];
    const newTorrents = [];
    torrents.forEach(torrent => {
      if (!torrent.hash) {
        newTorrents.push(torrent);
        return;
      }

      if (!allHash.includes(torrent.hash)) {
        allHash.push(torrent.hash);
        newTorrents.push(torrent);
        return;
      }
    });

    return newTorrents;
  }

  private static setAllHashAndExcludeDuplicateTorrents(torrents: Torrent[]) {
    if (torrents.length === 0) {
      return of(torrents);
    }

    const obsSetUrls: Observable<Torrent>[] = [];
    torrents.forEach(torrent => {
      obsSetUrls.push(
        TorrentGetUrlQuery.getData(torrent).pipe(
          map(url => {
            if (!url) {
              return torrent;
            }

            torrent.url = url;
            torrent.subPageUrl = null;

            torrent.hash = this.getHashFromUrl(url);

            return torrent;
          })
        )
      );
    });

    return forkJoin(obsSetUrls).pipe(map(() => this.excludeDuplicateTorrentsByHash(torrents)));
  }

  private static getAllHash(torrents: Torrent[], uncachedOnly = true) {
    const allHashes = [];
    torrents.forEach(torrent => {
      if (torrent.hash && !allHashes.includes(torrent.hash)) {
        if (uncachedOnly) {
          if (torrent.isCachedSource === false) {
            allHashes.push(torrent.hash);
          }
        } else {
          allHashes.push(torrent.hash);
        }
      }
    });
    return allHashes;
  }

  private static hasPremiumize() {
    return PremiumizeApiService.hasApiKey();
  }

  private static hasRealDebrid() {
    return !!RealDebridApiService.getToken();
  }

  static getScoreTorrent(torrent: Torrent) {
    const downloadDiff = torrent.seeds - torrent.peers;

    let score = 0;
    if (torrent.isCachedSource) {
      score += 100000;
    }
    if (downloadDiff >= 100) {
      score += 150;
    } else if (downloadDiff >= 20) {
      score += downloadDiff;
    } else if (downloadDiff < 20) {
      score -= 100;
    }

    if (torrent.seeds < 20) {
      score -= 100;
    }

    score += torrent.size_bytes / 1024 / 1024 / 1024;

    return score;
  }

  private static sortBySeeds(torrents: Torrent[]) {
    torrents.sort((torrent1, torrent2) => {
      const score1 = torrent1.seeds;
      const score2 = torrent2.seeds;

      if (score1 === score2) {
        return 0;
      }

      return score1 > score2 ? -1 : 1;
    });
  }

  static sortByBalanced(torrents: Torrent[]) {
    torrents.sort((torrent1, torrent2) => {
      const score1 = this.getScoreTorrent(torrent1);
      const score2 = this.getScoreTorrent(torrent2);

      if (score1 === score2) {
        return 0;
      }

      return score1 > score2 ? -1 : 1;
    });
  }

  static sortBySize(torrents: Torrent[]) {
    torrents.sort((torrent1, torrent2) => {
      const score1 = torrent1.size_bytes;
      const score2 = torrent2.size_bytes;

      if (score1 === score2) {
        return 0;
      }

      return score1 > score2 ? -1 : 1;
    });
  }

  static getData(providers: Provider[], torrentsQueryFilter: TorrentsQueryFilter, excludeQualities: string[]) {
    const searchingInProgress = JSON.stringify(torrentsQueryFilter);

    if (this.sourceResult) {
      if (this.searchingInProgressFilter === searchingInProgress) {
        console.log('already in progress');
        return this.sourceResult;
      }
      // Cancel it

      this.sourceResult.allQuerySubscription.unsubscribe();
      Object.keys(this.sourceResult.sourceByProvider).forEach(key => {
        if (this.sourceResult.sourceByProvider[key]) {
          this.sourceResult.sourceByProvider[key].subscription.unsubscribe();
        }
      });
      console.log('cancel search in progress', this.searchingInProgressFilter);
    }

    this.searchingInProgressFilter = searchingInProgress;

    const sourceByProvider: { [key: string]: SourceByProvider } = {};

    const progressObs = new BehaviorSubject<number>(0);

    let progress = 0;

    let totalProviders = providers.length;
    let totalCachedProvider = 0;

    if (this.hasPremiumize()) {
      totalProviders++;
      totalCachedProvider++;
    }
    if (this.hasRealDebrid()) {
      totalProviders++;
      totalCachedProvider++;
    }

    const torrentsNames = [];

    let allTorrents: Torrent[] = [];

    const allSourcesSubject = new Subject<Torrent[]>();

    const providerSubject = new Subject<Torrent[]>();

    providers.forEach(provider => {
      const providerDisplayName = ProviderService.getNameWithEmojiFlag(provider);
      sourceByProvider[provider.name] = {
        torrents: [],
        providerName: provider.name,
        displayName: providerDisplayName,
        isLoading: true,
        subscription: null
      };

      sourceByProvider[provider.name].subscription = TorrentFromProviderQuery.getData(provider, torrentsQueryFilter, excludeQualities)
        .pipe(
          map(torrents => {
            return torrents.filter(torrent => {
              if (torrentsNames.includes(torrent.title)) {
                return false;
              }
              torrentsNames.push(torrent.title);
              return true;
            });
          }),

          tap((torrents: Torrent[]) => {
            torrents.forEach(torrent => {
              torrent.displayName = sourceByProvider[torrent.providerName].displayName;
            });

            allTorrents = allTorrents.concat(torrents);

            sourceByProvider[provider.name].torrents = torrents;
          }),
          finalize(() => {
            sourceByProvider[provider.name].isLoading = false;

            console.log(provider.name, 'done');

            progress++;
            progressObs.next(Math.round(((totalProviders - (totalProviders - progress)) / totalProviders) * 100));

            if (progress === totalProviders - totalCachedProvider) {
              providerSubject.next(allTorrents);
              providerSubject.complete();
            }
          })
        )
        .subscribe();
    });

    const allQuerySubscription = providerSubject
      .pipe(
        map(torrents => TorrentFromProviderQuery.getOnlyNeededQuality(torrents, excludeQualities)),
        map(torrents => {
          this.sortByBalanced(torrents);
          return torrents;
        }),
        switchMap(torrents => {
          return this.setAllHashAndExcludeDuplicateTorrents(torrents);
        }),
        switchMap(torrents => {
          if (totalCachedProvider) {
            this.sourceResult.step = 'debrid';
          }

          if (this.hasPremiumize()) {
            return this.getFromPM(torrents, torrentsQueryFilter).pipe(
              finalize(() => {
                progress++;
                progressObs.next(Math.round(((totalProviders - (totalProviders - progress)) / totalProviders) * 100));
              })
            );
          }

          return of(torrents);
        }),
        switchMap(torrents => {
          if (this.hasRealDebrid()) {
            return this.getFromRD(torrents, torrentsQueryFilter).pipe(
              finalize(() => {
                progress++;
                progressObs.next(Math.round(((totalProviders - (totalProviders - progress)) / totalProviders) * 100));
              })
            );
          }

          progress++;
          progressObs.next(Math.round(((totalProviders - (totalProviders - progress)) / totalProviders) * 100));

          return of(torrents);
        })
      )
      .subscribe(torrents => {
        torrents = torrents.filter(torrent => torrent.isCachedSource || torrent.seeds > 1);

        progressObs.complete();
        allSourcesSubject.next(torrents);
        allSourcesSubject.complete();
        this.sourceResult = null;
      });

    allSourcesSubject.pipe(share());

    return (this.sourceResult = {
      allSources: allSourcesSubject,
      progress: progressObs,
      sourceByProvider: sourceByProvider,
      step: 'providers',
      allQuerySubscription: allQuerySubscription
    } as SourceResult);
  }
}

export interface SourceResult {
  allSources: Observable<Torrent[]>;
  progress: BehaviorSubject<number>;
  sourceByProvider: { [key: string]: SourceByProvider };
  step: 'providers' | 'debrid';
  allQuerySubscription: Subscription;
}

export interface SourceByProvider {
  torrents: Torrent[];
  providerName: string;
  displayName: string;
  isLoading: boolean;
  subscription: Subscription;
}
