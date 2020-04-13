import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { SourceQuery } from '../../../projects/plugin/src/plugin/entities/source-query';
import { SourceUtils } from '../../../projects/plugin/src/plugin/services/source-utils';
import { PluginLoaderService } from '../services/plugin-loader.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'movie.page.html',
  styleUrls: ['movie.page.scss']
})
export class MoviePage implements OnInit {
  @ViewChild('movieRef', { read: ViewContainerRef, static: true })
  movieVCRef: ViewContainerRef;

  constructor(private pluginLoader: PluginLoaderService) {}

  ngOnInit() {
    this.loadPlugin();
  }

  loadPlugin() {
    const data = JSON.parse(
      `{"movie":{"relatedIds":[],"title":"Big buck bunny","year":null,"imdbId":"tt0041098","tmdbId":20278,"traktId":12436,"trailer":"http://youtube.com/watch?v=USOHyNuOCZ0","certification":"NR","tagline":"A Zany, Hilarious Romp!","overview":"When bookseller Buzz cons Diana into thinking that his friend Stanley knows all there is to know about Africa, they are abducted and ordered to lead Diana and her henchmen to an African tribe in search of a fortune in jewels.","released":"1949-05-04","runtime":79,"rating":6.2,"votes":45,"language":"en","genres":["comedy"],"images_url":{"poster":"https://image.tmdb.org/t/p/w300/l4imef1WmxynQM8NiOnUeOgtgKj.jpg","backdrop":"https://image.tmdb.org/t/p/w500/fC7SQH4wDCnmpXpySrBP9Qft4A3.jpg","poster_original":"https://image.tmdb.org/t/p/original/l4imef1WmxynQM8NiOnUeOgtgKj.jpg","backdrop_original":"https://image.tmdb.org/t/p/original/fC7SQH4wDCnmpXpySrBP9Qft4A3.jpg"},"alternativeTitles":{"de":"Verrücktes Afrika","us":"Africa Screams","es":"Las Minas del Rey Salmonete","fr":"Africa Screams","pl":"Afrykańska przygoda (1949)","rs":"Афрички врисак"},"originalTitle":"Africa Screams"}}`
    );

    this.pluginLoader.createComponent('movies', this.movieVCRef, data);

    // this.test();
  }

  private test() {
    let a = null;

    let tTitle = 'Africa scream';

    let originalQuery = 'Africa scream 1949';

    let sourceQuery: SourceQuery = JSON.parse(`
    {"movie":{"relatedIds":[],"title":"Africa Screams","year":1949,"imdbId":"tt0041098","tmdbId":20278,"traktId":12436,"trailer":"http://youtube.com/watch?v=USOHyNuOCZ0","certification":"NR","tagline":"A Zany, Hilarious Romp!","overview":"When bookseller Buzz cons Diana into thinking that his friend Stanley knows all there is to know about Africa, they are abducted and ordered to lead Diana and her henchmen to an African tribe in search of a fortune in jewels.","released":"1949-05-04","runtime":79,"rating":6.2,"votes":45,"language":"en","genres":["comedy"],"images_url":{"poster":"https://image.tmdb.org/t/p/w300/l4imef1WmxynQM8NiOnUeOgtgKj.jpg","backdrop":"https://image.tmdb.org/t/p/w500/fC7SQH4wDCnmpXpySrBP9Qft4A3.jpg","poster_original":"https://image.tmdb.org/t/p/original/l4imef1WmxynQM8NiOnUeOgtgKj.jpg","backdrop_original":"https://image.tmdb.org/t/p/original/fC7SQH4wDCnmpXpySrBP9Qft4A3.jpg"},"alternativeTitles":{"de":"Verrücktes Afrika","us":"Africa Screams","es":"Las Minas del Rey Salmonete","fr":"Africa Screams","pl":"Afrykańska przygoda (1949)","rs":"Афрички врисак"},"originalTitle":"Africa Screams"}}
    `);

    a = SourceUtils.isMovieTitleMatching(tTitle, originalQuery, sourceQuery.movie);

    console.log('test matching', tTitle, a);
  }
}
