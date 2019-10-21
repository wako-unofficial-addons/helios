import { concat, forkJoin, Observable, of, throwError } from 'rxjs';
import { ProviderHttpService } from '../../services/provider-http.service';
import { catchError, last, map, mapTo, switchMap, tap } from 'rxjs/operators';
import { Provider, ProviderQueryInfo, ProviderQueryReplacement } from '../../entities/provider';
import { replacer, WakoHttpError } from '@wako-app/mobile-sdk';
import { SourceQuery } from '../../entities/source-query';
import { cleanTitleCustom, convertSizeStrToBytes, logData } from '../../services/tools';
import { TorrentQualityTitleQuery } from './torrent-quality-title.query';
import { TorrentSource } from '../../entities/torrent-source';
import { SourceQuality } from '../../entities/source-quality';
import { TorrentGetUrlQuery } from './torrent-get-url.query';


function bodyReplacer(tpl: string, data: { [key: string]: any }) {
  return tpl.replace(/{([a-z0-9\.]*)}/g, ($1, $2) => {
    if (!$1.match('{') || !$1.match('}')) {
      return $1;
    }
    return data[$2];
  });
}


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
    sourceQuery: SourceQuery,
    providerInfo: ProviderQueryInfo
  ): Observable<TorrentSource[]> {
    return this.getToken(provider).pipe(
      switchMap(token => {
        return this._getTorrents(token, provider, sourceQuery, providerInfo).pipe(
          catchError(err => {
            if (err instanceof WakoHttpError && err.status > 0) {
              // Something goes wrong
              return throwError(err);
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
            return throwError(err);
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
      provider.timeout_ms || 15000,
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


  private static _getTorrents(
    token: string,
    provider: Provider,
    sourceQuery: SourceQuery,
    providerInfo: ProviderQueryInfo
  ) {
    const keywords = typeof providerInfo.keywords === 'string' ? [providerInfo.keywords] : providerInfo.keywords;

    const torrentsObs = [];

    const providerUrls = [];

    let allTorrents: TorrentSource[] = [];

    keywords.forEach(_keywords => {

      let query = '';
      let originalQuery = '';

      let isPost = provider.http_method === 'POST';

      if (provider.separator) {
        query = query.replace(/\s/g, provider.separator);
      } else {
        query = encodeURIComponent(query);
      }

      let data;
      if (sourceQuery.query) {
        query = sourceQuery.query.trim();
        originalQuery = query;
      } else {
        data = this.getProviderQueryReplacement(provider, sourceQuery, _keywords, token, isPost);
        query = replacer(_keywords, data.cleanedReplacement).trim();
        originalQuery = replacer(_keywords, data.rawReplacement).trim();
      }

      if (provider.separator) {
        query = query.replace(/\s/g, provider.separator);
      } else if (!isPost) {
        query = encodeURIComponent(query);
      }


      const replacerObj = Object.assign({query: query}, data ? data.cleanedReplacement : {});

      let isAccurate = false;
      if (provider.base_url.match('imdbId') !== null || _keywords.match('imdbId') !== null) {
        isAccurate = true;

        if (data && data.rawReplacement.imdbId === '') {
          console.log('EMPTY QUERY');
          return;
        }
      }
      let providerBody = null;

      let providerUrl = provider.base_url;
      if (provider.http_method === 'POST') {
        providerBody = bodyReplacer(providerInfo.query, replacerObj);
        try {
          providerBody = JSON.parse(providerBody);
        } catch (e) {

        }
      } else {
        providerUrl = replacer(provider.base_url + providerInfo.query, replacerObj);
      }


      if (providerUrls.includes(providerUrl)) {
        return;
      }

      providerUrls.push(providerUrl);

      let torrents = [];


      torrentsObs.push(
        this.doProviderHttpRequest(providerUrl, provider, providerBody).pipe(
          catchError(err => {
            if (err.status && err.status === 404) {
              return of([]);
            }
            console.error(`Error ${err.status} on ${provider.name} (${providerUrl}}`, err);
            return throwError(err);
          }),
          map(response => {
            if (!response) {
              return [];
            }
            return this.getTorrentsFromProviderHttpResponse(response, provider, providerUrl);
          }),
          switchMap(_torrents => {
            return this.getHashFromSubPages(_torrents);
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

    if (torrentsObs.length === 0) {
      return of([]);
    }

    return concat(...torrentsObs).pipe(
      last(),
      map(() => {
        return allTorrents;
      })
    );
  }

  static getHashFromUrl(url: string) {
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
        logData('Exclude from provider', torrent.provider, torrent.title, 'cause no match', regexStr);
      }
      return keepIt;
    });
  }

  private static getProviderQueryReplacement(
    provider: Provider,
    sourceQuery: SourceQuery,
    keywords: string,
    token?: string,
    isPost = false
  ): { rawReplacement: ProviderQueryReplacement; cleanedReplacement: ProviderQueryReplacement } {
    if (!provider.title_replacement) {
      // Backward compatibility
      provider.title_replacement = {
        "'s": 's',
        '"': ' '
      };
    }

    const query = sourceQuery.movie ? sourceQuery.movie : sourceQuery.episode;

    const rawReplacement: ProviderQueryReplacement = {
      title: query.title,
      titleFirstLetter: query.title[0],
      token: token,
      year: typeof query.year === 'number' ? query.year.toString() : '',
      imdbId: query.imdbId ? query.imdbId : '',
      episodeCode: sourceQuery.episode ? sourceQuery.episode.episodeCode.toLowerCase() : '',
      seasonCode: sourceQuery.episode ? sourceQuery.episode.seasonCode.toLowerCase() : '',
      season: sourceQuery.episode ? sourceQuery.episode.seasonNumber.toString() : '',
      episode: sourceQuery.episode ? sourceQuery.episode.episodeNumber.toString() : '',
      absoluteNumber: sourceQuery.episode && sourceQuery.episode.absoluteNumber ? sourceQuery.episode.absoluteNumber.toString() : '',

      query: ''
    };

    const cleanedReplacement: ProviderQueryReplacement = Object.assign({}, rawReplacement);

    cleanedReplacement.title = cleanTitleCustom(query.title, provider.title_replacement);
    cleanedReplacement.titleFirstLetter = cleanedReplacement.title[0];

    if (query.alternativeTitles) {
      Object.keys(query.alternativeTitles).forEach(language => {
        rawReplacement['title.' + language] = query.alternativeTitles[language];
        cleanedReplacement['title.' + language] = cleanTitleCustom(query.alternativeTitles[language], provider.title_replacement);
      });
    }
    if (query.originalTitle) {
      rawReplacement['title.original'] = query.originalTitle;
      cleanedReplacement['title.original'] = cleanTitleCustom(query.originalTitle, provider.title_replacement);
    }

    rawReplacement.query = replacer(keywords, rawReplacement).trim();
    cleanedReplacement.query = replacer(keywords, cleanedReplacement).trim();

    if (provider.separator) {
      rawReplacement.query = rawReplacement.query.replace(/\s/g, provider.separator);
      cleanedReplacement.query = cleanedReplacement.query.replace(/\s/g, provider.separator);
    } else if (!isPost) {
      rawReplacement.query = encodeURIComponent(rawReplacement.query);
      cleanedReplacement.query = encodeURIComponent(cleanedReplacement.query);
    }

    return {rawReplacement, cleanedReplacement};
  }

  private static doProviderHttpRequest(providerUrl: string, provider: Provider, providerBody = null) {
    logData(`Getting "${providerUrl}" from ${provider.name} provider`);

    const headers = {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36'
    };
    if (provider.response_type === 'text') {
      headers['accept'] = 'text/html';
    }

    if (providerBody) {
      headers['Content-Type'] = 'application/json';
    }

    return ProviderHttpService.request<any>(
      {
        method: provider.http_method || 'GET',
        headers: headers,
        url: providerUrl,
        responseType: provider.response_type === 'json' ? 'json' : 'text',
        body: providerBody
      },
      null,
      provider.timeout_ms || 15000,
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
    if (size === null) {
      return null;
    }

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

  private static getFormatIntIfNotNull(value: number | string) {
    if (value === null) {
      return null;
    }
    return +value;
  }

  private static addBaseUrlIfNeeded(baseUrl: string, torrentUrl: string) {
    if (torrentUrl[0] === '/') {
      return baseUrl + torrentUrl;
    }
    return torrentUrl;
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

                let torrentUrl = this.addBaseUrlIfNeeded(provider.base_url, this.getObjectFromKey(subResult, provider.json_format.url));
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
                  seeds: this.getFormatIntIfNotNull(this.getObjectFromKey(subResult, provider.json_format.seeds)),
                  peers: this.getFormatIntIfNotNull(this.getObjectFromKey(subResult, provider.json_format.peers)),
                  quality: TorrentQualityTitleQuery.getData(quality),
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

          let torrentUrl = this.addBaseUrlIfNeeded(provider.base_url, this.getObjectFromKey(result, provider.json_format.url));
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
            seeds: this.getFormatIntIfNotNull(this.getObjectFromKey(result, provider.json_format.seeds)),
            peers: this.getFormatIntIfNotNull(this.getObjectFromKey(result, provider.json_format.peers)),
            size: this.getObjectFromKey(result, provider.json_format.size),
            quality: TorrentQualityTitleQuery.getData(quality)
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
      //  console.error(`Error on provider ${provider.name}`, e, response);
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

          let torrentUrl = this.addBaseUrlIfNeeded(provider.base_url, this.evalCode(row, providerUrl, provider, 'url'));

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
            seeds: this.getFormatIntIfNotNull(this.evalCode(row, providerUrl, provider, 'seeds')),
            peers: this.getFormatIntIfNotNull(this.evalCode(row, providerUrl, provider, 'peers')),
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
          // console.error(`Error on provider ${provider.name}`, e, response);
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
      provider: providerTorrentResult.providerName,
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
      isOnRD: false,
      type: 'torrent'
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

  private static getHashFromSubPages(torrents: TorrentSource[]) {
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
}
