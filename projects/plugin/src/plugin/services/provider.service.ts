import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { WakoHttpRequestService, WakoSettingsService } from '@wako-app/mobile-sdk';
import { concat, EMPTY, from, of, throwError } from 'rxjs';
import { catchError, last, map, switchMap } from 'rxjs/operators';
import { Provider, ProviderList, testProviders } from '../entities/provider';
import { HeliosCacheService } from './provider-cache.service';
import { ToastService } from './toast.service';
import { countryCodeToEmoji, logData } from './tools';

const CACHE_KEY_PROVIDERS = 'CACHE_KEY_PROVIDERS';
const CACHE_TIMEOUT_PROVIDERS = '1d';

@Injectable()
export class ProviderService {
  private providerStorageKey = 'provider_key';
  private providerUrlsStorageKey = 'provider_urls';

  /**
   * In latest wako's sdk, it seems wako backups everything that's saved with WakoSettingsService
   * To avoid to backup the providers' content which can be big, we're gonna backup only their URLs.
   * As there is no callback once the user has restored its settings, we use 2 storage keys to store the providers URLs.
   * if 'provider_urls_to_sync' differs from 'provider_urls' it means the users has restored its backup.
   */
  private providerUrlsToSyncStorageKey = 'provider_urls_to_sync';

  constructor(private storage: Storage, private toastService: ToastService) {}

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

  getAll(enabledOnly = true, category?: 'movie' | 'tv' | 'anime') {
    return this.getProviders().then((providers) => {
      if (!providers) {
        return [];
      }

      let _providers: Provider[] = [];

      Object.keys(providers).forEach((key) => {
        _providers.push(providers[key]);
      });

      if (enabledOnly) {
        _providers = _providers.filter((provider) => provider.enabled === true);
      }

      if (category) {
        _providers = _providers.filter((provider) => {
          if (category === 'movie' && provider.movie) {
            return true;
          }
          if (category === 'tv' && (provider.episode || provider.season)) {
            return true;
          }
          if (category === 'anime' && provider.anime) {
            return true;
          }
          return false;
        });
      }

      return _providers;
    });
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
          })
        );
      })
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
          })
        );
      })
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
      let areEquals = Object.keys(oldProviders).length === Object.keys(providers).length;

      if (areEquals) {
        Object.keys(oldProviders).forEach((key) => {
          const _old = Object.assign({}, oldProviders[key]);
          const _new = Object.assign({}, providers[key]);
          _old.enabled = true;
          _new.enabled = true;

          if (JSON.stringify(_old) !== JSON.stringify(_new)) {
            areEquals = false;
          }
        });
      }

      if (!areEquals) {
        this.toastService.simpleMessage('toasts.providersUpdated');
      } else {
        console.log('no changes');
      }

      Object.keys(oldProviders).forEach((key) => {
        if (providers.hasOwnProperty(key)) {
          providers[key].enabled = oldProviders[key].enabled;
        }
      });
    }

    return this.storage.set(this.providerStorageKey, providers).then(() => {
      if (!isAutomatic) {
        HeliosCacheService.clear();
      }
    });
  }

  private setProvidersFromUrls(urls: string[], isAutomatic = false) {
    const invalidUrls = [];
    const obss = [];
    urls.forEach((url) => {
      obss.push(
        WakoHttpRequestService.request<ProviderList>(
          {
            url: url,
            method: 'GET'
          },
          null,
          20000,
          true
        ).pipe(
          catchError(() => {
            invalidUrls.push(url);
            return EMPTY;
          })
        )
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
          })
        );
      }),
      catchError(() => {
        return of(false);
      })
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
        method: 'GET'
      },
      null,
      20000,
      true
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
      })
    );
  }
}
