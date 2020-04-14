import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'wk-cloud-account-files',
  templateUrl: './cloud-account-files.component.html',
  styleUrls: ['./cloud-account-files.component.scss']
})
export class CloudFilesComponent {
  constructor(public modalCtrl: ModalController) {}
}
