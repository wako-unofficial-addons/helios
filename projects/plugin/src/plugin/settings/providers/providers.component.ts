import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';


@Component({
  templateUrl: './providers.component.html'
})
export class ProvidersComponent {
  constructor(public modalCtrl: ModalController) {
  }
}
