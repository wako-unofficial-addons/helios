import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { SourceQuery } from '../../../projects/plugin/src/plugin/entities/source-query';
import { SourceUtils } from '../../../projects/plugin/src/plugin/services/source-utils';
import { PluginLoaderService } from '../services/plugin-loader.service';
import { PlaylistListComponent } from '../shared/playlist-list/playlist-list.component';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-tab1',
  templateUrl: 'movie.page.html',
  styleUrls: ['movie.page.scss'],
  imports: [
    PlaylistListComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
  ],
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
      `{"movie":{"type":"movie","ids":{"simkl":63926,"slug":"big-buck-bunny","tmdb":10378,"imdb":"tt1254207","offen":"http://www.bigbuckbunny.org"},"title":"Big Buck Bunny","overview":"Follow a day of the life of Big Buck Bunny when he meets three bullying rodents: Frank, Rinky, and Gamera. The rodents amuse themselves by harassing helpless creatures by throwing fruits, nuts and rocks at them. After the deaths of two of Bunny's favorite butterflies, and an offensive attack on Bunny himself, Bunny sets aside his gentle nature and orchestrates a complex plan for revenge.","imagesUrl":{"poster":"https://image.tmdb.org/t/p/w300/i9jJzvoXET4D9pOkoEwncSdNNER.jpg","backdrop":"https://image.tmdb.org/t/p/w500/bZxwNUANy2KAYBjM9UyUlqiCMI1.jpg","posterOriginal":"https://image.tmdb.org/t/p/original/i9jJzvoXET4D9pOkoEwncSdNNER.jpg","backdropOriginal":"https://image.tmdb.org/t/p/original/bZxwNUANy2KAYBjM9UyUlqiCMI1.jpg"},"year":2008,"certification":null,"runtime":8,"genres":["Animation","Comedy","Family"],"alternativeTitles":{"es":"Big Buck Bunny","cz":"Big Buck Bunny","de":"Big Buck Bunny","gr":"Big Buck Bunny","us":"Big Buck Bunny","mx":"Big Buck Bunny","fi":"Big Buck Bunny","fr":"Big Buck Bunny","hu":"Big Buck Bunny","it":"Big Buck Bunny","nl":"Big Buck Bunny","pl":"Big Buck Bunny","pt":"Big Buck Bunny","ro":"Iepurașul mare","ru":"Большой Бак","se":"Big Buck Bunny","cn":"大雄兔"},"originalTitle":"Big Buck Bunny","ratings":{"imdb":{"name":"IMDb","url":"https://imdb.com/title/tt1254207","rating":6.5,"votes":1953,"imageUrl":"https://eu.simkl.in/img_tv/ico-rating_imdb.png?v2"},"simkl":{"name":"SIMKL","url":"https://simkl.com/movies/63926","rating":6.5,"votes":13}},"rating":6.5,"votes":1953,"status":"Released","released":"2008-04-10","relatedImdbIds":[],"trailer":"yUQM7H4Swgw","language":"en","images_url":{"poster":"https://image.tmdb.org/t/p/w300/i9jJzvoXET4D9pOkoEwncSdNNER.jpg","backdrop":"https://image.tmdb.org/t/p/w500/bZxwNUANy2KAYBjM9UyUlqiCMI1.jpg","posterOriginal":"https://image.tmdb.org/t/p/original/i9jJzvoXET4D9pOkoEwncSdNNER.jpg","backdropOriginal":"https://image.tmdb.org/t/p/original/bZxwNUANy2KAYBjM9UyUlqiCMI1.jpg"},"imdbId":"tt1254207","tmdbId":10378}}`,
    );

    this.pluginLoader.createComponent('movies', this.movieVCRef, data);

    // this.test();
  }

  private test() {
    let a = null;

    let tTitle = 'Africa scream';

    let originalQuery = 'Africa scream 1949';

    let sourceQuery: SourceQuery = JSON.parse(`
    {"movie":{"relatedIds":[],"title":"Africa Screams","year":1949,"imdbId":"tt0041098","tmdbId":20278,"traktId":12436,"trailer":"http://youtube.com/watch?v=USOHyNuOCZ0","certification":"NR","tagline":"A Zany, Hilarious Romp!","overview":"When bookseller Buzz cons Diana into thinking that his friend Stanley knows all there is to know about Africa, they are abducted and ordered to lead Diana and her henchmen to an African tribe in search of a fortune in jewels.","released":"1949-05-04","runtime":79,"rating":6.2,"votes":45,"language":"en","genres":["comedy"],"imagesUrl":{"poster":"https://image.tmdb.org/t/p/w300/l4imef1WmxynQM8NiOnUeOgtgKj.jpg","backdrop":"https://image.tmdb.org/t/p/w500/fC7SQH4wDCnmpXpySrBP9Qft4A3.jpg","poster_original":"https://image.tmdb.org/t/p/original/l4imef1WmxynQM8NiOnUeOgtgKj.jpg","backdrop_original":"https://image.tmdb.org/t/p/original/fC7SQH4wDCnmpXpySrBP9Qft4A3.jpg"},"alternativeTitles":{"de":"Verrücktes Afrika","us":"Africa Screams","es":"Las Minas del Rey Salmonete","fr":"Africa Screams","pl":"Afrykańska przygoda (1949)","rs":"Афрички врисак"},"originalTitle":"Africa Screams"}}
    `);

    a = SourceUtils.isMovieTitleMatching(tTitle, originalQuery, sourceQuery.movie);

    console.log('test matching', tTitle, a);
  }
}
