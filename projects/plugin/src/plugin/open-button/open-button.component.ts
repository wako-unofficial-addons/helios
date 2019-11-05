import { Component, Input, OnInit } from '@angular/core';
import { Episode, Movie, Show, ToastService } from '@wako-app/mobile-sdk';
import { LoadingController, ModalController } from '@ionic/angular';
import { SourceService } from '../services/sources/source.service';
import { SettingsService } from '../services/settings.service';
import { Settings } from '../entities/settings';
import { SearchSourceComponent } from '../components/search-source/search-source.component';
import { KodiOpenMedia } from '../entities/kodi-open-media';
import { OpenSourceService } from '../services/open-source.service';
import { ProviderService } from '../services/provider.service';
import { logData, logEvent } from '../services/tools';
import { NEVER } from 'rxjs';
import { StreamLinkSource } from '../entities/stream-link-source';
import { TorrentSource } from '../entities/torrent-source';
import { finalize } from 'rxjs/operators';
import { ProvidersComponent } from '../settings/providers/providers.component';
import { SourceQueryFromKodiOpenMediaQuery } from '../queries/source-query-from-kodi-open-media.query';

@Component({
  selector: 'wk-open-button',
  templateUrl: './open-button.component.html',
  styleUrls: ['./open-button.component.scss']
})
export class OpenButtonComponent implements OnInit {
  @Input() movie: Movie;
  @Input() show: Show;
  @Input() episode: Episode;
  @Input() type: 'button' | 'item-option' = 'button';

  settings: Settings;

  bestSource: TorrentSource | StreamLinkSource;

  elapsedTime = 0;

  private kodiOpenMedia: KodiOpenMedia;

  constructor(
    private modalCtrl: ModalController,
    private sourceService: SourceService,
    private settingsService: SettingsService,
    private loadingCtrl: LoadingController,
    private openSourceService: OpenSourceService,
    private providerService: ProviderService,
    private toastService: ToastService,
    private modalController: ModalController
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


  private async openProviderModal() {
    const modal = await this.modalController.create({
      component: ProvidersComponent
    });

    await modal.present();

    modal.onDidDismiss().then(() => this.play());
  }

  async play() {
    const providers = await this.providerService.getAll(true);

    if (providers.length === 0) {
      this.toastService.simpleMessage('source-list.noProviderSet');

      this.openProviderModal();
      return NEVER;
    }

    const loader = await this.loadingCtrl.create({
      message: 'Searching for sources'
    });

    loader.present();

    const startTime = Date.now();


    this.sourceService.getBestSourceFromKodiOpenMedia(this.kodiOpenMedia)
      .pipe(
        finalize(() => {
          loader.dismiss();
        }))
      .subscribe(bestSource => {

        const endTime = Date.now();

        this.elapsedTime = endTime - startTime;

        logData(`Get bestSource ${bestSource} in ${this.elapsedTime} ms`);

        if (!bestSource) {
          this.toastService.simpleMessage('shared.noBestSource', null, 4000);
          this.openSourceModal();
          return;
        }

        this.bestSource = bestSource;

        if (bestSource.type === 'torrent') {
          this.openSourceService.openElementum(bestSource as TorrentSource, this.kodiOpenMedia);
          return;
        } else if (bestSource instanceof StreamLinkSource) {

          const title = this.kodiOpenMedia.movie
            ? this.kodiOpenMedia.movie.title
            : this.kodiOpenMedia.episode.code + ' - ' + this.kodiOpenMedia.show.title;

          const images = this.kodiOpenMedia.movie ? this.kodiOpenMedia.movie.images_url : this.kodiOpenMedia.show.images_url;

          const streamLink = bestSource.streamLinks[0];

          switch (this.settings.defaultPlayButtonAction) {
            case 'open-kodi':
              const urls = [];
              bestSource.streamLinks.forEach(streamLink => {
                urls.push(streamLink.url);
              });
              this.openSourceService.openKodi(urls, this.kodiOpenMedia);
              break;
            case 'open-browser':
              this.openSourceService.openBrowser(streamLink.url, streamLink.transcodedUrl, title, images ? images.poster_original : null);
              break;
            case 'open-vlc':
              this.openSourceService.openVlc(streamLink.url);
              break;
            case 'download-vlc':
              this.openSourceService.downloadWithVlc(streamLink.url);
              break;
            case 'share-url':
              this.openSourceService.share(streamLink.url, title);
              break;
            case 'open-with':
              this.openSourceService.openWith(streamLink.url, title);
              break;
            case 'open-nplayer':
              this.openSourceService.openNplayer(streamLink.url);
              break;
            default:
              SourceQueryFromKodiOpenMediaQuery.getData(this.kodiOpenMedia).subscribe(sourceQuery => {
                this.openSourceService.openStreamLinkSource(bestSource, sourceQuery, this.kodiOpenMedia);
              })
          }

        }
      });

    logEvent('helios_main_button', {action: this.settings.defaultPlayButtonAction});
  }

  async openSourceModal() {
    const modal = await this.modalCtrl.create({
      component: SearchSourceComponent,
      componentProps: {
        kodiOpenMedia: this.kodiOpenMedia
      }
    });

    modal.present();

    logEvent('helios_more_button', null);
  }
}
