import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { KodiOpenMedia } from '../../entities/kodi-open-media';
import { SourceQuery } from '../../entities/source-query';
import { getSourceQueryEpisode, getSourceQueryMovie } from '../../services/tools';

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


    this.title = this.kodiOpenMedia.movie
      ? this.kodiOpenMedia.movie.title + ' ' + this.kodiOpenMedia.movie.year
      : this.kodiOpenMedia.episode.code + ' - ' + this.kodiOpenMedia.show.title;

    if (this.kodiOpenMedia.movie) {
      this.manualSearchValue = this.kodiOpenMedia.movie.title + ' ' + this.kodiOpenMedia.movie.year;
      this.sourceQuery = getSourceQueryMovie(this.kodiOpenMedia.movie);
    } else if (this.kodiOpenMedia.show && this.kodiOpenMedia.episode) {
      this.manualSearchValue = this.kodiOpenMedia.show.title + ' ' + this.kodiOpenMedia.episode.code;
      this.sourceQuery = getSourceQueryEpisode(this.kodiOpenMedia.show, this.kodiOpenMedia.episode);
    } else  {
      this.manualSearchValue = '';
    }


  }


  dismiss() {
    this.modalCtrl.dismiss();
  }
}
