import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { SourceService } from '../../services/sources/source.service';
import { DebridAccountService } from '../../services/debrid-account.service';
import { KodiOpenMedia } from '../../entities/kodi-open-media';
import { SourceByQuality } from '../../entities/source-by-quality';
import { TorrentSource } from '../../entities/torrent-source';
import { SourceByProvider } from '../../entities/source-by-provider';
import { StreamLinkSource } from '../../entities/stream-link-source';
import {
  getSourceQueryEpisode,
  getSourceQueryMovie,
  getSourcesByQuality,
  sortTorrentsBalanced,
  sortTorrentsBySize
} from '../../services/tools';
import { finalize, takeUntil } from 'rxjs/operators';
import { SourceQuery } from '../../entities/source-query';
import { ProviderService } from '../../services/provider.service';
import { Provider } from '../../entities/provider';
import { LastPlayedSource } from '../../entities/last-played-source';
import { Subject } from 'rxjs';
import { ModalController } from '@ionic/angular';
import { CloudAccountListComponent } from '../../settings/cloud-account/cloud-account-list/cloud-account-list.component';
import { ProvidersComponent } from '../../settings/providers/providers.component';

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

  totalStreamLinkSource = 0;
  totalTorrentSource = 0;

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

  providers: Provider[] = [];

  searching = true;

  progressBarValue = 0;

  totalTimeElapsed = 0;

  sourceQuery: SourceQuery;

  lastPlayedSource: LastPlayedSource;

  stopSearch$ = new Subject<boolean>();


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
  }

  ngOnDestroy() {
    this.stopSearch$.next(true);
  }

  async ngOnChanges() {
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

    let sourceQuery: SourceQuery;

    if (!this.kodiOpenMedia || this.manualSearchValue) {
      if (this.manualSearchValue.length === 0) {
        return;
      }
      sourceQuery = {
        query: this.manualSearchValue,
        category: this.manualSearchCategory
      };
    } else if (this.kodiOpenMedia.movie) {
      sourceQuery = getSourceQueryMovie(this.kodiOpenMedia.movie);
      this.lastPlayedSource = await this.sourceService.getLastMoviePlayedSource().toPromise();
    } else if (this.kodiOpenMedia.show && this.kodiOpenMedia.episode) {
      sourceQuery = getSourceQueryEpisode(this.kodiOpenMedia.show, this.kodiOpenMedia.episode);
      this.lastPlayedSource = await this.sourceService.getLastEpisodePlayedSource(this.kodiOpenMedia.show.traktId).toPromise();

    }


    this.stopSearch$.next(true);

    this.searching = true;

    this.sourceQuery = sourceQuery;


    this.providers = await this.providerService.getAll(true, sourceQuery.category);

    this.providers.forEach(provider => {
      this.providerIsLoading[provider.name] = provider;
    });

    const startTime = Date.now();

    let total = 0;
    this.sourceService
      .getAll(sourceQuery)
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

    const streamLinkSources: StreamLinkSource[] = [];
    const torrentSources: TorrentSource[] = [];

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

    this.streamLinkSourcesByQuality = getSourcesByQuality<StreamLinkSource>(streamLinkSources, sortTorrentsBySize);
    this.torrentSourcesByQuality = getSourcesByQuality<TorrentSource>(torrentSources, sortTorrentsBalanced);

    this.totalStreamLinkSource = streamLinkSources.length;
    this.totalTorrentSource = torrentSources.length;
  }

  getProviderStatus(name: string) {
    return this.providers.find(provider => provider.name === name).enabled;
  }

  async toggleProvider(name: string, enabled: boolean) {

    const providerList = await this.providerService.getProviders();
    Object.keys(providerList).forEach(key => {
      if (providerList[key].name === name) {
        providerList[key].enabled = enabled
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
}
