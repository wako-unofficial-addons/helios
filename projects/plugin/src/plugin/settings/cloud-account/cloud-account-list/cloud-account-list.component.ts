import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'wk-cloud-account-list',
  templateUrl: './cloud-account-list.component.html',
  styleUrls: ['./cloud-account-list.component.scss']
})
export class CloudAccountListComponent {
  constructor(public modalCtrl: ModalController) {}
}
