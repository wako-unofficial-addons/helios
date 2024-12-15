import { Injectable } from '@angular/core';
import { WakoHttpRequestService, WakoSettingsService, WakoStorage } from '@wako-app/mobile-sdk';
import { concat, EMPTY, from, of, throwError } from 'rxjs';
import { catchError, last, map, switchMap } from 'rxjs/operators';
import { Provider, ProviderList, testProviders } from '../entities/provider';
import { HeliosCacheService } from './provider-cache.service';
import { countryCodeToEmoji, logData } from './tools';
import { DebridAccountService } from './debrid-account.service';

const CACHE_KEY_PROVIDERS = 'CACHE_KEY_PROVIDERS';
const CACHE_TIMEOUT_PROVIDERS = '5d';

export const EASYNEWS_PROVIDER_NAME = '__easynews__';

@Injectable()
export class ProviderService {
  private providerStorageKey = 'provider_key';
  private providerUrlsStorageKey = 'provider_urls';
  private providerStatusStorageKey = 'provider_status';

  /**
   * In latest wako's sdk, it seems wako backups everything that's saved with WakoSettingsService
   * To avoid to backup the providers' content which can be big, we're gonna backup only their URLs.
   * As there is no callback once the user has restored its settings, we use 2 storage keys to store the providers URLs.
   * if 'provider_urls_to_sync' differs from 'provider_urls' it means the users has restored its backup.
   */
  private providerUrlsToSyncStorageKey = 'provider_urls_to_sync';

  constructor(
    private storage: WakoStorage,
    private debridAccountService: DebridAccountService,
  ) {}

  async initialize() {
    setTimeout(() => {
      this.refreshProviders();
    }, 10000);

    await this.restoreProvidersIfNeeded();
  }

  private async restoreProvidersIfNeeded() {
    const providerUrls = await this.getProviderUrls();

    const providerUrlsToSync = await WakoSettingsService.getByCategory<string[]>(this.providerUrlsToSyncStorageKey);
    if (!providerUrlsToSync) {
      // Not set yet
      await WakoSettingsService.setByCategory(this.providerUrlsToSyncStorageKey, providerUrls);
      return;
    }

    const providerStatus = await WakoSettingsService.getByCategory<string[]>(this.providerStatusStorageKey);

    if (JSON.stringify(providerUrlsToSync) !== JSON.stringify(providerUrls)) {
      logData('Restore providers', providerUrls, providerUrlsToSync);
      // Restore provider
      for (const url of providerUrls) {
        await this.deleteProviderUrl(url).toPromise();
      }
      for (const url of providerUrlsToSync) {
        await this.addProviderUrl(url).toPromise();
      }
    }

    if (!providerStatus) {
      // Not set yet
      return;
    }

    const providerList = await this.getProviders();

    Object.keys(providerList).forEach((key) => {
      if (providerStatus.hasOwnProperty(key)) {
        providerList[key].enabled = providerStatus[key];
      }
    });

    await this.setProviders(providerList, false);
  }

  static getNameWithEmojiFlag(provider: Provider) {
    const emojiLanguages = [];
    provider.languages.forEach((country) => {
      try {
        const emoji = countryCodeToEmoji(country === 'en' ? 'us' : country);
        emojiLanguages.push(emoji);
      } catch (e) {
        console.log('e', e);
      }
    });
    return provider.name + ' ' + emojiLanguages.join(' ');
  }

  async getEasynewsProvider() {
    // Check if EN is enabled
    const hasEasynews = await this.debridAccountService.hasAccountEnabled('easynews');
    if (hasEasynews) {
      return {
        name: EASYNEWS_PROVIDER_NAME,
        enabled: true,
        languages: ['en'],
        base_url: 'https://members.easynews.com/2.0/search/solr-search/',
        response_type: 'json',
        anime: {
          query: 'anime',
          keywords: ['anime'],
        },
        movie: {
          query: 'movie',
          keywords: ['movie'],
        },
        season: {
          query: 'season',
          keywords: ['season'],
        },
      } as Provider;
    }
    return null;
  }

  async getAll(enabledOnly = true, category?: 'movie' | 'tv' | 'anime') {
    const easynewsProvider = await this.getEasynewsProvider();

    const providers = await this.getProviders();
    if (!providers && !easynewsProvider) {
      return [];
    }
    let _providers: Provider[] = [];
    if (easynewsProvider) {
      _providers.push(easynewsProvider);
    }
    Object.keys(providers).forEach((key) => {
      _providers.push(providers[key]);
    });
    if (enabledOnly) {
      _providers = _providers.filter((provider) => provider.enabled === true);
    }
    if (category) {
      _providers = _providers.filter((provider_1) => {
        if (category === 'movie' && provider_1.movie) {
          return true;
        }
        if (category === 'tv' && (provider_1.episode || provider_1.season)) {
          return true;
        }
        if (category === 'anime' && provider_1.anime) {
          return true;
        }
        return false;
      });
    }
    return _providers;
  }

  async getProviderUrls(): Promise<string[]> {
    return await this.storage.get(this.providerUrlsStorageKey).then((urls) => {
      if (!urls) {
        return [];
      }
      return urls;
    });
  }

  private async setProviderUrls(urls: string[]): Promise<boolean> {
    await WakoSettingsService.setByCategory(this.providerUrlsToSyncStorageKey, urls);
    return await this.storage.set(this.providerUrlsStorageKey, urls);
  }

  private async addProviderUrlToStorage(url: string): Promise<boolean> {
    const urls = await this.getProviderUrls();
    if (!urls.includes(url)) {
      urls.push(url);
    }
    return await this.setProviderUrls(urls);
  }

  addProviderUrl(url: string) {
    return this.isValidUrlProvider(url).pipe(
      switchMap((isValid) => {
        if (!isValid) {
          return throwError('Invalid URL');
        }
        return from(this.addProviderUrlToStorage(url)).pipe(
          switchMap(() => {
            return from(this.getProviderUrls());
          }),
          switchMap((urls) => {
            return this.setProvidersFromUrls(urls, false);
          }),
        );
      }),
    );
  }

  deleteProviderUrl(url: string) {
    return from(this.getProviderUrls()).pipe(
      switchMap((urls) => {
        const newUrls = [];
        urls.forEach((_url) => {
          if (_url === url) {
            return;
          }
          newUrls.push(_url);
        });
        return from(this.setProviderUrls(newUrls)).pipe(
          switchMap(() => {
            return this.setProvidersFromUrls(newUrls, false);
          }),
        );
      }),
    );
  }

  getProviders(): Promise<ProviderList> {
    if (Object.keys(testProviders).length > 0) {
      console.log('Gonna use the test provider');
      return Promise.resolve(testProviders);
    }
    return this.storage.get(this.providerStorageKey);
  }

  async setProviders(providers: ProviderList, isAutomatic = false) {
    const oldProviders = await this.getProviders();

    if (oldProviders && isAutomatic) {
      Object.keys(oldProviders).forEach((key) => {
        if (providers.hasOwnProperty(key)) {
          providers[key].enabled = oldProviders[key].enabled === true;
        }
      });
    }

    return this.storage.set(this.providerStorageKey, providers).then(() => {
      if (!isAutomatic) {
        HeliosCacheService.clear();
      }
      this.saveProviderStatus(providers);
    });
  }

  private saveProviderStatus(providers: ProviderList) {
    const providerStatus: Record<string, boolean> = {};
    Object.keys(providers).forEach((key) => {
      providerStatus[key] = providers[key].enabled;
    });
    return WakoSettingsService.setByCategory(this.providerStatusStorageKey, providerStatus);
  }

  private setProvidersFromUrls(urls: string[], isAutomatic = false) {
    const invalidUrls = [];
    const obss = [];

    urls.forEach((url) => {
      obss.push(
        WakoHttpRequestService.request<ProviderList>(
          {
            url: url,
            method: 'GET',
          },
          null,
          20000,
          true,
        ).pipe(
          catchError(() => {
            invalidUrls.push(url);
            return EMPTY;
          }),
          switchMap((data) => {
            if (isAutomatic && typeof data !== 'object') {
              return EMPTY;
            }
            return of(data);
          }),
        ),
      );
    });

    if (urls.length === 0) {
      obss.push(of({}));
    }

    const list: ProviderList = {};
    return concat(...obss).pipe(
      map((data) => {
        Object.keys(data).forEach((key) => {
          if (!list.hasOwnProperty(key)) {
            list[key] = data[key];
          }
        });
        return list;
      }),
      last(),
      switchMap((providerList) => {
        if (typeof providerList === 'string') {
          return of(false);
        }

        return from(this.setProviders(providerList, isAutomatic)).pipe(
          switchMap(() => {
            const newUrls = [];
            urls.forEach((url) => {
              if (!invalidUrls.includes(url)) {
                newUrls.push(url);
              }
            });
            return from(this.setProviderUrls(newUrls));
          }),
          map(() => {
            return true;
          }),
        );
      }),
      catchError(() => {
        return of(false);
      }),
    );
  }

  private refreshProviders() {
    HeliosCacheService.get<boolean>(CACHE_KEY_PROVIDERS).subscribe(async (cache) => {
      if (cache) {
        console.log('check providers later');
        return;
      }
      const urls = await this.getProviderUrls();

      this.setProvidersFromUrls(urls, true).subscribe();

      HeliosCacheService.set(CACHE_KEY_PROVIDERS, true, CACHE_TIMEOUT_PROVIDERS);
    });
  }

  private isValidUrlProvider(url: string) {
    return WakoHttpRequestService.request<ProviderList>(
      {
        url: url,
        method: 'GET',
      },
      null,
      20000,
      true,
    ).pipe(
      catchError(() => {
        return of(false);
      }),
      map((data) => {
        let valid = false;
        if (typeof data === 'object') {
          Object.keys(data).forEach((key) => {
            if (data[key].base_url) {
              valid = true;
            }
          });
        }
        return valid;
      }),
    );
  }
}
