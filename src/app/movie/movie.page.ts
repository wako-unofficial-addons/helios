import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { Movie, PluginLoaderService } from '@wako-app/mobile-sdk';

@Component({
  selector: 'app-tab1',
  templateUrl: 'movie.page.html',
  styleUrls: ['movie.page.scss']
})
export class MoviePage implements OnInit {
  @ViewChild('movieRef', {read: ViewContainerRef})
  movieVCRef: ViewContainerRef;

  constructor(private pluginLoader: PluginLoaderService) {
  }

  ngOnInit() {
    this.loadPlugin();
  }

  loadPlugin() {
    const movie = JSON.parse(
      `{"relatedIds":[],"title":"Captain Marvel","year":2019,"imdbId":"tt4154664","tmdbId":299537,"traktId":193963,"trailer":"http://youtube.com/watch?v=Z1BCujX3pw8","certification":"PG-13","tagline":"Higher. Further. Faster.","overview":"The story follows Carol Danvers as she becomes one of the universe’s most powerful heroes when Earth is caught in the middle of a galactic war between two alien races. Set in the 1990s, Captain Marvel is an all-new adventure from a previously unseen period in the history of the Marvel Cinematic Universe.","released":"2019-03-08","runtime":124,"rating":7.6,"votes":15204,"language":"en","genres":["science-fiction","action","adventure","superhero"],"images_url":{"poster":"https://image.tmdb.org/t/p/w300/AtsgWhDnHTq68L0lLsUrCnM7TjG.jpg","backdrop":"https://image.tmdb.org/t/p/w500/w2PMyoyLU22YvrGK3smVM9fW1jj.jpg","poster_original":"https://image.tmdb.org/t/p/original/AtsgWhDnHTq68L0lLsUrCnM7TjG.jpg","backdrop_original":"https://image.tmdb.org/t/p/original/w2PMyoyLU22YvrGK3smVM9fW1jj.jpg"},"alternativeTitles":{"us":"Captain Marvel","ru":"Капитан Марвел","pt":"Captain Marvel (Capitão Marvel)","es":"Capitana Marvel","pl":"Kapitan Marvel","it":"Captain Marvel","de":"Captain Marvel","fr":"Captain Marvel","cz":"Captain Marvel","gr":"Κάπτεν Μάρβελ","mx":"Capitana Marvel","tr":"Kaptan Marvel","kr":"캡틴 마블","bg":"Капитан Марвел","tw":"驚奇隊長","il":"קפטן מארוול","ua":"Капітан Марвел","hu":"Marvel Kapitány","br":"Capitã Marvel","uz":"Kapitan Marvel","dk":"Captain Marvel","cn":"惊奇队长","hk":"Marvel隊長","ge":"კაპიტანი მარველი","sk":"Captain Marvel","se":"Captain Marvel","rs":"Капетан Марвел","nl":"Captain Marvel","sa":"كابتن مارفل","jp":"キャプテン・マーベル","ro":"Captain Marvel","hr":"Kapetanica Marvel","vn":"Đại Úy Marvel","lv":"Kapteine Mārvela","ca":"Capitaine Marvel","lt":"Kapitonė Marvel","ae":"Captain Marvel","ir":"کاپیتان مارول","by":"Капітан Марвел","th":"กัปตัน มาร์เวล","et":"Kapten Marvel","id":"Captain Marvel","fi":"Captain Marvel"},"originalTitle":"Captain Marvel"}`
    ) as Movie;

    this.pluginLoader.createComponent('movies', this.movieVCRef, {
      movie
    });
  }
}
