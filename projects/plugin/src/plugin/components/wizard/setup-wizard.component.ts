import { Component } from '@angular/core';
import {
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonCheckbox,
  IonLabel,
  IonRippleEffect,
  IonFooter,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { WakoCacheService } from '@wako-app/mobile-sdk';
import { DebridAccountComponent } from '../debrid-account/debrid-account.component';
import { PlayButtonComponent } from '../play-button/play-button.component';
import { ProviderComponent } from '../provider/provider.component';
import { QualityComponent } from '../quality/quality.component';
import { SupportComponent } from '../support/support.component';

@Component({
  selector: 'app-tutorial',
  templateUrl: './setup-wizard.component.html',
  styleUrls: ['./setup-wizard.component.scss'],
  imports: [
    ProviderComponent,
    QualityComponent,
    DebridAccountComponent,
    PlayButtonComponent,
    SupportComponent,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonCheckbox,
    IonLabel,
    IonRippleEffect,
    IonFooter,
  ],
})
export class SetupWizardComponent {
  slideOpts = {
    effect: 'flip',
  };

  totalSlides = 6;
  slideIndex = 0;
  checked = false;

  constructor(private modalController: ModalController) {}

  close() {
    this.modalController.dismiss();
  }

  next() {
    this.slideIndex++;
  }

  prev() {
    this.slideIndex--;
  }

  toggleChecked() {
    this.checked = !this.checked;

    if (this.checked) {
      this.slideIndex = 1;
      WakoCacheService.set('disclaimer-accepted', true, '1m');
    }
  }
}
