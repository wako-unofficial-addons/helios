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
      `{"show":{"title":"The Handmaid's Tale","year":2017,"imdbId":"tt5834204","tmdbId":69478,"tvdbId":321239,"traktId":113938,"slug":"the-handmaid-s-tale","overview":"In a dystopian near-future, the totalitarian and Christian-fundamentalist government of Gilead rules the former United States amidst an ongoing civil war and subjugates women, who are not allowed to work, control money, or even read. Widespread infertility due to environmental contamination has resulted in the conscription of young fertile women—called Handmaids, according to biblical precedent—who are assigned to the homes of the elite, where they must have ritualized sex with the men in order to become pregnant and bear children for those men and their wives.","trailer":"http://youtube.com/watch?v=81PyH5TH-NQ","firstAired":"2017-04-26T07:00:00.000Z","runtime":55,"rating":8.5,"votes":5133,"language":"en","genres":["drama","fantasy","science-fiction"],"certification":"TV-MA","airedEpisodes":36,"images_url":{"poster":"https://image.tmdb.org/t/p/w300/kJnNIZ09BTcG3mxXXAvqDBkLKIc.jpg","backdrop":"https://image.tmdb.org/t/p/w500/klGcKDge85gQnspHz87PB2Fj5Rg.jpg","poster_original":"https://image.tmdb.org/t/p/original/kJnNIZ09BTcG3mxXXAvqDBkLKIc.jpg","backdrop_original":"https://image.tmdb.org/t/p/original/klGcKDge85gQnspHz87PB2Fj5Rg.jpg"},"alternativeTitles":{"kr":"핸드메이즈 테일","us":"The Handmaid's Tale","br":"O Conto da Aia","bs":"Handmaid's Tale","es":"El cuento de la criada","fr":"La servante écarlate","cz":"Příběh služebnice","gr":"The Handmaid's Tale","cn":"使女的故事","ru":"Рассказ служанки","hu":"A szolgálólány meséje","bg":"Историята на прислужницата","pl":"Opowieść podręcznej","il":"סיפורה של שפחה","ua":"Оповідь служниці","it":"The Handmaid's Tale","ca":"The Handmaid's Tale : la servante écarlate","nl":"The Handmaid's Tale","pt":"The Handmaid's Tale","tr":"The Handmaid's Tale","de":"The Handmaid’s Tale - Der Report der Magd","rs":"Прича Слушкиње","lv":"Kalpones stāsts","dk":"The Handmaid's Tale","lt":"Tarnaitės pasakojimas","se":"The Handmaid's Tale","tw":"侍女的故事","sa":"حكاية الخادمة","ir":"سرگذشت ندیمه","ro":"Povestea slujitoarei","sk":"Príbeh služobníčky","mx":"El cuento de la criada","fi":"The Handmaid's Tale - Orjattaresi"},"originalTitle":"The Handmaid's Tale"},"episode":{"traktSeasonNumber":3,"traktNumber":4,"code":"S03E04","title":"God Bless the Child","imdbId":"tt9364002","tmdbId":1814791,"tvdbId":7036371,"traktId":3372631,"overview":"June negotiates a truce in the Waterfords’ fractured relationship. Janine oversteps with the Putnam family, and a still-healing Aunt Lydia offers a brutal public punishment.","firstAired":"2019-06-12T07:00:00.000Z","rating":7.8,"votes":1580,"runtime":50,"watched":false}}`
    );

    this.pluginLoader.createComponent('episodes', this.episodeVCRef, data);
  }
}
