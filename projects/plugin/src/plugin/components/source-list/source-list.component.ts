import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { SourceService } from '../../services/sources/source.service';
import { DebridAccountService } from '../../services/debrid-account.service';
import { KodiOpenMedia } from '../../entities/kodi-open-media';
import { SourceByQuality } from '../../entities/source-by-quality';
import { TorrentSource } from '../../entities/torrent-source';
import { SourceByProvider } from '../../entities/source-by-provider';
import { StreamLinkSource } from '../../entities/stream-link-source';
import { getSourcesByQuality, removeDuplicates, sortTorrentsBalanced, sortTorrentsBySize } from '../../services/tools';
import { finalize, takeUntil } from 'rxjs/operators';
import { SourceQuery } from '../../entities/source-query';
import { ProviderService } from '../../services/provider.service';
import { Provider } from '../../entities/provider';
import { LastPlayedSource } from '../../entities/last-played-source';
import { Subject } from 'rxjs';
import { ModalController } from '@ionic/angular';
import { CloudAccountListComponent } from '../../settings/cloud-account/cloud-account-list/cloud-account-list.component';
import { ProvidersComponent } from '../../settings/providers/providers.component';
import { SourceQueryFromKodiOpenMediaQuery } from '../../queries/source-query-from-kodi-open-media.query';
import { SourceUtils } from '../../services/source-utils';

@Component({
  selector: 'wk-source-list',
  templateUrl: './source-list.component.html',
  styleUrls: ['./source-list.component.scss']
})
export class SourceListComponent implements OnInit, OnChanges, OnDestroy {
  sourceByProviders: SourceByProvider[] = [];

  providerIsLoading: { [key: string]: Provider } = {};

  @Input()
  manualSearchValue: string = null;

  @Input()
  manualSearchCategory: 'movie' | 'tv' | 'anime' = 'movie';

  @Input()
  kodiOpenMedia: KodiOpenMedia;

  @Input()
  searchOnOpen = true;

  totalStreamLinkSource = 0;
  totalTorrentSource = 0;

  private streamLinkSourcesByQualityCopy: SourceByQuality<StreamLinkSource>;
  private torrentSourcesByQualityCopy: SourceByQuality<TorrentSource>;

  streamLinkSourcesByQuality: SourceByQuality<StreamLinkSource> = {
    sources2160p: [],
    sources1080p: [],
    sources720p: [],
    sourcesOther: []
  };

  torrentSourcesByQuality: SourceByQuality<TorrentSource> = {
    sources2160p: [],
    sources1080p: [],
    sources720p: [],
    sourcesOther: []
  };

  hasDebridAccount: boolean;

  segment = 'debrid';

  hasProvider = true;
  providers: Provider[] = [];

  searching = true;

  progressBarValue = 0;

  totalTimeElapsed = 0;

  sourceQuery: SourceQuery;

  lastPlayedSource: LastPlayedSource;

  stopSearch$ = new Subject<boolean>();

  initialized = false;

  private ready = false;
  searchInput = '';

  constructor(
    private sourceService: SourceService,
    private debridAccountService: DebridAccountService,
    private providerService: ProviderService,
    private modalController: ModalController
  ) {
  }

  async ngOnInit() {
    this.hasDebridAccount = await this.debridAccountService.hasAtLeastOneAccount();

    if (!this.hasDebridAccount) {
      this.segment = 'torrents';
    }

    this.ready = true;

    if (this.searchOnOpen) {
      this.search();
    }
    this.searchOnOpen = true;
  }

  ngOnDestroy() {
    this.stopSearch$.next(true);
  }

  async ngOnChanges() {
    if (!this.ready) {
      return;
    }

    this.search();
  }

  private async search() {
    this.progressBarValue = 0;

    this.totalTimeElapsed = 0;

    this.totalStreamLinkSource = 0;
    this.totalTorrentSource = 0;

    this.streamLinkSourcesByQuality = {
      sources2160p: [],
      sources1080p: [],
      sources720p: [],
      sourcesOther: []
    };

    this.torrentSourcesByQuality = {
      sources2160p: [],
      sources1080p: [],
      sources720p: [],
      sourcesOther: []
    };

    this.sourceByProviders = [];

    this.providerIsLoading = {};

    this.hasProvider = (await this.providerService.getAll(true)).length > 0;

    this.stopSearch$.next(true);

    this.initialized = true;

    if (!this.kodiOpenMedia || this.manualSearchValue) {
      if (this.manualSearchValue.length === 0) {
        return;
      }

      this.sourceQuery = {
        query: this.manualSearchValue,
        category: this.manualSearchCategory
      };
    } else {
      this.sourceQuery = await SourceQueryFromKodiOpenMediaQuery.getData(this.kodiOpenMedia).toPromise();

      if (this.kodiOpenMedia.movie) {
        this.lastPlayedSource = await this.sourceService.getLastMoviePlayedSource().toPromise();
      } else if (this.kodiOpenMedia.show && this.kodiOpenMedia.episode) {
        this.lastPlayedSource = await this.sourceService.getLastEpisodePlayedSource(this.kodiOpenMedia.show.traktId).toPromise();
      }
    }

    this.searching = true;

    const startTime = Date.now();

    let total = 0;

    this.providers = await this.providerService.getAll(true, this.sourceQuery.category);

    this.providers.forEach(provider => {
      this.providerIsLoading[provider.name] = provider;
    });

    this.sourceService
      .getAll(this.sourceQuery)
      .pipe(
        takeUntil(this.stopSearch$),
        finalize(() => {
          this.searching = false;

          const endTime = Date.now();
          this.totalTimeElapsed = endTime - startTime;
        })
      )
      .subscribe(sourceByProvider => {
        total++;

        delete this.providerIsLoading[sourceByProvider.provider];

        this.setSources(sourceByProvider);

        this.progressBarValue = total / this.providers.length;
      });
  }

  private setSources(sourceByProvider: SourceByProvider) {
    const sources = this.sourceByProviders.slice(0);
    sources.push(sourceByProvider);

    this.sourceByProviders = sources;

    let streamLinkSources: StreamLinkSource[] = [];
    let torrentSources: TorrentSource[] = [];

    const streamIds = [];
    const torrentIds = [];

    this.sourceByProviders.forEach(sourceByProviders => {
      sourceByProviders.cachedTorrentDetail.sources.forEach(source => {
        if (!streamIds.includes(source.id)) {
          streamIds.push(source.id);
          streamLinkSources.push(source);
        }
      });

      sourceByProviders.torrentSourceDetail.sources.forEach(source => {
        if (!torrentIds.includes(source.id)) {
          torrentIds.push(source.id);
          torrentSources.push(source);
        }
      });
    });

    streamLinkSources = removeDuplicates<StreamLinkSource>(streamLinkSources, 'id');
    torrentSources = removeDuplicates<TorrentSource>(torrentSources, 'hash');

    this.streamLinkSourcesByQuality = getSourcesByQuality<StreamLinkSource>(streamLinkSources, sortTorrentsBySize);
    this.torrentSourcesByQuality = getSourcesByQuality<TorrentSource>(torrentSources, sortTorrentsBalanced);

    this.streamLinkSourcesByQualityCopy = Object.assign(this.streamLinkSourcesByQuality);
    this.torrentSourcesByQualityCopy = Object.assign(this.torrentSourcesByQuality);

    this.totalStreamLinkSource = streamLinkSources.length;
    this.totalTorrentSource = torrentSources.length;

    if (this.searchInput.length > 0) {
      this.filterSearch();
    }
  }

  getProviderStatus(name: string) {
    return this.providers.find(provider => provider.name === name).enabled;
  }

  async toggleProvider(name: string, enabled: boolean) {
    const providerList = await this.providerService.getProviders();
    Object.keys(providerList).forEach(key => {
      if (providerList[key].name === name) {
        providerList[key].enabled = enabled;
      }
    });

    this.providers.find(provider => provider.name === name).enabled = enabled;

    await this.providerService.setProviders(providerList);
  }

  async openDebridAccountModal() {
    const modal = await this.modalController.create({
      component: CloudAccountListComponent
    });

    await modal.present();

    modal.onDidDismiss().then(() => this.search());
  }

  async openProviderModal() {
    const modal = await this.modalController.create({
      component: ProvidersComponent
    });

    await modal.present();

    modal.onDidDismiss().then(() => this.search());
  }

  onSearch(event: any) {
    this.searchInput = event.target.value ? event.target.value : '';

    if (this.searchInput === '') {
      this.resetSearch();
      return;
    }
    this.filterSearch();
  }

  private resetCounter() {
    this.totalStreamLinkSource =
      this.streamLinkSourcesByQuality.sources2160p.length +
      this.streamLinkSourcesByQuality.sources1080p.length +
      this.streamLinkSourcesByQuality.sources720p.length +
      this.streamLinkSourcesByQuality.sourcesOther.length;
    this.totalTorrentSource =
      this.torrentSourcesByQuality.sources2160p.length +
      this.torrentSourcesByQuality.sources1080p.length +
      this.torrentSourcesByQuality.sources720p.length +
      this.torrentSourcesByQuality.sourcesOther.length;
  }

  private filterSearch() {
    const streamLinkSource: SourceByQuality<StreamLinkSource> = {
      sources2160p: [],
      sources1080p: [],
      sources720p: [],
      sourcesOther: []
    };

    const torrentSource: SourceByQuality<TorrentSource> = {
      sources2160p: [],
      sources1080p: [],
      sources720p: [],
      sourcesOther: []
    };
    this.streamLinkSourcesByQuality = this.getSourcesFiltered<StreamLinkSource>(
      streamLinkSource,
      this.streamLinkSourcesByQualityCopy,
      this.searchInput
    );
    this.torrentSourcesByQuality = this.getSourcesFiltered<TorrentSource>(
      torrentSource,
      this.torrentSourcesByQualityCopy,
      this.searchInput
    );

    this.resetCounter();
  }

  private resetSearch() {
    this.searchInput = '';
    this.streamLinkSourcesByQuality = Object.assign(this.streamLinkSourcesByQualityCopy);
    this.torrentSourcesByQuality = Object.assign(this.torrentSourcesByQualityCopy);

    this.resetCounter();
  }

  private getSourcesFiltered<T>(targets: SourceByQuality<T>, sources: SourceByQuality<T>, filter: string) {
    Object.keys(targets).forEach(key => {
      if (sources.hasOwnProperty(key)) {
        targets[key] = sources[key].filter((source: StreamLinkSource | TorrentSource) => {
          return SourceUtils.isWordMatching(source.title + ' ' + source.provider, filter, 0);
        });
      }
    });
    return targets;
  }
}
