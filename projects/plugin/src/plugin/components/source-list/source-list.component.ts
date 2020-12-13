import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { SourceService } from '../../services/sources/source.service';
import { DebridAccountService } from '../../services/debrid-account.service';
import { KodiOpenMedia } from '../../entities/kodi-open-media';
import { SourceByQuality } from '../../entities/source-by-quality';
import { TorrentSource } from '../../entities/torrent-source';
import { SourceByProvider } from '../../entities/source-by-provider';
import { StreamLinkSource } from '../../entities/stream-link-source';
import { getSourcesByQuality, removeDuplicates, sortTorrentsBalanced, sortTorrentsBySeeds, sortTorrentsBySize } from '../../services/tools';
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
import { SettingsService } from '../../services/settings.service';
import { Settings } from '../../entities/settings';
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

  @Input()
  disableSearch = false;

  totalStreamLinkSource = 0;
  totalTorrentSource = 0;

  private streamLinkSourcesByQualityCopy: SourceByQuality<StreamLinkSource>;
  private torrentSourcesByQualityCopy: SourceByQuality<TorrentSource>;

  private streamLinkSourcesCopy: StreamLinkSource[] = [];
  private torrentSourcesCopy: TorrentSource[] = [];

  streamLinkSources: StreamLinkSource[] = [];
  torrentSources: TorrentSource[] = [];

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

  searchInput = '';

  settings: Settings;

  constructor(
    private sourceService: SourceService,
    private debridAccountService: DebridAccountService,
    private providerService: ProviderService,
    private modalController: ModalController,
    private settingsService: SettingsService
  ) {}

  async ngOnInit() {
    this.hasDebridAccount = await this.debridAccountService.hasAtLeastOneAccount();

    if (this.kodiOpenMedia) {
      this.sourceQuery = await SourceQueryFromKodiOpenMediaQuery.getData(this.kodiOpenMedia).toPromise();
      this.providers = await this.providerService.getAll(true, this.sourceQuery.category);
    }

    this.hasProvider = (await this.providerService.getAll(true)).length > 0;

    this.settings = await this.settingsService.get();

    if (!this.hasDebridAccount) {
      this.segment = 'torrents';
    }

    this.initialized = true;

    if (this.searchOnOpen) {
      this.search();
    }
    this.searchOnOpen = true;

    this.settingsService.settings$.subscribe((settings) => {
      this.settings = settings.newValue;
      this.filterSources(this.streamLinkSources, this.torrentSources, this.settings);
    });
  }

  ngOnDestroy() {
    this.stopSearch$.next(true);
  }

  async ngOnChanges() {
    if (!this.initialized) {
      return;
    }

    this.search();
  }

  private async search() {
    if (this.disableSearch) {
      console.log('HELIOS SEARCH IS DISABLED');
      return;
    }
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

    this.streamLinkSources = [];
    this.torrentSources = [];

    this.sourceByProviders = [];

    this.providerIsLoading = {};

    this.stopSearch$.next(true);

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
        this.lastPlayedSource = await this.sourceService.getLastEpisodePlayedSource(this.kodiOpenMedia.show.ids.trakt).toPromise();
      }
    }

    this.providers = await this.providerService.getAll(true, this.sourceQuery.category);

    this.searching = true;

    const startTime = Date.now();

    let total = 0;

    this.providers.forEach((provider) => {
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
      .subscribe((sourceByProvider) => {
        total++;

        delete this.providerIsLoading[sourceByProvider.provider];

        this.setSources(sourceByProvider, this.settings);

        this.progressBarValue = total / this.providers.length;
      });
  }

  private setSources(sourceByProvider: SourceByProvider, settings: Settings) {
    const sources = this.sourceByProviders.slice(0);
    sources.push(sourceByProvider);

    this.sourceByProviders = sources;

    let streamLinkSources: StreamLinkSource[] = [];
    let torrentSources: TorrentSource[] = [];

    const streamIds = [];
    const torrentIds = [];

    this.sourceByProviders.forEach((sourceByProviders) => {
      sourceByProviders.cachedTorrentDetail.sources.forEach((source) => {
        if (!streamIds.includes(source.id)) {
          streamIds.push(source.id);
          streamLinkSources.push(source);
        }
      });

      sourceByProviders.torrentSourceDetail.sources.forEach((source) => {
        if (!torrentIds.includes(source.id)) {
          torrentIds.push(source.id);
          torrentSources.push(source);
        }
      });
    });

    streamLinkSources = removeDuplicates<StreamLinkSource>(streamLinkSources, 'id');
    torrentSources = removeDuplicates<TorrentSource>(torrentSources, 'hash');

    this.filterSources(streamLinkSources, torrentSources, settings);
  }

  private filterSources(streamLinkSources: StreamLinkSource[], torrentSources: TorrentSource[], settings: Settings) {
    const streamSortMethod: (source) => void = sortTorrentsBySize;
    let torrentSortMethod: (source) => void = sortTorrentsBalanced;

    if (settings.sourceFilter.sortTorrentsBy === 'seeds') {
      torrentSortMethod = sortTorrentsBySeeds;
    } else if (settings.sourceFilter.sortTorrentsBy === 'size') {
      torrentSortMethod = sortTorrentsBySize;
    }

    streamSortMethod(streamLinkSources);
    torrentSortMethod(torrentSources);

    this.streamLinkSources = streamLinkSources;
    this.torrentSources = torrentSources;

    this.streamLinkSourcesByQuality = getSourcesByQuality<StreamLinkSource>(streamLinkSources, streamSortMethod);
    this.torrentSourcesByQuality = getSourcesByQuality<TorrentSource>(torrentSources, torrentSortMethod);

    this.streamLinkSourcesByQualityCopy = Object.assign(this.streamLinkSourcesByQuality);
    this.torrentSourcesByQualityCopy = Object.assign(this.torrentSourcesByQuality);

    this.streamLinkSourcesCopy = Object.assign(this.streamLinkSources);
    this.torrentSourcesCopy = Object.assign(this.torrentSources);

    this.totalStreamLinkSource = streamLinkSources.length;
    this.totalTorrentSource = torrentSources.length;

    if (this.searchInput.length > 0) {
      this.filterSearch();
    }
  }

  getProviderStatus(name: string) {
    return this.providers.find((provider) => provider.name === name).enabled;
  }

  async toggleProvider(name: string, enabled: boolean) {
    const providerList = await this.providerService.getProviders();
    Object.keys(providerList).forEach((key) => {
      if (providerList[key].name === name) {
        providerList[key].enabled = enabled;
      }
    });

    this.providers.find((provider) => provider.name === name).enabled = enabled;

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
    const streamLinkSourceByQuality: SourceByQuality<StreamLinkSource> = {
      sources2160p: [],
      sources1080p: [],
      sources720p: [],
      sourcesOther: []
    };

    const torrentSourceByQuality: SourceByQuality<TorrentSource> = {
      sources2160p: [],
      sources1080p: [],
      sources720p: [],
      sourcesOther: []
    };

    this.streamLinkSourcesByQuality = this.getSourcesFilteredByQuality<StreamLinkSource>(
      streamLinkSourceByQuality,
      this.streamLinkSourcesByQualityCopy,
      this.searchInput
    );

    this.torrentSourcesByQuality = this.getSourcesFilteredByQuality<TorrentSource>(
      torrentSourceByQuality,
      this.torrentSourcesByQualityCopy,
      this.searchInput
    );

    this.streamLinkSources = this.getSourcesFiltered<StreamLinkSource>(this.streamLinkSourcesCopy, this.searchInput);
    this.torrentSources = this.getSourcesFiltered<TorrentSource>(this.torrentSourcesCopy, this.searchInput);

    this.resetCounter();
  }

  private resetSearch() {
    this.searchInput = '';
    this.streamLinkSourcesByQuality = Object.assign(this.streamLinkSourcesByQualityCopy);
    this.torrentSourcesByQuality = Object.assign(this.torrentSourcesByQualityCopy);

    this.streamLinkSources = Object.assign(this.streamLinkSourcesCopy);
    this.torrentSources = Object.assign(this.torrentSourcesCopy);

    this.resetCounter();
  }

  private getSourcesFilteredByQuality<T>(targets: SourceByQuality<T>, sources: SourceByQuality<T>, filter: string) {
    Object.keys(targets).forEach((key) => {
      if (sources.hasOwnProperty(key)) {
        targets[key] = sources[key].filter((source: StreamLinkSource | TorrentSource) => {
          return this.isMatching(source.title + ' ' + source.provider, filter);
        });
      }
    });
    return targets;
  }

  private getSourcesFiltered<T>(sources: T[], filter: string) {
    return sources.filter((source: any) => {
      return this.isMatching(source.title + ' ' + source.provider, filter);
    });
  }

  private isMatching(str: string, filter: string) {
    return SourceUtils.stripAccents(str.toLowerCase()).match(SourceUtils.stripAccents(filter.toLowerCase())) !== null;
  }
}
