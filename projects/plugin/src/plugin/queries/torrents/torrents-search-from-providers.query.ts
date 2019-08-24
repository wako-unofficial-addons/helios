import { Provider } from '../../entities/provider';
import { forkJoin, of } from 'rxjs';
import { TorrentsFromProviderBaseQuery } from './torrents-from-provider-base.query';
import { map, tap } from 'rxjs/operators';
import { TorrentSource } from '../../entities/torrent-source';

export class TorrentsSearchFromProvidersQuery extends TorrentsFromProviderBaseQuery {
  static getByProvider(query: string, category: 'movie' | 'tv' | 'anime', provider: Provider) {
    const providerInfo =
      category === 'anime' ? (provider.anime ? provider.anime : provider.episode) : category === 'tv' ? provider.episode : provider.movie;
    if (!providerInfo) {
      return of([]);
    }
    return super.getTorrents(provider, query, providerInfo);
  }

  static getData(query: string, category: 'movie' | 'tv' | 'anime', providers: Provider[]) {
    const obss = [];

    let allTorrents: TorrentSource[] = [];

    let total = 0;
    providers.forEach(provider => {
      obss.push(
        this.getByProvider(query, category, provider).pipe(
          tap(torrents => {
            total++;
            console.log('DONE', total, '/', providers.length);
            allTorrents = allTorrents.concat(torrents);
          })
        )
      );
    });

    if (obss.length === 0) {
      console.error('Oups no obss, check this');
      return of([]);
    }

    return forkJoin(...obss).pipe(
      map(() => {
        return allTorrents;
      })
    );
  }
}
