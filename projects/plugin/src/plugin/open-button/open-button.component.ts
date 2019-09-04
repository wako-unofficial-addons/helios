import { Component, Input, OnInit } from '@angular/core';
import { Episode, Movie, Show, ToastService } from '@wako-app/mobile-sdk';
import { LoadingController, ModalController } from '@ionic/angular';
import { SourceService } from '../services/sources/source.service';
import { SettingsService } from '../services/settings.service';
import { Settings } from '../entities/settings';
import { SourceDetail } from '../entities/source-detail';
import { from, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { SearchSourceComponent } from '../components/search-source/search-source.component';
import { KodiOpenMedia } from '../entities/kodi-open-media';
import { OpenSourceService } from '../services/open-source.service';
import { ProviderService } from '../services/provider.service';

@Component({
  selector: 'wk-open-button',
  templateUrl: './open-button.component.html',
  styleUrls: ['./open-button.component.scss']
})
export class OpenButtonComponent implements OnInit {
  @Input() movie: Movie;
  @Input() show: Show;
  @Input() episode: Episode;

  settings: Settings;

  private kodiOpenMedia: KodiOpenMedia;

  private sourceDetail: SourceDetail;

  constructor(
    private modalCtrl: ModalController,
    private sourceService: SourceService,
    private settingsService: SettingsService,
    private loadingCtrl: LoadingController,
    private openSourceService: OpenSourceService,
    private providerService: ProviderService,
    private toastService: ToastService
  ) {
  }

  async ngOnInit() {
    this.settings = await this.settingsService.get();

    this.kodiOpenMedia = {
      movie: this.movie,
      show: this.show,
      episode: this.episode
    };
  }

  private getSourceDetail() {

    this.providerService.getAll().then(providers => {
      if (providers.length === 0) {
        this.toastService.simpleMessage('source-list.noProviderSet');
      }
    });

    if (this.sourceDetail) {
      return of(this.sourceDetail);
    }

    let loading;
    return from(
      this.loadingCtrl.create({
        message: 'Searching for sources'
      })
    ).pipe(
      switchMap(_loading => {
        loading = _loading;
        loading.present();

        if (this.movie) {
          return this.sourceService.getMovie(this.movie);
        }
        return this.sourceService.getEpisode(this.show, this.episode);
      }),
      tap(sourceDetail => {
        this.sourceDetail = sourceDetail;
        loading.dismiss();
      })
    );
  }

  async play() {
    this.getSourceDetail().subscribe(sourceDetail => {

      if (this.settings.defaultPlayButtonAction === 'open-elementum' && sourceDetail.bestTorrent) {
        this.openSourceService.openElementum(sourceDetail.bestTorrent, this.kodiOpenMedia);
      } else if (sourceDetail.bestDebrid) {
        sourceDetail.bestDebrid.debridSourceFileObs.subscribe(source => {
          if (!source) {
            // TODO
            return;
          }
          if (Array.isArray(source)) {
            // TODO
            return;
          }

          const title = this.kodiOpenMedia.movie
            ? this.kodiOpenMedia.movie.title
            : this.kodiOpenMedia.episode.code + ' - ' + this.kodiOpenMedia.show.title;

          const images = this.kodiOpenMedia.movie ? this.kodiOpenMedia.movie.images_url : this.kodiOpenMedia.show.images_url;

          switch (this.settings.defaultPlayButtonAction) {
            case 'open-kodi':
              this.openSourceService.openKodi(source.url, this.kodiOpenMedia);
              break;
            case 'open-browser':
              this.openSourceService.openBrowser(source.url, source.transcodedUrl, title, images ? images.poster_original : null);
              break;
            case 'open-vlc':
              this.openSourceService.openVlc(source.url);
              break;
            case 'download-vlc':
              this.openSourceService.downloadWithVlc(source.url);
              break;
            case 'share-url':
              this.openSourceService.share(title, source.url);
              break;
          }
        });
      } else {
        // Errors
        if (!sourceDetail.bestDebrid && sourceDetail.torrentSources.length > 0) {
          // No best source found
          this.toastService.simpleMessage('shared.noBestSource', null, 4000);
        }
        this.openSourceModal();
      }
    });
  }

  async openSourceModal() {
    this.getSourceDetail().subscribe(sourceDetail => {
      this.modalCtrl
        .create({
          component: SearchSourceComponent,
          componentProps: {
            kodiOpenMedia: this.kodiOpenMedia,
            sourceDetail: sourceDetail
          }
        })
        .then(modal => {
          modal.present();
        });
    });
  }
}
