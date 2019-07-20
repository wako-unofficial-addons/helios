import { EMPTY, forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Torrent } from '../../entities/torrent';
import { Provider } from '../../entities/provider';
import { TorrentQualityTitleQuery } from './torrent-quality-title.query';
import { ProviderHttpService } from '../../services/provider-http.service';
import { TorrentsQueryFilter } from '../../services/torrent.service';
import { replacer, WakoHttpError } from '@wako-app/mobile-sdk';
import { cleanFilename, convertSizeStrToBytes } from '../../services/tools';
import { HeliosCacheService } from '../../services/provider-cache.service';

export class TorrentFromProviderQuery {
  private static tokenByProvider = new Map<string, ProviderToken>();

  private static getObjectFromKey(rootObject: Object, keyString: string): any {
    let results = rootObject;
    keyString.split('.').forEach(key => {
      if (results && results.hasOwnProperty(key)) {
        results = results[key];
      } else {
        results = null;
      }
    });

    return results;
  }

  private static evalCode(element: HTMLElement | Document, url: string, provider: Provider, field: string) {
    const code = provider.html_parser[field];
    try {
      return Function('doc', 'row', 'code', `return eval(code)`)(element, element, provider.html_parser[field]);
    } catch (e) {
      console.error(
        `Failed to execute ${field} code: ${code} for provider ${provider.name}. Url: ${url}`,
        e.toString()
      );
      return null;
    }
  }

  private static cleanTitle(title: string, replacements: { [key: string]: string }) {
    Object.keys(replacements).forEach(charToReplace => {
      title = title.split(charToReplace).join(replacements[charToReplace]);
    });

    return title.toLowerCase();
  }

  private static getProviderReplacement(
    provider: Provider,
    filter: TorrentsQueryFilter,
    keywords: string
  ): { rpl: any; originalQuery: string } {
    let season = '';
    let episode = '';
    const code = filter.episodeCode ? filter.episodeCode : filter.seasonCode ? filter.seasonCode : null;

    if (filter.episodeCode && filter.episodeCode.match(/S([0-9]+)E([0-9]+)/i)) {
      const matches = code.match(/S([0-9]+)E([0-9]+)/i);
      season = matches[1] || '';
      episode = matches[2] || '';
    }

    if (filter.seasonCode && filter.seasonCode.match(/S([0-9]+)/i)) {
      const matches = code.match(/S([0-9]+)/i);
      season = matches[1] || '';
    }

    if (!provider.title_replacement) {
      // Backward compatibility
      provider.title_replacement = {
        "'s": 's',
        '"': ' '
      };
    }

    const rpl = {
      title: filter.title ? this.cleanTitle(filter.title, provider.title_replacement) : '',
      titleFirstLetter: filter.title ? this.cleanTitle(filter.title, provider.title_replacement)[0] : '',
      imdbId: filter.imdbId,
      episodeCode: filter.episodeCode ? filter.episodeCode.toLowerCase() : '',
      seasonCode: filter.seasonCode ? filter.seasonCode.toLowerCase() : '',
      year: filter.year ? filter.year : '',
      season: season,
      episode: episode,
      query: '',
      token: '{token}' // Keep that for later
    };

    const originalRpl = {
      title: filter.title ? filter.title : '',
      titleFirstLetter: filter.title ? filter.title[0] : '',
      imdbId: filter.imdbId,
      episodeCode: filter.episodeCode ? filter.episodeCode.toLowerCase() : '',
      seasonCode: filter.seasonCode ? filter.seasonCode.toLowerCase() : '',
      year: filter.year ? filter.year : '',
      season: season,
      episode: episode,
      query: '',
      token: '{token}' // Keep that for later
    };

    if (filter.alternativeTitles) {
      Object.keys(filter.alternativeTitles).forEach(language => {
        rpl['title.' + language] = this.cleanTitle(filter.alternativeTitles[language], provider.title_replacement);
        originalRpl['title.' + language] = filter.alternativeTitles[language];
      });
    }
    if (filter.originalTitle) {
      rpl['title.original'] = this.cleanTitle(filter.originalTitle, provider.title_replacement);
      originalRpl['title.original'] = filter.originalTitle;
    }

    let query = '';
    let originalQuery = '';
    if (filter.query) {
      query = filter.query.trim();
      originalQuery = query;
    } else {
      query = replacer(keywords, rpl).trim();
      originalQuery = replacer(keywords, originalRpl).trim();
    }

    if (provider.separator) {
      query = query.replace(/\s/g, provider.separator);
    } else {
      query = encodeURIComponent(query);
    }

    rpl.query = query;

    return { rpl, originalQuery };
  }

  private static getTorrentsFromJsonResponse(provider: Provider, response: any): Torrent[] {
    const torrents: Torrent[] = [];

    try {
      const results = this.getObjectFromKey(response, provider.json_format.results);

      if (!results) {
        return torrents;
      }

      results.forEach((result: any) => {
        const title = result[provider.json_format.title];

        if (provider.json_format.sub_results) {
          const subResults = this.getObjectFromKey(result, provider.json_format.sub_results);

          try {
            subResults.forEach(subResult => {
              try {
                const quality = provider.json_format.quality
                  ? this.getObjectFromKey(subResult, provider.json_format.quality)
                  : TorrentQualityTitleQuery.getData(title || '');

                let torrentUrl = this.getObjectFromKey(subResult, provider.json_format.url);
                let subPageUrl = null;

                if (provider.source_is_in_sub_page) {
                  subPageUrl = torrentUrl;
                  torrentUrl = null;
                }

                const torrent = <Torrent>{
                  providerName: provider.name,
                  title: title,
                  url: torrentUrl,
                  subPageUrl: subPageUrl,
                  seeds: +this.getObjectFromKey(subResult, provider.json_format.seeds),
                  peers: +this.getObjectFromKey(subResult, provider.json_format.peers),
                  quality: quality,
                  isCachedSource: false
                };

                if (!torrent.url && !torrent.subPageUrl) {
                  return;
                }

                const size = this.getObjectFromKey(subResult, provider.json_format.size);

                if (Number(size)) {
                  torrent.size_bytes = +size;
                } else {
                  const sizeBytes = convertSizeStrToBytes(size);
                  if (sizeBytes !== null) {
                    torrent.size_bytes = sizeBytes;
                  } else {
                    torrent.size_str = size;
                  }
                }

                torrents.push(torrent);
              } catch (e) {}
            });
          } catch (e) {}
        } else {
          const quality = provider.json_format.quality
            ? this.getObjectFromKey(result, provider.json_format.quality)
            : TorrentQualityTitleQuery.getData(title || '');

          let torrentUrl = this.getObjectFromKey(result, provider.json_format.url);
          let subPageUrl = null;

          if (provider.source_is_in_sub_page) {
            subPageUrl = torrentUrl;
            torrentUrl = null;
          }

          const torrent = <Torrent>{
            providerName: provider.name,
            title: title,
            url: torrentUrl,
            subPageUrl: subPageUrl,
            seeds: +this.getObjectFromKey(result, provider.json_format.seeds),
            peers: +this.getObjectFromKey(result, provider.json_format.peers),
            size: this.getObjectFromKey(result, provider.json_format.size),
            quality: quality,
            isCachedSource: false
          };

          if (!torrent.url && !torrent.subPageUrl) {
            return;
          }

          const size = this.getObjectFromKey(result, provider.json_format.size);

          if (Number(size)) {
            torrent.size_bytes = +size;
          } else {
            const sizeBytes = convertSizeStrToBytes(size);
            if (sizeBytes !== null) {
              torrent.size_bytes = sizeBytes;
            } else {
              torrent.size_str = size;
            }
          }

          torrents.push(torrent);
        }
      });
    } catch (e) {
      console.error(`Error on provider ${provider.name}`, e, response);
    }

    return torrents;
  }

  private static getTorrentsFromTextResponse(provider: Provider, response: any, providerUrl: string): Torrent[] {
    const torrents: Torrent[] = [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(response, 'text/html');

    const rows = this.evalCode(doc, providerUrl, provider, 'row') as NodeListOf<HTMLTableRowElement>;

    if (rows) {
      rows.forEach(row => {
        try {
          const title = this.evalCode(row, providerUrl, provider, 'title');

          let torrentUrl = this.evalCode(row, providerUrl, provider, 'url');

          let subPageUrl = null;

          if (provider.source_is_in_sub_page) {
            subPageUrl = torrentUrl;
            torrentUrl = null;
          }

          const torrent = <Torrent>{
            providerName: provider.name,
            title: title,
            url: torrentUrl,
            subPageUrl: subPageUrl,
            seeds: +this.evalCode(row, providerUrl, provider, 'seeds'),
            peers: +this.evalCode(row, providerUrl, provider, 'peers'),
            quality: TorrentQualityTitleQuery.getData(title || ''),
            isCachedSource: false
          };

          if (!torrent.url && !torrent.subPageUrl) {
            return;
          }

          const size = this.evalCode(row, providerUrl, provider, 'size');

          if (Number(size)) {
            torrent.size_bytes = +size;
          } else {
            const sizeBytes = convertSizeStrToBytes(size);
            if (sizeBytes !== null) {
              torrent.size_bytes = sizeBytes;
            } else {
              torrent.size_str = size;
            }
          }

          torrents.push(torrent);
        } catch (e) {
          console.error(`Error on provider ${provider.name}`, e, response);
        }
      });
    }

    return torrents;
  }

  private static doProviderHttpRequest(providerUrl: string, provider: Provider, category: string) {
    console.log(`Getting "${providerUrl}" on ${category} from ${provider.name} provider`);

    const headers = {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36'
    };
    if (provider.response_type === 'text') {
      headers['accept'] = 'text/html';
    }
    return ProviderHttpService.request<any>(
      {
        method: 'GET',
        headers: headers,
        url: providerUrl,
        responseType: provider.response_type === 'json' ? 'json' : 'text'
      },
      this.getCacheTimeByCategory(category),
      10000,
      true,
      provider.time_to_wait_on_too_many_request_ms,
      provider.time_to_wait_between_each_request_ms
    );
  }

  private static getDataFromProviderHttpResponse(response: any, provider: Provider, providerUrl: string) {
    if (!response) {
      return [];
    }

    let torrents = [];
    if (provider.json_format) {
      torrents = this.getTorrentsFromJsonResponse(provider, response);
    } else {
      torrents = this.getTorrentsFromTextResponse(provider, response, providerUrl);
    }

    return torrents;
  }

  private static doRequestByProviderInfo(token: string, provider: Provider, filter: TorrentsQueryFilter, providerInfo) {
    const category = filter.category;

    const keywords = typeof providerInfo.keywords === 'string' ? [providerInfo.keywords] : providerInfo.keywords;

    const obsByKeywords = [];

    const providerUrls = [];

    keywords.forEach(_keywords => {
      let providerUrl = provider.base_url + providerInfo.query;

      const data = this.getProviderReplacement(provider, filter, _keywords);

      const providerReplacement = Object.assign(data.rpl, {
        token: token
      });

      providerUrl = replacer(providerUrl, providerReplacement);

      if (providerUrls.includes(providerUrl)) {
        return;
      }

      providerUrls.push(providerUrl);

      let isAccurate = false;
      if (category === 'movies') {
        if (provider.base_url.match('imdbId') !== null || _keywords.match('imdbId') !== null) {
          isAccurate = true;
        }
      }

      obsByKeywords.push(
        this.doProviderHttpRequest(providerUrl, provider, category).pipe(
          catchError(err => {
            if (err.status && err.status !== 404) {
              console.error(`Error ${err.status} on ${provider.name} (${providerUrl}}`, err);
              return of(null);
            }

            return throwError(err);
          }),
          map(response => {
            const torrents = this.getDataFromProviderHttpResponse(response, provider, providerUrl);
            if (isAccurate) {
              return torrents.map(torrent => {
                torrent.isAccurate = true;
                return torrent;
              });
            }
            return this.removeBadTorrents(torrents, data.originalQuery);
          }),
          tap(torrents => {
            console.log(
              `Total torrents found ${torrents.length} for "${providerUrl}" on ${category} from ${
                provider.name
              } provider`
            );
          })
        )
      );
    });

    return forkJoin<Torrent[]>(obsByKeywords).pipe(
      map(allTorrents => {
        let torrents: Torrent[] = [];
        allTorrents.forEach(_torrents => {
          torrents = torrents.concat(_torrents);
        });
        return torrents;
      })
    );
  }

  private static doRequestByProvider(provider: Provider, filter: TorrentsQueryFilter): Observable<Torrent[]> {
    let category = filter.category;

    if (category === 'anime' && !provider.anime) {
      category = 'tv';
    }

    if (category === 'movies' && !provider.movie) {
      return of([]);
    }

    if (category === 'tv' && !provider.episode) {
      return of([]);
    }

    if (category === 'anime' && !provider.anime) {
      return of([]);
    }

    let tokenObs = of(null);

    if (provider.token) {
      console.log(`Retrieving token for ${provider.name}`);
      tokenObs = ProviderHttpService.request(
        {
          method: 'GET',
          url: provider.base_url + provider.token.query,
          responseType: provider.response_type
        },
        provider.token.token_validity_time_ms || null,
        5000,
        true,
        provider.time_to_wait_on_too_many_request_ms,
        provider.time_to_wait_between_each_request_ms
      ).pipe(
        map(response => {
          const _token = response[provider.token.token_format.token];
          this.tokenByProvider.set(provider.name, {
            token: _token,
            generatedDate: new Date()
          });

          console.log(`Token ${_token} has been retrieved for ${provider.name}`);

          return _token;
        })
      );
    }

    return tokenObs.pipe(
      switchMap(token => {
        let providerInfo;
        switch (category) {
          case 'tv':
            providerInfo = provider.episode;
            break;
          case 'anime':
            providerInfo = provider.anime;
            break;
          default:
            providerInfo = provider.movie;
            break;
        }

        return this.doRequestByProviderInfo(token, provider, filter, providerInfo).pipe(
          switchMap(torrents => {
            if (category === 'tv' && provider.season && torrents.length < 5) {
              providerInfo = provider.season;
              return this.doRequestByProviderInfo(token, provider, filter, providerInfo).pipe(
                map(seasonTorrents => {
                  // get only filename with SXX no episode

                  return torrents.concat(
                    seasonTorrents.filter(torrent => {
                      return torrent.title.match(/(S[0-9]+)/i) && !torrent.title.match(/(E[0-9]+)/i);
                    })
                  );
                })
              );
            }
            return of(torrents);
          })
        );
      })
    );
  }

  private static removeBadTorrents(torrents: Torrent[], originalQuery: string) {
    const words = originalQuery
      .replace(/[^0-9a-z]/gi, ' ')
      .split(' ')
      .filter(word => word.trim().length >= 3);

    const regexStr = words.join('|');

    const regex = new RegExp(regexStr, 'ig');

    return torrents.filter(torrent => {
      if (torrent.title.match(/hdcam/gi) !== null) {
        console.log('Exclude', torrent.title, 'cause hdcam');
        return false;
      }
      const match = torrent.title.match(regex);
      const keepIt = match !== null && match.length >= words.length;

      if (!keepIt) {
        console.log('Exclude', torrent.title, 'cause no match', regexStr);
      }
      return keepIt;
    });
  }

  private static getCacheTimeByCategory(category: string) {
    return category === 'movies' ? '1d' : '1h';
  }

  private static filterByExcludedQualities(torrents: Torrent[], excludeQualities: string[]) {
    const allQualities = ['2160p', '1080p', '720p', 'other'];
    return torrents.filter(torrent => {
      return allQualities.includes(torrent.quality) && excludeQualities.includes(torrent.quality) === false;
    });
  }

  static getOnlyNeededQuality(torrents: Torrent[], excludeQualities: string[]): Torrent[] {
    let filteredTorrents = [];
    const _excludeQualities = excludeQualities.slice(0);

    _excludeQualities.unshift('fake'); // this will be removed first;

    do {
      _excludeQualities.shift();
      filteredTorrents = this.filterByExcludedQualities(torrents, _excludeQualities);
    } while (filteredTorrents.length < 20 && _excludeQualities.length > 0);

    return filteredTorrents;
  }

  static getData(provider: Provider, filter: TorrentsQueryFilter, excludeQualities: string[]): Observable<Torrent[]> {
    const cacheKey = provider.name + '_' + JSON.stringify(filter);
    return HeliosCacheService.get<Torrent[]>(cacheKey).pipe(
      switchMap(torrentsFromCache => {
        if (torrentsFromCache) {
          const query = filter.title + ' ' + (filter.episodeCode ? filter.episodeCode : '');
          console.log(
            `Total torrents found from cache ${torrentsFromCache.length} for "${query.trim()}" on ${
              filter.category
            } from ${provider.name} provider`
          );
          return of(torrentsFromCache);
        }

        return this.doRequestByProvider(provider, filter).pipe(
          catchError(err => {
            if (err instanceof WakoHttpError && err.status > 0) {
              // Something goes wrong
              return EMPTY;
            }

            // maybe block
            if (provider.fallback_urls) {
              const newUrl = provider.fallback_urls.shift();
              if (newUrl) {
                console.log('use fallback url', newUrl, 'for', provider.name);
                provider.base_url = newUrl;
                return this.doRequestByProvider(provider, filter);
              }
            }
            return of([]);
          }),
          tap(torrents => {
            torrents.forEach(torrent => {
              torrent.title = cleanFilename(torrent.title);
            });
            HeliosCacheService.set(cacheKey, torrents, this.getCacheTimeByCategory(filter.category));
          })
        );
      }),
      map(torrents => {
        return this.getOnlyNeededQuality(torrents, excludeQualities);
      })
    );
  }
}

interface ProviderToken {
  token: string;
  generatedDate: Date;
}
