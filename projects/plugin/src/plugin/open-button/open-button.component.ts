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
import { logData } from '../services/tools';
import { NEVER } from 'rxjs';
import { StreamLinkSource } from '../entities/stream-link-source';
import { TorrentSource } from '../entities/torrent-source';
import { finalize } from 'rxjs/operators';
import { ProvidersComponent } from '../settings/providers/providers.component';

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

    this.sourceService
      .getBestSourceFromKodiOpenMedia(this.kodiOpenMedia)
      .pipe(
        finalize(() => {
          loader.dismiss();
        })
      )
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
          this.openSourceService.open(bestSource, 'open-elementum', this.kodiOpenMedia);
        } else if (bestSource instanceof StreamLinkSource) {
          this.openSourceService.open(bestSource, this.settings.defaultPlayButtonAction, this.kodiOpenMedia);
        }
      });
  }

  async openSourceModal() {
    const modal = await this.modalCtrl.create({
      component: SearchSourceComponent,
      componentProps: {
        kodiOpenMedia: this.kodiOpenMedia
      }
    });

    modal.present();
  }
}
