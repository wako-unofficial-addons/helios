import { Component, OnInit, ViewChild } from '@angular/core';
import { IonSlides, ModalController } from '@ionic/angular';
import { WakoCacheService } from '@wako-app/mobile-sdk';

@Component({
  selector: 'app-tutorial',
  templateUrl: './setup-wizard.component.html',
  styleUrls: ['./setup-wizard.component.scss'],
})
export class SetupWizardComponent implements OnInit {
  slideOpts = {
    effect: 'flip',
  };

  @ViewChild(IonSlides, { static: true }) slides: IonSlides;
  checked = false;

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    this.checkSlides();
  }

  close() {
    this.modalController.dismiss();
  }

  async goNextSlide() {
    if ((await this.slides.getActiveIndex()) === 1) {
      setTimeout(() => {
        this.slides.slideNext();
      }, 1000);
    }
  }

  toggleChecked() {
    this.checked = !this.checked;

    this.checkSlides();

    if (this.checked) {
      this.slides.slideNext();
      WakoCacheService.set('disclaimer-accepted', true, '1m');
    }
  }

  private checkSlides() {
    this.slides.lockSwipes(!this.checked);
  }
}
