import { Component, Input, NgZone, OnInit } from '@angular/core';
import {
  ActionSheetController,
  ModalController,
  PopoverController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonFooter,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { KodiOpenMedia } from '../../entities/kodi-open-media';
import { SourceQuery } from '../../entities/source-query';
import { PluginDetailComponent } from '../../plugin-detail/plugin-detail.component';
import { SourceQueryFromKodiOpenMediaQuery } from '../../queries/source-query-from-kodi-open-media.query';
import { countryCodeToEmoji, setKodiOpenMediaLang } from '../../services/tools';
import { SourceListComponent } from '../source-list/source-list.component';
import { SourcePopoverFilterComponent } from '../source-popover-filter/source-popover-filter.component';
import { addIcons } from 'ionicons';
import { flagOutline, searchOutline, listOutline, funnelOutline, closeOutline } from 'ionicons/icons';
import { WakoGlobal } from '@wako-app/mobile-sdk';

@Component({
  templateUrl: './search-source.component.html',
  imports: [
    SourceListComponent,
    PluginDetailComponent,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
  ],
})
export class SearchSourceComponent implements OnInit {
  @Input()
  kodiOpenMedia: KodiOpenMedia;

  sourceQuery: SourceQuery;

  title: string;
  manualSearchValue: string;
  manualSearch = false;

  lang: string;
  showContent = true;

  disableSearch = true;
  isTvLayout = false;

  constructor(
    private modalCtrl: ModalController,
    private actionSheetController: ActionSheetController,
    private translateService: TranslateService,
    private ngZone: NgZone,
    private popoverCtrl: PopoverController,
  ) {
    addIcons({ flagOutline, searchOutline, listOutline, funnelOutline, closeOutline });
    this.isTvLayout = WakoGlobal && WakoGlobal.isTvLayout;
  }

  async ngOnInit() {
    if (!this.kodiOpenMedia) {
      return;
    }

    this.lang = this.kodiOpenMedia.titleLang;

    this.setProperties();
  }

  ionViewDidEnter() {
    this.disableSearch = false;
  }

  private async setProperties() {
    this.manualSearchValue = '';

    if (this.kodiOpenMedia.movie || this.kodiOpenMedia.episode) {
      this.sourceQuery = await SourceQueryFromKodiOpenMediaQuery.getData(this.kodiOpenMedia).toPromise();
      if (this.sourceQuery.movie) {
        this.title = this.sourceQuery.movie.title + ' ' + (this.sourceQuery.movie.year || '');
        this.manualSearchValue = this.title;
      } else if (this.sourceQuery.episode.isAnime) {
        this.title = `${this.sourceQuery.episode.episodeCode} (${this.sourceQuery.episode.absoluteNumber}) - ${this.sourceQuery.episode.title}`;
        this.manualSearchValue = this.sourceQuery.episode.title + ' ' + this.sourceQuery.episode.absoluteNumber;
      } else {
        this.title = `${this.sourceQuery.episode.episodeCode} - ${this.sourceQuery.episode.title}`;
        this.manualSearchValue = this.sourceQuery.episode.title + ' ' + this.sourceQuery.episode.episodeCode;
      }
    }
  }

  async selectLang() {
    const buttons = [];

    let titles = {};

    if (this.kodiOpenMedia.movie) {
      titles = this.kodiOpenMedia.movie.alternativeTitles;
    }

    if (this.kodiOpenMedia.show) {
      titles = this.kodiOpenMedia.show.alternativeTitles;
    }

    Object.keys(titles).forEach((lang) => {
      if (lang === 'original') {
        buttons.unshift({
          text: 'Original - ' + titles[lang],
          handler: () => {
            this.setLang(lang);
          },
        });
        return;
      }

      const flag = countryCodeToEmoji(lang === 'en' ? 'us' : lang);
      buttons.push({
        text: flag + ' - ' + titles[lang],
        handler: () => {
          this.setLang(lang);
        },
      });
    });

    buttons.push({
      text: this.translateService.instant('shared.cancel'),
      icon: 'close',
      role: 'cancel',
      handler: () => {
        console.log('Cancel clicked');
      },
    });

    const action = await this.actionSheetController.create({
      header: this.translateService.instant('actionSheets.search-source.selectTitle'),
      buttons: buttons,
    });

    action.present();
  }

  private async setLang(lang: string) {
    this.ngZone.run(() => {
      this.kodiOpenMedia = setKodiOpenMediaLang(this.kodiOpenMedia, lang);
      this.showContent = false;

      this.setProperties();

      setTimeout(async () => {
        this.showContent = true;
      }, 100);
    });
  }

  async openFilterPopover(event) {
    const popover = await this.popoverCtrl.create({
      component: SourcePopoverFilterComponent,
      event: event,
    });

    await popover.present();
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
