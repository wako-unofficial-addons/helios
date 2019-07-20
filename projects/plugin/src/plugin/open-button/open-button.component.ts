import { Component, Input } from '@angular/core';
import { Episode, Movie, Show } from '@wako-app/mobile-sdk';
import { ModalController } from '@ionic/angular';
import { SearchSourceComponent } from '../components/search-source/search-source.component';

@Component({
  selector: 'wk-open-button',
  templateUrl: './open-button.component.html',
  styleUrls: ['./open-button.component.scss']
})
export class OpenButtonComponent {
  @Input() movie: Movie;
  @Input() show: Show;
  @Input() episode: Episode;

  constructor(private modalCtrl: ModalController) {}

  async open() {
    const modal = await this.modalCtrl.create({
      component: SearchSourceComponent,
      componentProps: {
        movie: this.movie,
        show: this.show,
        episode: this.episode
      }
    });

    modal.present();
  }
}
