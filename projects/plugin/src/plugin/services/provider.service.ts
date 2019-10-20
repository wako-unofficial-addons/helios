import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { catchError, last, map, switchMap } from 'rxjs/operators';
import { concat, EMPTY, from, of } from 'rxjs';
import { ToastService, WakoHttpRequestService } from '@wako-app/mobile-sdk';
import { Provider, ProviderList } from '../entities/provider';
import { countryCodeToEmoji } from './tools';
import { HeliosCacheService } from './provider-cache.service';

const CACHE_KEY_PROVIDERS = 'CACHE_KEY_PROVIDERS';
const CACHE_TIMEOUT_PROVIDERS = '1d';

@Injectable()
export class ProviderService {

  private providerStorageKey = 'provider_key';
  private providerUrlStorageKey = 'provider_url';
  private providerUrlsStorageKey = 'provider_urls';

  constructor(
    private storage: Storage,
    private toastService: ToastService
  ) {

  }

  async initialize() {
    setTimeout(() => {
      this.refreshProviders();
    }, 10000);

    // Patch
    const oldUrl = await this.getProviderUrl();
    if (oldUrl) {
      await this.addProviderUrlToStorage(oldUrl);
      await this.storage.remove(this.providerUrlStorageKey);
    }
  }

  static getNameWithEmojiFlag(provider: Provider) {
    const emojiLanguages = [];
    provider.languages.forEach(country => {
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
    return this.getProviders().then(providers => {
      if (!providers) {
        return [];
      }

      let _providers: Provider[] = [];

      Object.keys(providers).forEach(key => {
        _providers.push(providers[key]);
      });

      if (enabledOnly) {
        _providers = _providers.filter(provider => provider.enabled === true);
      }

      if (category) {
        _providers = _providers.filter(provider => {
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
    return await this.storage.get(this.providerUrlsStorageKey)
      .then(urls => {
        if (!urls) {
          return [];
        }
        return urls;
      });
  }

  private async setProviderUrls(urls: string[]): Promise<boolean> {
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
    return from(this.addProviderUrlToStorage(url))
      .pipe(
        switchMap(() => {
          return from(this.getProviderUrls())
        }),
        switchMap(urls => {
          return this.setProvidersFromUrls(urls, false)
        })
      )
  }

  deleteProviderUrl(url: string) {
    return from(this.getProviderUrls())
      .pipe(
        switchMap((urls) => {
          const newUrls = [];
          urls.forEach(_url => {
            if (_url === url) {
              return;
            }
            newUrls.push(_url);
          });
          return from(this.setProviderUrls(newUrls))
            .pipe(
              switchMap(() => {
                return this.setProvidersFromUrls(newUrls, false)
              })
            )
        })
      )
  }


  /**
   * @deprecated
   */
  getProviderUrl(): Promise<string> {
    return this.storage.get(this.providerUrlStorageKey);
  }

  getProviders(): Promise<ProviderList> {
    return this.storage.get(this.providerStorageKey);
  }

  async setProviders(providers: ProviderList, isAutomatic = false) {
    const oldProviders = await this.getProviders();

    if (oldProviders && isAutomatic) {
      let areEquals = Object.keys(oldProviders).length === Object.keys(providers).length;

      if (areEquals) {
        Object.keys(oldProviders).forEach(key => {
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

      Object.keys(oldProviders).forEach(key => {
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


    const obss = [];
    urls.forEach(url => {
      obss.push(WakoHttpRequestService.request<ProviderList>(
        {
          url: url,
          method: 'GET'
        },
        null,
        20000,
        true
      ));
    });

    if (urls.length === 0) {
      obss.push(of({}));
    }

    const list: ProviderList = {};
    return concat(...obss)
      .pipe(
        catchError(() => {
          return EMPTY;
        }),
        map(data => {
          Object.keys(data).forEach(key => {
            if (!list.hasOwnProperty(key)) {
              list[key] = data[key];
            }
          });
          return list;
        }),
        last(),
        switchMap(providerList => {
          if (typeof providerList === 'string') {
            return of(false);
          }

          return from(this.setProviders(providerList, isAutomatic)).pipe(
            switchMap(() => {
              return from(this.setProviderUrls(urls));
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
    HeliosCacheService.get<boolean>(CACHE_KEY_PROVIDERS).subscribe(async cache => {
      if (cache) {
        console.log('check providers later');
        return;
      }
      const urls = await this.getProviderUrls();

      this.setProvidersFromUrls(urls, true);

      HeliosCacheService.set(CACHE_KEY_PROVIDERS, true, CACHE_TIMEOUT_PROVIDERS);
    });
  }

}
