import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { SourceDetail } from '../../entities/source-detail';
import { KodiOpenMedia } from '../../entities/kodi-open-media';

@Component({
  templateUrl: './search-source.component.html'
})
export class SearchSourceComponent implements OnInit {
  @Input()
  sourceDetail: SourceDetail;

  @Input()
  kodiOpenMedia: KodiOpenMedia;

  title: string;
  manualSearchValue: string;
  manualSearch = false;

  constructor(private modalCtrl: ModalController) {}

  ngOnInit(): void {
    if (!this.kodiOpenMedia) {
      return;
    }

    this.title = this.kodiOpenMedia.movie
      ? this.kodiOpenMedia.movie.title
      : this.kodiOpenMedia.episode.code + ' - ' + this.kodiOpenMedia.show.title;
    if (this.kodiOpenMedia.movie) {
      this.manualSearchValue = this.kodiOpenMedia.movie.title + ' ' + this.kodiOpenMedia.movie.year;
    } else {
      this.manualSearchValue = this.kodiOpenMedia.show.title + ' ' + this.kodiOpenMedia.episode.code;
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
