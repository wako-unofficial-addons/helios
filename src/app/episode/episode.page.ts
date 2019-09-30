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

  @ViewChild('episodeItemOptionRef', {read: ViewContainerRef, static: true})
  episodeItemOptionVCRef: ViewContainerRef;

  data: { show: Show, episode: Episode } = JSON.parse(
    `{"show":{"title":"The 100","year":2014,"imdbId":"tt2661044","tmdbId":48866,"tvdbId":268592,"traktId":48562,"slug":"the-100","overview":"Set ninety-seven years after a nuclear war has destroyed civilization, when a spaceship housing humanity's lone survivors sends one hundred juvenile delinquents back to Earth, in hopes of possibly re-populating the planet.","trailer":"http://youtube.com/watch?v=aDrsItJ_HU4","firstAired":"2014-03-20T01:00:00.000Z","runtime":45,"rating":8,"votes":14774,"language":"en","genres":["drama","fantasy","science-fiction","action","suspense","thriller"],"certification":"TV-14","airedEpisodes":84,"images_url":{"poster":"https://image.tmdb.org/t/p/w300/wBzNjurA8ijJPF21Ggs9nbviIzi.jpg","backdrop":"https://image.tmdb.org/t/p/w500/qYTIuJJ7fIehicAt3bl0vW70Sq6.jpg","poster_original":"https://image.tmdb.org/t/p/original/wBzNjurA8ijJPF21Ggs9nbviIzi.jpg","backdrop_original":"https://image.tmdb.org/t/p/original/qYTIuJJ7fIehicAt3bl0vW70Sq6.jpg"},"alternativeTitles":{"pt":"The 100","ru":"Сотня","nl":"The 100","fr":"Les 100","tr":"The 100","us":"The 100","gr":"Οι 100","it":"The 100","cn":"地球百子","de":"The 100","es":"Los 100","se":"The 100","hu":"A visszatérők","lt":"Šimtukas","pl":"100","hr":"Stotina","bs":"The 100","bg":"Стоте","cz":"The 100","il":"המאה","fi":"Eloonjääneet","th":"เดอะ 100 ฝ่าโลกมฤตยู","id":"The 100","ir":"۱۰۰","sa":"المائة","km":"The 100","sg":"The 100","br":"Os 100","dk":"The 100","ua":"Сотня","kr":"원헌드레드","tw":"地球百子","ro":"The 100","ge":"ასეული","sk":"Prvých 100","ca":"Les 100","lv":"Simts","jp":"The 100／ハンドレッド","rs":"100","mx":"Los 100"},"originalTitle":"The 100"},"episode":{"traktSeasonNumber":1,"traktNumber":1,"code":"S01E01","title":"Pilot","imdbId":"tt2912494","tmdbId":972730,"tvdbId":4543295,"traktId":924290,"overview":"Ninety-seven years ago, nuclear Armageddon decimated planet Earth, destroying civilization. The only survivors were the 400 inhabitants of 12 international space stations that were in orbit at the time. Three generations have been born in space, the survivors now number 4,000, and resources are running out on their dying \\"Ark.\\" Among the 100 young exiles are Clarke, the bright teenage daughter of the Ark’s chief medical officer; the daredevil Finn; the brother/sister duo of Bellamy and Octavia, whose illegal sibling status has always led them to flaunt the rules, the lighthearted Jasper and the resourceful Monty. Technologically blind to what’s happening on the planet below them, the Ark’s leaders — Clarke’s widowed mother, Abby; Chancellor Jaha; and his shadowy second in command, Kane — are faced with difficult decisions about life, death and the continued existence of the human race.","firstAired":"2014-03-20T01:00:00.000Z","rating":7.4,"votes":6595,"runtime":41,"watched":false}}`
  );

  constructor(private pluginLoader: PluginLoaderService) {
  }

  ngOnInit() {
    this.loadPlugin();
  }

  loadPlugin() {

    this.pluginLoader.createComponent('episodes', this.episodeVCRef, this.data);
    this.pluginLoader.createComponent('episodes-item-option', this.episodeItemOptionVCRef, this.data);
  }
}
