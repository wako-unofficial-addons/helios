import { Component, OnInit, ViewChild } from '@angular/core';
import { IonSlides, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-tutorial',
  templateUrl: './setup-wizard.component.html',
  styleUrls: ['./setup-wizard.component.scss'],
})
export class SetupWizardComponent implements OnInit {
  slideOpts = {
    effect: 'flip'
  };

  @ViewChild(IonSlides, {static: true}) slides: IonSlides;

  constructor(private modalController: ModalController) {
  }

  ngOnInit() {
  }

  close() {
    this.modalController.dismiss();
  }

  async goNextSlide() {
    if (await this.slides.getActiveIndex() === 1) {
      setTimeout(() => {
        this.slides.slideNext();
      }, 1000);
    }
  }
}
