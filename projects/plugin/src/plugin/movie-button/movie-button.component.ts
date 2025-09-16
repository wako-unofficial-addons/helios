import { Component } from '@angular/core';
import { Movie, MovieDetailBaseComponent } from '@wako-app/mobile-sdk';
import { OpenButtonComponent } from '../open-button/open-button.component';

@Component({
  templateUrl: './movie-button.component.html',
  styleUrls: ['./movie-button.component.scss'],
  imports: [OpenButtonComponent],
})
export class MovieButtonComponent extends MovieDetailBaseComponent {
  movie: Movie;

  setMovie(movie: Movie): any {
    this.movie = movie;
  }
}
