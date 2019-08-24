import { concat, Observable, of, throwError } from 'rxjs';
import { ProviderHttpService } from '../../services/provider-http.service';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Provider, ProviderQueryInfo, ProviderQueryReplacement } from '../../entities/provider';
import { replacer, WakoHttpError } from '@wako-app/mobile-sdk';
import { SourceEpisodeQuery, SourceQuery } from '../../entities/source-query';
import { cleanTitleCustom, convertSizeStrToBytes, logData, sortTorrentsBySeeds } from '../../services/tools';
import { TorrentQualityTitleQuery } from './torrent-quality-title.query';
import { TorrentSource } from '../../entities/torrent-source';
import { SourceQuality } from '../../entities/source-quality';

interface ProviderToken {
  token: string;
  generatedDate: Date;
}

interface ProviderTorrentResult {
  providerName: string;
  title: string;
  seeds: number;
  peers: number;
  size: number;
  quality: SourceQuality;
  url: string;
  subPageUrl: string;
}

export abstract class TorrentsFromProviderBaseQuery {
  private static tokenByProvider = new Map<string, ProviderToken>();

  protected static getTorrents(
    provider: Provider,
    sourceQuery: SourceQuery | SourceEpisodeQuery | string,
    providerInfo: ProviderQueryInfo
  ): Observable<TorrentSource[]> {
    if (provider.base_url === 'https://thepiratebay.org') {
      provider.base_url = 'https://thepiratebayAE.org';
    }
    return this.getToken(provider).pipe(
      switchMap(token => {
        return this._getTorrents(token, provider, sourceQuery, providerInfo).pipe(
          catchError(err => {
            if (err instanceof WakoHttpError && err.status > 0) {
              // Something goes wrong
              return of([]);
            }

            // maybe block
            if (provider.fallback_urls) {
              const newUrl = provider.fallback_urls.shift();
              if (newUrl) {
                logData('use fallback url', newUrl, 'for', provider.name);
                provider.base_url = newUrl;
                return this.getTorrents(provider, sourceQuery, providerInfo);
              }
            }
            return of([]);
          })
        );
      })
    );
  }

  private static getToken(provider: Provider) {
    if (!provider.token) {
      return of('');
    }

    logData(`Retrieving token for ${provider.name}`);
    return ProviderHttpService.request(
      {
        method: 'GET',
        url: provider.base_url + provider.token.query,
        responseType: provider.response_type
      },
      provider.token.token_validity_time_ms || null,
      provider.timeout_ms || 5000,
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

        logData(`Token ${_token} has been retrieved for ${provider.name}`);

        return _token;
      })
    );
  }

  static excludeDuplicateTorrentsByHash(torrents: TorrentSource[]) {
    // First sort all torrents by seeds
    sortTorrentsBySeeds(torrents);

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

  private static _getTorrents(
    token: string,
    provider: Provider,
    sourceQuery: SourceQuery | SourceEpisodeQuery | string,
    providerInfo: ProviderQueryInfo
  ) {
    const keywords = typeof providerInfo.keywords === 'string' ? [providerInfo.keywords] : providerInfo.keywords;

    const torrentsObs = [];

    const providerUrls = [];

    let allTorrents: TorrentSource[] = [];

    keywords.forEach(_keywords => {
      let providerUrl = provider.base_url + providerInfo.query;

      let query = '';
      let originalQuery = '';

      if (provider.separator) {
        query = query.replace(/\s/g, provider.separator);
      } else {
        query = encodeURIComponent(query);
      }

      let data;
      if (typeof sourceQuery === 'string') {
        query = sourceQuery.trim();
        originalQuery = query;
      } else {
        data = this.getProviderQueryReplacement(provider, sourceQuery, _keywords, token);
        query = replacer(_keywords, data.cleanedReplacement).trim();
        originalQuery = replacer(_keywords, data.rawReplacement).trim();
      }

      if (provider.separator) {
        query = query.replace(/\s/g, provider.separator);
      } else {
        query = encodeURIComponent(query);
      }

      providerUrl = replacer(providerUrl, Object.assign({query: query}, data ? data.cleanedReplacement : {}));

      if (providerUrls.includes(providerUrl)) {
        return;
      }

      providerUrls.push(providerUrl);

      let torrents = [];

      let isAccurate = false;
      if (provider.base_url.match('imdbId') !== null || _keywords.match('imdbId') !== null) {
        isAccurate = true;
      }

      torrentsObs.push(
        this.doProviderHttpRequest(providerUrl, provider).pipe(
          catchError(err => {
            if (err.status && err.status !== 404) {
              console.error(`Error ${err.status} on ${provider.name} (${providerUrl}}`, err);
              return of(null);
            }
            return throwError(err);
          }),
          map(response => {
            if (!response) {
              return [];
            }
            return this.getTorrentsFromProviderHttpResponse(response, provider, providerUrl);
          }),
          map(_torrents => {
            if (isAccurate) {
              return _torrents;
            }
            return this.removeBadTorrents(_torrents, originalQuery);
          }),
          tap(_torrents => {
            torrents = torrents.concat(_torrents);
            allTorrents = allTorrents.concat(torrents);
            logData(`${provider.name} - Found ${torrents.length} torrents - URL: "${providerUrl}"`);
          })
        )
      );
    });

    return concat(...torrentsObs).pipe(
      map(() => {
        return allTorrents;
      })
    );
  }

  private static getHashFromUrl(url: string) {
    if (url && url.match(/btih:([a-zA-Z0-9]*)/)) {
      const match = url.match(/btih:([a-zA-Z0-9]*)/);
      return match.length > 1 ? match[1].trim().toLowerCase() : null;
    } else if (url && url.match(/(\w{40})/)) {
      const match = url.match(/(\w{40})/);
      return match.length > 1 ? match[1].trim().toLowerCase() : null;
    }
    return null;
  }

  private static removeBadTorrents(torrents: TorrentSource[], originalQuery: string) {
    const words = originalQuery
      .replace(/[^0-9a-z]/gi, ' ')
      .split(' ')
      .filter(word => word.trim().length >= 3);

    const regexStr = words.join('|');

    const regex = new RegExp(regexStr, 'ig');

    return torrents.filter(torrent => {
      if (torrent.title.match(/hdcam/gi) !== null) {
        logData('Exclude', torrent.title, 'cause hdcam');
        return false;
      }
      const match = torrent.title.match(regex);
      const keepIt = match !== null && match.length >= words.length;

      if (!keepIt) {
        logData('Exclude', torrent.title, 'cause no match', regexStr);
      }
      return keepIt;
    });
  }

  private static getProviderQueryReplacement(
    provider: Provider,
    sourceQuery: SourceQuery | SourceEpisodeQuery,
    keywords: string,
    token?: string
  ): { rawReplacement: ProviderQueryReplacement; cleanedReplacement: ProviderQueryReplacement } {
    if (!provider.title_replacement) {
      // Backward compatibility
      provider.title_replacement = {
        "'s": 's',
        '"': ' '
      };
    }

    const rawReplacement: ProviderQueryReplacement = {
      title: sourceQuery.title,
      titleFirstLetter: sourceQuery.title[0],
      token: token,
      year: sourceQuery.year ? sourceQuery.year.toString() : '',
      imdbId: sourceQuery instanceof SourceQuery ? sourceQuery.imdbId : '',
      episodeCode: sourceQuery instanceof SourceEpisodeQuery ? sourceQuery.episodeCode.toLowerCase() : '',
      seasonCode: sourceQuery instanceof SourceEpisodeQuery ? sourceQuery.seasonCode.toLowerCase() : '',
      season: sourceQuery instanceof SourceEpisodeQuery ? sourceQuery.seasonNumber.toString() : '',
      episode: sourceQuery instanceof SourceEpisodeQuery ? sourceQuery.episodeNumber.toString() : '',
      query: ''
    };

    const cleanedReplacement: ProviderQueryReplacement = Object.assign({}, rawReplacement);

    cleanedReplacement.title = cleanTitleCustom(sourceQuery.title, provider.title_replacement);
    cleanedReplacement.titleFirstLetter = cleanedReplacement.title[0];

    if (sourceQuery.alternativeTitles) {
      Object.keys(sourceQuery.alternativeTitles).forEach(language => {
        rawReplacement['title.' + language] = sourceQuery.alternativeTitles[language];
        cleanedReplacement['title.' + language] = cleanTitleCustom(sourceQuery.alternativeTitles[language], provider.title_replacement);
      });
    }
    if (sourceQuery.originalTitle) {
      rawReplacement['title.original'] = sourceQuery.originalTitle;
      cleanedReplacement['title.original'] = cleanTitleCustom(sourceQuery.originalTitle, provider.title_replacement);
    }

    rawReplacement.query = replacer(keywords, rawReplacement).trim();
    cleanedReplacement.query = replacer(keywords, cleanedReplacement).trim();

    if (provider.separator) {
      rawReplacement.query = rawReplacement.query.replace(/\s/g, provider.separator);
      cleanedReplacement.query = cleanedReplacement.query.replace(/\s/g, provider.separator);
    } else {
      rawReplacement.query = encodeURIComponent(rawReplacement.query);
      cleanedReplacement.query = encodeURIComponent(cleanedReplacement.query);
    }

    return {rawReplacement, cleanedReplacement};
  }

  private static doProviderHttpRequest(providerUrl: string, provider: Provider) {
    logData(`Getting "${providerUrl}" from ${provider.name} provider`);

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
      null,
      5000,
      true,
      provider.time_to_wait_on_too_many_request_ms,
      provider.time_to_wait_between_each_request_ms
    );
  }

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

  private static getSize(size: number | string) {
    if (Number(size)) {
      return +size;
    } else {
      const sizeBytes = convertSizeStrToBytes(size as string);
      if (sizeBytes !== null) {
        return sizeBytes;
      } else {
        console.error(`Cannot convert ${size} to bytes`);
      }
    }

    return 0;
  }

  private static getTorrentsFromJsonResponse(provider: Provider, response: any): ProviderTorrentResult[] {
    const torrents: ProviderTorrentResult[] = [];

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

                const torrent: ProviderTorrentResult = {
                  providerName: provider.name,
                  title: title,
                  url: torrentUrl,
                  subPageUrl: subPageUrl,
                  seeds: +this.getObjectFromKey(subResult, provider.json_format.seeds),
                  peers: +this.getObjectFromKey(subResult, provider.json_format.peers),
                  quality: quality,
                  size: 0
                };

                if (!torrent.url && !torrent.subPageUrl) {
                  return;
                }

                const size = this.getObjectFromKey(subResult, provider.json_format.size);

                torrent.size = this.getSize(size);

                torrents.push(torrent);
              } catch (e) {
              }
            });
          } catch (e) {
          }
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

          const torrent: ProviderTorrentResult = {
            providerName: provider.name,
            title: title,
            url: torrentUrl,
            subPageUrl: subPageUrl,
            seeds: +this.getObjectFromKey(result, provider.json_format.seeds),
            peers: +this.getObjectFromKey(result, provider.json_format.peers),
            size: this.getObjectFromKey(result, provider.json_format.size),
            quality: quality
          };

          if (!torrent.url && !torrent.subPageUrl) {
            return;
          }

          const size = this.getObjectFromKey(result, provider.json_format.size);

          torrent.size = this.getSize(size);

          torrents.push(torrent);
        }
      });
    } catch (e) {
      console.error(`Error on provider ${provider.name}`, e, response);
    }

    return torrents;
  }

  private static getTorrentsFromTextResponse(provider: Provider, response: any, providerUrl: string): ProviderTorrentResult[] {
    const torrents: ProviderTorrentResult[] = [];

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

          const torrent: ProviderTorrentResult = {
            providerName: provider.name,
            title: title,
            url: torrentUrl,
            subPageUrl: subPageUrl,
            seeds: +this.evalCode(row, providerUrl, provider, 'seeds'),
            peers: +this.evalCode(row, providerUrl, provider, 'peers'),
            quality: TorrentQualityTitleQuery.getData(title || ''),
            size: 0
          };

          if (!torrent.url && !torrent.subPageUrl) {
            return;
          }

          const size = this.evalCode(row, providerUrl, provider, 'size');

          torrent.size = this.getSize(size);

          torrents.push(torrent);
        } catch (e) {
          console.error(`Error on provider ${provider.name}`, e, response);
        }
      });
    }

    return torrents;
  }

  private static evalCode(element: HTMLElement | Document, url: string, provider: Provider, field: string) {
    const code = provider.html_parser[field];
    try {
      return Function('doc', 'row', 'code', `return eval(code)`)(element, element, provider.html_parser[field]);
    } catch (e) {
      console.error(`Failed to execute ${field} code: ${code} for provider ${provider.name}. Url: ${url}`, e.toString());
      return null;
    }
  }

  private static transformProviderTorrentResultToTorrentSource(providerTorrentResult: ProviderTorrentResult) {
    let id = null;
    const hash = this.getHashFromUrl(providerTorrentResult.url);
    if (hash) {
      id = providerTorrentResult.providerName + '-' + hash;
    } else {
      id = providerTorrentResult.providerName + '-' + providerTorrentResult.url + '-' + providerTorrentResult.subPageUrl;
    }

    const torrent: TorrentSource = {
      id: id,
      providerName: providerTorrentResult.providerName,
      fileName: providerTorrentResult.title,
      title: providerTorrentResult.title,
      seeds: providerTorrentResult.seeds,
      peers: providerTorrentResult.peers,
      size: providerTorrentResult.size,
      quality: providerTorrentResult.quality,
      url: providerTorrentResult.url,
      subPageUrl: providerTorrentResult.subPageUrl,
      isPackage: false,
      hash: hash,
      isOnPM: false,
      isOnRD: false
    };

    return torrent;
  }


  private static getTorrentsFromProviderHttpResponse(response: any, provider: Provider, providerUrl: string): TorrentSource[] {
    let providerTorrentResults: ProviderTorrentResult[] = [];

    if (provider.json_format) {
      providerTorrentResults = this.getTorrentsFromJsonResponse(provider, response);
    } else {
      providerTorrentResults = this.getTorrentsFromTextResponse(provider, response, providerUrl);
    }

    const torrentSources: TorrentSource[] = [];

    providerTorrentResults.forEach(providerTorrentResult => {
      torrentSources.push(this.transformProviderTorrentResultToTorrentSource(providerTorrentResult))
    });

    return torrentSources;
  }
}
