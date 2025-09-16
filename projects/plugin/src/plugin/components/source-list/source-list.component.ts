import { KeyValuePipe } from '@angular/common';

import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import {
  ModalController,
  IonProgressBar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSearchbar,
  IonList,
  IonItem,
  IonItemSliding,
  IonText,
  IonNote,
  IonBadge,
  IonItemOptions,
  IonItemOption,
  IonIcon,
  IonSpinner,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonButton,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { lastValueFrom, Subject, Subscription } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { HideKeyboardEnterDirective } from '../../directives/hide-keyboard-enter.directive';
import { KodiOpenMedia } from '../../entities/kodi-open-media';
import { LastPlayedSource } from '../../entities/last-played-source';
import { Provider } from '../../entities/provider';
import { Settings } from '../../entities/settings';
import { SourceByProvider } from '../../entities/source-by-provider';
import { SourceByQuality } from '../../entities/source-by-quality';
import { SourceQuery } from '../../entities/source-query';
import { StreamLinkSource } from '../../entities/stream-link-source';
import { TorrentSource } from '../../entities/torrent-source';
import { SourceQueryFromKodiOpenMediaQuery } from '../../queries/source-query-from-kodi-open-media.query';
import { DebridAccountService } from '../../services/debrid-account.service';
import { ProviderService } from '../../services/provider.service';
import { SettingsService } from '../../services/settings.service';
import { SourceUtils } from '../../services/source-utils';
import { SourceService } from '../../services/sources/source.service';
import {
  getSourcesByQuality,
  removeDuplicates,
  sortTorrentsBalanced,
  sortTorrentsBySeeds,
  sortTorrentsBySize,
} from '../../services/tools';
import { CloudAccountListComponent } from '../../settings/cloud-account/cloud-account-list/cloud-account-list.component';
import { ProvidersComponent } from '../../settings/providers/providers.component';
import { DebridSourceItemComponent } from '../debrid-source-item/debrid-source-item.component';
import { TorrentSourceItemComponent } from '../torrent-source-item/torrent-source-item.component';
import { addIcons } from 'ionicons';
import { removeCircleOutline, addOutline, informationCircleOutline } from 'ionicons/icons';
import { TorrentSourceDetail } from '../../entities/torrent-source-detail';
import { TorrentSourceDetailModalComponent } from '../torrent-source-detail-modal/torrent-source-detail-modal.component';

@Component({
  selector: 'wk-source-list',
  templateUrl: './source-list.component.html',
  styleUrls: ['./source-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HideKeyboardEnterDirective,
    DebridSourceItemComponent,
    TorrentSourceItemComponent,
    KeyValuePipe,
    TranslateModule,
    IonProgressBar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSearchbar,
    IonList,
    IonItem,
    IonItemSliding,
    IonText,
    IonNote,
    IonBadge,
    IonItemOptions,
    IonItemOption,
    IonIcon,
    IonSpinner,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonButton,
  ],
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

  allStreamLinkSources: StreamLinkSource[] = [];
  allTorrentSources: TorrentSource[] = [];

  streamLinkSourcesByQualityFiltered: SourceByQuality<StreamLinkSource> = {
    sources2160p: [],
    sources1080p: [],
    sources720p: [],
    sourcesOther: [],
  };

  torrentSourcesByQualityFiltered: SourceByQuality<TorrentSource> = {
    sources2160p: [],
    sources1080p: [],
    sources720p: [],
    sourcesOther: [],
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

  private sortTorrentsCache = new Map<string, (source: any) => void>();

  private settingsSubscription: Subscription;

  private readonly PAGE_SIZE = 20;
  private currentDebridPage = 0;
  private currentTorrentPage = 0;

  visibleDebridSources: Array<{ isHeader: boolean; quality?: string; source?: StreamLinkSource; count?: number }> = [];
  visibleTorrentSources: Array<{ isHeader: boolean; quality?: string; source?: TorrentSource; count?: number }> = [];

  // Todo: We could show an alert if no sources are found but we have excluded sources.
  applySettingsFilters = true;

  constructor(
    private sourceService: SourceService,
    private debridAccountService: DebridAccountService,
    private providerService: ProviderService,
    private modalController: ModalController,
    private settingsService: SettingsService,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({ informationCircleOutline, removeCircleOutline, addOutline });
  }

  async ngOnInit() {
    this.hasDebridAccount = await this.debridAccountService.hasAtLeastOneAccount();

    if (this.kodiOpenMedia) {
      this.sourceQuery = await lastValueFrom(SourceQueryFromKodiOpenMediaQuery.getData(this.kodiOpenMedia));
      this.providers = await this.providerService.getAll(true, this.sourceQuery.category);
    }

    this.hasProvider = (await this.providerService.getAll(true)).length > 0;

    this.settings = await this.settingsService.get();

    if (!this.hasDebridAccount) {
      this.segment = 'torrents';
    }

    if (this.searchOnOpen) {
      this.search();
    }
    this.searchOnOpen = true;

    this.settingsSubscription = this.settingsService.settings$.subscribe(async (settings) => {
      this.hasProvider = (await this.providerService.getAll(true)).length > 0;
      this.hasDebridAccount = await this.debridAccountService.hasAtLeastOneAccount();

      this.settings = settings.newValue;
      this.filterSources({
        streamLinkSources: this.allStreamLinkSources,
        torrentSources: this.allTorrentSources,
        settings: this.settings,
      });

      this.cdr.detectChanges();
    });

    this.initialized = true;

    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.stopSearch$.next(true);
    if (this.settingsSubscription) {
      this.settingsSubscription.unsubscribe();
    }
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

    this.streamLinkSourcesByQualityFiltered = {
      sources2160p: [],
      sources1080p: [],
      sources720p: [],
      sourcesOther: [],
    };

    this.torrentSourcesByQualityFiltered = {
      sources2160p: [],
      sources1080p: [],
      sources720p: [],
      sourcesOther: [],
    };

    this.allStreamLinkSources = [];
    this.allTorrentSources = [];

    this.sourceByProviders = [];

    this.providerIsLoading = {};

    this.stopSearch$.next(true);

    if (!this.kodiOpenMedia || this.manualSearchValue) {
      if (this.manualSearchValue.length === 0) {
        return;
      }

      this.sourceQuery = {
        query: this.manualSearchValue,
        category: this.manualSearchCategory,
      };
    } else {
      this.sourceQuery = await lastValueFrom(SourceQueryFromKodiOpenMediaQuery.getData(this.kodiOpenMedia));

      if (this.kodiOpenMedia.movie) {
        this.lastPlayedSource = await lastValueFrom(this.sourceService.getLastMoviePlayedSource());
      } else if (this.kodiOpenMedia.show && this.kodiOpenMedia.episode) {
        this.lastPlayedSource = await lastValueFrom(
          this.sourceService.getLastEpisodePlayedSource(this.kodiOpenMedia.show.ids.trakt),
        );
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
      .getAll({
        sourceQuery: this.sourceQuery,
        applySettingsFilters: this.applySettingsFilters,
      })
      .pipe(
        takeUntil(this.stopSearch$),
        finalize(() => {
          this.searching = false;

          const endTime = Date.now();
          this.totalTimeElapsed = endTime - startTime;
        }),
      )
      .subscribe((sourceByProvider) => {
        total++;

        delete this.providerIsLoading[sourceByProvider.provider];

        this.setSources({ sourceByProvider, settings: this.settings });

        this.progressBarValue = total / this.providers.length;

        this.cdr.detectChanges();
      });
  }

  private setSources({ sourceByProvider, settings }: { sourceByProvider: SourceByProvider; settings: Settings }) {
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

      if (sourceByProviders.torrentSourceDetail) {
        sourceByProviders.torrentSourceDetail.sources.forEach((source) => {
          if (!torrentIds.includes(source.id)) {
            torrentIds.push(source.id);
            torrentSources.push(source);
          }
        });
      }
    });

    streamLinkSources = removeDuplicates<StreamLinkSource>(streamLinkSources, 'id');
    torrentSources = removeDuplicates<TorrentSource>(torrentSources, 'hash');

    this.filterSources({ streamLinkSources, torrentSources, settings });
  }

  private filterSources({
    streamLinkSources,
    torrentSources,
    settings,
  }: {
    streamLinkSources: StreamLinkSource[];
    torrentSources: TorrentSource[];
    settings: Settings;
  }) {
    const streamLinkSortMethod: (source) => void = sortTorrentsBySize;
    const torrentSortMethod = this.getCachedSortMethod(torrentSources, settings.sourceFilter.sortTorrentsBy);

    streamLinkSortMethod(streamLinkSources);
    torrentSortMethod(torrentSources);

    let streamLinkSourcesByQuality = getSourcesByQuality<StreamLinkSource>(streamLinkSources, streamLinkSortMethod);
    let torrentSourcesByQuality = getSourcesByQuality<TorrentSource>(torrentSources, torrentSortMethod);

    this.allStreamLinkSources = streamLinkSources;
    this.allTorrentSources = torrentSources;

    if (this.searchInput.length > 0) {
      streamLinkSourcesByQuality = this.getSourcesFilteredByQuality<StreamLinkSource>(
        streamLinkSourcesByQuality,
        this.searchInput,
      );

      torrentSourcesByQuality = this.getSourcesFilteredByQuality<TorrentSource>(
        torrentSourcesByQuality,
        this.searchInput,
      );
    }

    this.streamLinkSourcesByQualityFiltered = streamLinkSourcesByQuality;
    this.torrentSourcesByQualityFiltered = torrentSourcesByQuality;

    this.updateTotalCounts();

    this.resetPagination();

    this.cdr.detectChanges();
  }

  private updateTotalCounts() {
    this.totalStreamLinkSource = Object.keys(this.streamLinkSourcesByQualityFiltered).reduce(
      (acc, quality) => acc + this.streamLinkSourcesByQualityFiltered[quality].length,
      0,
    );
    this.totalTorrentSource = Object.keys(this.torrentSourcesByQualityFiltered).reduce(
      (acc, quality) => acc + this.torrentSourcesByQualityFiltered[quality].length,
      0,
    );
  }

  private getCachedSortMethod(sources: TorrentSource[], method: string): (source: any) => void {
    const cacheKey = `${method}-${sources.length}`;
    if (!this.sortTorrentsCache.has(cacheKey)) {
      let sortMethod: (source: any) => void;
      switch (method) {
        case 'seeds':
          sortMethod = sortTorrentsBySeeds;
          break;
        case 'size':
          sortMethod = sortTorrentsBySize;
          break;
        default:
          sortMethod = sortTorrentsBalanced;
      }
      this.sortTorrentsCache.set(cacheKey, sortMethod);
    }
    return this.sortTorrentsCache.get(cacheKey);
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
      component: CloudAccountListComponent,
    });

    await modal.present();

    modal.onDidDismiss().then(() => this.search());
  }

  async openProviderModal() {
    const modal = await this.modalController.create({
      component: ProvidersComponent,
    });

    await modal.present();

    modal.onDidDismiss().then(() => this.search());
  }

  onSearch(event: any) {
    this.searchInput = event.target.value ? event.target.value : '';

    this.filterSources({
      streamLinkSources: this.allStreamLinkSources,
      torrentSources: this.allTorrentSources,
      settings: this.settings,
    });
  }

  private getSourcesFilteredByQuality<T>(sources: SourceByQuality<T>, filter: string) {
    const targets: SourceByQuality<T> = {
      sources2160p: [],
      sources1080p: [],
      sources720p: [],
      sourcesOther: [],
    };
    Object.keys(targets).forEach((key) => {
      if (sources.hasOwnProperty(key)) {
        targets[key] = sources[key].filter((source: StreamLinkSource | TorrentSource) => {
          return this.isMatching(source.title + ' ' + source.provider, filter);
        });
      }
    });
    return targets;
  }

  private isMatching(str: string, filter: string) {
    return SourceUtils.stripAccents(str.toLowerCase()).match(SourceUtils.stripAccents(filter.toLowerCase())) !== null;
  }

  private getFlattenedDebridSources(): Array<{
    isHeader: boolean;
    quality?: string;
    source?: StreamLinkSource;
    count?: number;
  }> {
    if (!this.settings.sourceFilter.groupStreamsByQuality) {
      return this.allStreamLinkSources.map((source) => ({ isHeader: false, source }));
    }

    const result = [];
    Object.keys(this.streamLinkSourcesByQualityFiltered).forEach((quality) => {
      const sources = this.streamLinkSourcesByQualityFiltered[quality];
      if (sources.length > 0) {
        result.push({
          isHeader: true,
          quality: quality.replace('sources', ''),
          count: sources.length,
        });
        sources.forEach((source) => result.push({ isHeader: false, source }));
      }
    });
    return result;
  }

  private getFlattenedTorrentSources(): Array<{
    isHeader: boolean;
    quality?: string;
    source?: TorrentSource;
    count?: number;
  }> {
    if (!this.settings.sourceFilter.groupTorrentsByQuality) {
      return this.allTorrentSources.map((source) => ({ isHeader: false, source }));
    }

    const result = [];
    Object.keys(this.torrentSourcesByQualityFiltered).forEach((quality) => {
      const sources = this.torrentSourcesByQualityFiltered[quality];
      if (sources.length > 0) {
        result.push({
          isHeader: true,
          quality: quality.replace('sources', ''),
          count: sources.length,
        });
        sources.forEach((source) => result.push({ isHeader: false, source }));
      }
    });
    return result;
  }

  trackByFlatItem(index: number, item: any): string {
    if (item.isHeader) {
      return `header-${item.quality}`;
    }
    return item.source.hash || item.source.id;
  }

  loadMoreDebridSources(event?: any) {
    const allSources = this.getFlattenedDebridSources();

    const start = this.currentDebridPage * this.PAGE_SIZE;
    const end = start + this.PAGE_SIZE;

    this.visibleDebridSources = [...this.visibleDebridSources, ...allSources.slice(start, end)];
    this.currentDebridPage++;

    if (event) {
      event.target.complete();
      if (end >= allSources.length) {
        event.target.disabled = true;
      }
    }
  }

  loadMoreTorrentSources(event?: any) {
    const allSources = this.getFlattenedTorrentSources();

    const start = this.currentTorrentPage * this.PAGE_SIZE;
    const end = start + this.PAGE_SIZE;

    this.visibleTorrentSources = [...this.visibleTorrentSources, ...allSources.slice(start, end)];
    this.currentTorrentPage++;

    if (event) {
      event.target.complete();
      if (end >= allSources.length) {
        event.target.disabled = true;
      }
    }
  }

  resetPagination() {
    this.currentDebridPage = 0;
    this.currentTorrentPage = 0;
    this.visibleDebridSources = [];
    this.visibleTorrentSources = [];
    this.loadMoreDebridSources();
    this.loadMoreTorrentSources();
  }

  async providerDetails(torrentSourceDetail: TorrentSourceDetail) {
    const modal = await this.modalController.create({
      component: TorrentSourceDetailModalComponent,
      componentProps: {
        sourceDetail: torrentSourceDetail,
      },
    });

    await modal.present();
  }
}
