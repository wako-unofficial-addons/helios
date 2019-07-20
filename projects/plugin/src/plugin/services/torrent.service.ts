import { Injectable } from '@angular/core';
import { ProviderService } from './provider.service';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Torrent } from '../entities/torrent';
import { Provider } from '../entities/provider';
import { SourceQuality } from '../entities/source-quality';
import { TorrentFromProvidersQuery } from '../queries/torrents/torrent-from-providers.query';
import { TorrentGetUrlQuery } from '../queries/torrents/torrent-get-url.query';

export interface TorrentQuality {
  torrents2160p: Torrent[];
  torrents1080p: Torrent[];
  torrents720p: Torrent[];
  torrentsOther: Torrent[];
}

export interface TorrentsQueryFilter {
  query?: string;
  category: 'movies' | 'tv' | 'anime';
  imdbId?: string;
  title?: string;
  seasonCode?: string;
  episodeCode?: string;
  year?: number;
  alternativeTitles?: { [key: string]: string };
  originalTitle?: string;
}


@Injectable()
export class TorrentService {
  constructor(private providerService: ProviderService) {
  }


  getBestSource(filter: TorrentsQueryFilter) {
    return from(this.providerService.getAll()).pipe(
      switchMap(providers => {
        return from(this.providerService.getSourceQualitySettings()).pipe(
          map(settings => {
            return this.getBestSourceByProviders(providers, filter, settings);
          })
        );
      })
    );
  }

  getBestSourceByProviders(providers: Provider[], filter: TorrentsQueryFilter, sourceQuality: SourceQuality) {
    const result = {
      progress$: new BehaviorSubject<number>(0),
      bestTorrent: new Observable<Torrent>()
    };

    if (providers.length === 0) {
      result.bestTorrent = new Observable(observer => {
        observer.next(null);
        observer.complete();
      });
      return result;
    }

    const excludeQualities = [];
    sourceQuality.qualities.forEach(quality => {
      if (!quality.enabled) {
        excludeQualities.push(quality.quality);
      }
    });

    let torrentsFound: Torrent[] = [];

    const sourceResult = TorrentFromProvidersQuery.getData(providers, filter, excludeQualities);

    result.progress$ = sourceResult.progress;

    result.bestTorrent = sourceResult.allSources.pipe(
      map(torrents => {
        torrentsFound = torrents;

        console.log('Torrents found for besttorrent', torrentsFound.length);
        TorrentFromProvidersQuery.sortByBalanced(torrentsFound);

        const torrentQuality = this.getTorrentQualitySortedBalanced(torrentsFound);

        const qualities = sourceQuality.qualities;

        let bestTorrent = null;

        qualities.forEach(quality => {
          if (!quality.enabled || bestTorrent) {
            return;
          }

          if (quality.quality === '2160p' && this.hasBestTorrent(torrentQuality.torrents2160p)) {
            bestTorrent = torrentQuality.torrents2160p[0];
          } else if (quality.quality === '1080p' && this.hasBestTorrent(torrentQuality.torrents1080p)) {
            bestTorrent = torrentQuality.torrents1080p[0];
          } else if (quality.quality === '720p' && this.hasBestTorrent(torrentQuality.torrents720p)) {
            bestTorrent = torrentQuality.torrents720p[0];
          } else if (quality.quality === 'other' && this.hasBestTorrent(torrentQuality.torrentsOther)) {
            bestTorrent = torrentQuality.torrentsOther[0];
          }
        });

        if (!bestTorrent && torrentsFound.length > 0) {
          bestTorrent = torrentsFound[0];
        }

        console.log('bestTorrent is ', bestTorrent);

        return bestTorrent;
      })
    );

    return result;
  }

  getTorrentQualitySortedBalanced(torrents: Torrent[]) {
    const torrentQuality: TorrentQuality = {
      torrents2160p: [],
      torrents1080p: [],
      torrents720p: [],
      torrentsOther: []
    };

    torrents.forEach(torrent => {
      if (torrent.quality === '2160p') {
        torrentQuality.torrents2160p.push(torrent);
      } else if (torrent.quality === '1080p') {
        torrentQuality.torrents1080p.push(torrent);
      } else if (torrent.quality === '720p') {
        torrentQuality.torrents720p.push(torrent);
      } else {
        torrentQuality.torrentsOther.push(torrent);
      }
    });

    TorrentFromProvidersQuery.sortByBalanced(torrentQuality.torrents2160p);
    TorrentFromProvidersQuery.sortByBalanced(torrentQuality.torrents1080p);
    TorrentFromProvidersQuery.sortByBalanced(torrentQuality.torrents720p);
    TorrentFromProvidersQuery.sortByBalanced(torrentQuality.torrentsOther);

    return torrentQuality;
  }

  getTorrentQualitySortedSize(torrents: Torrent[]) {
    const torrentQuality: TorrentQuality = {
      torrents2160p: [],
      torrents1080p: [],
      torrents720p: [],
      torrentsOther: []
    };

    torrents.forEach(torrent => {
      if (torrent.quality === '2160p') {
        torrentQuality.torrents2160p.push(torrent);
      } else if (torrent.quality === '1080p') {
        torrentQuality.torrents1080p.push(torrent);
      } else if (torrent.quality === '720p') {
        torrentQuality.torrents720p.push(torrent);
      } else {
        torrentQuality.torrentsOther.push(torrent);
      }
    });

    TorrentFromProvidersQuery.sortBySize(torrentQuality.torrents2160p);
    TorrentFromProvidersQuery.sortBySize(torrentQuality.torrents1080p);
    TorrentFromProvidersQuery.sortBySize(torrentQuality.torrents720p);
    TorrentFromProvidersQuery.sortBySize(torrentQuality.torrentsOther);

    return torrentQuality;
  }

  private hasBestTorrent(torrents: Torrent[]) {
    if (torrents.length === 0) {
      return false;
    }
    const torrent = torrents[0];
    return torrent.seeds >= 20 && torrent.seeds > torrent.peers;
  }

  getTorrentUrl(torrent: Torrent) {
    return TorrentGetUrlQuery.getData(torrent);
  }
}
