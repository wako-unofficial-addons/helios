import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { Episode, PluginLoaderService, Show } from '@wako-app/mobile-sdk';

@Component({
  selector: 'app-tab1',
  templateUrl: 'episode.page.html',
  styleUrls: ['episode.page.scss']
})
export class EpisodePage implements OnInit {
  @ViewChild('episodeRef', {read: ViewContainerRef, static: true})
  episodeVCRef: ViewContainerRef;

  constructor(private pluginLoader: PluginLoaderService) {
  }

  ngOnInit() {
    this.loadPlugin();
  }

  loadPlugin() {
    const show = JSON.parse(
      `{"title":"Game of Thrones","year":2011,"imdbId":"tt0944947","tmdbId":1399,"tvdbId":121361,"traktId":1390,"slug":"game-of-thrones","overview":"Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war. All while a very ancient evil awakens in the farthest north. Amidst the war, a neglected military order of misfits, the Night's Watch, is all that stands between the realms of men and the icy horrors beyond.","trailer":"http://youtube.com/watch?v=bjqEWgDVPe0","firstAired":"2011-04-18T01:00:00.000Z","runtime":55,"rating":9.3,"votes":95218,"language":"en","genres":["drama","fantasy","science-fiction","action","adventure"],"certification":"TV-MA","airedEpisodes":73,"images_url":{"poster":"https://image.tmdb.org/t/p/w300/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg","backdrop":"https://image.tmdb.org/t/p/w500/qsD5OHqW7DSnaQ2afwz8Ptht1Xb.jpg","poster_original":"https://image.tmdb.org/t/p/original/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg","backdrop_original":"https://image.tmdb.org/t/p/original/qsD5OHqW7DSnaQ2afwz8Ptht1Xb.jpg"},"alternativeTitles":{"us":"Game of Thrones","fr":"Game of Thrones","ru":"Игра престолов","gr":"Game of Thrones","nl":"Game of Thrones","bg":"Игра на тронове","cn":"冰与火之歌","pl":"Gra o Tron","dk":"Game of Thrones","tr":"Game of Thrones","il":"משחקי הכס","de":"Game of Thrones","fi":"Game of Thrones","kr":"왕좌의 게임","se":"Game of Thrones","ua":"Гра Престолів","is":"Krúnuleikar","lt":"Sostų karai","hr":"Igra Prijestolja","bs":"Game of Thrones","pt":"A Guerra dos Tronos","hu":"Trónok harca","ir":"بازی تاج و تخت","id":"Game of Thrones","br":"Game of Thrones","lb":"Game of Thrones","vn":"Trò Chơi Vương Quyền","tw":"冰與火之歌：權力遊戲","sa":"صراع العروش","ca":"Le trône de fer","mx":"Juego de Tronos","rs":"Игра престола","it":"Il Trono di Spade","cz":"Hra o trůny","sk":"Hra o Tróny","es":"Juego de Tronos","ro":"Urzeala tronurilor","eo":"Ludo de Tronoj","th":"เกมส์ ออฟ โธรนส์ มหาศึกชิงบัลลังก์","no":"Game of Thrones","lv":"Troņu spēles","by":"Гульня тронаў","jp":"ゲーム・オブ・スローンズ","ge":"სამეფო კარის თამაშები","uz":"Taxtlar Oʻyini","in":"ഗെയിം ഓഫ് ത്രോൺസ്"},"originalTitle":"Game of Thrones"}`
    ) as Show;

    const episode = JSON.parse(
      `{"traktSeasonNumber":8,"traktNumber":5,"code":"S08E05","title":"The Bells","imdbId":"tt6027916","tmdbId":1551829,"tvdbId":7121404,"traktId":3465697,"overview":"Varys betrays his queen, and Daenerys brings her forces to King's Landing.","firstAired":"2019-05-13T01:00:00.000Z","rating":7.6,"votes":8097,"runtime":93,"watched":false}`
    ) as Episode;

    const data = JSON.parse(
      `{"show":{"title":"Cop Craft","year":2019,"imdbId":"tt10347516","tmdbId":88050,"tvdbId":361491,"traktId":145720,"slug":"cop-craft","overview":"15 years ago, an unknown hyperspace gate opened over the Pacific. Beyond this gate lies Reto Semaani, a strange alternate world where fairies and demons live.","trailer":null,"firstAired":"2019-07-08T15:00:00.000Z","runtime":25,"rating":6.1,"votes":17,"language":"ja","genres":["action","anime","adventure","fantasy","science-fiction","crime"],"certification":null,"airedEpisodes":7,"images_url":{"poster":"https://image.tmdb.org/t/p/w300/ojjpfSFz5gDosavmRVBEjHF8HFZ.jpg","backdrop":"https://image.tmdb.org/t/p/w500/oxMLKe2mlxCcKBgZPaLEXWI9Ha7.jpg","poster_original":"https://image.tmdb.org/t/p/original/ojjpfSFz5gDosavmRVBEjHF8HFZ.jpg","backdrop_original":"https://image.tmdb.org/t/p/original/oxMLKe2mlxCcKBgZPaLEXWI9Ha7.jpg"},"alternativeTitles":{"us":"COP CRAFT","cn":"全缉毒狂潮","br":"Cop Craft","es":"Cop Craft","fr":"Cop Craft","mx":"Cop Craft","ru":"Мастерство копа"},"originalTitle":"COP CRAFT [コップクラフト]"},"episode":{"traktSeasonNumber":1,"traktNumber":7,"code":"S01E07","title":"MIDNIGHT TRAIN","imdbId":"tt10494666","tmdbId":1814492,"tvdbId":7239914,"traktId":3581146,"overview":"Kei and Tilarna are hot on the trail of the fairy thief, but Tilarna gets upset at the investigation’s slow pace, and sets out on her own…","firstAired":"2019-07-22T15:00:00.000Z","rating":7.2,"votes":33,"runtime":25,"watched":false}}`
    );

    this.pluginLoader.createComponent('episodes', this.episodeVCRef, data);
  }
}
