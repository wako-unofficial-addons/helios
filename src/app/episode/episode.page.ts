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
      `{"show":{"title":"The 100","year":2014,"imdbId":"tt2661044","tmdbId":48866,"tvdbId":268592,"traktId":48562,"slug":"the-100","overview":"Set ninety-seven years after a nuclear war has destroyed civilization, when a spaceship housing humanity's lone survivors sends one hundred juvenile delinquents back to Earth, in hopes of possibly re-populating the planet.","trailer":"http://youtube.com/watch?v=aDrsItJ_HU4","firstAired":"2014-03-20T01:00:00.000Z","runtime":45,"rating":8,"votes":14774,"language":"en","genres":["drama","fantasy","science-fiction","action","suspense","thriller"],"certification":"TV-14","airedEpisodes":84,"images_url":{"poster":"https://image.tmdb.org/t/p/w300/wBzNjurA8ijJPF21Ggs9nbviIzi.jpg","backdrop":"https://image.tmdb.org/t/p/w500/qYTIuJJ7fIehicAt3bl0vW70Sq6.jpg","poster_original":"https://image.tmdb.org/t/p/original/wBzNjurA8ijJPF21Ggs9nbviIzi.jpg","backdrop_original":"https://image.tmdb.org/t/p/original/qYTIuJJ7fIehicAt3bl0vW70Sq6.jpg"},"alternativeTitles":{"pt":"The 100","ru":"Сотня","nl":"The 100","fr":"Les 100","tr":"The 100","us":"The 100","gr":"Οι 100","it":"The 100","cn":"地球百子","de":"The 100","es":"Los 100","se":"The 100","hu":"A visszatérők","lt":"Šimtukas","pl":"100","hr":"Stotina","bs":"The 100","bg":"Стоте","cz":"The 100","il":"המאה","fi":"Eloonjääneet","th":"เดอะ 100 ฝ่าโลกมฤตยู","id":"The 100","ir":"۱۰۰","sa":"المائة","km":"The 100","sg":"The 100","br":"Os 100","dk":"The 100","ua":"Сотня","kr":"원헌드레드","tw":"地球百子","ro":"The 100","ge":"ასეული","sk":"Prvých 100","ca":"Les 100","lv":"Simts","jp":"The 100／ハンドレッド","rs":"100","mx":"Los 100"},"originalTitle":"The 100"},"episode":{"traktSeasonNumber":1,"traktNumber":1,"code":"S01E01","title":"Pilot","imdbId":"tt2912494","tmdbId":972730,"tvdbId":4543295,"traktId":924290,"overview":"Ninety-seven years ago, nuclear Armageddon decimated planet Earth, destroying civilization. The only survivors were the 400 inhabitants of 12 international space stations that were in orbit at the time. Three generations have been born in space, the survivors now number 4,000, and resources are running out on their dying \\"Ark.\\" Among the 100 young exiles are Clarke, the bright teenage daughter of the Ark’s chief medical officer; the daredevil Finn; the brother/sister duo of Bellamy and Octavia, whose illegal sibling status has always led them to flaunt the rules, the lighthearted Jasper and the resourceful Monty. Technologically blind to what’s happening on the planet below them, the Ark’s leaders — Clarke’s widowed mother, Abby; Chancellor Jaha; and his shadowy second in command, Kane — are faced with difficult decisions about life, death and the continued existence of the human race.","firstAired":"2014-03-20T01:00:00.000Z","rating":7.4,"votes":6595,"runtime":41,"watched":false}}`
    );

    this.pluginLoader.createComponent('episodes', this.episodeVCRef, data);
  }
}
