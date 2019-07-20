import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Torrent } from '../../entities/torrent';
import { from, Subscription } from 'rxjs';
import { Provider } from '../../entities/provider';
import { SourceResult, TorrentFromProvidersQuery } from '../../queries/torrents/torrent-from-providers.query';
import { TorrentService, TorrentsQueryFilter } from '../../services/torrent.service';
import { KodiOpenMedia } from '../../entities/kodi-open-media';
import { ProviderService } from '../../services/provider.service';
import { CloudAccountService } from '../../services/cloud-account.service';

@Component({
  selector: 'wk-source-list',
  templateUrl: './source-list.component.html',
  styleUrls: ['./source-list.component.scss']
})
export class SourceListComponent implements OnChanges, OnDestroy {
  @Input() filter: TorrentsQueryFilter;

  @Input() torrents: Torrent[] | null = null;

  @Input() kodiOpenMedia: KodiOpenMedia;

  @Input() chooseAutoStream = true;

  totalTorrents = 0;
  totalCachedTorrents = 0;

  torrents2160p: Torrent[] = [];
  torrents1080p: Torrent[] = [];
  torrents720p: Torrent[] = [];
  torrentsOther: Torrent[] = [];

  cached2160p: Torrent[] = [];
  cached1080p: Torrent[] = [];
  cached720p: Torrent[] = [];
  cachedOther: Torrent[] = [];

  retrievingTorrents = false;

  initialized = false;

  sourceResult: SourceResult;

  get loadingByProvider(): LoaderProvider[] {
    const data = [];
    Object.keys(this.loaderByProvider).forEach(key => {
      data.push(this.loaderByProvider[key]);
    });

    return data;
  }

  providers: Provider[] = [];

  private loaderByProvider: { [key: string]: LoaderProvider } = {};

  private subscriptions: Subscription[] = [];

  hasCloudAccount = false;
  segment = 'all';

  constructor(
    private torrentService: TorrentService,
    private providerService: ProviderService,
    private cloudAccountService: CloudAccountService
  ) {

  }

  ngOnChanges(changes: SimpleChanges) {
    this.retrieveData();
  }

  private retrieveData() {
    this.getProviders().subscribe(providers => {
      this.providers = providers;

      this.cloudAccountService.hasAtLeastOneAccount().then(has => {
        this.hasCloudAccount = has;
        if (has) {
          this.segment = 'cached';
        }
      });

      this.subscriptions.forEach(_subscriber => {
        _subscriber.unsubscribe();
      });

      if (this.torrents !== null) {
        this.setTorrents(this.torrents);

        this.retrievingTorrents = false;
      } else if (this.filter.query && this.filter.query.length === 0) {
        this.setTorrents([]);

        this.retrievingTorrents = false;
      } else {
        this.retrievingTorrents = true;

        this.providerService.getSourceQualitySettings().then(sourceQuality => {
          const excludeQualities = [];
          sourceQuality.qualities.forEach(quality => {
            if (!quality.enabled) {
              excludeQualities.push(quality.quality);
            }
          });

          this.getTorrents(providers, excludeQualities);
        });
      }

      this.initialized = true;
    });
  }

  private getProviders() {
    return from(this.providerService.getAll());
  }

  private getTorrents(providers: Provider[], excludeQualities: string[]) {
    this.sourceResult = TorrentFromProvidersQuery.getData(providers, this.filter, excludeQualities);

    this.loaderByProvider = this.sourceResult.sourceByProvider;

    this.subscriptions.push(
      this.sourceResult.allSources.subscribe(torrents => {
        this.setTorrents(torrents);
        this.retrievingTorrents = false;
      })
    );
  }

  private setTorrents(torrents: Torrent[]) {
    this.totalTorrents = torrents.length;

    const torrentUris = [];
    torrents = torrents.filter(torrent => {
      const url = torrent.subPageUrl ? torrent.subPageUrl : torrent.url;
      if (!torrentUris.includes(url)) {
        torrentUris.push(url);
        return true;
      }

      return false;
    });

    const torrentQuality = this.torrentService.getTorrentQualitySortedBalanced(torrents);

    this.torrents2160p = torrentQuality.torrents2160p;
    this.torrents1080p = torrentQuality.torrents1080p;
    this.torrents720p = torrentQuality.torrents720p;
    this.torrentsOther = torrentQuality.torrentsOther;

    const cachedTorrent = torrents.slice(0).filter(torrent => torrent.isCachedSource);

    const torrentQualityCached = this.torrentService.getTorrentQualitySortedSize(cachedTorrent);

    this.cached2160p = torrentQualityCached.torrents2160p;
    this.cached1080p = torrentQualityCached.torrents1080p;
    this.cached720p = torrentQualityCached.torrents720p;
    this.cachedOther = torrentQualityCached.torrentsOther;

    this.totalCachedTorrents =
      this.cached2160p.length + this.cached1080p.length + this.cached720p.length + this.cachedOther.length;
  }

  ngOnDestroy() {
    this.subscriptions.forEach(_subscriber => {
      _subscriber.unsubscribe();
    });
  }

  stopLoadingProvider(loader: LoaderProvider) {
    loader.isLoading = false;
    loader.subscription.unsubscribe();
  }

  searchSources() {
    this.retrieveData();
  }
}

interface LoaderProvider {
  torrents: Torrent[];
  providerName: string;
  displayName: string;
  isLoading: boolean;
  subscription: Subscription;
}
