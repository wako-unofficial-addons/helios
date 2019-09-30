import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { PluginLoaderService } from '@wako-app/mobile-sdk';

@Component({
  selector: 'app-tab1',
  templateUrl: 'movie.page.html',
  styleUrls: ['movie.page.scss']
})
export class MoviePage implements OnInit {
  @ViewChild('movieRef', {read: ViewContainerRef, static: true})
  movieVCRef: ViewContainerRef;

  constructor(private pluginLoader: PluginLoaderService) {
  }

  ngOnInit() {
    this.loadPlugin();
  }

  loadPlugin() {
    // const movie = JSON.parse(
    //   `{"relatedIds":[],"title":"Captain Marvel","year":2019,"imdbId":"tt4154664","tmdbId":299537,"traktId":193963,"trailer":"http://youtube.com/watch?v=Z1BCujX3pw8","certification":"PG-13","tagline":"Higher. Further. Faster.","overview":"The story follows Carol Danvers as she becomes one of the universe’s most powerful heroes when Earth is caught in the middle of a galactic war between two alien races. Set in the 1990s, Captain Marvel is an all-new adventure from a previously unseen period in the history of the Marvel Cinematic Universe.","released":"2019-03-08","runtime":124,"rating":7.6,"votes":15204,"language":"en","genres":["science-fiction","action","adventure","superhero"],"images_url":{"poster":"https://image.tmdb.org/t/p/w300/AtsgWhDnHTq68L0lLsUrCnM7TjG.jpg","backdrop":"https://image.tmdb.org/t/p/w500/w2PMyoyLU22YvrGK3smVM9fW1jj.jpg","poster_original":"https://image.tmdb.org/t/p/original/AtsgWhDnHTq68L0lLsUrCnM7TjG.jpg","backdrop_original":"https://image.tmdb.org/t/p/original/w2PMyoyLU22YvrGK3smVM9fW1jj.jpg"},"alternativeTitles":{"us":"Captain Marvel","ru":"Капитан Марвел","pt":"Captain Marvel (Capitão Marvel)","es":"Capitana Marvel","pl":"Kapitan Marvel","it":"Captain Marvel","de":"Captain Marvel","fr":"Captain Marvel","cz":"Captain Marvel","gr":"Κάπτεν Μάρβελ","mx":"Capitana Marvel","tr":"Kaptan Marvel","kr":"캡틴 마블","bg":"Капитан Марвел","tw":"驚奇隊長","il":"קפטן מארוול","ua":"Капітан Марвел","hu":"Marvel Kapitány","br":"Capitã Marvel","uz":"Kapitan Marvel","dk":"Captain Marvel","cn":"惊奇队长","hk":"Marvel隊長","ge":"კაპიტანი მარველი","sk":"Captain Marvel","se":"Captain Marvel","rs":"Капетан Марвел","nl":"Captain Marvel","sa":"كابتن مارفل","jp":"キャプテン・マーベル","ro":"Captain Marvel","hr":"Kapetanica Marvel","vn":"Đại Úy Marvel","lv":"Kapteine Mārvela","ca":"Capitaine Marvel","lt":"Kapitonė Marvel","ae":"Captain Marvel","ir":"کاپیتان مارول","by":"Капітан Марвел","th":"กัปตัน มาร์เวล","et":"Kapten Marvel","id":"Captain Marvel","fi":"Captain Marvel"},"originalTitle":"Captain Marvel"}`
    // ) as Movie;
    // const data = JSON.parse(
    //   `{"movie":{"relatedIds":[],"title":"The Hangover","year":2009,"imdbId":"tt1119646","tmdbId":18785,"traktId":11534,"trailer":"http://youtube.com/watch?v=jj6wcUes1no","certification":"R","tagline":"Some guys just can't handle Vegas.","overview":"When three friends finally come to after a raucous night of bachelor-party revelry, they find a baby in the closet and a tiger in the bathroom. But they can't seem to locate their best friend, Doug – who's supposed to be tying the knot. Launching a frantic search for Doug, the trio perseveres through a nasty hangover to try to make it to the church on time.","released":"2009-06-05","runtime":100,"rating":7.8,"votes":21432,"language":"en","genres":["comedy"],"images_url":{"poster":"https://image.tmdb.org/t/p/w300/uluhlXubGu1VxU63X9VHCLWDAYP.jpg","backdrop":"https://image.tmdb.org/t/p/w500/xxKd56iFbMeRQARUosTGgxKxrnF.jpg","poster_original":"https://image.tmdb.org/t/p/original/uluhlXubGu1VxU63X9VHCLWDAYP.jpg","backdrop_original":"https://image.tmdb.org/t/p/original/xxKd56iFbMeRQARUosTGgxKxrnF.jpg"},"alternativeTitles":{"us":"The Hangover","de":"Hangover","fr":"Very Bad Trip","ru":"Мальчишник в Вегасе","es":"Resacón en Las Vegas","tr":"Felekten Bir Gece","cn":"宿醉","cz":"Pařba ve Vegas","bg":"Последният ергенски запой","sk":"Vo štvorici po opici","fi":"Kauhea kankkunen","no":"Hangover","il":"בדרך לחתונה עוצרים בווגאס","gr":"The Hangover","th":"แฮงค์โอเวอร์ เมายกแก๊ง แฮงค์ยกก๊วน","pl":"Kac Vegas","ro":"Marea mahmureală","br":"Se Beber, Não Case!","ua":"Похмілля у Вегасі","tw":"醉後大丈夫","si":"Prekrokana noč","jp":"ハングオーバー！消えた花ムコと史上最悪の二日酔い","se":"Baksmällan","hu":"Másnaposok","nl":"The Hangover","dk":"Tømmermænd i Vegas","kr":"행오버","rs":"Мамурлук у Вегасу","mx":"¿Qué pasó ayer?","hr":"Mamurluk","pt":"Se Beber, Não Case!","it":"Una notte da leoni","ir":"خماری","ca":"Lendemain de veille","lv":"Paģiras","lt":"Pagirios Las Vegase","hk":"醉爆伴郎團"},"originalTitle":"The Hangover"}}`
    // );
    const data = JSON.parse(
      `{"movie":{"relatedIds":[],"title":"moana","year":2016,"imdbId":"tt2139881","tmdbId":459992,"traktId":307062,"trailer":"http://youtube.com/watch?v=ZKsc2I4Tgsk","certification":"R","tagline":"Unlikely but not impossible","overview":"Fred Flarsky is a gifted and free-spirited journalist who has a knack for getting into trouble. Charlotte Field is one of the most influential women in the world -- a smart, sophisticated and accomplished politician. When Fred unexpectedly runs into Charlotte, he soon realizes that she was his former baby sitter and childhood crush. When Charlotte decides to make a run for the presidency, she impulsively hires Fred as her speechwriter -- much to the dismay of her trusted advisers.","released":"2019-05-03","runtime":125,"rating":7.4,"votes":2630,"language":"en","genres":["comedy","romance"],"images_url":{"poster":"https://image.tmdb.org/t/p/w300/m2ttWZ8rMRwIMT7zA48Jo6mTkDS.jpg","backdrop":"https://image.tmdb.org/t/p/w500/88r25ghJzVYKq0vaOApqEOZsQlD.jpg","poster_original":"https://image.tmdb.org/t/p/original/m2ttWZ8rMRwIMT7zA48Jo6mTkDS.jpg","backdrop_original":"https://image.tmdb.org/t/p/original/88r25ghJzVYKq0vaOApqEOZsQlD.jpg"},"alternativeTitles":{"us":"Long Shot","bg":"А дано, ама надали","dk":"Long Shot","fr":"Séduis-moi si tu peux !","ua":"Божевільна парочка","nl":"Long Shot","ru":"Та еще парочка","se":"Long Shot","ca":"Un bon coup","de":"Long Shot – Unwahrscheinlich, aber nicht unmöglich","kr":"롱 샷","il":"מה הסיכוי?","pl":"Niedobrani","es":"Casi imposible","gr":"Μια Απίθανη Σχέση","id":"Long Shot","pt":"Seduz-me Se És Capaz","rs":"Заведи ме ако можеш","br":"Casal Improvável","cn":"全民追女王","tw":"選情尬翻天","cz":"Srážka s láskou","sk":"Stará láska nehrdzavie","hu":"Csekély esély","it":"Non succede… Ma se succede","mx":"Ni en tus sueños","fi":"Long Shot - Mahdoton Yhtälö","tr":"Denemeye Değer","th":"นายโคตรแน่ขอจีบตัวแม่หน่อย!","ro":"N-ai șanse, frate!"},"originalTitle":"Long Shot"}}`
    );

    this.pluginLoader.createComponent('movies', this.movieVCRef, data);
  }
}
