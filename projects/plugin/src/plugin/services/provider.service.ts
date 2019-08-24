import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { catchError, map, switchMap } from 'rxjs/operators';
import { from, of } from 'rxjs';
import { ToastService, WakoHttpRequestService } from '@wako-app/mobile-sdk';
import { Provider, ProviderList } from '../entities/provider';
import { countryCodeToEmoji } from './tools';
import { HeliosCacheService } from './provider-cache.service';

const CACHE_KEY_PROVIDERS = 'CACHE_KEY_PROVIDERS';
const CACHE_TIMEOUT_PROVIDERS = '1d';

@Injectable()
export class ProviderService {
  constructor(
    private storage: Storage,
    private toastService: ToastService
  ) {
    setTimeout(() => {
      this.refreshProviders();
    }, 10000);
  }

  async setDefaultProvidersIfEmpty() {
    const providerUrl = await this.getProviderUrl();
    if (!providerUrl) {
      await this.setProviderUrl('https://bit.ly/wako-providers');
    }
  }

  private providerStorageKey = 'provider_key';
  private providerUrlStorageKey = 'provider_url';

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

  getAll(enabledOnly = true) {
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

      return _providers;
    });
  }

  getProviderUrl(): Promise<string> {
    return this.storage.get(this.providerUrlStorageKey);
  }

  private setProviderUrl(url: string): Promise<boolean> {
    return this.storage.set(this.providerUrlStorageKey, url);
  }

  getProviders(): Promise<ProviderList> {
    return this.storage.get(this.providerStorageKey);
  }

  setProviders(providers: ProviderList, isAutomatic = false) {
    return this.getProviders().then(oldProviders => {
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
    });
  }

  setProvidersFromUrl(url: string, isAutomatic = false) {
    return WakoHttpRequestService.request<ProviderList>(
      {
        url: url,
        method: 'GET'
      },
      null,
      10000,
      true
    ).pipe(
      switchMap(providerList => {
        if (typeof providerList === 'string' || Object.keys(providerList).length === 0) {
          return of(false);
        }

        return from(this.setProviders(providerList, isAutomatic)).pipe(
          switchMap(() => {
            return from(this.setProviderUrl(url));
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
    HeliosCacheService.get<boolean>(CACHE_KEY_PROVIDERS).subscribe(cache => {
      if (cache) {
        console.log('check providers later');
        return;
      }
      this.getProviderUrl().then(url => {
        if (url) {
          this.setProvidersFromUrl(url, true).subscribe();
        }
      });

      HeliosCacheService.set(CACHE_KEY_PROVIDERS, true, CACHE_TIMEOUT_PROVIDERS);
    });
  }

}
