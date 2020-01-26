import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { KodiOpenMedia } from '../../entities/kodi-open-media';
import { SourceQuery } from '../../entities/source-query';
import { SourceQueryFromKodiOpenMediaQuery } from '../../queries/source-query-from-kodi-open-media.query';

@Component({
  templateUrl: './search-source.component.html'
})
export class SearchSourceComponent implements OnInit {
  @Input()
  kodiOpenMedia: KodiOpenMedia;

  sourceQuery: SourceQuery;

  title: string;
  manualSearchValue: string;
  manualSearch = false;

  constructor(private modalCtrl: ModalController) {
  }

  async ngOnInit() {
    if (!this.kodiOpenMedia) {
      return;
    }


    this.manualSearchValue = '';

    if (this.kodiOpenMedia.movie || this.kodiOpenMedia.episode) {
      this.sourceQuery = await SourceQueryFromKodiOpenMediaQuery.getData(this.kodiOpenMedia).toPromise();
      if (this.sourceQuery.movie) {
        this.title = this.sourceQuery.movie.title + ' ' + (this.sourceQuery.movie.year || '');
        this.manualSearchValue = this.title;
      } else if (this.sourceQuery.episode.isAnime) {
        this.title = `${this.sourceQuery.episode.episodeCode} (${this.sourceQuery.episode.absoluteNumber}) - ${this.sourceQuery.episode.title}`
        this.manualSearchValue = this.sourceQuery.episode.title + ' ' + this.sourceQuery.episode.absoluteNumber;
      } else {
        this.title = `${this.sourceQuery.episode.episodeCode} - ${this.sourceQuery.episode.title}`
        this.manualSearchValue = this.sourceQuery.episode.title + ' ' + this.sourceQuery.episode.episodeCode;
      }
    }

  }


  dismiss() {
    this.modalCtrl.dismiss();
  }
}
