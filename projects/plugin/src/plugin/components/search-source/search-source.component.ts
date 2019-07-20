import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Episode, Movie, Show } from '@wako-app/mobile-sdk';
import { add0 } from '../../services/tools';


@Component({
  templateUrl: './search-source.component.html'
})
export class SearchSourceComponent {

  private _movie: Movie;
  private _show: Show;
  private _episode: Episode;

  filter;

  title: string;

  @Input()
  set movie(movie: Movie) {
    this._movie = movie;

    if (movie) {
      this.filter = this.getFilter();

      this.title = movie.title;
    }
  }

  get movie() {
    return this._movie;
  }

  @Input()
  set show(show: Show) {
    this._show = show;
  }

  get show() {
    return this._show;
  }

  @Input()
  set episode(episode: Episode) {
    this._episode = episode;

    if (episode) {
      this.filter = this.getFilter();

      this.title = episode.code + ' - ' + this.show.title;
    }
  }

  get episode() {
    return this._episode;
  }

  constructor(
    private modalCtrl: ModalController
  ) {
  }

  getSeasonCode(seasonNumber: number) {
    return 'S' + add0(seasonNumber).toString();
  }

  getFilter() {
    if (this.movie) {
      return {
        imdbId: this.movie.imdbId,
        title: this.movie.title,
        alternativeTitles: this.movie.alternativeTitles,
        originalTitle: this.movie.originalTitle,
        year: this.movie.year,
        category: 'movies'
      }
    }
    return {
      episodeCode: this.episode.code,
      seasonCode: this.getSeasonCode(this.episode.traktSeasonNumber),
      title: this.show.title,
      alternativeTitles: this.show.alternativeTitles,
      originalTitle: this.show.originalTitle,
      year: this.show.year,
      category: this.show.genres.includes('anime') ? 'anime' : 'tv'
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
