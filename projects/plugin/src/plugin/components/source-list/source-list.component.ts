import { KeyValuePipe, NgFor, NgIf, NgSwitch, NgSwitchCase } from '@angular/common';

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
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, Subscription } from 'rxjs';
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
import { removeCircleOutline, addOutline } from 'ionicons/icons';

@Component({
  selector: 'wk-source-list',
  templateUrl: './source-list.component.html',
  styleUrls: ['./source-list.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgIf,
    HideKeyboardEnterDirective,
    NgSwitch,
    NgFor,
    DebridSourceItemComponent,
    TorrentSourceItemComponent,
    NgSwitchCase,
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
    sourcesOther: [],
  };

  torrentSourcesByQuality: SourceByQuality<TorrentSource> = {
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
  private filterSourcesCache = new Map<string, any[]>();

  private settingsSubscription: Subscription;

  private readonly PAGE_SIZE = 20;
  private currentDebridPage = 0;
  private currentTorrentPage = 0;

  visibleDebridSources: Array<{ isHeader: boolean; quality?: string; source?: StreamLinkSource; count?: number }> = [];
  visibleTorrentSources: Array<{ isHeader: boolean; quality?: string; source?: TorrentSource; count?: number }> = [];

  constructor(
    private sourceService: SourceService,
    private debridAccountService: DebridAccountService,
    private providerService: ProviderService,
    private modalController: ModalController,
    private settingsService: SettingsService,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({ removeCircleOutline, addOutline });
  }

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

    if (this.searchOnOpen) {
      this.search();
    }
    this.searchOnOpen = true;

    this.settingsSubscription = this.settingsService.settings$.subscribe((settings) => {
      this.settings = settings.newValue;
      this.filterSources(this.streamLinkSources, this.torrentSources, this.settings);
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

    this.streamLinkSourcesByQuality = {
      sources2160p: [],
      sources1080p: [],
      sources720p: [],
      sourcesOther: [],
    };

    this.torrentSourcesByQuality = {
      sources2160p: [],
      sources1080p: [],
      sources720p: [],
      sourcesOther: [],
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
        category: this.manualSearchCategory,
      };
    } else {
      this.sourceQuery = await SourceQueryFromKodiOpenMediaQuery.getData(this.kodiOpenMedia).toPromise();

      if (this.kodiOpenMedia.movie) {
        this.lastPlayedSource = await this.sourceService.getLastMoviePlayedSource().toPromise();
      } else if (this.kodiOpenMedia.show && this.kodiOpenMedia.episode) {
        this.lastPlayedSource = await this.sourceService
          .getLastEpisodePlayedSource(this.kodiOpenMedia.show.ids.trakt)
          .toPromise();
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
        }),
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
    this.cdr.markForCheck();
  }

  private filterSources(streamLinkSources: StreamLinkSource[], torrentSources: TorrentSource[], settings: Settings) {
    if (
      this.areSourcesEqual(this.streamLinkSourcesCopy, streamLinkSources) &&
      this.areSourcesEqual(this.torrentSourcesCopy, torrentSources)
    ) {
      return;
    }

    const streamSortMethod: (source) => void = sortTorrentsBySize;
    const torrentSortMethod = this.getCachedSortMethod(torrentSources, settings.sourceFilter.sortTorrentsBy);

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

    this.updateTotalCounts();

    if (this.searchInput.length > 0) {
      this.filterSearch();
    }

    this.resetPagination();
  }

  private updateTotalCounts() {
    this.totalStreamLinkSource = this.streamLinkSources.length;
    this.totalTorrentSource = this.torrentSources.length;
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

  private getSourcesFiltered<T>(sources: T[], filter: string) {
    const cacheKey = `${filter}-${sources.length}`;
    if (!this.filterSourcesCache.has(cacheKey)) {
      const filtered = sources.filter((source: any) => {
        return this.isMatching(source.title + ' ' + source.provider, filter);
      });
      this.filterSourcesCache.set(cacheKey, filtered);
    }
    return this.filterSourcesCache.get(cacheKey);
  }

  private areSourcesEqual<T extends { id: string }>(sources1: T[], sources2: T[]): boolean {
    if (sources1.length !== sources2.length) return false;
    return sources1.every((source, index) => source.id === sources2[index].id);
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

    if (this.searchInput === '') {
      this.resetSearch();
      return;
    }
    this.filterSearch();
  }

  private filterSearch() {
    const streamLinkSourceByQuality: SourceByQuality<StreamLinkSource> = {
      sources2160p: [],
      sources1080p: [],
      sources720p: [],
      sourcesOther: [],
    };

    const torrentSourceByQuality: SourceByQuality<TorrentSource> = {
      sources2160p: [],
      sources1080p: [],
      sources720p: [],
      sourcesOther: [],
    };

    this.streamLinkSourcesByQuality = this.getSourcesFilteredByQuality<StreamLinkSource>(
      streamLinkSourceByQuality,
      this.streamLinkSourcesByQualityCopy,
      this.searchInput,
    );

    this.torrentSourcesByQuality = this.getSourcesFilteredByQuality<TorrentSource>(
      torrentSourceByQuality,
      this.torrentSourcesByQualityCopy,
      this.searchInput,
    );

    this.streamLinkSources = this.getSourcesFiltered<StreamLinkSource>(this.streamLinkSourcesCopy, this.searchInput);
    this.torrentSources = this.getSourcesFiltered<TorrentSource>(this.torrentSourcesCopy, this.searchInput);

    this.updateTotalCounts();
  }

  private resetSearch() {
    this.searchInput = '';
    this.streamLinkSourcesByQuality = Object.assign(this.streamLinkSourcesByQualityCopy);
    this.torrentSourcesByQuality = Object.assign(this.torrentSourcesByQualityCopy);

    this.streamLinkSources = Object.assign(this.streamLinkSourcesCopy);
    this.torrentSources = Object.assign(this.torrentSourcesCopy);

    this.updateTotalCounts();
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
      return this.streamLinkSources.map((source) => ({ isHeader: false, source }));
    }

    const result = [];
    Object.keys(this.streamLinkSourcesByQuality).forEach((quality) => {
      const sources = this.streamLinkSourcesByQuality[quality];
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
      return this.torrentSources.map((source) => ({ isHeader: false, source }));
    }

    const result = [];
    Object.keys(this.torrentSourcesByQuality).forEach((quality) => {
      const sources = this.torrentSourcesByQuality[quality];
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
}
