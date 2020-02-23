import { Episode, Movie, Show } from '@wako-app/mobile-sdk';

export interface KodiOpenMedia {
  movie?: Movie;
  show?: Show;
  episode?: Episode;
  titleLang: string;
}
